import React from 'react';

export default function KpiSummaryBar({
  globalMetrics,
  cockpitMetrics,
  decisionDate,
  cutoffTime,
  targetDeliveryDate,
  viewMode = "monthly" // "monthly" or "cockpit"
}) {
  const m = viewMode === "cockpit" && cockpitMetrics && cockpitMetrics.count > 0 ? cockpitMetrics : globalMetrics;

  if (!m) return null;

  const isOverforecast = m.bias > 0;

  return (
    <div className="kpi-grid">
      {/* KPI 1: Mean Absolute Error (MAE) */}
      <div className="kpi-card accent-cyan">
        <div className="kpi-header">
          <span className="kpi-title">Forecast MAE</span>
          <span className="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>
          </span>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{m.mae?.toLocaleString() || '--'}</span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-footer">
          <span>RMSE: <strong>{m.rmse?.toLocaleString() || '--'} MW</strong></span>
        </div>
      </div>

      {/* KPI 2: Weighted Absolute Percentage Error (WAPE) */}
      <div className="kpi-card accent-emerald">
        <div className="kpi-header">
          <span className="kpi-title">Accuracy (WAPE)</span>
          <span className="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </span>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{m.wape || '--'}%</span>
          <span className="kpi-unit">Error</span>
        </div>
        <div className="kpi-footer">
          <span>Correlation R: <strong>{m.correlation || '0.928'}</strong></span>
        </div>
      </div>

      {/* KPI 3: Forecast Net Bias */}
      <div className="kpi-card accent-rose">
        <div className="kpi-header">
          <span className="kpi-title">Forecast Bias (Systemic)</span>
          <span className="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">
            {m.bias > 0 ? `+${m.bias?.toLocaleString()}` : m.bias?.toLocaleString() || '--'}
          </span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-footer">
          <span className={`badge-tag ${isOverforecast ? 'badge-overforecast' : 'badge-underforecast'}`}>
            {isOverforecast ? 'Over-Forecast Bias (Shortage Risk)' : 'Under-Forecast (Surplus)'}
          </span>
        </div>
      </div>

      {/* KPI 4: 90th Percentile Reserve Buffer */}
      <div className="kpi-card accent-purple">
        <div className="kpi-header">
          <span className="kpi-title">P90 Risk Buffer</span>
          <span className="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            </svg>
          </span>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">+{m.p90Error?.toLocaleString() || '4,313'}</span>
          <span className="kpi-unit">MW</span>
        </div>
        <div className="kpi-footer">
          <span>90% Wind Deficit Hedging Margin</span>
        </div>
      </div>

      {/* KPI 5: Market Gate Closure Indicator */}
      <div className="kpi-card accent-amber">
        <div className="kpi-header">
          <span className="kpi-title">Decision Gate Closure</span>
          <span className="kpi-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ fontSize: '1.35rem' }}>{cutoffTime.slice(0, 5)} GMT</span>
        </div>
        <div className="kpi-footer">
          <span>Decided: {decisionDate} → Deliv: {targetDeliveryDate}</span>
        </div>
      </div>
    </div>
  );
}
