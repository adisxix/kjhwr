import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import KpiSummaryBar from './components/KpiSummaryBar';
import DayAheadCockpit from './components/DayAheadCockpit';
import AccuracyAnalytics from './components/AccuracyAnalytics';
import ProcurementSimulator from './components/ProcurementSimulator';
import PitchDeckModal from './components/PitchDeckModal';
import TechReviewModal from './components/TechReviewModal';
import { fetchCockpitData, fetchAnalyticsSummary, getCsvExportUrl } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('cockpit'); // 'cockpit', 'analytics', 'procurement'
  const [decisionDate, setDecisionDate] = useState('2026-01-14');
  const [cutoffTime, setCutoffTime] = useState('11:00:00');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState('2026-01-15');

  const [cockpitData, setCockpitData] = useState(null);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isPitchOpen, setIsPitchOpen] = useState(false);
  const [isTechReviewOpen, setIsTechReviewOpen] = useState(false);

  // Synchronize target delivery date when decision date changes (D-1 -> D)
  useEffect(() => {
    try {
      const dt = new Date(decisionDate);
      dt.setDate(dt.getDate() + 1);
      const nextDate = dt.toISOString().slice(0, 10);
      setTargetDeliveryDate(nextDate);
    } catch {
      // Fallback
    }
  }, [decisionDate]);

  // Fetch Cockpit data
  const loadCockpit = async () => {
    setLoading(true);
    try {
      const data = await fetchCockpitData(decisionDate, cutoffTime, targetDeliveryDate);
      setCockpitData(data);
    } catch (err) {
      console.error('Failed to load cockpit:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Monthly Analytics Summary
  const loadAnalytics = async () => {
    try {
      const summary = await fetchAnalyticsSummary(cutoffTime);
      setAnalyticsSummary(summary);
    } catch (err) {
      console.error('Failed to load analytics summary:', err);
    }
  };

  useEffect(() => {
    loadCockpit();
  }, [decisionDate, cutoffTime, targetDeliveryDate]);

  useEffect(() => {
    loadAnalytics();
  }, [cutoffTime]);

  const handleExportCsv = () => {
    window.location.href = getCsvExportUrl(cutoffTime);
  };

  const handleSelectDateFromTimeline = (selectedDecisionDate) => {
    setDecisionDate(selectedDecisionDate);
    setActiveTab('cockpit');
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPitch={() => setIsPitchOpen(true)}
        onOpenTechReview={() => setIsTechReviewOpen(true)}
        onExportCsv={handleExportCsv}
      />

      {/* Main KPI Bar */}
      <KpiSummaryBar
        globalMetrics={analyticsSummary?.globalMetrics}
        cockpitMetrics={cockpitData?.metrics}
        decisionDate={decisionDate}
        cutoffTime={cutoffTime}
        targetDeliveryDate={targetDeliveryDate}
        viewMode={activeTab === 'cockpit' ? 'cockpit' : 'monthly'}
      />

      {/* Tab 1: Day-Ahead Decision Cockpit */}
      {activeTab === 'cockpit' && (
        <DayAheadCockpit
          cockpitData={cockpitData}
          decisionDate={decisionDate}
          setDecisionDate={setDecisionDate}
          cutoffTime={cutoffTime}
          setCutoffTime={setCutoffTime}
          loading={loading}
          onRefresh={loadCockpit}
        />
      )}

      {/* Tab 2: Quantitative Forecast Accuracy Analytics */}
      {activeTab === 'analytics' && (
        <AccuracyAnalytics
          analyticsSummary={analyticsSummary}
          onSelectDate={handleSelectDateFromTimeline}
        />
      )}

      {/* Tab 3: Day-Ahead Thermal Sourcing & Risk Hedging Simulator */}
      {activeTab === 'procurement' && (
        <ProcurementSimulator
          decisionDate={decisionDate}
          cutoffTime={cutoffTime}
          targetDeliveryDate={targetDeliveryDate}
        />
      )}

      {/* Modals for Pitch & Tech Review */}
      <PitchDeckModal isOpen={isPitchOpen} onClose={() => setIsPitchOpen(false)} />
      <TechReviewModal isOpen={isTechReviewOpen} onClose={() => setIsTechReviewOpen(false)} />

      {/* Footer */}
      <footer style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', gap: '16px' }}>
        <div>
          <strong>REint WindIQ</strong> — UK Wholesale Electricity Day-Ahead Procurement & Forecast Intelligence.
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span>Data Sources: Elexon BMRS (FUELHH &amp; WINDFOR)</span>
          <span>Scope: January 2026 Decisions</span>
          <button
            onClick={() => setIsTechReviewOpen(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--wind-cyan)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            System Specs →
          </button>
        </div>
      </footer>
    </div>
  );
}
