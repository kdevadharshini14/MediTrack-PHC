import math
from datetime import datetime
from database import get_db, log_activity

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees) using Haversine formula.
    """
    R = 6371.0  # Earth's radius in kilometers

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = R * c
    return round(distance, 1)

def is_phc_surplus(quantity, min_level, days_left):
    """
    A PHC is SURPLUS for a medicine when days_left > 30 AND quantity > 3x min_level.
    """
    return (days_left > 30 and quantity > 3 * min_level)

def find_nearest_donors(requester_phc_id, medicine_id):
    """
    Find surplus PHCs for a medicine, sorted by nearest distance.
    Donor can give = min(surplus above 2x min_level, quantity needed for 30 days of requester's usage).
    Donor may NEVER go below 2x min_level.
    """
    from services.stock_service import calculate_burn_rate_and_trend

    conn = get_db()
    cursor = conn.cursor()

    # Get requester coordinates and current stock
    cursor.execute("SELECT id, name, latitude, longitude FROM phc WHERE id = ?", (requester_phc_id,))
    req_phc = cursor.fetchone()
    if not req_phc:
        conn.close()
        return []

    cursor.execute("""
        SELECT quantity, min_level FROM stock 
        WHERE phc_id = ? AND medicine_id = ?
    """, (requester_phc_id, medicine_id))
    req_stock = cursor.fetchone()
    req_qty = req_stock['quantity'] if req_stock else 0
    req_min = req_stock['min_level'] if req_stock else 10

    # Calculate requester 30-day need
    req_burn = calculate_burn_rate_and_trend(requester_phc_id, medicine_id, req_qty)
    req_daily_usage = req_burn['avg_daily_usage']
    
    # 30-day target buffer
    target_30_day = max(math.ceil(30.0 * req_daily_usage), 2 * req_min)
    needed_qty = max(1, target_30_day - req_qty)

    # Find potential donor PHCs (other than requester) with stock for this medicine
    cursor.execute("""
        SELECT 
            p.id as phc_id,
            p.name as phc_name,
            p.location as phc_location,
            p.latitude,
            p.longitude,
            p.contact_email,
            s.quantity,
            s.min_level
        FROM phc p
        JOIN stock s ON p.id = s.phc_id
        WHERE p.id != ? AND s.medicine_id = ?
    """, (requester_phc_id, medicine_id))
    candidate_rows = cursor.fetchall()
    conn.close()

    donors = []
    for cand in candidate_rows:
        cand_qty = cand['quantity']
        cand_min = cand['min_level']

        cand_burn = calculate_burn_rate_and_trend(cand['phc_id'], medicine_id, cand_qty)
        cand_days_left = cand_burn['days_left']

        # Check surplus rule: days_left > 30 AND quantity > 3x min_level
        if is_phc_surplus(cand_qty, cand_min, cand_days_left):
            # Safe floor for donor is 2x min_level
            safe_floor = 2 * cand_min
            surplus_above_floor = max(0, cand_qty - safe_floor)

            if surplus_above_floor > 0:
                can_give = min(surplus_above_floor, needed_qty)
                dist = haversine_distance(
                    req_phc['latitude'], req_phc['longitude'],
                    cand['latitude'], cand['longitude']
                )

                donors.append({
                    "phc_id": cand['phc_id'],
                    "phc_name": cand['phc_name'],
                    "phc_location": cand['phc_location'],
                    "distance_km": dist,
                    "quantity": cand_qty,
                    "min_level": cand_min,
                    "safe_floor": safe_floor,
                    "surplus_available": surplus_above_floor,
                    "can_give": can_give,
                    "days_left": cand_days_left,
                    "contact_email": cand['contact_email']
                })

    # Sort donors by nearest distance
    donors.sort(key=lambda d: d['distance_km'])
    return donors

def search_surplus_stock_across_block(current_phc_id, medicine_id):
    """
    Search other PHCs that currently hold surplus for a specified medicine.
    Returns surplus donors with distance from current_phc_id.
    """
    return find_nearest_donors(current_phc_id, medicine_id)

def create_transfer_request(from_phc_id, to_phc_id, medicine_id, quantity, urgency=None):
    """
    Create a new transfer request from requester (from_phc_id) to donor (to_phc_id).
    If urgency not provided, auto-detects from active alert: CRITICAL -> EMERGENCY.
    """
    conn = get_db()
    cursor = conn.cursor()

    if not urgency:
        cursor.execute("""
            SELECT level FROM alert 
            WHERE phc_id = ? AND medicine_id = ? AND status = 'active'
        """, (from_phc_id, medicine_id))
        alert_row = cursor.fetchone()
        urgency = "EMERGENCY" if (alert_row and alert_row['level'] == 'CRITICAL') else "NORMAL"

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO transfer_request (from_phc_id, to_phc_id, medicine_id, quantity, urgency, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
    """, (from_phc_id, to_phc_id, medicine_id, quantity, urgency, now_str))
    req_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT name FROM phc WHERE id = ?", (from_phc_id,))
    from_name = cursor.fetchone()['name']
    cursor.execute("SELECT name FROM phc WHERE id = ?", (to_phc_id,))
    to_name = cursor.fetchone()['name']
    cursor.execute("SELECT name FROM medicine WHERE id = ?", (medicine_id,))
    med_name = cursor.fetchone()['name']

    conn.close()

    log_activity(
        "Transfer Requested",
        f"[{urgency}] {from_name} requested {quantity} units of {med_name} from {to_name}"
    )

    return req_id

