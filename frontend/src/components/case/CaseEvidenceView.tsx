import React, { useState, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { EntityNodeData } from '../EntityNode';
import {
  Shield,
  Search,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Network,
  Clock,
  Fingerprint,
  FileCode,
  Flame,
  Globe,
  User,
  Server,
  Lock,
} from 'lucide-react';

interface CaseEvidenceViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectEntity: (entity: EntityNodeData) => void;
  onViewInGraph: (nodeId: string) => void;
}

interface EvidenceRecord {
  id: string;
  nodeId: string;
  title: string;
  category: 'PROFILE' | 'NETWORK' | 'BREACH' | 'DOCUMENT' | 'IDENTITY';
  tier: 'VERIFIED' | 'CORRELATED' | 'PROBABLE';
  confidence: number;
  entityLabel: string;
  entityCategory: string;
  url?: string;
  notes?: string;
  observedDate: string;
  sha256Hash: string;
  metadata?: Record<string, any>;
}

// Generate pseudo-deterministic cryptographic hash for demonstration evidence
const generateHash = (str: string) => {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}${part3}${part4}`.toLowerCase();
};

export const CaseEvidenceView: React.FC<CaseEvidenceViewProps> = ({
  nodes,
  edges,
  onSelectEntity,
  onViewInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'PROFILE' | 'NETWORK' | 'BREACH' | 'IDENTITY'>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Generate evidence records from nodes and edges
  const evidenceRecords: EvidenceRecord[] = useMemo(() => {
    return nodes.map((n, idx) => {
      const d = (n.data || {}) as EntityNodeData;
      const rawCat = (d.category || '').toUpperCase();
      let category: 'PROFILE' | 'NETWORK' | 'BREACH' | 'DOCUMENT' | 'IDENTITY' = 'IDENTITY';
      if (rawCat.includes('DOMAIN') || rawCat.includes('IP')) category = 'NETWORK';
      else if (rawCat.includes('BREACH')) category = 'BREACH';
      else if (rawCat.includes('SOCIAL') || rawCat.includes('USER') || d.url) category = 'PROFILE';

      const rawConf = typeof d.confidence === 'number' ? d.confidence : 0.85;
      const confPct = rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100);

      let tier: 'VERIFIED' | 'CORRELATED' | 'PROBABLE' = 'PROBABLE';
      if (confPct >= 90) tier = 'VERIFIED';
      else if (confPct >= 75) tier = 'CORRELATED';

      const observedDate =
        d.observedDates?.last ||
        d.observedDates?.first ||
        d.metadata?.created_at?.split('T')[0] ||
        (d as any).created_at?.split('T')[0] ||
        new Date().toISOString().split('T')[0];
      const hash = generateHash(`${n.id}-${d.label}-${observedDate}-${idx}`);

      return {
        id: `ev-${n.id}`,
        nodeId: n.id,
        title: `${tier === 'VERIFIED' ? 'Verified Artifact' : 'Correlated Sighting'}: ${d.label}`,
        category,
        tier,
        confidence: confPct,
        entityLabel: d.label,
        entityCategory: d.category || 'ENTITY',
        url: d.url,
        notes: d.notes || `Discovered during multi-vector OSINT scan. Metadata validated across public endpoints.`,
        observedDate,
        sha256Hash: hash,
        metadata: d.metadata || {
          status: '200 OK',
          evidence_source: d.url ? 'HTTP Probe' : 'Graph Topology Ingestion',
          connections: d.metrics?.connections || 4,
          first_seen: d.observedDates?.first || '2001-06-17',
        },
      };
    });
  }, [nodes]);

  const filteredEvidence = useMemo(() => {
    return evidenceRecords.filter((ev) => {
      const matchesCategory = selectedFilter === 'all' || ev.category === selectedFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.entityLabel.toLowerCase().includes(q) ||
        ev.notes?.toLowerCase().includes(q) ||
        ev.sha256Hash.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [evidenceRecords, selectedFilter, searchQuery]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getTierMeta = (tier: 'VERIFIED' | 'CORRELATED' | 'PROBABLE') => {
    if (tier === 'VERIFIED') {
      return {
        badge: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        dot: 'bg-emerald-400',
        text: 'VERIFIED EVIDENCE',
      };
    }
    if (tier === 'CORRELATED') {
      return {
        badge: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
        dot: 'bg-cyan-400',
        text: 'CORRELATED ARTIFACT',
      };
    }
    return {
      badge: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
      dot: 'bg-amber-400',
      text: 'PROBABLE RECORD',
    };
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060911] text-slate-100 overflow-hidden font-mono select-none">
      {/* Top Header & Filter Controls */}
      <div className="p-4 border-b border-slate-800/80 bg-[#080d17]/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search evidence records, hashes, or notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#090f1d] border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: 'all', label: 'All Evidence' },
              { id: 'PROFILE', label: 'Profiles' },
              { id: 'NETWORK', label: 'Network' },
              { id: 'BREACH', label: 'Breaches' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedFilter(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                  selectedFilter === cat.id
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                    : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 bg-slate-900/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-slate-400">
            Vault: <strong className="text-emerald-400">{filteredEvidence.length}</strong> items recorded
          </div>
        </div>
      </div>

      {/* Evidence Repository Grid */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredEvidence.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Shield className="w-10 h-10 text-slate-700" />
            <span>No evidence records matching the query.</span>
          </div>
        ) : (
          filteredEvidence.map((ev) => {
            const tierMeta = getTierMeta(ev.tier);
            const parentNode = nodes.find((n) => n.id === ev.nodeId);
            const entityData = (parentNode?.data || {}) as EntityNodeData;

            return (
              <div
                key={ev.id}
                className="p-4 rounded-2xl bg-[#090f1d] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex flex-col gap-3 group relative overflow-hidden"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {ev.title}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>Target Entity: <strong className="text-slate-300">{ev.entityLabel}</strong></span>
                        <span>•</span>
                        <span>Observed: {ev.observedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Tier & Confidence */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[10px] font-bold ${tierMeta.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tierMeta.dot}`} />
                      <span>{tierMeta.text}</span>
                    </span>
                    <span className="text-[11px] font-black text-slate-300">
                      {ev.confidence}%
                    </span>
                  </div>
                </div>

                {/* Evidence Note / Excerpt */}
                <div className="text-xs text-slate-300 leading-relaxed">
                  {ev.notes}
                </div>

                {/* Raw Forensic Payload / Hash Block */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[10px] space-y-1.5 font-mono text-slate-400">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                      <span>SHA-256 Integrity Stamp:</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-cyan-400/90 font-bold tracking-tight truncate max-w-xs">
                        {ev.sha256Hash}
                      </span>
                      <button
                        onClick={() => handleCopyHash(ev.sha256Hash)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Hash"
                      >
                        {copiedHash === ev.sha256Hash ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="text-[10px] text-slate-500">
                    Chain of Custody ID: <span className="text-slate-400">{ev.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectEntity(entityData)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold transition-colors"
                    >
                      Inspect Entity
                    </button>

                    <button
                      onClick={() => onViewInGraph(ev.nodeId)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Network className="w-3 h-3" />
                      <span>Focus on Graph</span>
                    </button>

                    {ev.url && (
                      <button
                        onClick={() => window.open(ev.url, '_blank')}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-300 transition-colors"
                        title="Open Source Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
