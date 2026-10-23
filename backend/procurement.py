"""
UK Day-Ahead Power Procurement & Thermal Dispatch Simulator.
Translates wind forecasts and quantified errors into optimal wholesale market purchase decisions.
"""

from typing import Dict, List, Any
import math


def generate_typical_uk_demand_profile(scale_peak_mw: float = 5000.0) -> List[float]:
    """
    Generates a realistic winter weekday UK electricity demand curve (24 hours).
    Morning ramp (07:00-09:00), afternoon plateau, evening winter peak (17:00-19:00), overnight trough.
    Normalized and scaled to `scale_peak_mw`.
    """
    # Normalized multipliers (peak at 18:00 is 1.0, minimum at 04:00 is ~0.55)
    curve = [
        0.58, 0.55, 0.53, 0.52, 0.54, 0.62, 0.74, 0.88, 0.92, 0.90,
        0.89, 0.88, 0.87, 0.86, 0.87, 0.91, 0.98, 1.00, 0.97, 0.92,
        0.87, 0.80, 0.72, 0.64
    ]
    return [round(c * scale_peak_mw, 1) for c in curve]


def simulate_procurement_decision(
    forecast_series: List[Dict[str, Any]],
    portfolio_peak_mw: float = 5000.0,
    strategy: str = "P90_BUFFER",
    custom_buffer_mw: float = 0.0,
    day_ahead_price_per_mwh: float = 95.0,
    imbalance_penalty_price_per_mwh: float = 220.0,
    spill_salvage_price_per_mwh: float = 35.0
) -> Dict[str, Any]:
    """
    Simulates utility purchase decisions across the 24 hours of delivery.
    Compares Raw Forecast Procurement vs. Error-Hedging Procurement.
    """
    demand_curve = generate_typical_uk_demand_profile(portfolio_peak_mw)
    hours_count = min(len(forecast_series), 24)

    # National average wind capacity scaling factor for portfolio
    # (assuming the utility's wind portfolio corresponds to a fraction of national wind)
    # Typical national wind generation in Jan 2026 is ~12,000 MW; if portfolio is 5,000 MW peak,
    # wind portfolio represents ~25% of demand.
    scaling_ratio = (portfolio_peak_mw * 0.40) / 12000.0

    schedule = []
    total_day_ahead_cost = 0.0
    total_imbalance_cost = 0.0
    total_spill_revenue = 0.0
    total_short_mwh = 0.0
    total_long_mwh = 0.0

    for i in range(hours_count):
        pt = forecast_series[i]
        hour_demand = demand_curve[i]
        
        # Portfolio wind forecast and actual
        f_mw = round(pt["forecastMw"] * scaling_ratio, 1)
        a_mw = round((pt["actualMw"] if pt["actualMw"] is not None else pt["forecastMw"]) * scaling_ratio, 1)

        # Determine risk buffer
        # In January 2026, positive bias and P90 error indicates wind deficit
        if strategy == "RAW":
            buffer_mw = 0.0
        elif strategy == "P50_BIAS":
            buffer_mw = round(1643.0 * scaling_ratio, 1)
        elif strategy == "P90_BUFFER":
            buffer_mw = round(4313.0 * scaling_ratio * 0.75, 1)
        elif strategy == "CUSTOM":
            buffer_mw = custom_buffer_mw
        else:
            buffer_mw = 0.0

        # Day-Ahead thermal procurement volume
        # We need: Thermal = Demand - Effective Wind Available
        # Effective Wind = max(0, f_mw - buffer_mw)
        effective_wind_mw = max(0.0, f_mw - buffer_mw)
        thermal_procured_mw = max(0.0, hour_demand - effective_wind_mw)

        # Actual generation outturn on delivery day
        total_generation_available = thermal_procured_mw + a_mw
        imbalance_mw = round(total_generation_available - hour_demand, 1)

        # Cost calculations (1 hour delivery = 1 MWh per MW)
        da_cost = thermal_procured_mw * day_ahead_price_per_mwh
        total_day_ahead_cost += da_cost

        imbalance_cost = 0.0
        spill_revenue = 0.0

        if imbalance_mw < 0:
            # Deficit: Under-procured! Must buy from Elexon Balancing Mechanism at punitive cashout price
            short_mwh = abs(imbalance_mw)
            imbalance_cost = short_mwh * imbalance_penalty_price_per_mwh
            total_short_mwh += short_mwh
            total_imbalance_cost += imbalance_cost
        else:
            # Surplus: Over-procured! Excess power sold at salvage price
            long_mwh = imbalance_mw
            spill_revenue = long_mwh * spill_salvage_price_per_mwh
            total_long_mwh += long_mwh
            total_spill_revenue += spill_revenue

        schedule.append({
            "hour": i,
            "label": f"{i:02d}:00",
            "demandMw": hour_demand,
            "windForecastMw": f_mw,
            "windActualMw": a_mw,
            "bufferAppliedMw": buffer_mw,
            "thermalProcuredMw": round(thermal_procured_mw, 1),
            "totalGenerationMw": round(total_generation_available, 1),
            "imbalanceMw": imbalance_mw,
            "daCostGbp": round(da_cost, 2),
            "imbalancePenaltyGbp": round(imbalance_cost, 2)
        })

    total_net_cost = total_day_ahead_cost + total_imbalance_cost - total_spill_revenue

    # Baseline comparison (if utility had used Raw Forecast with zero buffer)
    baseline_net_cost = total_net_cost
    if strategy != "RAW":
        baseline = simulate_procurement_decision(
            forecast_series=forecast_series,
            portfolio_peak_mw=portfolio_peak_mw,
            strategy="RAW",
            day_ahead_price_per_mwh=day_ahead_price_per_mwh,
            imbalance_penalty_price_per_mwh=imbalance_penalty_price_per_mwh,
            spill_salvage_price_per_mwh=spill_salvage_price_per_mwh
        )
        baseline_net_cost = baseline["summary"]["totalNetCostGbp"]

    cost_savings = round(baseline_net_cost - total_net_cost, 2)

    return {
        "summary": {
            "portfolioPeakMw": portfolio_peak_mw,
            "strategy": strategy,
            "totalDayAheadCostGbp": round(total_day_ahead_cost, 2),
            "totalImbalancePenaltyGbp": round(total_imbalance_cost, 2),
            "totalSpillRevenueGbp": round(total_spill_revenue, 2),
            "totalNetCostGbp": round(total_net_cost, 2),
            "baselineNetCostGbp": round(baseline_net_cost, 2),
            "netSavingsGbp": cost_savings,
            "totalShortMwh": round(total_short_mwh, 1),
            "totalLongMwh": round(total_long_mwh, 1),
            "reliabilityRatePercent": round((hours_count - len([s for s in schedule if s["imbalanceMw"] < 0])) / hours_count * 100, 1)
        },
        "hourlySchedule": schedule
    }
