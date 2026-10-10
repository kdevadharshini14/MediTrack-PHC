import os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime
from database import get_db, log_activity

def send_email_alert(to_email, subject, message_body):
    """
    Optional Gmail SMTP email alert via environment variables.
    Skips silently if not configured or on network error.
    """
    smtp_user = os.environ.get("SMTP_EMAIL")
    smtp_pass = os.environ.get("SMTP_PASSWORD")

    if not smtp_user or not smtp_pass or not to_email:
        return  # Silently skip if not configured

    try:
        msg = MIMEText(message_body)
        msg['Subject'] = subject
        msg['From'] = smtp_user
        msg['To'] = to_email

        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=5) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception:
        # Silently ignore email failures so app execution never fails
        pass

def evaluate_alerts_for_item(phc_id, medicine_id):
    """
    Evaluate alert conditions for a specific (phc_id, medicine_id).
    Creates, updates, or resolves alerts without duplicates.
    """
    from services.stock_service import calculate_burn_rate_and_trend

    conn = get_db()
    cursor = conn.cursor()

    # Get current stock
    cursor.execute("""
        SELECT s.quantity, s.min_level, m.name as medicine_name, p.name as phc_name, p.contact_email
        FROM stock s
        JOIN medicine m ON s.medicine_id = m.id
        JOIN phc p ON s.phc_id = p.id
        WHERE s.phc_id = ? AND s.medicine_id = ?
    """, (phc_id, medicine_id))
    stock_row = cursor.fetchone()

    if not stock_row:
        conn.close()
        return

    qty = stock_row['quantity']
    min_lvl = stock_row['min_level']
    med_name = stock_row['medicine_name']
    phc_name = stock_row['phc_name']
    contact_email = stock_row['contact_email']

    burn = calculate_burn_rate_and_trend(phc_id, medicine_id, qty)
    days_left = burn['days_left']
    trend = burn['trend']
    trend_pct = burn['trend_pct']

    # Determine alert level and reason
    level = None
    reason = None
    message = None

    # CRITICAL rule: qty < min_level OR days_left < 3
    if qty < min_lvl or days_left < 3:
        level = "CRITICAL"
        if days_left < 3:
            reason = "FAST_BURN"
            rate_info = f" ({trend_pct} this week)" if trend == "UP" else ""
            message = f"{med_name}: {days_left} days left at current burn rate{rate_info} (Stock: {qty}, Min: {min_lvl})"
        else:
            reason = "LOW_QTY"
            message = f"{med_name}: Stock critical ({qty} units, below minimum safe level of {min_lvl})"
    # WARNING rule: days_left < 7 OR (trend is UP with days_left < 10) OR qty < 2 * min_level
    elif days_left < 7 or (trend == "UP" and days_left < 10) or (qty < 2 * min_lvl):
        level = "WARNING"
        if trend == "UP" and days_left < 10:
            reason = "FAST_BURN"
            message = f"{med_name}: Burning faster ({trend_pct}), {days_left} days remaining"
        elif days_left < 7:
            reason = "FAST_BURN"
            message = f"{med_name}: {days_left} days left at current rate"
        else:
            reason = "LOW_QTY"
            message = f"{med_name}: Low buffer stock ({qty} units, 2x min is {2 * min_lvl})"

    # Check for existing active alert
    cursor.execute("""
        SELECT id, level, message FROM alert
        WHERE phc_id = ? AND medicine_id = ? AND status = 'active'
    """, (phc_id, medicine_id))
    existing_alert = cursor.fetchone()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if level:
        if existing_alert:
            # Update existing alert if level or message changed
            if existing_alert['level'] != level or existing_alert['message'] != message:
                cursor.execute("""
                    UPDATE alert 
                    SET level = ?, reason = ?, message = ?, created_at = ?
                    WHERE id = ?
                """, (level, reason, message, now_str, existing_alert['id']))
                conn.commit()
        else:
            # Create new active alert
            cursor.execute("""
                INSERT INTO alert (phc_id, medicine_id, level, reason, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?)
            """, (phc_id, medicine_id, level, reason, message, now_str))
            conn.commit()
            log_activity("Alert Triggered", f"[{level}] {phc_name} - {message}")

            # Send optional email notification
            if contact_email:
                send_email_alert(
                    contact_email,
                    f"MediTrack Alert [{level}]: {med_name} at {phc_name}",
                    f"Alert Notice:\n\nPHC: {phc_name}\nMedicine: {med_name}\nLevel: {level}\nReason: {reason}\n{message}\n\nPlease check MediTrack PHC redistribution portal."
                )
    else:
        # Conditions are now safe; resolve active alert if exists
        if existing_alert:
            cursor.execute("""
                UPDATE alert SET status = 'resolved' WHERE id = ?
            """, (existing_alert['id'],))
            conn.commit()
            log_activity("Alert Resolved", f"{phc_name} - {med_name} stock restored above danger threshold")

    conn.close()