def approve_transfer_request(request_id):
    """
    Approve transfer request:
    - Deduct from donor (ensuring donor never goes below 2x min_level)
    - Add to requester
    - Re-evaluate alerts for both PHCs
    - Log activity
    """
    from services.alert_service import evaluate_alerts_for_item

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.*, m.name as medicine_name, p_from.name as requester_name, p_to.name as donor_name
        FROM transfer_request r
        JOIN medicine m ON r.medicine_id = m.id
        JOIN phc p_from ON r.from_phc_id = p_from.id
        JOIN phc p_to ON r.to_phc_id = p_to.id
        WHERE r.id = ?
    """, (request_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        raise ValueError("Transfer request not found.")

    if req['status'] != 'pending':
        conn.close()
        raise ValueError(f"Request is already {req['status']}.")

    donor_phc_id = req['to_phc_id']
    requester_phc_id = req['from_phc_id']
    med_id = req['medicine_id']
    requested_qty = req['quantity']

    # Check donor current stock and min_level
    cursor.execute("""
        SELECT quantity, min_level FROM stock 
        WHERE phc_id = ? AND medicine_id = ?
    """, (donor_phc_id, med_id))
    donor_stock = cursor.fetchone()

    if not donor_stock:
        conn.close()
        raise ValueError("Donor PHC does not hold this medicine in inventory.")

    donor_qty = donor_stock['quantity']
    donor_min = donor_stock['min_level']
    donor_safe_floor = 2 * donor_min
    max_transferable = max(0, donor_qty - donor_safe_floor)

    if max_transferable <= 0:
        conn.close()
        raise ValueError(
            f"Cannot transfer: Donor stock ({donor_qty}) is already at or below safe buffer ({donor_safe_floor})."
        )

    actual_qty = min(requested_qty, max_transferable)

    try:
        # Deduct from donor
        cursor.execute("""
            UPDATE stock 
            SET quantity = quantity - ? 
            WHERE phc_id = ? AND medicine_id = ?
        """, (actual_qty, donor_phc_id, med_id))

        # Add to requester
        cursor.execute("""
            SELECT id FROM stock WHERE phc_id = ? AND medicine_id = ?
        """, (requester_phc_id, med_id))
        has_req_stock = cursor.fetchone()

        if has_req_stock:
            cursor.execute("""
                UPDATE stock 
                SET quantity = quantity + ? 
                WHERE phc_id = ? AND medicine_id = ?
            """, (actual_qty, requester_phc_id, med_id))
        else:
            cursor.execute("""
                INSERT INTO stock (phc_id, medicine_id, quantity, min_level)
                VALUES (?, ?, ?, ?)
            """, (requester_phc_id, med_id, actual_qty, 10))

        cursor.execute("""
            UPDATE transfer_request 
            SET status = 'approved', quantity = ?
            WHERE id = ?
        """, (actual_qty, request_id))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

    conn.close()

    # Re-evaluate alerts for both parties
    evaluate_alerts_for_item(donor_phc_id, med_id)
    evaluate_alerts_for_item(requester_phc_id, med_id)

    log_activity(
        "Transfer Approved",
        f"Transferred {actual_qty} units of {req['medicine_name']} from {req['donor_name']} to {req['requester_name']}"
    )

    return True

def reject_transfer_request(request_id):
    """
    Reject a pending transfer request.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.*, m.name as medicine_name, p_from.name as requester_name, p_to.name as donor_name
        FROM transfer_request r
        JOIN medicine m ON r.medicine_id = m.id
        JOIN phc p_from ON r.from_phc_id = p_from.id
        JOIN phc p_to ON r.to_phc_id = p_to.id
        WHERE r.id = ?
    """, (request_id,))
    req = cursor.fetchone()

    if not req:
        conn.close()
        raise ValueError("Transfer request not found.")

    if req['status'] != 'pending':
        conn.close()
        raise ValueError(f"Request is already {req['status']}.")

    cursor.execute("UPDATE transfer_request SET status = 'rejected' WHERE id = ?", (request_id,))
    conn.commit()
    conn.close()

    log_activity(
        "Transfer Rejected",
        f"{req['donor_name']} rejected request of {req['quantity']} units of {req['medicine_name']} from {req['requester_name']}"
    )

    return True

def get_transfer_requests(status=None, phc_id=None, incoming_to_phc_id=None, outgoing_from_phc_id=None):
    """
    List transfer requests:
    - incoming_to_phc_id: requests where this PHC is donor (needs approval/rejection)
    - outgoing_from_phc_id: requests where this PHC is requester (tracking status)
    """
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT 
            r.id,
            r.from_phc_id,
            p_from.name as requester_name,
            p_from.location as requester_location,
            r.to_phc_id,
            p_to.name as donor_name,
            p_to.location as donor_location,
            r.medicine_id,
            m.name as medicine_name,
            m.unit as medicine_unit,
            r.quantity,
            r.urgency,
            r.status,
            r.created_at
        FROM transfer_request r
        JOIN phc p_from ON r.from_phc_id = p_from.id
        JOIN phc p_to ON r.to_phc_id = p_to.id
        JOIN medicine m ON r.medicine_id = m.id
        WHERE 1=1
    """
    params = []
    if status:
        query += " AND r.status = ?"
        params.append(status)

    if incoming_to_phc_id:
        query += " AND r.to_phc_id = ?"
        params.append(incoming_to_phc_id)
    elif outgoing_from_phc_id:
        query += " AND r.from_phc_id = ?"
        params.append(outgoing_from_phc_id)
    elif phc_id:
        query += " AND (r.from_phc_id = ? OR r.to_phc_id = ?)"
        params.extend([phc_id, phc_id])

    query += """
        ORDER BY 
            CASE WHEN r.status = 'pending' THEN 1 ELSE 2 END,
            CASE WHEN r.urgency = 'EMERGENCY' THEN 1 ELSE 2 END,
            r.created_at DESC
    """

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_block_rebalance_overview():
    """
    Computes:
    - Count of PHCs currently facing shortage
    - Count of PHCs with surplus
    - Top 5 suggested peer rebalancing pairs (Shortage -> Surplus)
    """
    from services.stock_service import get_stock

    all_stock = get_stock()

    shortage_phcs = set()
    surplus_phcs = set()
    rebalance_pairs = []

    for item in all_stock:
        if item['qty_status'] == 'RED' or item['days_left_status'] in ('RED', 'YELLOW'):
            shortage_phcs.add(item['phc_id'])

        if item['days_left'] > 30 and item['quantity'] > 3 * item['min_level']:
            surplus_phcs.add(item['phc_id'])

    shortage_items = [
        item for item in all_stock 
        if item['days_left_status'] == 'RED' or item['qty_status'] == 'RED'
    ]

    for s_item in shortage_items:
        donors = find_nearest_donors(s_item['phc_id'], s_item['medicine_id'])
        if donors:
            top_donor = donors[0]
            rebalance_pairs.append({
                "medicine_id": s_item['medicine_id'],
                "medicine_name": s_item['medicine_name'],
                "medicine_unit": s_item['medicine_unit'],
                "requester_id": s_item['phc_id'],
                "requester_name": s_item['phc_name'],
                "requester_stock": s_item['quantity'],
                "requester_days_left": s_item['days_left_display'],
                "donor_id": top_donor['phc_id'],
                "donor_name": top_donor['phc_name'],
                "donor_stock": top_donor['quantity'],
                "distance_km": top_donor['distance_km'],
                "suggested_qty": top_donor['can_give'],
                "urgency": "EMERGENCY" if s_item['days_left'] < 3 or s_item['qty_status'] == 'RED' else "NORMAL"
            })

    rebalance_pairs.sort(key=lambda x: (0 if x['urgency'] == 'EMERGENCY' else 1, x['distance_km']))

    return {
        "shortage_count": len(shortage_phcs),
        "surplus_count": len(surplus_phcs),
        "top_pairs": rebalance_pairs[:5]
    }

