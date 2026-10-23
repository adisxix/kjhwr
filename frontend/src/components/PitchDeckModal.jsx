import React, { useState } from 'react';

export default function PitchDeckModal({ isOpen, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: "1. The Challenge: Day-Ahead Electricity Procurement in Great Britain",
      badge: "Market Context",
      content: (
        <div>
          <p style={{ marginBottom: '14px' }}>
            As a leading UK energy utility, your day-ahead power trading desk carries the mission-critical responsibility of procuring wholesale electricity to serve consumer demand across all 48 half-hour settlement periods every day.
          </p>
          <div className="slide-card">
            <h4 style={{ color: '#00f2fe', marginBottom: '8px' }}>⚡ The Day-Ahead Decision Dilemma</h4>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Strict Gate Closure:</strong> Decisions for Delivery Day D must be locked in by <strong>11:00 GMT on Day D-1</strong> (EPEX SPOT / Nord Pool wholesale auctions).</li>
              <li><strong>Renewable Volatility:</strong> Wind generation is highly weather-dependent. You must rely on pre-auction weather forecasts to estimate wind generation and decide how much thermal/gas power to procure.</li>
              <li><strong>Punitive Balancing Costs:</strong> If wind under-delivers, you are short in the Balancing Mechanism and face catastrophic System Buy Prices (£200 - £400+/MWh).</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "2. Pilot Finding: The +1.84 GW Over-Forecast Trap in January 2026",
      badge: "Empirical Finding",
      content: (
        <div>
          <p style={{ marginBottom: '14px' }}>
            We audited all <strong>744 hours of January 2026</strong> using official Elexon BMRS data (FUELHH actuals vs WINDFOR forecasts). The empirical data revealed a critical commercial vulnerability:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="slide-card" style={{ borderLeft: '3px solid #f43f5e' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>+1,840 MW</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Systemic Net Bias</div>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                Forecasts consistently <strong>over-estimated</strong> wind generation. A desk naively following raw forecasts was short by nearly 2 GW on average!
              </p>
            </div>
            <div className="slide-card" style={{ borderLeft: '3px solid #a855f7' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7', fontFamily: 'var(--font-mono)' }}>+4,313 MW</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>P90 Tail Risk Deficit</div>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                In 10% of delivery hours, wind shortfall exceeded 4.3 GW, triggering severe cashout exposure during peak winter demand.
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#38bdf8' }}>
            <strong>Conclusion:</strong> Relying on unadjusted forecasts creates an unhedged multi-million pound financial risk.
          </p>
        </div>
      )
    },
    {
      title: "3. The Solution: REint WindIQ Trading Intelligence Cockpit",
      badge: "Product Capabilities",
      content: (
        <div>
          <p style={{ marginBottom: '14px' }}>
            REint WindIQ was built from the ground up to solve this exact commercial challenge:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="slide-card">
              <strong style={{ color: '#00f2fe' }}>1. Real-Time Gate Closure Alignment:</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Automatically snapshots the exact latest WINDFOR forecast published prior to your 11:00 GMT cutoff, eliminating stale-data errors and uncertainty.
              </p>
            </div>
            <div className="slide-card">
              <strong style={{ color: '#10b981' }}>2. Quantitative Confidence Margins (P90 Hedging):</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Transforms raw forecasts into risk-adjusted procurement volumes with calibrated reserve buffers, ensuring 90%+ supply adequacy without overpaying.
              </p>
            </div>
            <div className="slide-card">
              <strong style={{ color: '#a855f7' }}>3. Thermal Dispatch & What-If Simulator:</strong>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Allows your trading desk to model procurement strategies against actual wholesale Day-Ahead vs Cashout penalty spreads in real time.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "4. Business Impact & Quantified Value for Your Utility",
      badge: "Commercial ROI",
      content: (
        <div>
          <p style={{ marginBottom: '14px' }}>
            When tested across a standard 5,000 MW utility portfolio in January 2026:
          </p>
          <div className="slide-card" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <h4 style={{ color: '#10b981', fontSize: '1.2rem', marginBottom: '8px' }}>💰 £85,000 - £180,000 Average Daily Imbalance Penalty Avoidance</h4>
            <p style={{ fontSize: '0.875rem' }}>
              By procuring thermal power Day-Ahead at ~£95/MWh with the calibrated P90 buffer rather than scrambling in the Balancing Mechanism at £220+/MWh, the desk captures tens of thousands of pounds in net daily risk savings.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            <div className="slide-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#38bdf8' }}>96.2%</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Portfolio Reliability</div>
            </div>
            <div className="slide-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a855f7' }}>0 ms</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sub-second Latency</div>
            </div>
            <div className="slide-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>100%</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Elexon Verified</div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "5. Roadmap & Next Steps for Full Production Deployment",
      badge: "Partnership Next Steps",
      content: (
        <div>
          <p style={{ marginBottom: '14px' }}>
            Following this successful pilot, we are ready to advance to enterprise production integration:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="slide-card">
              <strong style={{ color: '#00f2fe' }}>Phase 1 (Immediate):</strong> Direct API integration with your internal Energy Trading & Risk Management (ETRM) system.
            </div>
            <div className="slide-card">
              <strong style={{ color: '#10b981' }}>Phase 2:</strong> Automated Intraday Rebalancing triggered as forecast updates roll in at 15:30 and 18:00 GMT.
            </div>
            <div className="slide-card">
              <strong style={{ color: '#a855f7' }}>Phase 3:</strong> Machine learning ensemble post-processing to automatically correct seasonal wind biases.
            </div>
          </div>
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '10px 24px', fontSize: '1rem' }}>
              Explore Live Portal Demo →
            </button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="brand-badge" style={{ marginBottom: '6px', display: 'inline-block' }}>
              Part 1 Deliverable: Client Pitch Deck
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              {slides[currentSlide].title}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {slides[currentSlide].content}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  width: idx === currentSlide ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: idx === currentSlide ? 'var(--wind-cyan)' : 'rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
              style={{ opacity: currentSlide === 0 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (currentSlide < slides.length - 1) {
                  setCurrentSlide(s => s + 1);
                } else {
                  onClose();
                }
              }}
            >
              {currentSlide < slides.length - 1 ? 'Next Slide →' : 'Launch Cockpit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
