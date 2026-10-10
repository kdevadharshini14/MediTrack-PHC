import sqlite3
import os
from datetime import datetime

DB_NAME = os.path.join(os.path.dirname(os.path.abspath(__file__)), "meditrack.db")

def get_db():
    """
    Get a database connection with dictionary-like row access
    and foreign keys enabled.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """
    Initialize database schema with PHC authentication and isolated tenancy.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS phc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        contact_email TEXT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL DEFAULT 'phc123'
    );

    CREATE TABLE IF NOT EXISTS medicine (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        unit TEXT NOT NULL,
        category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phc_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_level INTEGER NOT NULL DEFAULT 10,
        expiry_date TEXT,
        FOREIGN KEY (phc_id) REFERENCES phc(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE,
        UNIQUE (phc_id, medicine_id)
    );

    CREATE TABLE IF NOT EXISTS usage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phc_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (phc_id) REFERENCES phc(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phc_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('CRITICAL', 'WARNING')),
        reason TEXT NOT NULL CHECK(reason IN ('LOW_QTY', 'FAST_BURN')),
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (phc_id) REFERENCES phc(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transfer_request (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_phc_id INTEGER NOT NULL,
        to_phc_id INTEGER NOT NULL,
        medicine_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        urgency TEXT NOT NULL DEFAULT 'NORMAL' CHECK(urgency IN ('EMERGENCY', 'NORMAL')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (from_phc_id) REFERENCES phc(id) ON DELETE CASCADE,
        FOREIGN KEY (to_phc_id) REFERENCES phc(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicine(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS citizen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL DEFAULT 'citizen123',
        location TEXT,
        created_at TEXT NOT NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_phc_username ON phc(username);
    CREATE INDEX IF NOT EXISTS idx_stock_phc_med ON stock(phc_id, medicine_id);
    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_log(date, phc_id, medicine_id);
    CREATE INDEX IF NOT EXISTS idx_alert_status ON alert(status, phc_id, medicine_id);
    CREATE INDEX IF NOT EXISTS idx_transfer_status ON transfer_request(status);
    CREATE INDEX IF NOT EXISTS idx_citizen_phone ON citizen(phone);
    """)

    # Safe Migrations for existing database
    cursor.execute("PRAGMA table_info(stock)")
    stock_cols = [c[1] for c in cursor.fetchall()]
    if 'batch_no' not in stock_cols:
        cursor.execute("ALTER TABLE stock ADD COLUMN batch_no TEXT")

    cursor.execute("PRAGMA table_info(transfer_request)")
    tr_cols = [c[1] for c in cursor.fetchall()]
    if 'waybill_no' not in tr_cols:
        cursor.execute("ALTER TABLE transfer_request ADD COLUMN waybill_no TEXT")
    if 'dispatch_type' not in tr_cols:
        cursor.execute("ALTER TABLE transfer_request ADD COLUMN dispatch_type TEXT DEFAULT 'MANUAL'")
    if 'batch_no' not in tr_cols:
        cursor.execute("ALTER TABLE transfer_request ADD COLUMN batch_no TEXT")

    conn.commit()
    conn.close()

def log_activity(action, details):
    """
    Log system actions to activity_log table.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO activity_log (action, details, timestamp) VALUES (?, ?, ?)",
        (action, details, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
