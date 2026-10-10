import os
import math
from datetime import datetime, date, timedelta
from database import get_db, log_activity

def calculate_burn_rate_and_trend(phc_id, medicine_id, current_qty):
    """
    Calculate:
    - 7-day average daily usage
    - days_left (current_qty / avg_daily_usage)
    - trend (comparing last 3 days avg daily usage vs previous 7 days)
    """
    conn = get_db()
    cursor = conn.cursor()

    today = date.today()
    start_last_7 = (today - timedelta(days=6)).isoformat()
    today_str = today.isoformat()

    # Total usage in last 7 days (today - 6 days through today)
    cursor.execute("""
        SELECT COALESCE(SUM(quantity), 0) as total_7
        FROM usage_log
        WHERE phc_id = ? AND medicine_id = ? AND date >= ? AND date <= ?
    """, (phc_id, medicine_id, start_last_7, today_str))
    row = cursor.fetchone()
    total_7 = row['total_7'] if row else 0
    avg_daily_usage = round(total_7 / 7.0, 2)

    # Days left calculation
    if avg_daily_usage <= 0:
        days_left = 999.0
        days_left_display = "∞"
        days_left_status = "GREEN"
    else:
        days_left = round(current_qty / avg_daily_usage, 1)
        days_left_display = str(days_left)
        if days_left < 3:
            days_left_status = "RED"
        elif days_left <= 7:
            days_left_status = "YELLOW"
        else:
            days_left_status = "GREEN"

    # Trend calculation: last 3 days vs previous 7 days
    # Last 3 days: [today - 2, today]
    start_last_3 = (today - timedelta(days=2)).isoformat()
    cursor.execute("""
        SELECT COALESCE(SUM(quantity), 0) as total_3
        FROM usage_log
        WHERE phc_id = ? AND medicine_id = ? AND date >= ? AND date <= ?
    """, (phc_id, medicine_id, start_last_3, today_str))
    total_3 = cursor.fetchone()['total_3']
    avg_last_3 = total_3 / 3.0

    # Previous 7 days: [today - 9, today - 3]
    start_prev_7 = (today - timedelta(days=9)).isoformat()
    end_prev_7 = (today - timedelta(days=3)).isoformat()
    cursor.execute("""
        SELECT COALESCE(SUM(quantity), 0) as total_prev_7
        FROM usage_log
        WHERE phc_id = ? AND medicine_id = ? AND date >= ? AND date <= ?
    """, (phc_id, medicine_id, start_prev_7, end_prev_7))
    total_prev_7 = cursor.fetchone()['total_prev_7']
    avg_prev_7 = total_prev_7 / 7.0

    # Meaningful clinical thresholds:
    # A surge ('Burning faster') requires both a percentage rise (>= 30%)
    # AND an actual meaningful quantity increase (at least 3.0 units/day difference and 12+ total units in 3 days).
    # Small single-patient dispensing (e.g. 1-5 tablets) will NEVER trigger 'Burning faster'.
    diff = avg_last_3 - avg_prev_7

    if avg_prev_7 > 0:
        pct_change = round((diff / avg_prev_7) * 100)
        # Genuine high demand surge: >= 30% increase AND at least 3 units/day spike AND >= 12 total units in 3 days
        if pct_change >= 30 and diff >= 3.0 and total_3 >= 12:
            trend = "UP"
            trend_symbol = "↑"
            trend_label = "Burning faster"
            trend_pct = f"+{pct_change}%"
        elif pct_change <= -30 and diff <= -3.0 and avg_prev_7 >= 5.0:
            trend = "DOWN"
            trend_symbol = "↓"
            trend_label = "Slowing down"
            trend_pct = f"{pct_change}%"
        else:
            trend = "STABLE"
            trend_symbol = "→"
            trend_label = "Stable"
            pct_str = f"{'+' if pct_change > 0 else ''}{pct_change}%" if pct_change != 0 else "0%"
            trend_pct = pct_str
    elif avg_last_3 >= 5.0 and total_3 >= 15:
        # Starting from zero, but large surge (many patients in last 3 days)
        trend = "UP"
        trend_symbol = "↑"
        trend_label = "Burning faster"
        trend_pct = "+100%"
    else:
        # 0 or small routine usage (e.g. 1 tablet, 2 tablets) -> perfectly Stable
        trend = "STABLE"
        trend_symbol = "→"
        trend_label = "Stable"
        trend_pct = "0%"

    conn.close()

    return {
        "avg_daily_usage": avg_daily_usage,
        "days_left": days_left,
        "days_left_display": days_left_display,
        "days_left_status": days_left_status,
        "trend": trend,
        "trend_symbol": trend_symbol,
        "trend_label": trend_label,
        "trend_pct": trend_pct,
        "avg_last_3": round(avg_last_3, 2),
        "avg_prev_7": round(avg_prev_7, 2)
    }

