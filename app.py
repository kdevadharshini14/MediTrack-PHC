import os
import io
import csv
from functools import wraps
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, Response, redirect, url_for, session
from dotenv import load_dotenv

from database import init_db, get_db, log_activity
from seed_data import seed_database
from services.stock_service import (
    get_stock,
    update_or_create_stock,
    record_usage
)
from services.alert_service import (
    get_alerts,
    get_active_alert_count,
    evaluate_all_alerts,
    evaluate_alerts_for_item
)
from services.transfer_service import (
    find_nearest_donors,
    search_surplus_stock_across_block,
    create_transfer_request,
    approve_transfer_request,
    reject_transfer_request,
    get_transfer_requests,
    get_block_rebalance_overview,
    generate_district_indent
)
from services.forecast_service import (
    get_medicine_forecast,
    get_consumption_analytics
)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "meditrack-phc-secret-key-2026")

# Auto-initialize and seed DB on start if needed
init_db()
seed_database(force=False)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'phc_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.context_processor
def inject_current_phc():
    """Inject logged-in hospital details into all Jinja templates."""
    if 'phc_id' in session:
        return {
            'current_phc': {
                'id': session['phc_id'],
                'name': session.get('phc_name', ''),
                'location': session.get('phc_location', ''),
                'username': session.get('phc_username', '')
            }
        }
    return {'current_phc': None}

# ==========================================
# AUTHENTICATION ROUTES
# ==========================================

@app.route("/login", methods=["GET", "POST"])
def login():
    # Handle quick demo login via query param: e.g. /login?quick=komarapalayam
    quick = request.args.get("quick")
    if quick:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, location, username FROM phc WHERE username = ?", (quick,))
        phc = cursor.fetchone()
        conn.close()
        if phc:
            session['phc_id'] = phc['id']
            session['phc_name'] = phc['name']
            session['phc_location'] = phc['location']
            session['phc_username'] = phc['username']
            log_activity("Hospital Logged In", f"Staff signed in to {phc['name']}")
            return redirect(url_for('dashboard'))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, location, username FROM phc ORDER BY name ASC")
    phc_list = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, location, username, password FROM phc WHERE username = ?", (username,))
        phc = cursor.fetchone()
        conn.close()

        if phc and phc['password'] == password:
            session['phc_id'] = phc['id']
            session['phc_name'] = phc['name']
            session['phc_location'] = phc['location']
            session['phc_username'] = phc['username']
            log_activity("Hospital Logged In", f"Staff signed in to {phc['name']}")
            return redirect(url_for('dashboard'))
        else:
            return render_template("login.html", phcs=phc_list, error="Invalid username or password. (Demo password is phc123)")

    return render_template("login.html", phcs=phc_list)

@app.route("/register", methods=["GET", "POST"])
def register():
    """Register a new Primary Health Centre."""
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        location = request.form.get("location", "").strip()
        lat_val = request.form.get("latitude", "11.2189")
        lng_val = request.form.get("longitude", "78.1674")
        email = request.form.get("contact_email", "").strip()
        username = request.form.get("username", "").strip().lower()
        password = request.form.get("password", "").strip()

        if not name or not location or not username or not password:
            return render_template("register.html", error="All essential fields are required.")

        try:
            lat = float(lat_val)
            lng = float(lng_val)
        except ValueError:
            lat = 11.2189
            lng = 78.1674

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM phc WHERE username = ?", (username,))
        existing = cursor.fetchone()

        if existing:
            conn.close()
            return render_template("register.html", error="Username already exists. Please choose a different username.")

        try:
            cursor.execute("""
                INSERT INTO phc (name, location, latitude, longitude, contact_email, username, password)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, location, lat, lng, email, username, password))
            phc_id = cursor.lastrowid
            conn.commit()
            conn.close()

            log_activity("New PHC Registered", f"New health centre registered: {name} ({username})")

            # Sign in automatically
            session['phc_id'] = phc_id
            session['phc_name'] = name
            session['phc_location'] = location
            session['phc_username'] = username

            return redirect(url_for('dashboard'))
        except Exception as e:
            conn.close()
            return render_template("register.html", error=f"Registration failed: {str(e)}")

    return render_template("register.html")

@app.route("/logout")
def logout():
    phc_name = session.get('phc_name', 'Hospital')
    log_activity("Hospital Logged Out", f"Staff signed out from {phc_name}")
    session.clear()
    return redirect(url_for('login'))

# ==========================================
# PAGE ROUTES (PROTECTED TO LOGGED-IN PHC)
# ==========================================

@app.route("/")
@login_required
def dashboard():
    return render_template("dashboard.html")

@app.route("/stock")
@login_required
def stock_page():
    return render_template("stock.html")

@app.route("/usage")
@login_required
def usage_page():
    return render_template("usage.html")

@app.route("/analytics")
@login_required
def analytics_page():
    return render_template("analytics.html")

@app.route("/requests")
@login_required
def requests_page():
    return render_template("requests.html")

@app.route("/alerts")
@login_required
def alerts_page():
    return render_template("alerts.html")

@app.route("/activity")
@login_required
def activity_page():
    return render_template("activity.html")

# ==========================================
# API ENDPOINTS (SCOPED TO ACTIVE HOSPITAL)
# ==========================================

@app.route("/api/current_phc", methods=["GET"])
@login_required
def api_current_phc():
    """Returns the currently authenticated hospital profile."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, location, latitude, longitude, contact_email, username FROM phc WHERE id = ?", (session['phc_id'],))
    row = cursor.fetchone()
    conn.close()
    return jsonify({"success": True, "data": dict(row) if row else None})

