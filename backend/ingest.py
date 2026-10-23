"""
Elexon BMRS Data Ingestion Module for UK Wind Power
Extracts actual generation (FUELHH - fuelType WIND) and forecasts (WINDFOR)
specifically for purchase decisions in January 2026.
"""

import os
import json
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "elexon_wind.db")
ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
HEADERS = {"User-Agent": "REint-Wind-Procurement-Platform/1.0"}


def init_db(db_path=DB_PATH):
    """Initializes SQLite database with appropriate schema and indices."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS actual_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time TEXT NOT NULL,
            publish_time TEXT,
            settlement_date TEXT NOT NULL,
            settlement_period INTEGER NOT NULL,
            generation REAL NOT NULL,
            fuel_type TEXT NOT NULL DEFAULT 'WIND',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(start_time, fuel_type)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS forecast_generation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            publish_time TEXT NOT NULL,
            start_time TEXT NOT NULL,
            generation REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(publish_time, start_time)
        )
    """)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_actual_start ON actual_generation(start_time)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_actual_date ON actual_generation(settlement_date)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_forecast_pub ON forecast_generation(publish_time)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_forecast_start ON forecast_generation(start_time)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_forecast_pair ON forecast_generation(publish_time, start_time)")

    conn.commit()
    conn.close()
    logger.info(f"Database schema initialized at {db_path}")


def fetch_url(url):
    """Fetch JSON from URL with error handling."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = resp.read().decode("utf-8")
            parsed = json.loads(data)
            if isinstance(parsed, dict) and "data" in parsed:
                return parsed["data"]
            return parsed
    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        return []


def ingest_actuals(start_date="2026-01-01", end_date="2026-02-02", db_path=DB_PATH):
    """
    Ingest half-hourly wind generation actuals from FUELHH stream.
    """
    logger.info(f"Fetching FUELHH actuals from {start_date} to {end_date}...")
    url = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream?settlementDateFrom={start_date}&settlementDateTo={end_date}"
    records = fetch_url(url)
    wind_records = [r for r in records if r.get("fuelType") == "WIND"]
    logger.info(f"Fetched {len(records)} total FUELHH records, filtered {len(wind_records)} WIND records.")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    inserted = 0

    for r in wind_records:
        start_time = r.get("startTime")
        publish_time = r.get("publishTime")
        settlement_date = r.get("settlementDate")
        settlement_period = r.get("settlementPeriod")
        gen = r.get("generation", 0.0)

        if start_time and gen is not None:
            cur.execute("""
                INSERT INTO actual_generation (start_time, publish_time, settlement_date, settlement_period, generation)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(start_time, fuel_type) DO UPDATE SET
                    generation = excluded.generation,
                    publish_time = excluded.publish_time,
                    settlement_date = excluded.settlement_date,
                    settlement_period = excluded.settlement_period
            """, (start_time, publish_time, settlement_date, settlement_period, float(gen)))
            inserted += 1

    conn.commit()
    conn.close()
    logger.info(f"Successfully upserted {inserted} actual generation records into database.")
    return inserted


def ingest_forecasts(from_dt="2025-12-30T00:00:00Z", to_dt="2026-02-02T00:00:00Z", db_path=DB_PATH):
    """
    Ingest WINDFOR forecasts in 5-day sliding windows to ensure full data capture without timeouts.
    """
    start_dt = datetime.fromisoformat(from_dt.replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(to_dt.replace("Z", "+00:00"))
    step = timedelta(days=5)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    total_inserted = 0

    curr = start_dt
    while curr < end_dt:
        chunk_end = min(curr + step, end_dt)
        c_from = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        c_to = chunk_end.strftime("%Y-%m-%dT%H:%M:%SZ")
        url = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream?publishDateTimeFrom={c_from}&publishDateTimeTo={c_to}"
        logger.info(f"Fetching WINDFOR chunk: {c_from} to {c_to}...")

        records = fetch_url(url)
        logger.info(f"  Got {len(records)} forecast items.")

        for r in records:
            pub_time = r.get("publishTime")
            start_time = r.get("startTime")
            gen = r.get("generation")
            if pub_time and start_time and gen is not None:
                cur.execute("""
                    INSERT INTO forecast_generation (publish_time, start_time, generation)
                    VALUES (?, ?, ?)
                    ON CONFLICT(publish_time, start_time) DO UPDATE SET
                        generation = excluded.generation
                """, (pub_time, start_time, float(gen)))
                total_inserted += 1

        conn.commit()
        curr = chunk_end

    conn.close()
    logger.info(f"Successfully upserted {total_inserted} total WINDFOR records.")
    return total_inserted


def run_full_ingestion():
    """Executes full database initialization and January 2026 ingestion."""
    init_db()
    actual_count = ingest_actuals("2026-01-01", "2026-02-02")
    forecast_count = ingest_forecasts("2025-12-30T00:00:00Z", "2026-02-02T00:00:00Z")
    logger.info(f"Ingestion complete! Actuals: {actual_count}, Forecast points: {forecast_count}")


if __name__ == "__main__":
    run_full_ingestion()
