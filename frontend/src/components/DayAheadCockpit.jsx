import React, { useState } from 'react';
import InteractiveChart from './InteractiveChart';

export default function DayAheadCockpit({
  cockpitData,
  decisionDate,
  setDecisionDate,
  cutoffTime,
  setCutoffTime,
  loading,
  onRefresh
}) {
  const [showEvolution, setShowEvolution] = useState(true);
  const [tableFilter, setTableFilter] = useState('ALL'); // 'ALL', 'OVER', 'UNDER'

  const series = cockpitData?.series || [];
  const metrics = cockpitData?.metrics || {};
  const evolutionRuns = cockpitData?.evolutionRuns || [];
  const targetDeliveryDate = cockpitData?.targetDeliveryDate || '';

  // Preset key trading days in January 2026 for instant demo
  const presets = [
    { label: "Jan 03 (Wind Ramp)", date: "2026-01-03" },
    { label: "Jan 14 (Mid-Month Peak)", date: "2026-01-14" },
    { label: "Jan 21 (Wind Lull)", date: "2026-01-21" },
    { label: "Jan 28 (High Volatility)", date: "2026-01-28" }
  ];

  // Filter table rows
  const filteredSeries = series.filter(row => {
    if (tableFilter === 'OVER') return row.errorMw > 100;
    if (tableFilter === 'UNDER') return row.errorMw < -100;
    return true;
  });

  return (
    <div>
      {/* Control Toolbar */}
      <div className="control-bar">
        <div className="control-group">
          <div className="control-item">
            <label className="control-label">Purchase Decision Date (D-1)</label>
            <input
              type="date"
              className="control-input"
              value={decisionDate}
              min="2026-01-01"
              max="2026-01-31"
              onChange={(e) => setDecisionDate(e.target.value)}
            />
          </div>

          <div className="control-item">
            <label className="control-label">Decision Gate Closure Cutoff</label>
            <select
              className="control-select"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
            >
              <option value="11:00:00">11:00 GMT (EPEX SPOT UK Day-Ahead Auction)</option>
              <option value="12:00:00">12:00 GMT (Nord Pool UK Day-Ahead)</option>
              <option value="09:30:00">09:30 GMT (Morning Early Strategy Run)</option>
              <option value="15:30:00">15:30 GMT (Afternoon Post-Auction Run)</option>
              <option value="18:00:00">18:00 GMT (Evening Intraday Transition)</option>
            </select>
          </div>

          <div className="control-item">
            <label className="control-label">Delivery Target Day (D)</label>
            <div className="control-input" style={{ background: 'rgba(0, 242, 254, 0.08)', color: 'var(--wind-cyan)', fontWeight: 'bold' }}>
              {targetDeliveryDate || 'D+1'}
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="control-group">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>KEY DATES:</span>
          {presets.map(p => (
            <button
              key={p.date}
              className={`btn btn-secondary ${decisionDate === p.date ? 'btn-primary' : ''}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => setDecisionDate(p.date)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contextual Market Explainer Banner */}
      <div className="info-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div>
          <strong>Day-Ahead Wholesale Procurement Logic:</strong> As of{' '}
          <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{decisionDate} {cutoffTime.slice(0, 5)} GMT</span>, the trading desk evaluates the latest published{' '}
          <span style={{ color: 'var(--forecast-purple)', fontWeight: 600 }}>WINDFOR</span> forecast to determine residual electricity needed from thermal generators for delivery on{' '}
          <span style={{ color: 'var(--wind-cyan)', fontWeight: 600 }}>{targetDeliveryDate}</span>.
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 className="card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
              Latest Day-Ahead Forecast vs. Actual Generation Outturn
            </h2>
            <p className="card-subtitle">
              Evaluating forecast delivered for {targetDeliveryDate} (Settlement Periods 1-48 / 24 Hours)
            </p>
          </div>

          <div className="card-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showEvolution}
                onChange={(e) => setShowEvolution(e.target.checked)}
                style={{ accentColor: '#a855f7' }}
              />
              Show Earlier Forecast Trajectories (Spaghetti)
            </label>
          </div>
        </div>

        {/* Interactive Vector Chart */}
        <InteractiveChart
          series={series}
          evolutionRuns={evolutionRuns}
          showEvolution={showEvolution}
          title={`Delivery Day: ${targetDeliveryDate}`}
          yAxisLabel="Wind Generation (MW)"
        />
      </div>

      {/* Breakdown Table & Daily Stats */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="card-title">Delivery Day Half-Hour / Hourly Audit Ledger</h3>
            <p className="card-subtitle">
              Exact forecast timestamp, generation volumes, and residual error variance for {targetDeliveryDate}
            </p>
          </div>

          <div className="tab-pills">
            <button
              className={`tab-pill ${tableFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setTableFilter('ALL')}
            >
              All Hours ({series.length})
            </button>
            <button
              className={`tab-pill ${tableFilter === 'OVER' ? 'active' : ''}`}
              onClick={() => setTableFilter('OVER')}
            >
              Over-Forecasts (Deficit Risk)
            </button>
            <button
              className={`tab-pill ${tableFilter === 'UNDER' ? 'active' : ''}`}
              onClick={() => setTableFilter('UNDER')}
            >
              Under-Forecasts (Surplus)
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Target Time (GMT)</th>
                <th>Forecast Published</th>
                <th>Forecast Generation (MW)</th>
                <th>Actual Outturn (MW)</th>
                <th>Error Variance (MW)</th>
                <th>Percentage Error</th>
                <th>Market Impact</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeries.map((row, idx) => {
                const isOver = row.errorMw > 0;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{row.startTime.replace('T', ' ').slice(11, 16)} GMT</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {row.publishTime ? row.publishTime.replace('T', ' ').slice(0, 16) : '--'}
                    </td>
                    <td style={{ color: '#c084fc', fontWeight: 600 }}>
                      {row.forecastMw.toLocaleString()} MW
                    </td>
                    <td style={{ color: '#34d399', fontWeight: 600 }}>
                      {row.actualMw != null ? `${row.actualMw.toLocaleString()} MW` : 'Pending'}
                    </td>
                    <td style={{ color: isOver ? '#f43f5e' : '#10b981', fontWeight: 700 }}>
                      {row.errorMw > 0 ? `+${row.errorMw.toLocaleString()}` : row.errorMw?.toLocaleString()} MW
                    </td>
                    <td>
                      {row.percentageError != null ? `${row.percentageError}%` : '--'}
                    </td>
                    <td>
                      <span className={`badge-tag ${isOver ? 'badge-overforecast' : 'badge-underforecast'}`}>
                        {isOver ? 'Shortage / Cashout Risk' : 'Surplus Spill'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