@app.route("/api/phcs", methods=["GET"])
def api_get_phcs():
    """List all PHCs."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, location, latitude, longitude, contact_email, username FROM phc ORDER BY name ASC")
    phcs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "data": phcs})

@app.route("/api/medicines", methods=["GET", "POST"])
def api_get_or_create_medicines():
    """
    GET: List all medicines
    POST: Create a brand new medicine in master catalog
    """
    if request.method == "GET":
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, unit, category FROM medicine ORDER BY name ASC")
        meds = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "data": meds})

    # POST - Add new medicine
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    unit = data.get("unit", "").strip()
    category = data.get("category", "").strip()

    if not name or not unit or not category:
        return jsonify({"success": False, "error": "Medicine Name, Unit, and Category are required."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, unit, category FROM medicine WHERE LOWER(name) = LOWER(?)", (name,))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return jsonify({"success": True, "message": "Medicine already exists.", "data": dict(existing)})

    try:
        cursor.execute("INSERT INTO medicine (name, unit, category) VALUES (?, ?, ?)", (name, unit, category))
        med_id = cursor.lastrowid
        conn.commit()
        conn.close()

        log_activity("New Medicine Added", f"Registered new medicine: {name} ({unit}, {category})")
        return jsonify({
            "success": True, 
            "message": f"Medicine '{name}' created successfully in master catalog.",
            "data": {"id": med_id, "name": name, "unit": unit, "category": category}
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/stock", methods=["GET", "POST"])
@login_required
def api_stock():
    """
    GET: returns inventory for THIS hospital (session['phc_id']) by default.
    POST: updates/adds stock for THIS hospital (supports creating new medicine on the fly).
    """
    current_phc_id = session['phc_id']

    if request.method == "GET":
        # Scoped strictly to the logged-in hospital
        med_id = request.args.get("medicine_id", type=int)
        try:
            stocks = get_stock(phc_id=current_phc_id, medicine_id=med_id)
            return jsonify({"success": True, "data": stocks})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # POST - update or add stock for this hospital
    data = request.get_json() or {}
    try:
        phc_id = current_phc_id  # Enforce logged-in hospital ID

        if data.get("is_new_medicine"):
            med_name = data.get("new_name", "").strip()
            med_unit = data.get("new_unit", "").strip()
            med_category = data.get("new_category", "").strip()
            if not med_name or not med_unit or not med_category:
                return jsonify({"success": False, "error": "Name, Unit, and Category are required for new medicine."}), 400

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM medicine WHERE LOWER(name) = LOWER(?)", (med_name,))
            existing = cursor.fetchone()
            if existing:
                medicine_id = existing['id']
            else:
                cursor.execute("INSERT INTO medicine (name, unit, category) VALUES (?, ?, ?)", (med_name, med_unit, med_category))
                medicine_id = cursor.lastrowid
                conn.commit()
                log_activity("New Medicine Created", f"Registered: {med_name} ({med_unit}, {med_category})")
            conn.close()
        else:
            medicine_id = int(data.get("medicine_id"))

        quantity = int(data.get("quantity", 0))
        min_level = int(data.get("min_level", 10))
        expiry_date = data.get("expiry_date")

        if quantity < 0 or min_level < 0:
            return jsonify({"success": False, "error": "Quantities cannot be negative."}), 400

        update_or_create_stock(phc_id, medicine_id, quantity, min_level, expiry_date)
        return jsonify({"success": True, "message": "Hospital inventory updated successfully."})
    except (TypeError, ValueError) as ve:
        return jsonify({"success": False, "error": f"Invalid input values: {str(ve)}"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/usage", methods=["POST"])
@login_required
def api_record_usage():
    """
    Record daily multi-item usage and subtract stock atomically for THIS hospital.
    """
    current_phc_id = session['phc_id']
    data = request.get_json() or {}
    try:
        usage_date = data.get("date", date.today().isoformat())
        items = data.get("items", [])

        if not items:
            return jsonify({"success": False, "error": "At least one medicine item is required."}), 400

        record_usage(current_phc_id, usage_date, items)
        return jsonify({"success": True, "message": "Usage recorded and local stock deducted successfully."})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

@app.route("/api/alerts", methods=["GET"])
@login_required
def api_alerts():
    """
    Get active or resolved alerts for THIS hospital.
    """
    current_phc_id = session['phc_id']
    status = request.args.get("status", "active")
    try:
        alerts = get_alerts(status=status, phc_id=current_phc_id)
        return jsonify({"success": True, "data": alerts})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/alerts/count", methods=["GET"])
@login_required
def api_alerts_count():
    """
    Summary counts of active alerts for THIS hospital.
    """
    current_phc_id = session['phc_id']
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN level = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN level = 'WARNING' THEN 1 ELSE 0 END) as warning
            FROM alert
            WHERE status = 'active' AND phc_id = ?
        """, (current_phc_id,))
        row = cursor.fetchone()
        conn.close()

        counts = {
            "total": row['total'] or 0,
            "critical": row['critical'] or 0,
            "warning": row['warning'] or 0
        }
        return jsonify({"success": True, "data": counts})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/search_surplus", methods=["GET"])