def get_quantity_status(quantity, min_level):
    """
    GREEN (qty >= 2x min_level)
    YELLOW (min_level <= qty < 2x min_level)
    RED (qty < min_level)
    """
    if quantity >= 2 * min_level:
        return "GREEN"
    elif quantity >= min_level:
        return "YELLOW"
    else:
        return "RED"

def check_expiry_details(expiry_date_str, medicine_id, current_phc_id):
    """
    Calculates days to expiry and checks if within 30 days.
    If near expiry, suggests the PHC with highest 7-day usage.
    """
    if not expiry_date_str:
        return {
            "days_to_expiry": None,
            "is_near_expiry": False,
            "suggested_expiry_phc": None
        }

    try:
        exp_date = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
        today = date.today()
        days_to_expiry = (exp_date - today).days
        is_near_expiry = (0 <= days_to_expiry <= 30)

        suggested_expiry_phc = None
        if is_near_expiry:
            conn = get_db()
            cursor = conn.cursor()
            start_last_7 = (today - timedelta(days=6)).isoformat()
            cursor.execute("""
                SELECT p.id, p.name, COALESCE(SUM(u.quantity), 0) as total_usage
                FROM phc p
                LEFT JOIN usage_log u ON p.id = u.phc_id 
                    AND u.medicine_id = ? 
                    AND u.date >= ? 
                    AND u.date <= ?
                WHERE p.id != ?
                GROUP BY p.id, p.name
                ORDER BY total_usage DESC
                LIMIT 1
            """, (medicine_id, start_last_7, today.isoformat(), current_phc_id))
            top_phc = cursor.fetchone()
            if top_phc and top_phc['total_usage'] > 0:
                suggested_expiry_phc = {
                    "phc_id": top_phc['id'],
                    "phc_name": top_phc['name'],
                    "weekly_burn": top_phc['total_usage'],
                    "daily_burn": round(top_phc['total_usage'] / 7.0, 1)
                }
            conn.close()

        return {
            "days_to_expiry": days_to_expiry,
            "is_near_expiry": is_near_expiry,
            "suggested_expiry_phc": suggested_expiry_phc
        }
    except Exception:
        return {
            "days_to_expiry": None,
            "is_near_expiry": False,
            "suggested_expiry_phc": None
        }

