export interface Target {
  id: string;
  case_id: string;
  case_title?: string;
  type: string;
  value: string;
  notes?: string;
  status?: 'ACTIVE' | 'SCANNING' | 'COMPLETED' | 'PAUSED' | 'FAILED';
  tags?: string[];
  progress?: number;
  last_scanned_at?: string;
  scans_count?: number;
  artifacts_count?: number;
  created_at: string;
}

export interface TargetDetail {
  target: Target;
  artifacts: Artifact[];
  scans: Scan[];
}


export interface Scan {
  id: string;
  case_id: string;
  target_id: string;
  module: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  started_at: string;
  completed_at?: string;
  total: number;
  completed: number;
  matches_count: number;
  error?: string;
  config?: Record<string, any>;
}

export interface ScanEvent {
  id: string;
  scan_id: string;
  event_type: 'PROGRESS' | 'MATCH' | 'LOG' | 'ERROR' | 'DONE';
  message: string;
  payload?: Record<string, any>;
  created_at: string;
}

export interface Artifact {
  id: string;
  case_id: string;
  target_id: string;
  scan_id?: string;
  node_type: string;
  label: string;
  url?: string;
  confidence: number;
  metadata_json?: Record<string, any>;
  discovered_at: string;
}

export interface Case {
  id: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  targets: Target[];
  scans: Scan[];
  targets_count?: number;
  scans_count?: number;
  artifacts_count?: number;
  edges_count?: number;
}


export interface GraphNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data: {
    label: string;
    node_type?: string;
    targetType?: string;
    url?: string;
    confidence?: number;
    metadata?: Record<string, any>;
    notes?: string;
    discovered_at?: string;
    created_at?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface CaseGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