def generate_district_indent(phc_id=None):
    """
    Auto-generated district indent:
    Lists items still in shortage after accounting for what nearby peer donors can supply.
    """
    from services.stock_service import get_stock

    stock_list = get_stock(phc_id=phc_id)
    indent_items = []

    for item in stock_list:
        is_shortage = (item['qty_status'] in ('RED', 'YELLOW') or item['days_left'] < 30)
        if not is_shortage:
            continue

        target_30_day = max(math.ceil(30.0 * item['avg_daily_usage']), 2 * item['min_level'])
        needed = max(0, target_30_day - item['quantity'])

        if needed <= 0:
            continue

        donors = find_nearest_donors(item['phc_id'], item['medicine_id'])
        peer_available = sum(d['can_give'] for d in donors)
        net_district_qty = max(0, needed - peer_available)

        if needed > 0:
            indent_items.append({
                "phc_id": item['phc_id'],
                "phc_name": item['phc_name'],
                "medicine_id": item['medicine_id'],
                "medicine_name": item['medicine_name'],
                "medicine_unit": item['medicine_unit'],
                "category": item['medicine_category'],
                "current_stock": item['quantity'],
                "min_level": item['min_level'],
                "avg_daily_usage": item['avg_daily_usage'],
                "days_left": item['days_left_display'],
                "target_30_day": target_30_day,
                "gross_needed": needed,
                "peer_covered": peer_available,
                "net_district_indent": net_district_qty,
                "suggested_top_donor": donors[0]['phc_name'] if donors else "None"
            })

    indent_items.sort(key=lambda x: x['net_district_indent'], reverse=True)
    return indent_items
