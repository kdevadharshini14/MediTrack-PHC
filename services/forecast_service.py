from datetime import datetime, date, timedelta
from database import get_db

def get_medicine_forecast(medicine_id, phc_id=None):
    """
    Computes 7-day simple moving average forecast for a medicine.
    Returns:
    - past 14 days of actual daily usage
    - next 7 days projected usage based on 7-day moving average
    - summary metrics (average daily consumption, projected 7-day total)
    """
    conn = get_db()
    cursor = conn.cursor()

    today = date.today()
    start_history = today - timedelta(days=13)  # Past 14 days

    # Query daily historical usage
    query = """
        SELECT date, COALESCE(SUM(quantity), 0) as total_qty
        FROM usage_log
        WHERE medicine_id = ? AND date >= ? AND date <= ?
    """
    params = [medicine_id, start_history.isoformat(), today.isoformat()]

    if phc_id:
        query += " AND phc_id = ?"
        params.append(phc_id)

    query += " GROUP BY date ORDER BY date ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()

    history_dict = {r['date']: r['total_qty'] for r in rows}

    # Build dense 14-day history array
    history_labels = []
    history_values = []
    for i in range(14):
        curr_day = (start_history + timedelta(days=i)).isoformat()
        history_labels.append(curr_day)
        history_values.append(history_dict.get(curr_day, 0))

    # Calculate 7-day moving average from the most recent 7 historical days
    last_7_values = history_values[-7:] if len(history_values) >= 7 else history_values
    sma_7 = round(sum(last_7_values) / float(len(last_7_values)), 1) if last_7_values else 0

    # Project next 7 days
    forecast_labels = []
    forecast_values = []
    for i in range(1, 8):
        future_day = (today + timedelta(days=i)).isoformat()
        forecast_labels.append(future_day)
        # Using 7-day moving average projection
        forecast_values.append(sma_7)

    # Get medicine name and unit
    cursor.execute("SELECT name, unit, category FROM medicine WHERE id = ?", (medicine_id,))
    med_info = cursor.fetchone()
    conn.close()

    return {
        "medicine_id": medicine_id,
        "medicine_name": med_info['name'] if med_info else "Unknown",
        "medicine_unit": med_info['unit'] if med_info else "units",
        "category": med_info['category'] if med_info else "",
        "history_labels": history_labels,
        "history_values": history_values,
        "forecast_labels": forecast_labels,
        "forecast_values": forecast_values,
        "sma_daily_rate": sma_7,
        "projected_7_day_total": round(sma_7 * 7, 1)
    }

def get_consumption_analytics(period='weekly', phc_id=None):
    """
    Analytics data for bar charts:
    - Period: 'weekly' (last 7 days) or 'monthly' (last 30 days)
    - Highest-demand medicines
    - Filter by PHC or All PHCs
    - Includes quantity color status based on aggregate or selected PHC
    """
    conn = get_db()
    cursor = conn.cursor()

    today = date.today()
    days = 7 if period == 'weekly' else 30
    start_date = (today - timedelta(days=days - 1)).isoformat()

    query = """
        SELECT 
            m.id as medicine_id,
            m.name as medicine_name,
            m.unit as medicine_unit,
            m.category as medicine_category,
            COALESCE(SUM(u.quantity), 0) as total_consumed,
            COALESCE(SUM(s.quantity), 0) as total_stock,
            COALESCE(SUM(s.min_level), 0) as total_min_level
        FROM medicine m
        LEFT JOIN usage_log u ON m.id = u.medicine_id 
            AND u.date >= ? AND u.date <= ?
            {phc_usage_filter}
        LEFT JOIN stock s ON m.id = s.medicine_id
            {phc_stock_filter}
        GROUP BY m.id, m.name, m.unit, m.category
        ORDER BY total_consumed DESC
    """

    phc_usage_filter = ""
    phc_stock_filter = ""
    params = [start_date, today.isoformat()]

    if phc_id:
        phc_usage_filter = " AND u.phc_id = ?"
        phc_stock_filter = " AND s.phc_id = ?"
        params.extend([phc_id, phc_id])

    formatted_query = query.format(
        phc_usage_filter=phc_usage_filter,
        phc_stock_filter=phc_stock_filter
    )

    cursor.execute(formatted_query, params)
    rows = cursor.fetchall()
    conn.close()

    items = []
    labels = []
    data_consumed = []
    data_stock = []
    bar_colors = []

    for r in rows:
        consumed = r['total_consumed']
        stock = r['total_stock']
        min_lvl = r['total_min_level']

        # Determine color badge based on stock health
        if stock >= 2 * min_lvl and stock > 0:
            color = "#10b981"  # Emerald / Green
            status = "GREEN"
        elif stock >= min_lvl:
            color = "#f59e0b"  # Amber / Yellow
            status = "YELLOW"
        else:
            color = "#ef4444"  # Red / Shortage
            status = "RED"

        labels.append(r['medicine_name'])
        data_consumed.append(consumed)
        data_stock.append(stock)
        bar_colors.append(color)

        items.append({
            "medicine_id": r['medicine_id'],
            "medicine_name": r['medicine_name'],
            "medicine_unit": r['medicine_unit'],
            "category": r['medicine_category'],
            "total_consumed": consumed,
            "total_stock": stock,
            "total_min_level": min_lvl,
            "status": status,
            "color": color
        })

    return {
        "period": period,
        "days": days,
        "labels": labels,
        "consumed": data_consumed,
        "stock": data_stock,
        "colors": bar_colors,
        "items": items
    }
