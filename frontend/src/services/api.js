/**
 * Frontend API Service for REint WindIQ
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch API health');
  return res.json();
}

export async function fetchCockpitData(decisionDate = '2026-01-14', cutoffTime = '11:00:00', targetDeliveryDate = null) {
  const params = new URLSearchParams({ decisionDate, cutoffTime });
  if (targetDeliveryDate) {
    params.append('targetDeliveryDate', targetDeliveryDate);
  }
  const res = await fetch(`${API_BASE}/cockpit?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch Day-Ahead Cockpit data');
  return res.json();
}

export async function fetchAnalyticsSummary(cutoffTime = '11:00:00') {
  const params = new URLSearchParams({ cutoffTime });
  const res = await fetch(`${API_BASE}/analytics/summary?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch Analytics summary');
  return res.json();
}

export async function simulateProcurement(payload) {
  const res = await fetch(`${API_BASE}/procurement/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to run procurement simulation');
  return res.json();
}

export function getCsvExportUrl(cutoffTime = '11:00:00') {
  return `${API_BASE}/export/csv?cutoffTime=${encodeURIComponent(cutoffTime)}`;
}