def evaluate_all_alerts():
    """
    Evaluates all stock items across all PHCs.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT phc_id, medicine_id FROM stock")
    rows = cursor.fetchall()
    conn.close()

    for r in rows:
        evaluate_alerts_for_item(r['phc_id'], r['medicine_id'])

def get_alerts(status='active', phc_id=None):
    """
    Returns alerts with medicine details, PHC details, and suggested donors.
    """
    from services.transfer_service import find_nearest_donors
    from services.stock_service import calculate_burn_rate_and_trend

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT 
            a.id as alert_id,
            a.phc_id,
            p.name as phc_name,
            p.location as phc_location,
            a.medicine_id,
            m.name as medicine_name,
            m.unit as medicine_unit,
            m.category as medicine_category,
            s.quantity as current_quantity,
            s.min_level,
            a.level,
            a.reason,
            a.message,
            a.status,
            a.created_at
        FROM alert a
        JOIN phc p ON a.phc_id = p.id
        JOIN medicine m ON a.medicine_id = m.id
        LEFT JOIN stock s ON s.phc_id = a.phc_id AND s.medicine_id = a.medicine_id
        WHERE 1=1
    """
    params = []
    if status:
        query += " AND a.status = ?"
        params.append(status)
    if phc_id:
        query += " AND a.phc_id = ?"
        params.append(phc_id)

    # Sort critical first, then newest
    query += " ORDER BY CASE WHEN a.level = 'CRITICAL' THEN 1 ELSE 2 END, a.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        alert_dict = dict(r)
        burn = calculate_burn_rate_and_trend(r['phc_id'], r['medicine_id'], r['current_quantity'] or 0)
        alert_dict['days_left'] = burn['days_left']
        alert_dict['days_left_display'] = burn['days_left_display']
        alert_dict['trend'] = burn['trend']
        alert_dict['trend_symbol'] = burn['trend_symbol']
        alert_dict['trend_label'] = burn['trend_label']
        alert_dict['trend_pct'] = burn['trend_pct']

        # Find suggested nearest donors for active alerts
        if r['status'] == 'active':
            donors = find_nearest_donors(r['phc_id'], r['medicine_id'])
            alert_dict['suggested_donors'] = donors
            alert_dict['top_donor'] = donors[0] if donors else None
        else:
            alert_dict['suggested_donors'] = []
            alert_dict['top_donor'] = None

        results.append(alert_dict)

    return results

def get_active_alert_count():
    """
    Returns active alert counts {total, critical, warning}.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN level = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN level = 'WARNING' THEN 1 ELSE 0 END) as warning
        FROM alert
        WHERE status = 'active'
    """)
    row = cursor.fetchone()
    conn.close()
    return {
        "total": row['total'] or 0,
        "critical": row['critical'] or 0,
        "warning": row['warning'] or 0
    }
