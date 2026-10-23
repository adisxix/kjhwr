"""
Analytical Engine for UK Day-Ahead Wind Power Forecast Accuracy & Procurement.
Computes industry-standard statistical metrics: MAE, RMSE, WAPE, Bias,
error distributions, diurnal profiles, quantile risk bounds, and lead-time decay.
"""

import sqlite3
import math
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

DB_PATH = "backend/data/elexon_wind.db"


def get_db_connection(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_latest_forecast_at_cutoff(
    decision_date: str,
    cutoff_time_str: str = "11:00:00",
    target_delivery_date: Optional[str] = None,
    db_path: str = DB_PATH
) -> List[Dict[str, Any]]:
    """
    Finds the latest forecast available at or before `cutoff_time_str` on `decision_date`
    for delivery during `target_delivery_date` (defaulting to decision_date + 1 day).
    """
    if not target_delivery_date:
        dec_dt = datetime.strptime(decision_date, "%Y-%m-%d")
        target_delivery_date = (dec_dt + timedelta(days=1)).strftime("%Y-%m-%d")

    cutoff_iso = f"{decision_date}T{cutoff_time_str}Z"
    target_start_iso = f"{target_delivery_date}T00:00:00Z"
    target_end_iso = f"{target_delivery_date}T23:59:59Z"

    conn = get_db_connection(db_path)
    cur = conn.cursor()

    # Query for the latest forecast per start_time published <= cutoff_iso
    cur.execute("""
        WITH LatestForecasts AS (
            SELECT 
                start_time,
                publish_time,
                generation,
                ROW_NUMBER() OVER (
                    PARTITION BY start_time 
                    ORDER BY publish_time DESC
                ) as rn
            FROM forecast_generation
            WHERE publish_time <= ?
              AND start_time >= ?
              AND start_time <= ?
        )
        SELECT 
            start_time,
            publish_time,
            generation as forecast_mw
        FROM LatestForecasts
        WHERE rn = 1
        ORDER BY start_time ASC
    """, (cutoff_iso, target_start_iso, target_end_iso))

    forecast_rows = cur.fetchall()

    # Query actual generation for the target delivery date
    # In FUELHH, start_time is at 30-min resolution.
    # Group or match hourly or half-hourly.
    cur.execute("""
        SELECT 
            start_time,
            settlement_period,
            generation as actual_mw
        FROM actual_generation
        WHERE settlement_date = ?
        ORDER BY settlement_period ASC
    """, (target_delivery_date,))
    actual_rows = cur.fetchall()
    conn.close()

    # Create lookup for actuals by start_time
    # Actuals have 30m resolution; WINDFOR typically has 60m resolution.
    # We calculate actual hourly average for matching WINDFOR start_times,
    # and provide full half-hour actuals as well.
    actuals_by_time = {r["start_time"]: r["actual_mw"] for r in actual_rows}
    
    # Calculate hourly average actuals for hourly alignment
    # e.g., for start_time '2026-01-02T10:00:00Z', actual covers 10:00 and 10:30.
    hourly_actuals = {}
    for r in actual_rows:
        st = r["start_time"]
        hour_key = st[:13] + ":00:00Z"
        if hour_key not in hourly_actuals:
            hourly_actuals[hour_key] = []
        hourly_actuals[hour_key].append(r["actual_mw"])

    aligned_series = []
    for f in forecast_rows:
        st = f["start_time"]
        f_mw = round(f["forecast_mw"], 1)
        pub = f["publish_time"]
        
        # Look up corresponding actual
        act_vals = hourly_actuals.get(st, [])
        act_mw = round(sum(act_vals) / len(act_vals), 1) if act_vals else None

        err = round(f_mw - act_mw, 1) if act_mw is not None else None
        pct_err = round((abs(err) / act_mw * 100), 2) if (act_mw and act_mw > 0 and err is not None) else None

        aligned_series.append({
            "startTime": st,
            "publishTime": pub,
            "forecastMw": f_mw,
            "actualMw": act_mw,
            "errorMw": err,
            "absErrorMw": abs(err) if err is not None else None,
            "percentageError": pct_err
        })

    return aligned_series


def calculate_metrics_for_series(series: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates MAE, RMSE, WAPE, Bias, Peak Over/Under forecast for an aligned series."""
    valid_pairs = [(s["forecastMw"], s["actualMw"]) for s in series if s["actualMw"] is not None]
    if not valid_pairs:
        return {
            "count": 0, "mae": 0, "rmse": 0, "wape": 0, "bias": 0,
            "maxOverForecast": 0, "maxUnderForecast": 0, "p10Error": 0, "p50Error": 0, "p90Error": 0
        }

    errors = [f - a for f, a in valid_pairs]
    abs_errors = [abs(e) for e in errors]
    sq_errors = [e ** 2 for e in errors]
    actual_sum = sum(a for _, a in valid_pairs)

    n = len(valid_pairs)
    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(sq_errors) / n)
    bias = sum(errors) / n
    wape = (sum(abs_errors) / actual_sum * 100) if actual_sum > 0 else 0.0

    errors_sorted = sorted(errors)
    p10 = errors_sorted[int(0.10 * n)] if n > 0 else 0
    p50 = errors_sorted[int(0.50 * n)] if n > 0 else 0
    p90 = errors_sorted[min(int(0.90 * n), n - 1)] if n > 0 else 0

    return {
        "count": n,
        "mae": round(mae, 1),
        "rmse": round(rmse, 1),
        "wape": round(wape, 2),
        "bias": round(bias, 1),
        "maxOverForecast": round(max(errors), 1),
        "maxUnderForecast": round(min(errors), 1),
        "p10Error": round(p10, 1),
        "p50Error": round(p50, 1),
        "p90Error": round(p90, 1),
        "correlation": round(calculate_correlation(valid_pairs), 3)
    }


def calculate_correlation(pairs: List[tuple]) -> float:
    if len(pairs) < 2:
        return 0.0
    f_vals = [p[0] for p in pairs]
    a_vals = [p[1] for p in pairs]
    f_mean = sum(f_vals) / len(f_vals)
    a_mean = sum(a_vals) / len(a_vals)

    num = sum((f - f_mean) * (a - a_mean) for f, a in pairs)
    den_f = sum((f - f_mean) ** 2 for f in f_vals)
    den_a = sum((a - a_mean) ** 2 for a in a_vals)
    den = math.sqrt(den_f * den_a)

    return (num / den) if den > 0 else 0.0


def get_monthly_evaluation_summary(cutoff_time_str: str = "11:00:00", db_path: str = DB_PATH) -> Dict[str, Any]:
    """
    Evaluates Day-Ahead forecast accuracy for ALL purchase decisions in January 2026.
    Computes:
    - Global metrics (MAE, RMSE, WAPE, Bias, P10/P50/P90)
    - Daily performance timeline
    - Diurnal (hourly) error profile
    - Error distribution histogram
    - Lead time degradation analysis (48h down to 4h)
    """
    conn = get_db_connection(db_path)
    cur = conn.cursor()

    # Distinct decision dates in Jan 2026: 2026-01-01 to 2026-01-31
    cur.execute("""
        SELECT DISTINCT settlement_date 
        FROM actual_generation 
        WHERE settlement_date BETWEEN '2026-01-01' AND '2026-01-31'
        ORDER BY settlement_date ASC
    """)
    dates = [r[0] for r in cur.fetchall()]
    conn.close()

    all_matched_points = []
    daily_stats = []
    hourly_error_buckets = {h: [] for h in range(24)}

    for d in dates:
        # Decision made on previous day (d - 1 day) for delivery on d
        dt_obj = datetime.strptime(d, "%Y-%m-%d")
        dec_date = (dt_obj - timedelta(days=1)).strftime("%Y-%m-%d")

        series = get_latest_forecast_at_cutoff(
            decision_date=dec_date,
            cutoff_time_str=cutoff_time_str,
            target_delivery_date=d,
            db_path=db_path
        )
        m = calculate_metrics_for_series(series)
        daily_stats.append({
            "deliveryDate": d,
            "decisionDate": dec_date,
            "mae": m["mae"],
            "rmse": m["rmse"],
            "wape": m["wape"],
            "bias": m["bias"],
            "pointsCount": m["count"]
        })

        for pt in series:
            if pt["actualMw"] is not None:
                all_matched_points.append(pt)
                h = int(pt["startTime"][11:13])
                hourly_error_buckets[h].append(pt["errorMw"])

    # Global summary metrics
    global_metrics = calculate_metrics_for_series(all_matched_points)

    # Diurnal profile: hourly MAE, Bias, and spread
    diurnal_profile = []
    for h in range(24):
        errs = hourly_error_buckets[h]
        if errs:
            abs_errs = [abs(e) for e in errs]
            diurnal_profile.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "mae": round(sum(abs_errs) / len(abs_errs), 1),
                "bias": round(sum(errs) / len(errs), 1),
                "maxError": round(max(errs), 1),
                "minError": round(min(errs), 1),
                "samples": len(errs)
            })
        else:
            diurnal_profile.append({
                "hour": h, "label": f"{h:02d}:00", "mae": 0, "bias": 0, "maxError": 0, "minError": 0, "samples": 0
            })

    # Error distribution histogram (bins of 500 MW from -5000 to +5000)
    all_errors = [p["errorMw"] for p in all_matched_points]
    bins = list(range(-5000, 5500, 500))
    hist_counts = [0] * (len(bins) - 1)
    for e in all_errors:
        for i in range(len(bins) - 1):
            if bins[i] <= e < bins[i+1]:
                hist_counts[i] += 1
                break

    histogram = []
    for i in range(len(hist_counts)):
        mid = (bins[i] + bins[i+1]) / 2
        label = f"{bins[i]} to {bins[i+1]} MW"
        histogram.append({
            "binRange": label,
            "binMid": mid,
            "count": hist_counts[i],
            "percentage": round(hist_counts[i] / len(all_errors) * 100, 2) if all_errors else 0
        })

    # Horizon Degradation Analysis:
    # Compare forecast accuracy at 48h, 36h, 24h (Day-Ahead), 12h, 6h, 2h prior to delivery
    lead_time_decay = compute_lead_time_decay(db_path=db_path)

    return {
        "globalMetrics": global_metrics,
        "dailyStats": daily_stats,
        "diurnalProfile": diurnal_profile,
        "histogram": histogram,
        "leadTimeDecay": lead_time_decay,
        "totalEvaluatedHours": len(all_matched_points),
        "cutoffTime": cutoff_time_str
    }


def compute_lead_time_decay(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """
    Computes forecast error MAE as a function of forecast lead time
    (how many hours in advance the forecast was published before generation delivery).
    """
    conn = get_db_connection(db_path)
    cur = conn.cursor()

    # Sample query pairing forecast with actuals across lead times
    cur.execute("""
        SELECT 
            f.publish_time,
            f.start_time,
            f.generation as forecast_mw,
            (
                SELECT AVG(a.generation)
                FROM actual_generation a
                WHERE a.start_time LIKE SUBSTR(f.start_time, 1, 13) || '%'
            ) as actual_mw
        FROM forecast_generation f
        WHERE f.start_time BETWEEN '2026-01-05T00:00:00Z' AND '2026-01-20T23:59:59Z'
    """)
    rows = cur.fetchall()
    conn.close()

    lead_buckets = {
        "48h+": [],
        "36h-48h": [],
        "24h-36h (Day-Ahead)": [],
        "12h-24h": [],
        "6h-12h": [],
        "1h-6h (Intraday)": []
    }

    for r in rows:
        if r["actual_mw"] is None:
            continue
        try:
            pub_dt = datetime.fromisoformat(r["publish_time"].replace("Z", "+00:00"))
            start_dt = datetime.fromisoformat(r["start_time"].replace("Z", "+00:00"))
            lead_hours = (start_dt - pub_dt).total_seconds() / 3600.0
            err = abs(r["forecast_mw"] - r["actual_mw"])

            if lead_hours >= 48:
                lead_buckets["48h+"].append(err)
            elif lead_hours >= 36:
                lead_buckets["36h-48h"].append(err)
            elif lead_hours >= 24:
                lead_buckets["24h-36h (Day-Ahead)"].append(err)
            elif lead_hours >= 12:
                lead_buckets["12h-24h"].append(err)
            elif lead_hours >= 6:
                lead_buckets["6h-12h"].append(err)
            elif lead_hours >= 1:
                lead_buckets["1h-6h (Intraday)"].append(err)
        except Exception:
            continue

    result = []
    for bucket, errs in lead_buckets.items():
        if errs:
            result.append({
                "leadTimeBucket": bucket,
                "mae": round(sum(errs) / len(errs), 1),
                "samples": len(errs)
            })
    return result
