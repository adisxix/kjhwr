import React, { useState, useEffect } from 'react';
import { simulateProcurement } from '../services/api';

export default function ProcurementSimulator({ decisionDate, cutoffTime, targetDeliveryDate }) {
  const [portfolioPeakMw, setPortfolioPeakMw] = useState(5000);
  const [strategy, setStrategy] = useState('P90_BUFFER');
  const [customBufferMw, setCustomBufferMw] = useState(500);
  const [dayAheadPrice, setDayAheadPrice] = useState(95);
  const [penaltyPrice, setPenaltyPrice] = useState(220);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await simulateProcurement({
        decisionDate,
        cutoffTime,
        targetDeliveryDate,
        portfolioPeakMw: Number(portfolioPeakMw),
        strategy,
        customBufferMw: Number(customBufferMw),
        dayAheadPrice: Number(dayAheadPrice),
        imbalancePenaltyPrice: Number(penaltyPrice),
        spillSalvagePrice: 35.0
      });
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [decisionDate, cutoffTime, targetDeliveryDate, portfolioPeakMw, strategy, customBufferMw, dayAheadPrice, penaltyPrice]);

  const summary = simulationResult?.summary || {};
  const schedule = simulationResult?.hourlySchedule || [];

  return (
    <div>
      {/* Parameter Control Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 className="card-title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              UK Day-Ahead Thermal Procurement & Risk Hedging Engine
            </h2>
            <p className="card-subtitle">
              Calculates exact wholesale power volume to buy from the Day-Ahead auction to meet consumer demand considering quantified wind forecast error.
            </p>
          </div>
          <span className="live-indicator">
            Simulating for: {targetDeliveryDate}
          </span>
        </div>

        {/* Form Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '8px' }}>
          <div className="control-item">
            <label className="control-label">Utility Peak Demand (MW)</label>
            <input
              type="number"
              className="control-input"
              value={portfolioPeakMw}
              step="500"
              min="1000"
              max="20000"
              onChange={(e) => setPortfolioPeakMw(e.target.value)}
            />
          </div>

          <div className="control-item">
            <label className="control-label">Procurement Risk Strategy</label>
            <select
              className="control-select"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              <option value="P90_BUFFER">P90 Conservative Hedge (Recommended)</option>
              <option value="P50_BIAS">P50 Bias-Corrected</option>
              <option value="RAW">Unhedged (Raw Forecast - High Risk)</option>
              <option value="CUSTOM">Custom Reserve Buffer (MW)</option>
            </select>
          </div>

          {strategy === 'CUSTOM' && (
            <div className="control-item">
              <label className="control-label">Custom Reserve Margin (MW)</label>
              <input
                type="number"
                className="control-input"
                value={customBufferMw}
                step="50"
                onChange={(e) => setCustomBufferMw(e.target.value)}
              />
            </div>
          )}

          <div className="control-item">
            <label className="control-label">Day-Ahead Power Price (£/MWh)</label>
            <input
              type="number"
              className="control-input"
              value={dayAheadPrice}
              step="5"
              onChange={(e) => setDayAheadPrice(e.target.value)}
            />
          </div>

          <div className="control-item">
            <label className="control-label">Imbalance Penalty Cashout (£/MWh)</label>
            <input
              type="number"
              className="control-input"
              value={penaltyPrice}
              step="10"
              onChange={(e) => setPenaltyPrice(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Financial & Reliability KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent-emerald">
          <div className="kpi-header">
            <span className="kpi-title">Net Financial Savings</span>
            <span className="kpi-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 14 14"/>
              </svg>
            </span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: summary.netSavingsGbp >= 0 ? '#10b981' : '#f43f5e' }}>
              £{summary.netSavingsGbp?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="kpi-footer">
            <span>Vs. unhedged raw forecast baseline (£{summary.baselineNetCostGbp?.toLocaleString()})</span>
          </div>
        </div>

        <div className="kpi-card accent-cyan">
          <div className="kpi-header">
            <span className="kpi-title">Total Energy Sourcing Cost</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              £{summary.totalNetCostGbp?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="kpi-footer">
            <span>Day-Ahead: £{summary.totalDayAheadCostGbp?.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card accent-rose">
          <div className="kpi-header">
            <span className="kpi-title">Imbalance Cashout Penalties</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: '#f43f5e' }}>
              £{summary.totalImbalancePenaltyGbp?.toLocaleString() || '0'}
            </span>
          </div>
          <div className="kpi-footer">
            <span>Uncovered Volume: {summary.totalShortMwh?.toLocaleString()} MWh</span>
          </div>
        </div>

        <div className="kpi-card accent-purple">
          <div className="kpi-header">
            <span className="kpi-title">Supply Adequacy Rate</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">
              {summary.reliabilityRatePercent || 100}%
            </span>
          </div>
          <div className="kpi-footer">
            <span>Hours fully covered without market shortage</span>
          </div>
        </div>
      </div>

      {/* Hourly Dispatch Stack Visualization */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="card-title">24-Hour Generation Dispatch & Residual Sourcing Stack</h3>
            <p className="card-subtitle">
              Visual breakdown of consumer demand coverage: Actual Wind Contribution (Green) + Procured Day-Ahead Thermal (Blue) vs Total Demand (Amber Line).
            </p>
          </div>
        </div>

        <div style={{ width: '100%', height: '320px', position: 'relative' }}>
          <svg viewBox="0 0 900 280" style={{ width: '100%', height: '100%' }}>
            {schedule.map((s, i) => {
              const x = 50 + i * 34;
              const barW = 24;
              const maxScale = portfolioPeakMw * 1.25;

              // Heights
              const windH = (s.windActualMw / maxScale) * 220;
              const thermalH = (s.thermalProcuredMw / maxScale) * 220;
              const demandY = 240 - (s.demandMw / maxScale) * 220;

              return (
                <g key={i}>
                  {/* Wind Bar */}
                  <rect
                    x={x}
                    y={240 - windH}
                    width={barW}
                    height={windH}
                    fill="#10b981"
                    rx="2"
                    opacity="0.85"
                  />
                  {/* Thermal Stacked Bar */}
                  <rect
                    x={x}
                    y={240 - windH - thermalH}
                    width={barW}
                    height={thermalH}
                    fill="#3b82f6"
                    rx="2"
                    opacity="0.85"
                  />
                  {/* Demand Target Marker */}
                  <line
                    x1={x - 2}
                    y1={demandY}
                    x2={x + barW + 2}
                    y2={demandY}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />
                  {/* Hour label */}
                  <text
                    x={x + barW / 2}
                    y={258}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                  >
                    {s.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></span>
            Wind Power Actuals (Green)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></span>
            Procured Thermal Baseload (Blue)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '3px', background: '#f59e0b', borderRadius: '2px' }}></span>
            Consumer Electricity Demand (Amber)
          </span>
        </div>
      </div>

      {/* Hourly Audit Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Hourly Procurement Ledger & Imbalance Exposure</h3>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hour (GMT)</th>
                <th>Consumer Demand</th>
                <th>Forecasted Wind</th>
                <th>Actual Wind</th>
                <th>Buffer Applied</th>
                <th>Thermal Procured</th>
                <th>Outturn Imbalance</th>
                <th>Day-Ahead Cost</th>
                <th>Imbalance Penalty</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((s, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{s.label}</td>
                  <td>{s.demandMw.toLocaleString()} MW</td>
                  <td style={{ color: '#c084fc' }}>{s.windForecastMw.toLocaleString()} MW</td>
                  <td style={{ color: '#34d399' }}>{s.windActualMw.toLocaleString()} MW</td>
                  <td style={{ color: '#a855f7' }}>+{s.bufferAppliedMw} MW</td>
                  <td style={{ color: '#60a5fa', fontWeight: 600 }}>{s.thermalProcuredMw.toLocaleString()} MW</td>
                  <td style={{ color: s.imbalanceMw < 0 ? '#f43f5e' : '#10b981', fontWeight: 600 }}>
                    {s.imbalanceMw > 0 ? `+${s.imbalanceMw}` : s.imbalanceMw} MW
                  </td>
                  <td>£{s.daCostGbp.toLocaleString()}</td>
                  <td style={{ color: s.imbalancePenaltyGbp > 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                    {s.imbalancePenaltyGbp > 0 ? `£${s.imbalancePenaltyGbp.toLocaleString()}` : '£0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
