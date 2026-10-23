import React from 'react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenPitch,
  onOpenTechReview,
  onExportCsv
}) {
  return (
    <header className="navbar">
      <div className="brand" onClick={() => setActiveTab('cockpit')}>
        <div className="brand-icon-box">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
            <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
          </svg>
        </div>
        <div>
          <span className="brand-title">REint WindIQ</span>
          <span className="brand-badge">UK Day-Ahead</span>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <nav className="tab-pills">
        <button
          className={`tab-pill ${activeTab === 'cockpit' ? 'active' : ''}`}
          onClick={() => setActiveTab('cockpit')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
          </svg>
          Decision Cockpit
        </button>
        <button
          className={`tab-pill ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/>
            <path d="m19 9-5 5-4-4-3 3"/>
          </svg>
          Forecast Accuracy
        </button>
        <button
          className={`tab-pill ${activeTab === 'procurement' ? 'active' : ''}`}
          onClick={() => setActiveTab('procurement')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Thermal Sourcing & Hedge
        </button>
      </nav>

      {/* Right Side Actions & Deliverables */}
      <div className="nav-actions">
        <div className="live-indicator">
          <span className="pulse-dot"></span>
          <span>Elexon BMRS Verified</span>
        </div>

        <button className="btn btn-secondary" onClick={onExportCsv} title="Download Jan 2026 Elexon Dataset CSV">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV
        </button>

        <button className="btn btn-pitch" onClick={onOpenPitch} title="Customer Pitch Presentation (Part 1)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Pitch Deck (Part 1)
        </button>

        <button className="btn btn-secondary" onClick={onOpenTechReview} title="Technical Lead Review (Part 2)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Tech Review (Part 2)
        </button>
      </div>
    </header>
  );
}
