import React, { useState, useRef } from 'react';

/**
 * Interactive SVG Time Series Chart for Day-Ahead Forecast vs Actuals.
 * Features:
 * - High-DPI responsive vector rendering
 * - Shaded residual error band (over-forecast vs under-forecast)
 * - Historical forecast evolution runs ("cone of uncertainty")
 * - Hover crosshair with precision data tooltip
 */
export default function InteractiveChart({
  series = [],
  evolutionRuns = [],
  showEvolution = true,
  title = "Generation Profile",
  yAxisLabel = "Power (MW)"
}) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  if (!series || series.length === 0) {
    return (
      <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <p style={{ color: 'var(--text-muted)' }}>No time-series data available for selected horizon.</p>
      </div>
    );
  }

  // Dimensions
  const width = 900;
  const height = 340;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute Scales
  const allValues = [];
  series.forEach(d => {
    if (d.forecastMw != null) allValues.push(d.forecastMw);
    if (d.actualMw != null) allValues.push(d.actualMw);
  });
  if (showEvolution && evolutionRuns) {
    evolutionRuns.forEach(r => {
      r.data.forEach(d => {
        if (d.generation != null) allValues.push(d.generation);
      });
    });
  }

  const minVal = Math.max(0, Math.min(...allValues, 0));
  const maxVal = Math.max(...allValues, 1000) * 1.08;

  const getX = (idx) => padding.left + (idx / Math.max(series.length - 1, 1)) * chartW;
  const getY = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;

  // Build SVG Paths
  const forecastPath = series.reduce((acc, d, i) => {
    if (d.forecastMw == null) return acc;
    const x = getX(i);
    const y = getY(d.forecastMw);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const actualPath = series.reduce((acc, d, i) => {
    if (d.actualMw == null) return acc;
    const x = getX(i);
    const y = getY(d.actualMw);
    return acc ? `${acc} L ${x} ${y}` : `M ${x} ${y}`;
  }, '');

  // Build Residual Error Polygon (Area between forecast and actual)
  const validIndices = series
    .map((d, i) => (d.forecastMw != null && d.actualMw != null ? i : null))
    .filter(i => i !== null);

  let residualPolygon = '';
  if (validIndices.length > 1) {
    // Top boundary (forecast)
    const forward = validIndices.map(i => `${getX(i)},${getY(series[i].forecastMw)}`).join(' L ');
    // Bottom boundary reversed (actual)
    const backward = [...validIndices].reverse().map(i => `${getX(i)},${getY(series[i].actualMw)}`).join(' L ');
    residualPolygon = `M ${forward} L ${backward} Z`;
  }

  // Handle Mouse Move for Hover Crosshair
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartMouseX = mouseX - (padding.left / width) * rect.width;
    const ratio = chartMouseX / ((chartW / width) * rect.width);
    const index = Math.round(ratio * (series.length - 1));

    if (index >= 0 && index < series.length) {
      setHoverIndex(index);
      setTooltipPos({
        x: (getX(index) / width) * rect.width,
        y: (getY(series[index].forecastMw) / height) * rect.height
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Y-Axis Ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map(p => {
    const v = Math.round(minVal + p * (maxVal - minVal));
    return { val: v, y: getY(v) };
  });

  const activePoint = hoverIndex !== null ? series[hoverIndex] : null;

  return (
    <div className="chart-container" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="residualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.10" />
          </linearGradient>
          <filter id="glowForecast" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.6" />
          </filter>
          <filter id="glowActual" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Horizontal Grid Lines */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="rgba(255, 255, 255, 0.07)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={t.y + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {t.val.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Y Axis Title */}
        <text
          x={-(height / 2)}
          y={16}
          transform="rotate(-90)"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="10"
          fontFamily="var(--font-sans)"
          fontWeight="600"
          letterSpacing="0.05em"
        >
          {yAxisLabel}
        </text>

        {/* X-Axis Hour Labels */}
        {series.map((d, i) => {
          if (i % 3 !== 0 && i !== series.length - 1) return null;
          const x = getX(i);
          const timeLabel = d.startTime ? d.startTime.slice(11, 16) : `${i}:00`;
          return (
            <text
              key={i}
              x={x}
              y={height - 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontFamily="var(--font-mono)"
            >
              {timeLabel}
            </text>
          );
        })}

        {/* Residual Area (Forecast vs Actual Spread) */}
        {residualPolygon && (
          <path d={residualPolygon} fill="url(#residualGradient)" />
        )}

        {/* Evolution Runs (Earlier forecasts) */}
        {showEvolution && evolutionRuns.map((run, rIdx) => {
          const runPts = run.data.map(d => {
            const seriesIdx = series.findIndex(s => s.startTime === d.startTime);
            return seriesIdx !== -1 ? { x: getX(seriesIdx), y: getY(d.generation) } : null;
          }).filter(p => p !== null);

          if (runPts.length < 2) return null;
          const dStr = runPts.reduce((acc, p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
          return (
            <path
              key={rIdx}
              d={dStr}
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.35"
            />
          );
        })}

        {/* Forecast Line */}
        <path
          d={forecastPath}
          fill="none"
          stroke="#a855f7"
          strokeWidth="2.5"
          filter="url(#glowForecast)"
        />

        {/* Actual Line */}
        <path
          d={actualPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          filter="url(#glowActual)"
        />

        {/* Data Points */}
        {series.map((d, i) => (
          <g key={i}>
            {d.actualMw != null && (
              <circle
                cx={getX(i)}
                cy={getY(d.actualMw)}
                r="3"
                fill="#10b981"
                opacity={hoverIndex === i ? 1 : 0.6}
              />
            )}
            {d.forecastMw != null && (
              <circle
                cx={getX(i)}
                cy={getY(d.forecastMw)}
                r="3"
                fill="#a855f7"
                opacity={hoverIndex === i ? 1 : 0.6}
              />
            )}
          </g>
        ))}

        {/* Hover Crosshair */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={height - padding.bottom}
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {activePoint?.forecastMw != null && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activePoint.forecastMw)}
                r="6"
                fill="#a855f7"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
            {activePoint?.actualMw != null && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activePoint.actualMw)}
                r="6"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Dynamic Hover Tooltip */}
      {activePoint && (
        <div
          className="chart-tooltip"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`
          }}
        >
          <div className="tooltip-time">
            Target Time: <strong>{activePoint.startTime.replace('T', ' ').slice(0, 16)} GMT</strong>
          </div>
          <div className="tooltip-row">
            <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%' }}></span>
              Day-Ahead Forecast:
            </span>
            <span className="tooltip-val" style={{ color: '#c084fc' }}>
              {activePoint.forecastMw.toLocaleString()} MW
            </span>
          </div>
          <div className="tooltip-row">
            <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
              Actual Outturn:
            </span>
            <span className="tooltip-val" style={{ color: '#34d399' }}>
              {activePoint.actualMw != null ? `${activePoint.actualMw.toLocaleString()} MW` : 'N/A'}
            </span>
          </div>
          {activePoint.errorMw != null && (
            <div className="tooltip-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', marginTop: '4px' }}>
              <span style={{ color: activePoint.errorMw > 0 ? '#fda4af' : '#6ee7b7' }}>
                Forecast Error:
              </span>
              <span className="tooltip-val" style={{ color: activePoint.errorMw > 0 ? '#f43f5e' : '#10b981' }}>
                {activePoint.errorMw > 0 ? `+${activePoint.errorMw.toLocaleString()}` : activePoint.errorMw.toLocaleString()} MW
                {activePoint.percentageError != null && ` (${activePoint.percentageError}%)`}
              </span>
            </div>
          )}
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
            Published: {activePoint.publishTime ? activePoint.publishTime.replace('T', ' ').slice(0, 16) : 'N/A'}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-line" style={{ background: '#a855f7' }}></div>
          <span>Latest Day-Ahead Forecast (WINDFOR)</span>
        </div>
        <div className="legend-item">
          <div className="legend-line" style={{ background: '#10b981' }}></div>
          <span>Actual Wind Generation (FUELHH)</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch" style={{ background: 'rgba(244, 63, 94, 0.4)' }}></div>
          <span>Residual Error Gap (Forecast vs Actual)</span>
        </div>
        {showEvolution && evolutionRuns.length > 0 && (
          <div className="legend-item">
            <div className="legend-line" style={{ background: '#6366f1', borderTop: '2px dashed #6366f1' }}></div>
            <span>Earlier Forecast Runs (Evolution)</span>
          </div>
        )}
      </div>
    </div>
  );
}