@login_required
def api_search_surplus():
    """
    Crucial feature: Search other hospitals that hold surplus stock for a medicine.
    Returns nearest surplus donors with distance from THIS hospital.
    """
    current_phc_id = session['phc_id']
    med_id = request.args.get("medicine_id", type=int)

    if not med_id:
        return jsonify({"success": False, "error": "medicine_id parameter is required."}), 400

    try:
        donors = search_surplus_stock_across_block(current_phc_id, med_id)
        return jsonify({"success": True, "data": donors})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/donors", methods=["GET"])
@login_required
def api_donors():
    """Find nearest surplus donor PHCs for a given medicine."""
    current_phc_id = session['phc_id']
    med_id = request.args.get("medicine_id", type=int)

    if not med_id:
        return jsonify({"success": False, "error": "medicine_id parameter is required."}), 400

    try:
        donors = find_nearest_donors(current_phc_id, med_id)
        return jsonify({"success": True, "data": donors})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/requests", methods=["GET", "POST"])
@login_required
def api_requests():
    """
    GET:
      - type='incoming': requests sent by other hospitals asking THIS hospital for stock (to approve/reject)
      - type='outgoing': requests THIS hospital sent asking others for stock
      - default: all requests involving THIS hospital
    POST:
      - create a new transfer request from THIS hospital to a donor hospital
    """
    current_phc_id = session['phc_id']

    if request.method == "GET":
        req_type = request.args.get("type")
        status = request.args.get("status")

        try:
            if req_type == "incoming":
                reqs = get_transfer_requests(status=status, incoming_to_phc_id=current_phc_id)
            elif req_type == "outgoing":
                reqs = get_transfer_requests(status=status, outgoing_from_phc_id=current_phc_id)
            else:
                reqs = get_transfer_requests(status=status, phc_id=current_phc_id)

            return jsonify({"success": True, "data": reqs})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    # POST - Create request from this hospital
    data = request.get_json() or {}
    try:
        from_phc = current_phc_id  # Automatically requester
        to_phc = int(data.get("to_phc_id"))
        med_id = int(data.get("medicine_id"))
        quantity = int(data.get("quantity"))
        urgency = data.get("urgency")

        if from_phc == to_phc:
            return jsonify({"success": False, "error": "Requester and donor PHC cannot be identical."}), 400
        if quantity <= 0:
            return jsonify({"success": False, "error": "Requested quantity must be greater than zero."}), 400

        req_id = create_transfer_request(from_phc, to_phc, med_id, quantity, urgency=urgency)
        return jsonify({"success": True, "message": "Transfer request created and sent to donor PHC.", "request_id": req_id})
    except (TypeError, ValueError) as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/requests/<int:req_id>/approve", methods=["POST"])
@login_required
def api_approve_request(req_id):
    """
    Approve transfer request (only if this hospital is the donor).
    """
    try:
        approve_transfer_request(req_id)
        return jsonify({"success": True, "message": "Transfer approved and inventory transferred successfully."})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/requests/<int:req_id>/reject", methods=["POST"])
