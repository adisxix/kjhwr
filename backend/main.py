"""
FastAPI Application for UK Day-Ahead Wind Power Forecast Intelligence & Procurement.
Serves REST API and mounts static frontend in production.
"""

import os
import io
import csv
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.analytics import (
    get_latest_forecast_at_cutoff,
    calculate_metrics_for_series,
    get_monthly_evaluation_summary,
    get_db_connection,
    DB_PATH
)
from backend.procurement import simulate_procurement_decision

app = FastAPI(
    title="REint UK Wind Day-Ahead Procurement Intelligence API",
    description="Commercial decision support and forecast accuracy evaluation for UK electricity utility trading desks",
    version="1.0.0"
)

# Enable CORS for React frontend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for monthly summary to deliver sub-5ms responses
SUMMARY_CACHE = {}


class ProcurementRequest(BaseModel):
    decisionDate: str = "2026-01-14"
    cutoffTime: str = "11:00:00"
    targetDeliveryDate: Optional[str] = "2026-01-15"
    portfolioPeakMw: float = 5000.0
    strategy: str = "P90_BUFFER"
    customBufferMw: float = 0.0
    dayAheadPrice: float = 95.0
    imbalancePenaltyPrice: float = 220.0
    spillSalvagePrice: float = 35.0


@app.get("/api/health")
def health_check():
    """Returns database status and record counts."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM actual_generation")
        act_cnt = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM forecast_generation")
        fc_cnt = cur.fetchone()[0]
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "actualsCount": act_cnt,
            "forecastCount": fc_cnt,
            "targetMonth": "January 2026",
            "elexonDatasets": ["FUELHH (fuelType=WIND)", "WINDFOR"]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/cockpit")
def get_cockpit_view(
    decisionDate: str = Query("2026-01-14", description="Decision date YYYY-MM-DD"),
    cutoffTime: str = Query("11:00:00", description="Cutoff time HH:MM:SS (default 11:00 UK Day-Ahead)"),
    targetDeliveryDate: Optional[str] = Query(None, description="Delivery date YYYY-MM-DD")
):
    """
    Day-Ahead Decision Cockpit:
    Provides the latest wind forecast available at decision cutoff time,
    the actual delivery outturn, and quantified forecast errors.
    """
    try:
        series = get_latest_forecast_at_cutoff(
            decision_date=decisionDate,
            cutoff_time_str=cutoffTime,
            target_delivery_date=targetDeliveryDate
        )
        metrics = calculate_metrics_for_series(series)

        # Retrieve earlier forecast evolution curves for the same delivery day
        # (e.g., forecasts published 24h, 36h, 48h prior to show forecast trajectory)
        t_del = targetDeliveryDate or decisionDate
        evolution_runs = get_forecast_evolution(decisionDate, cutoffTime, t_del)

        return {
            "decisionDate": decisionDate,
            "cutoffTime": cutoffTime,
            "targetDeliveryDate": targetDeliveryDate or t_del,
            "metrics": metrics,
            "series": series,
            "evolutionRuns": evolution_runs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_forecast_evolution(decision_date: str, cutoff_time: str, target_date: str):
    """Queries earlier forecast publications to show forecast trajectory leading to decision."""
    cutoff_iso = f"{decision_date}T{cutoff_time}Z"
    target_start = f"{target_date}T00:00:00Z"
    target_end = f"{target_date}T23:59:59Z"

    conn = get_db_connection()
    cur = conn.cursor()
    # Find distinct publish times within 48h prior to cutoff
    cur.execute("""
        SELECT DISTINCT publish_time
        FROM forecast_generation
        WHERE publish_time <= ?
          AND start_time >= ? AND start_time <= ?
        ORDER BY publish_time DESC
        LIMIT 4
    """, (cutoff_iso, target_start, target_end))
    pub_times = [r[0] for r in cur.fetchall()]

    runs = []
    for pt in pub_times:
        cur.execute("""
            SELECT start_time, generation
            FROM forecast_generation
            WHERE publish_time = ?
              AND start_time >= ? AND start_time <= ?
            ORDER BY start_time ASC
        """, (pt, target_start, target_end))
        pts = cur.fetchall()
        runs.append({
            "publishTime": pt,
            "data": [{"startTime": r[0], "generation": r[1]} for r in pts]
        })
    conn.close()
    return runs


@app.get("/api/analytics/summary")
def get_analytics_summary(
    cutoffTime: str = Query("11:00:00", description="Cutoff time HH:MM:SS")
):
    """
    Monthly Quantitative Evaluation Summary for January 2026.
    Computes global MAE, RMSE, WAPE, Bias, daily trends, hourly profiles, and error distributions.
    """
    cache_key = f"summary_{cutoffTime}"
    if cache_key in SUMMARY_CACHE:
        return SUMMARY_CACHE[cache_key]

    try:
        data = get_monthly_evaluation_summary(cutoff_time_str=cutoffTime)
        SUMMARY_CACHE[cache_key] = data
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/procurement/simulate")
def simulate_procurement(req: ProcurementRequest):
    """
    Simulates Day-Ahead Thermal Power Purchase and Quantified Error Hedging.
    """
    try:
        series = get_latest_forecast_at_cutoff(
            decision_date=req.decisionDate,
            cutoff_time_str=req.cutoffTime,
            target_delivery_date=req.targetDeliveryDate
        )
        result = simulate_procurement_decision(
            forecast_series=series,
            portfolio_peak_mw=req.portfolioPeakMw,
            strategy=req.strategy,
            custom_buffer_mw=req.customBufferMw,
            day_ahead_price_per_mwh=req.dayAheadPrice,
            imbalance_penalty_price_per_mwh=req.imbalancePenaltyPrice,
            spill_salvage_price_per_mwh=req.spillSalvagePrice
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/export/csv")
def export_dataset_csv(
    cutoffTime: str = Query("11:00:00")
):
    """Exports all evaluated January 2026 hourly paired points as CSV."""
    try:
        summary = get_monthly_evaluation_summary(cutoff_time_str=cutoffTime)
        
        # Build comprehensive row list
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "DeliveryDate", "Hour", "StartTime", "ForecastPublishTime",
            "ForecastGenerationMW", "ActualGenerationMW", "ForecastErrorMW", "PercentageError"
        ])

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT settlement_date 
            FROM actual_generation 
            WHERE settlement_date BETWEEN '2026-01-01' AND '2026-01-31'
            ORDER BY settlement_date ASC
        """)
        dates = [r[0] for r in cur.fetchall()]
        conn.close()

        from datetime import datetime, timedelta
        for d in dates:
            dt_obj = datetime.strptime(d, "%Y-%m-%d")
            dec_date = (dt_obj - timedelta(days=1)).strftime("%Y-%m-%d")
            series = get_latest_forecast_at_cutoff(dec_date, cutoffTime, d)
            for s in series:
                writer.writerow([
                    d,
                    s["startTime"][11:16],
                    s["startTime"],
                    s["publishTime"],
                    s["forecastMw"],
                    s["actualMw"],
                    s["errorMw"],
                    s["percentageError"]
                ])

        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=elexon_jan2026_wind_evaluation.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Mount static build of React app if available (for production / Docker / Heroku)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
