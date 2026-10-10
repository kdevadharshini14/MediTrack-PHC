import random
from datetime import date, timedelta
from database import init_db, get_db, log_activity
from services.alert_service import evaluate_all_alerts

def seed_database(force=False):
    """
    Seeds the database with Namakkal district PHCs (with login credentials),
    12 medicines, 30 days of realistic daily usage, stock levels, and initial evaluated alerts.
    """
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    # Check if already seeded with credentials
    cursor.execute("SELECT COUNT(*) as count FROM phc")
    if cursor.fetchone()['count'] > 0 and not force:
        conn.close()
        return False

    # Clear existing if force
    if force:
        cursor.execute("DELETE FROM transfer_request")
        cursor.execute("DELETE FROM alert")
        cursor.execute("DELETE FROM usage_log")
        cursor.execute("DELETE FROM stock")
        cursor.execute("DELETE FROM medicine")
        cursor.execute("DELETE FROM phc")
        cursor.execute("DELETE FROM activity_log")
        conn.commit()

    today = date.today()

    # 1. PHCs in Namakkal District, Tamil Nadu with credentials
    phcs = [
        (1, "Komarapalayam PHC", "Komarapalayam, Namakkal", 11.4443, 77.7011, "komarapalayam.phc@tnhealth.gov.in", "komarapalayam", "phc123"),
        (2, "Pallipalayam PHC", "Pallipalayam, Namakkal", 11.3606, 77.7423, "pallipalayam.phc@tnhealth.gov.in", "pallipalayam", "phc123"),
        (3, "Tiruchengode PHC", "Tiruchengode, Namakkal", 11.3789, 77.8964, "tiruchengode.phc@tnhealth.gov.in", "tiruchengode", "phc123"),
        (4, "Namakkal Town PHC", "Namakkal, Namakkal", 11.2189, 78.1674, "namakkal.phc@tnhealth.gov.in", "namakkal", "phc123"),
        (5, "Rasipuram PHC", "Rasipuram, Namakkal", 11.4646, 78.1772, "rasipuram.phc@tnhealth.gov.in", "rasipuram", "phc123"),
        (6, "Paramathi Velur PHC", "Paramathi Velur, Namakkal", 11.0469, 78.0163, "pvelur.phc@tnhealth.gov.in", "pvelur", "phc123")
    ]
    cursor.executemany("""
        INSERT INTO phc (id, name, location, latitude, longitude, contact_email, username, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, phcs)

    # 2. 12 Essential PHC Medicines
    medicines = [
        (1, "Paracetamol syrup", "100ml Bottle", "Pediatrics"),
        (2, "Amoxicillin", "500mg Strip", "Antibiotic"),
        (3, "ORS", "Sachet", "Rehydration"),
        (4, "Metformin", "500mg Strip", "Antidiabetic"),
        (5, "Amlodipine", "5mg Strip", "Cardiovascular"),
        (6, "Cetirizine", "10mg Strip", "Antihistamine"),
        (7, "Insulin", "10ml Vial", "Antidiabetic"),
        (8, "Atenolol", "50mg Strip", "Cardiovascular"),
        (9, "Omeprazole", "20mg Strip", "Gastrointestinal"),
        (10, "Vitamin B12", "Strip", "Supplement"),
        (11, "Azithromycin", "500mg Strip", "Antibiotic"),
        (12, "Salbutamol", "Inhaler", "Respiratory")
    ]
    cursor.executemany("""
        INSERT INTO medicine (id, name, unit, category)
        VALUES (?, ?, ?, ?)
    """, medicines)

    # 3. 30 Days of realistic usage logs
    random.seed(42)

    usage_entries = []

    for day_offset in range(29, -1, -1):
        log_date = (today - timedelta(days=day_offset)).isoformat()

        for phc_id in range(1, 7):
            for med_id in range(1, 13):
                # Custom scenario logic:
                if phc_id == 1 and med_id == 1:
                    # Komarapalayam - Paracetamol syrup:
                    # Outbreak! Rising sharply in last 3 days
                    if day_offset == 0:     # Today
                        qty = 38
                    elif day_offset == 1:   # Yesterday
                        qty = 34
                    elif day_offset == 2:   # 2 days ago
                        qty = 28
                    elif day_offset in (3, 4, 5, 6): # Days 3 to 6 ago
                        qty = 15 + (6 - day_offset) * 2
                    else:
                        qty = 10 + (day_offset % 3)
                elif phc_id == 2 and med_id == 1:
                    # Pallipalayam - Paracetamol syrup (Surplus Donor)
                    qty = 3 + (day_offset % 2)
                elif phc_id == 3 and med_id == 1:
                    # Tiruchengode - Paracetamol syrup (Surplus Donor)
                    qty = 4 + (day_offset % 3)
                elif phc_id == 5 and med_id == 3:
                    # Rasipuram - ORS (Shortage)
                    qty = 25 + (day_offset % 5)
                elif phc_id == 4 and med_id == 4:
                    # Namakkal - Metformin
                    qty = 24 + (day_offset % 4)
                elif phc_id == 6 and med_id == 4:
                    # Paramathi Velur - Metformin
                    qty = 4 + (day_offset % 2)
                else:
                    base = 6
                    if med_id in (1, 2, 3):
                        base = 12
                    elif med_id in (4, 5, 8):
                        base = 10
                    elif med_id in (7, 12):
                        base = 3
                    variance = random.randint(-2, 3)
                    qty = max(1, base + variance)

                usage_entries.append((phc_id, med_id, qty, log_date))

    cursor.executemany("""
        INSERT INTO usage_log (phc_id, medicine_id, quantity, date)
        VALUES (?, ?, ?, ?)
    """, usage_entries)

    # 4. Stock table setup
    standard_exp = (today + timedelta(days=365)).isoformat()
    near_exp = (today + timedelta(days=18)).isoformat()  # Expiring in 18 days!

    stock_entries = []

    for phc_id in range(1, 7):
        for med_id in range(1, 13):
            min_level = 30
            quantity = 150
            expiry = standard_exp

            if phc_id == 1 and med_id == 1:
                # Komarapalayam - Paracetamol syrup: CRITICAL SHORTAGE & FAST BURN
                min_level = 50
                quantity = 48  # Below min level, ~2 days left with ~23/day avg!
                expiry = standard_exp
            elif phc_id == 2 and med_id == 1:
                # Pallipalayam - Paracetamol syrup: SURPLUS DONOR (~10.3 km away)
                min_level = 40
                quantity = 420 # Surplus! Safe buffer = 80, can give up to 340
                expiry = standard_exp
            elif phc_id == 3 and med_id == 1:
                # Tiruchengode - Paracetamol syrup: SURPLUS DONOR (~22.5 km away)
                min_level = 50
                quantity = 380 # Surplus!
                expiry = standard_exp
            elif phc_id == 5 and med_id == 1:
                # Rasipuram - Paracetamol syrup: SURPLUS DONOR (~52 km away)
                min_level = 30
                quantity = 310
                expiry = standard_exp
            elif phc_id == 3 and med_id == 2:
                min_level = 50
                quantity = 65
                expiry = standard_exp
            elif phc_id == 5 and med_id == 3:
                min_level = 80
                quantity = 70
                expiry = standard_exp
            elif phc_id == 4 and med_id == 3:
                min_level = 60
                quantity = 550
                expiry = standard_exp
            elif phc_id == 6 and med_id == 4:
                min_level = 40
                quantity = 280
                expiry = near_exp
            elif phc_id == 6 and med_id == 12:
                min_level = 25
                quantity = 18
                expiry = standard_exp
            elif phc_id == 2 and med_id == 7:
                min_level = 20
                quantity = 26
                expiry = standard_exp
            else:
                min_level = random.choice([25, 30, 40, 50])
                quantity = min_level * 3 + random.randint(20, 80)

            stock_entries.append((phc_id, med_id, quantity, min_level, expiry))

    cursor.executemany("""
        INSERT INTO stock (phc_id, medicine_id, quantity, min_level, expiry_date)
        VALUES (?, ?, ?, ?, ?)
    """, stock_entries)

    conn.commit()
    conn.close()

    log_activity("System Initialized", "Database seeded with Namakkal district PHC logins, medicines, and initial baseline.")
    evaluate_all_alerts()

    return True

if __name__ == "__main__":
    seed_database(force=True)
    print("Database seeded successfully with PHC authentication credentials.")