@login_required
def api_reject_request(req_id):
    """
    Reject transfer request.
    """
    try:
        reject_transfer_request(req_id)
        return jsonify({"success": True, "message": "Transfer request rejected."})
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/analytics", methods=["GET"])
@login_required
def api_analytics():
    """Consumption analytics for THIS hospital."""
    current_phc_id = session['phc_id']
    period = request.args.get("period", "weekly")
    try:
        data = get_consumption_analytics(period=period, phc_id=current_phc_id)
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/forecast", methods=["GET"])
@login_required
def api_forecast():
    """7-day moving-average forecast for a medicine at THIS hospital."""
    current_phc_id = session['phc_id']
    med_id = request.args.get("medicine_id", type=int)

    if not med_id:
        return jsonify({"success": False, "error": "medicine_id parameter is required."}), 400

    try:
        data = get_medicine_forecast(med_id, phc_id=current_phc_id)
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/indent", methods=["GET"])
@login_required
def api_indent():
    """Auto-generated district indent for THIS hospital."""
    current_phc_id = session['phc_id']
    try:
        items = generate_district_indent(phc_id=current_phc_id)
        return jsonify({"success": True, "data": items})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/activity", methods=["GET"])
@login_required
def api_activity():
    """List activity log entries."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, action, details, timestamp FROM activity_log ORDER BY id DESC LIMIT 100")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "data": logs})

# ==========================================
# CSV EXPORT ENDPOINTS
# ==========================================

@app.route("/api/export/<target>", methods=["GET"])
@login_required
def api_export_csv(target):
    """CSV export for current hospital."""
    current_phc_id = session['phc_id']
    output = io.StringIO()
    writer = csv.writer(output)

    if target == "stock":
        stocks = get_stock(phc_id=current_phc_id)
        writer.writerow([
            "PHC Name", "Medicine", "Category", "Unit", "Current Stock",
            "Min Safe Level", "Quantity Status", "7-Day Avg Daily Burn",
            "Days Left", "Burn Trend", "Expiry Date", "Near Expiry"
        ])
        for s in stocks:
            writer.writerow([
                s['phc_name'], s['medicine_name'], s['medicine_category'], s['medicine_unit'],
                s['quantity'], s['min_level'], s['qty_status'], s['avg_daily_usage'],
                s['days_left_display'], f"{s['trend_symbol']} {s['trend_label']} ({s['trend_pct']})",
                s['expiry_date'] or "N/A", "YES" if s['is_near_expiry'] else "NO"
            ])
        filename = f"stock_{session.get('phc_username')}_{date.today().isoformat()}.csv"

    elif target == "usage":
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.date, p.name as phc_name, m.name as medicine_name, m.unit, u.quantity
            FROM usage_log u
            JOIN phc p ON u.phc_id = p.id
            JOIN medicine m ON u.medicine_id = m.id
            WHERE u.phc_id = ?
            ORDER BY u.date DESC
        """, (current_phc_id,))
        rows = cursor.fetchall()
        conn.close()

        writer.writerow(["Date", "PHC Name", "Medicine Name", "Unit", "Quantity Consumed"])
        for r in rows:
            writer.writerow([r['date'], r['phc_name'], r['medicine_name'], r['unit'], r['quantity']])
        filename = f"usage_{session.get('phc_username')}_{date.today().isoformat()}.csv"

    elif target == "indent":
        indents = generate_district_indent(phc_id=current_phc_id)
        writer.writerow([
            "PHC Name", "Medicine", "Category", "Current Stock", "Min Level",
            "Avg Daily Burn", "Days Left", "30-Day Total Target", "Gross Shortage",
            "Peer Donors Can Cover", "Net Indent Needed from District"
        ])
        for item in indents:
            writer.writerow([
                item['phc_name'], item['medicine_name'], item['category'],
                item['current_stock'], item['min_level'], item['avg_daily_usage'],
                item['days_left'], item['target_30_day'], item['gross_needed'],
                item['peer_covered'], item['net_district_indent']
            ])
        filename = f"district_indent_{session.get('phc_username')}_{date.today().isoformat()}.csv"

    elif target == "activity":
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT timestamp, action, details FROM activity_log ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()

        writer.writerow(["Timestamp", "Action", "Details"])
        for r in rows:
            writer.writerow([r['timestamp'], r['action'], r['details']])
        filename = f"activity_log_{date.today().isoformat()}.csv"

    else:
        return jsonify({"success": False, "error": "Invalid export target."}), 400

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    print("=" * 60)
    print(" MediTrack PHC - Multi-Tenant Medicine Management Running")
    print(" Access Portal: http://127.0.0.1:5000/login")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
