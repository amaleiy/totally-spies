import { Case, Target, TargetDetail, Scan, ScanEvent, CaseGraph } from '../types';

const API_BASE = '/api';

export async function fetchCases(): Promise<Case[]> {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

export async function fetchCase(caseId: string): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  if (!res.ok) throw new Error('Failed to fetch case details');
  return res.json();
}

export async function createCase(data: {
  title: string;
  description?: string;
  status?: string;
  tags?: string[];
  notes?: string;
}): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create case');
  return res.json();
}

export async function updateCase(
  caseId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    tags?: string[];
    notes?: string;
  }
): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update case');
  return res.json();
}

export async function importCase(dossierJson: Record<string, any>): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dossierJson)
  });
  if (!res.ok) throw new Error('Failed to import case dossier');
  return res.json();
}

export async function deleteCase(caseId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete case');
}

export async function fetchAllTargets(filters?: {
  case_id?: string;
  type?: string;
  status?: string;
  search?: string;
}): Promise<Target[]> {
  const params = new URLSearchParams();
  if (filters?.case_id) params.append('case_id', filters.case_id);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const qs = params.toString();
  const res = await fetch(`${API_BASE}/targets${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch targets');
  return res.json();
}

export async function fetchTargetDetail(targetId: string): Promise<TargetDetail> {
  const res = await fetch(`${API_BASE}/targets/${targetId}`);
  if (!res.ok) throw new Error('Failed to fetch target details');
  return res.json();
}

export async function createTarget(
  caseId: string,
  data: {
    type: string;
    value: string;
    notes?: string;
    status?: string;
    tags?: string[];
  }
): Promise<Target> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create target');
  return res.json();
}

export async function updateTarget(
  targetId: string,
  data: {
    type?: string;
    value?: string;
    notes?: string;
    status?: string;
    tags?: string[];
  }
): Promise<Target> {
  const res = await fetch(`${API_BASE}/targets/${targetId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update target');
  return res.json();
}

export async function bulkImportTargets(data: {
  case_id: string;
  targets: Array<{
    type: string;
    value: string;
    notes?: string;
    status?: string;
    tags?: string[];
  }>;
}): Promise<Target[]> {
  const res = await fetch(`${API_BASE}/targets/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to bulk import targets');
  return res.json();
}

export async function triggerTargetScan(
  targetId: string,
  module?: string,
  config?: any
): Promise<Scan> {
  const res = await fetch(`${API_BASE}/targets/${targetId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ module, config })
  });
  if (!res.ok) throw new Error('Failed to trigger scan on target');
  return res.json();
}

export async function deleteTarget(targetId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/targets/${targetId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete target');
}


export async function createScan(caseId: string, data: { target_id: string; module: string; config?: any }): Promise<Scan> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to trigger scan');
  return res.json();
}

export async function fetchCaseScans(caseId: string): Promise<Scan[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/scans`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function fetchScanEvents(scanId: string): Promise<ScanEvent[]> {
  const res = await fetch(`${API_BASE}/scans/${scanId}/events`);
  if (!res.ok) throw new Error('Failed to fetch scan events');
  return res.json();
}

export async function fetchCaseGraph(caseId: string): Promise<CaseGraph> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/graph`);
  if (!res.ok) throw new Error('Failed to fetch case graph');
  return res.json();
}

