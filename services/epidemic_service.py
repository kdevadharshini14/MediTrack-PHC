import math
from database import get_db
from services.stock_service import calculate_burn_rate_and_trend, get_quantity_status
from services.transfer_service import haversine_distance, find_nearest_donors

DISEASE_MAPPING = {
    "paracetamol": "Acute Viral Fever / Dengue Outbreak (வைரல் காய்ச்சல் / டெங்கு பரவல்)",
    "ors": "Acute Diarrheal Outbreak / Gastroenteritis (காலரா / நீரிழப்பு தொற்று)",
    "amoxicillin": "Seasonal Bacterial / Respiratory Cluster (சுவாசக் குழாய் தொற்று)",
    "azithromycin": "Acute Upper Respiratory Infection (சுவாசத் தொற்று)",
    "salbutamol": "Bronchial Asthma / Wheezing Flare (மூச்சுத்திணறல் பரவல்)",
    "cetirizine": "Seasonal Allergy / Rhinitis Surge (பருவகால அலர்ஜி)",
    "insulin": "Essential Chronic Care Shortage (நீரிழிவு மருந்து பற்றாக்குறை)",
    "metformin": "Chronic Glycemic Care Demand (சர்க்கரை நோய் மருந்து தேவை)"
}

def detect_epidemic_outbreaks():
    """
    Scans all PHCs in the block for simultaneous rapid consumption surges.
    Detects disease outbreaks and epidemic clusters based on medicine depletion velocities.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            s.phc_id, p.name as phc_name, p.latitude, p.longitude, p.location,
            s.medicine_id, m.name as medicine_name, m.unit as medicine_unit, m.category,
            s.quantity, s.min_level
        FROM stock s
        JOIN phc p ON s.phc_id = p.id
        JOIN medicine m ON s.medicine_id = m.id
        ORDER BY m.name ASC, p.name ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    # Track surges by medicine_id
    surges_by_med = {}

    for r in rows:
        burn = calculate_burn_rate_and_trend(r['phc_id'], r['medicine_id'], r['quantity'])
        
        # Consider a surge if trend is UP (Burning faster) or days_left < 4 with high daily usage
        is_surging = (burn['trend'] == 'UP') or (burn['days_left'] < 4 and burn['avg_daily_usage'] >= 8)

        if is_surging:
            med_id = r['medicine_id']
            if med_id not in surges_by_med:
                surges_by_med[med_id] = {
                    "medicine_id": med_id,
                    "medicine_name": r['medicine_name'],
                    "medicine_unit": r['medicine_unit'],
                    "category": r['category'],
                    "affected_phcs": []
                }
            surges_by_med[med_id]["affected_phcs"].append({
                "phc_id": r['phc_id'],
                "phc_name": r['phc_name'],
                "location": r['location'],
                "latitude": r['latitude'],
                "longitude": r['longitude'],
                "quantity": r['quantity'],
                "burn_rate": burn['avg_daily_usage'],
                "days_left": burn['days_left_display'],
                "trend_pct": burn['trend_pct']
            })

    clusters = []

    for med_id, data in surges_by_med.items():
        affected = data["affected_phcs"]
        med_lower = data["medicine_name"].lower()
        
        disease_title = "High-Velocity Infection Cluster (அதிவேக தொற்று பரவல்)"
        for keyword, title in DISEASE_MAPPING.items():
            if keyword in med_lower:
                disease_title = title
                break

        # Severity assessment
        if len(affected) >= 2 or any(p['burn_rate'] >= 25 for p in affected):
            severity = "CRITICAL_OUTBREAK"
            severity_label = "🚨 ACTIVE OUTBREAK CLUSTER DETECTED"
        else:
            severity = "LOCAL_SPIKE"
            severity_label = "⚠️ LOCALIZED VELOCITY SPIKE"

        clusters.append({
            "medicine_id": med_id,
            "medicine_name": data["medicine_name"],
            "medicine_unit": data["medicine_unit"],
            "disease_name": disease_title,
            "severity": severity,
            "severity_label": severity_label,
            "affected_count": len(affected),
            "affected_phcs": affected,
            "advisory": (
                f"Cluster detected across {len(affected)} health centres. "
                f"Recommend immediate sideways lateral transfer and alert Block Medical Officer."
            )
        })

    # Sort by severity and number of affected centres
    clusters.sort(key=lambda c: (0 if c['severity'] == 'CRITICAL_OUTBREAK' else 1, -c['affected_count']))
    return clusters

def citizen_check_stock(medicine_id, phc_id=None):
    """
    Public Citizen Stock Checker:
    Allows citizens and mothers to verify medicine availability at their nearest PHC.
    If unavailable, automatically finds nearest sister PHCs with stock and distance!
    """
    conn = get_db()
    cursor = conn.cursor()

    # Get medicine info
    cursor.execute("SELECT id, name, unit, category FROM medicine WHERE id = ?", (medicine_id,))
    med = cursor.fetchone()
    if not med:
        conn.close()
        return None

    results = []

    if phc_id:
        cursor.execute("""
            SELECT 
                p.id as phc_id, p.name as phc_name, p.location, p.latitude, p.longitude, p.contact_email,
                s.quantity, s.min_level
            FROM phc p
            LEFT JOIN stock s ON p.id = s.phc_id AND s.medicine_id = ?
            WHERE p.id = ?
        """, (medicine_id, phc_id))
    else:
        cursor.execute("""
            SELECT 
                p.id as phc_id, p.name as phc_name, p.location, p.latitude, p.longitude, p.contact_email,
                s.quantity, s.min_level
            FROM phc p
            LEFT JOIN stock s ON p.id = s.phc_id AND s.medicine_id = ?
            ORDER BY p.name ASC
        """, (medicine_id,))

    phc_rows = cursor.fetchall()
    conn.close()

    for row in phc_rows:
        qty = row['quantity'] if row['quantity'] is not None else 0
        min_lvl = row['min_level'] if row['min_level'] is not None else 20
        
        if qty >= min_lvl:
            status = "AVAILABLE"
            status_badge = "🟢 In Stock & Ready to Dispense"
            status_class = "badge-green"
            alternatives = []
        elif qty > 0:
            status = "LOW_STOCK"
            status_badge = "🟡 Limited Supply"
            status_class = "badge-yellow"
            alternatives = find_nearest_donors(row['phc_id'], medicine_id)[:2]
        else:
            status = "OUT_OF_STOCK"
            status_badge = "🔴 Currently Out of Stock"
            status_class = "badge-red"
            # Crucial: Find nearest sister centre with surplus
            alternatives = find_nearest_donors(row['phc_id'], medicine_id)[:2]

        results.append({
            "phc_id": row['phc_id'],
            "phc_name": row['phc_name'],
            "location": row['location'],
            "contact_email": row['contact_email'],
            "quantity": qty,
            "status": status,
            "status_badge": status_badge,
            "status_class": status_class,
            "alternatives": alternatives
        })

    return {
        "medicine_id": med['id'],
        "medicine_name": med['name'],
        "medicine_unit": med['unit'],
        "category": med['category'],
        "centres": results
    }