def get_stock(phc_id=None, medicine_id=None):
    """
    Fetch stock with all enriched indicators:
    qty_status, burn rate, days_left, trend, expiry.
    """
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT 
            s.id as stock_id,
            s.phc_id,
            p.name as phc_name,
            p.location as phc_location,
            p.latitude as phc_lat,
            p.longitude as phc_lng,
            s.medicine_id,
            m.name as medicine_name,
            m.unit as medicine_unit,
            m.category as medicine_category,
            s.quantity,
            s.min_level,
            s.expiry_date,
            s.batch_no
        FROM stock s
        JOIN phc p ON s.phc_id = p.id
        JOIN medicine m ON s.medicine_id = m.id
        WHERE 1=1
    """
    params = []
    if phc_id:
        query += " AND s.phc_id = ?"
        params.append(phc_id)
    if medicine_id:
        query += " AND s.medicine_id = ?"
        params.append(medicine_id)

    query += " ORDER BY p.name ASC, m.name ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    enriched = []
    for r in rows:
        burn = calculate_burn_rate_and_trend(r['phc_id'], r['medicine_id'], r['quantity'])
        qty_status = get_quantity_status(r['quantity'], r['min_level'])
        expiry_info = check_expiry_details(r['expiry_date'], r['medicine_id'], r['phc_id'])

        batch_code = r['batch_no'] or f"TN-{r['medicine_name'][:4].upper()}-2026-B{r['medicine_id']:02d}"

        item = {
            "stock_id": r['stock_id'],
            "phc_id": r['phc_id'],
            "phc_name": r['phc_name'],
            "phc_location": r['phc_location'],
            "phc_lat": r['phc_lat'],
            "phc_lng": r['phc_lng'],
            "medicine_id": r['medicine_id'],
            "medicine_name": r['medicine_name'],
            "medicine_unit": r['medicine_unit'],
            "medicine_category": r['medicine_category'],
            "quantity": r['quantity'],
            "min_level": r['min_level'],
            "expiry_date": r['expiry_date'],
            "batch_no": batch_code,
            "qty_status": qty_status,
            **burn,
            **expiry_info
        }
        enriched.append(item)

    return enriched

def update_or_create_stock(phc_id, medicine_id, quantity, min_level, expiry_date):
    """
    Create or update stock item and trigger alert evaluation.
    """
    from services.alert_service import evaluate_alerts_for_item

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, quantity FROM stock WHERE phc_id = ? AND medicine_id = ?",
        (phc_id, medicine_id)
    )
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE stock 
            SET quantity = ?, min_level = ?, expiry_date = ?
            WHERE id = ?
        """, (quantity, min_level, expiry_date, existing['id']))
        action = "Stock Updated"
        details = f"PHC #{phc_id}, Med #{medicine_id} updated: qty={quantity}, min={min_level}"
    else:
        cursor.execute("""
            INSERT INTO stock (phc_id, medicine_id, quantity, min_level, expiry_date)
            VALUES (?, ?, ?, ?, ?)
        """, (phc_id, medicine_id, quantity, min_level, expiry_date))
        action = "Stock Added"
        details = f"PHC #{phc_id}, Med #{medicine_id} created: qty={quantity}, min={min_level}"

    conn.commit()
    conn.close()

    log_activity(action, details)
    evaluate_alerts_for_item(phc_id, medicine_id)
    return True

def record_usage(phc_id, usage_date, items):
    """
    Atomic multi-item usage log entry.
    items: list of {'medicine_id': int, 'quantity': int}
    Validates stock sufficiency before deducting.
    """
    from services.alert_service import evaluate_alerts_for_item

    if not items or len(items) == 0:
        raise ValueError("No medicine items provided for usage entry.")

    conn = get_db()
    cursor = conn.cursor()

    # Step 1: Pre-validation of all items
    for item in items:
        med_id = int(item['medicine_id'])
        req_qty = int(item['quantity'])
        if req_qty <= 0:
            conn.close()
            raise ValueError(f"Quantity must be greater than zero.")

        cursor.execute("""
            SELECT s.quantity, m.name 
            FROM stock s
            JOIN medicine m ON s.medicine_id = m.id
            WHERE s.phc_id = ? AND s.medicine_id = ?
        """, (phc_id, med_id))
        row = cursor.fetchone()

        if not row:
            conn.close()
            raise ValueError(f"Medicine ID {med_id} not found in this PHC's stock.")

        if req_qty > row['quantity']:
            conn.close()
            raise ValueError(
                f"Insufficient stock for '{row['name']}': requested {req_qty}, available {row['quantity']}."
            )

    # Step 2: Atomic update
    try:
        updated_medicines = []
        for item in items:
            med_id = int(item['medicine_id'])
            req_qty = int(item['quantity'])

            # Log usage
            cursor.execute("""
                INSERT INTO usage_log (phc_id, medicine_id, quantity, date)
                VALUES (?, ?, ?, ?)
            """, (phc_id, med_id, req_qty, usage_date))

            # Deduct stock
            cursor.execute("""
                UPDATE stock
                SET quantity = quantity - ?
                WHERE phc_id = ? AND medicine_id = ?
            """, (req_qty, phc_id, med_id))

            updated_medicines.append(med_id)

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

    conn.close()

    # Step 3: Log activity and re-evaluate alerts
    log_activity("Usage Recorded", f"PHC #{phc_id} recorded usage for {len(items)} medicines on {usage_date}")
    for med_id in updated_medicines:
        evaluate_alerts_for_item(phc_id, med_id)

    return True
