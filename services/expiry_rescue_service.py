import math
from datetime import datetime, date
from database import get_db, log_activity

MEDICINE_UNIT_PRICES = {
    1: 22.50,   # Paracetamol syrup (per bottle)
    2: 45.00,   # Amoxicillin (per strip)
    3: 8.50,    # ORS (per sachet)
    4: 18.00,   # Metformin (per strip)
    5: 24.00,   # Amlodipine (per strip)
    6: 12.00,   # Cetirizine (per strip)
    7: 195.00,  # Insulin (per vial)
    8: 26.00,   # Atenolol (per strip)
    9: 32.00,   # Omeprazole (per strip)
    10: 40.00,  # Vitamin B12 (per strip)
    11: 75.00,  # Azithromycin (per strip)
    12: 140.00  # Salbutamol (per inhaler)
}

def get_near_expiry_rescue_candidates(current_phc_id=None):
    """
    Near-Expiry Smart Rescue Swap Algorithm:
    1. Scans all stock items that have an expiry_date within the next 90 days.
    2. Projects how much will actually be consumed before expiry based on the PHC's burn rate.
       expected_burn_before_expiry = avg_daily_usage * days_to_expiry
       wastage_risk_qty = max(0, current_quantity - expected_burn_before_expiry)
    3. If wastage_risk_qty > 0, there is a verified hazard of medicine expiry wastage!
    4. Automatically scans for nearby high-volume PHCs or District Hospital (GH) that consume 
       this medicine at a significantly higher rate, and pairs them for an immediate 'Rescue Swap'.
    """
    from services.stock_service import calculate_burn_rate_and_trend
    from services.transfer_service import haversine_distance

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
        WHERE s.expiry_date IS NOT NULL AND s.quantity > 0
    """
    params = []
    if current_phc_id:
        query += " AND (s.phc_id = ? OR s.medicine_id IN (SELECT medicine_id FROM stock WHERE phc_id = ?))"
        params.extend([current_phc_id, current_phc_id])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    today = date.today()
    rescue_candidates = []

    for r in rows:
        exp_str = r['expiry_date']
        try:
            exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
        except ValueError:
            continue

        days_to_expiry = (exp_date - today).days
        if days_to_expiry < 0:
            # Already expired
            continue
        
        # We consider hazard if within 90 days
        if days_to_expiry > 90:
            continue

        phc_id = r['phc_id']
        med_id = r['medicine_id']
        qty = r['quantity']

        burn = calculate_burn_rate_and_trend(phc_id, med_id, qty)
        daily_usage = burn['avg_daily_usage']

        projected_consumption = math.ceil(daily_usage * days_to_expiry)
        wastage_risk_qty = max(0, qty - projected_consumption)

        # If there is real surplus that will expire without being used:
        if wastage_risk_qty > 0 or days_to_expiry <= 30:
            rescue_qty = wastage_risk_qty if wastage_risk_qty > 0 else max(1, math.ceil(qty * 0.5))
            
            # Find candidate rescue destinations (other PHCs with high consumption)
            cursor.execute("""
                SELECT p.id, p.name, p.latitude, p.longitude, s.quantity as target_stock
                FROM phc p
                JOIN stock s ON p.id = s.phc_id
                WHERE p.id != ? AND s.medicine_id = ?
            """, (phc_id, med_id))
            target_candidates = cursor.fetchall()

            best_target = None
            highest_daily_burn = -1.0

            for cand in target_candidates:
                cand_burn = calculate_burn_rate_and_trend(cand['id'], med_id, cand['target_stock'])
                cand_daily = cand_burn['avg_daily_usage']

                dist = haversine_distance(
                    r['phc_lat'], r['phc_lng'],
                    cand['latitude'], cand['longitude']
                )

                # Score: prefer higher burn rate and reasonable distance
                if cand_daily > daily_usage or best_target is None:
                    if cand_daily > highest_daily_burn:
                        highest_daily_burn = cand_daily
                        days_needed_at_target = math.ceil(rescue_qty / max(0.5, cand_daily))
                        best_target = {
                            "target_phc_id": cand['id'],
                            "target_phc_name": cand['name'],
                            "target_daily_burn": cand_daily,
                            "distance_km": dist,
                            "days_needed_at_target": days_needed_at_target
                        }

            unit_price = MEDICINE_UNIT_PRICES.get(med_id, 25.0)
            loss_prevented_rs = round(rescue_qty * unit_price, 2)
            
            batch_display = r['batch_no'] or f"TN-{r['medicine_name'][:4].upper()}-2026-B{r['stock_id']:02d}"

            urgency_tag = "CRITICAL_HAZARD" if days_to_expiry <= 30 else "ELEVATED_RISK"

            rescue_candidates.append({
                "stock_id": r['stock_id'],
                "source_phc_id": phc_id,
                "source_phc_name": r['phc_name'],
                "medicine_id": med_id,
                "medicine_name": r['medicine_name'],
                "medicine_unit": r['medicine_unit'],
                "medicine_category": r['medicine_category'],
                "current_stock": qty,
                "batch_no": batch_display,
                "expiry_date": exp_str,
                "days_to_expiry": days_to_expiry,
                "source_daily_burn": daily_usage,
                "projected_local_burn": projected_consumption,
                "wastage_risk_qty": wastage_risk_qty,
                "rescue_qty": rescue_qty,
                "loss_prevented_rs": loss_prevented_rs,
                "urgency_tag": urgency_tag,
                "target_phc": best_target,
                "is_source_current": (current_phc_id == phc_id if current_phc_id else False)
            })

    conn.close()

    # Sort by nearest expiry first, then largest wastage quantity
    rescue_candidates.sort(key=lambda x: (x['days_to_expiry'], -x['wastage_risk_qty']))
    return rescue_candidates

def execute_rescue_swap(source_phc_id, target_phc_id, medicine_id, quantity):
    """
    Executes an automated 'Near-Expiry Smart Rescue Swap' transfer:
    - Deducts quantity from source PHC (where it was at risk of expiry)
    - Adds quantity to target high-consumption PHC (where it will be used immediately)
    - Records transfer_request with dispatch_type='RESCUE_SWAP', status='approved'
    - Generates Waybill ID
    - Logs audit activity
    """
    from services.alert_service import evaluate_alerts_for_item
    import time

    conn = get_db()
    cursor = conn.cursor()

    # Verify source stock
    cursor.execute("""
        SELECT s.*, m.name as medicine_name, p1.name as source_name, p2.name as target_name
        FROM stock s
        JOIN medicine m ON s.medicine_id = m.id
        JOIN phc p1 ON s.phc_id = p1.id
        JOIN phc p2 ON p2.id = ?
        WHERE s.phc_id = ? AND s.medicine_id = ?
    """, (target_phc_id, source_phc_id, medicine_id))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise ValueError("Source stock or target health centre not found.")

    available_qty = row['quantity']
    if available_qty < quantity:
        quantity = available_qty

    if quantity <= 0:
        conn.close()
        raise ValueError("Cannot perform swap with 0 units.")

    med_name = row['medicine_name']
    source_name = row['source_name']
    target_name = row['target_name']
    batch_no = row['batch_no'] or f"TN-{med_name[:4].upper()}-2026-B{row['id']:02d}"
    waybill_no = f"TN-RESCUE-SWAP-2026-{int(time.time()) % 100000:05d}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        # Deduct from source
        cursor.execute("""
            UPDATE stock SET quantity = quantity - ?
            WHERE phc_id = ? AND medicine_id = ?
        """, (quantity, source_phc_id, medicine_id))

        # Add to target
        cursor.execute("SELECT id FROM stock WHERE phc_id = ? AND medicine_id = ?", (target_phc_id, medicine_id))
        target_exists = cursor.fetchone()

        if target_exists:
            cursor.execute("""
                UPDATE stock SET quantity = quantity + ?
                WHERE phc_id = ? AND medicine_id = ?
            """, (quantity, target_phc_id, medicine_id))
        else:
            cursor.execute("""
                INSERT INTO stock (phc_id, medicine_id, quantity, min_level, expiry_date, batch_no)
                VALUES (?, ?, ?, 15, ?, ?)
            """, (target_phc_id, medicine_id, quantity, row['expiry_date'], batch_no))

        # Record in transfer_request
        cursor.execute("""
            INSERT INTO transfer_request 
            (from_phc_id, to_phc_id, medicine_id, quantity, urgency, status, created_at, waybill_no, dispatch_type, batch_no)
            VALUES (?, ?, ?, ?, 'EMERGENCY', 'approved', ?, ?, 'RESCUE_SWAP', ?)
        """, (target_phc_id, source_phc_id, medicine_id, quantity, now_str, waybill_no, batch_no))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

    conn.close()

    # Re-evaluate alerts
    evaluate_alerts_for_item(source_phc_id, medicine_id)
    evaluate_alerts_for_item(target_phc_id, medicine_id)

    log_activity(
        "💡 Smart Expiry Rescue Swap",
        f"Saved {quantity} units of {med_name} from expiry wastage! Transferred from {source_name} to high-burn centre {target_name} (Waybill: {waybill_no})"
    )

    return {
        "success": True,
        "waybill_no": waybill_no,
        "batch_no": batch_no,
        "quantity": quantity,
        "source_name": source_name,
        "target_name": target_name,
        "medicine_name": med_name
    }