export async function deleteArtifact(artifactId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/artifacts/${artifactId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete artifact');
}

export async function cancelScan(scanId: string): Promise<Scan> {
  const res = await fetch(`${API_BASE}/scans/${scanId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to cancel scan');
  return res.json();
}

export async function exportCaseReport(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/export`);
  if (!res.ok) throw new Error('Failed to export case report');
  return res.json();
}

export async function fetchStats(): Promise<{
  active_cases: number;
  tracked_targets: number;
  executed_scans: number;
  discovered_artifacts: number;
  active_agents: number;
}> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchActivity(): Promise<Array<{
  id: string;
  type: string;
  message: string;
  created_at: string;
}>> {
  const res = await fetch(`${API_BASE}/activity`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export interface ExposureHostResult {
  query: string;
  ip: string | null;
  error?: string;
  ports: Array<{
    port: number;
    service: string;
    protocol: string;
  }>;
  raw_ports?: number[];
  hostnames: string[];
  cpes: string[];
  vulns: string[];
  tags: string[];
  source?: string;
  status?: string;
  message?: string;
}

export async function lookupExposure(query: string): Promise<ExposureHostResult> {
  const res = await fetch(`${API_BASE}/exposure/lookup?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to query host exposure');
  return res.json();
}

export interface BreachStats {
  total_records: number;
  incidents_count: number;
  unique_identifiers: number;
  affected_services: number;
  top_affected_countries: Array<{
    code: string;
    name: string;
    records: string;
    records_num: number;
    flag: string;
    lat: number;
    lon: number;
  }>;
  breach_types: Array<{
    type: string;
    percentage: number;
    color: string;
  }>;
  live_connections: Array<{
    role: string;
    location: string;
    status: string;
    color: string;
    lat: number;
    lon: number;
  }>;
}

export interface BreachIncident {
  id: string;
  name: string;
  records: number;
  date: string;
  time_ago: string;
  source_status: string;
  data_classes: string[];
  description: string;
  logo_color: string;
}

export interface BreachLookupResult {
  query: string;
  type: string;
  total_found: number;
  risk_score: number;
  breaches: Array<{
    breach_name: string;
    records: number;
    date: string;
    data_classes: string[];
    severity: string;
    verified: boolean;
    description: string;
  }>;
}

export async function fetchBreachStats(): Promise<BreachStats> {
  const res = await fetch(`${API_BASE}/breaches/stats`);
  if (!res.ok) throw new Error('Failed to fetch breach statistics');
  return res.json();
}

export async function fetchRecentBreaches(): Promise<BreachIncident[]> {
  const res = await fetch(`${API_BASE}/breaches/recent`);
  if (!res.ok) throw new Error('Failed to fetch recent breaches');
  return res.json();
}

export async function fetchLargestBreaches(): Promise<BreachIncident[]> {
  const res = await fetch(`${API_BASE}/breaches/largest`);
  if (!res.ok) throw new Error('Failed to fetch largest breaches');
  return res.json();
}

export async function lookupBreaches(query: string, type: string = 'email'): Promise<BreachLookupResult> {
  const params = new URLSearchParams({ query, type });
  const res = await fetch(`${API_BASE}/breaches/lookup?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to search breach records');
  return res.json();
}

export async function attachBreachToCase(data: {
  case_id: string;
  target_id?: string;
  breach_name: string;
  query_value: string;
  data_classes: string[];
  records_count?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/breaches/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to attach breach to case');
  return res.json();
}

// -------------------------------------------------------------
// Scans API
// -------------------------------------------------------------
export async function fetchAllScans(filters?: { status?: string; module?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.module) params.append('module', filters.module);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/scans${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function launchScanDirect(data: {
  case_id?: string;
  target_id?: string;
  target_value?: string;
  target_type?: string;
  module?: string;
  config?: any;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/scans/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to launch scan');
  return res.json();
}

export async function rerunScan(scanId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scans/${scanId}/rerun`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to rerun scan');
  return res.json();
}

export async function deleteScan(scanId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/scans/${scanId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete scan');
}

// -------------------------------------------------------------
// Reports API
// -------------------------------------------------------------
export async function fetchReports(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function generateReport(data: {
  title?: string;
  case_id?: string;
  target_id?: string;
  template?: string;
  classification?: string;
  include_sections?: string[];
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function fetchReport(reportId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/reports/${reportId}`);
  if (!res.ok) throw new Error('Failed to fetch report');
  return res.json();
}

export async function deleteReport(reportId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${reportId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete report');
}

// -------------------------------------------------------------
// Settings API
// -------------------------------------------------------------
export async function fetchSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function testApiKey(service: string, key: string): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/test-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service, key })
  });
  if (!res.ok) throw new Error('Failed to test API key');
  return res.json();
}

export async function fetchDiagnostics(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/diagnostics`);
  if (!res.ok) throw new Error('Failed to fetch system diagnostics');
  return res.json();
}

export async function purgeCache(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/purge-cache`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to purge cache');
  return res.json();
}

export async function exportDatabase(): Promise<any> {
  const res = await fetch(`${API_BASE}/settings/export-db`);
  if (!res.ok) throw new Error('Failed to export database');
  return res.json();
}

// -------------------------------------------------------------
// Clover Identity Recon API
// -------------------------------------------------------------
export async function fetchCloverPlatforms(): Promise<any> {
  const res = await fetch(`${API_BASE}/clover/platforms`);
  if (!res.ok) throw new Error('Failed to fetch Clover platforms');
  return res.json();
}

export async function cloverLookup(data: {
  username: string;
  categories?: string[];
  platforms?: string[];
  concurrency?: number;
  timeout?: number;
  permutations?: boolean;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/clover/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Clover identity lookup failed');
  return res.json();
}

export async function attachCloverProfiles(data: {
  case_id: string;
  target_username: string;
  profiles: any[];
}): Promise<any> {
  const res = await fetch(`${API_BASE}/clover/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to attach Clover profiles to case');
  return res.json();
}




