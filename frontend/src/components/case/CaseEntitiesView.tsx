import React, { useState, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { EntityNodeData } from '../EntityNode';
import {
  Search,
  ExternalLink,
  Shield,
  Network,
  Eye,
  Sparkles,
  User,
  Globe,
  Mail,
  Server,
  Flame,
  FileText,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';

interface CaseEntitiesViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectEntity: (entity: EntityNodeData) => void;
  onViewInGraph: (nodeId: string) => void;
}

export const CaseEntitiesView: React.FC<CaseEntitiesViewProps> = ({
  nodes,
  edges,
  onSelectEntity,
  onViewInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Precompute connection counts
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((e) => {
      counts[e.source] = (counts[e.source] || 0) + 1;
      counts[e.target] = (counts[e.target] || 0) + 1;
    });
    return counts;
  }, [edges]);

  // Telemetry counts
  const telemetry = useMemo(() => {
    let primaries = 0;
    let accounts = 0;
    let network = 0;
    let breaches = 0;

    nodes.forEach((n) => {
      const d = (n.data || {}) as EntityNodeData;
      if (d.isPrimary) primaries++;
      const cat = (d.category || '').toUpperCase();
      if (cat.includes('SOCIAL') || cat.includes('USER') || cat.includes('PROFILE')) accounts++;
      if (cat.includes('DOMAIN') || cat.includes('IP')) network++;
      if (cat.includes('BREACH')) breaches++;
    });

    return {
      total: nodes.length,
      primaries,
      accounts,
      network,
      breaches,
    };
  }, [nodes]);

  const getCategoryMeta = (catStr: string = '') => {
    const cat = catStr.toUpperCase();
    if (cat.includes('PERSON')) return { label: 'PERSON', icon: User, color: 'text-blue-400 bg-blue-950/60 border-blue-500/40' };
    if (cat.includes('DOMAIN')) return { label: 'DOMAIN', icon: Globe, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
    if (cat.includes('EMAIL') || cat.includes('MAIL')) return { label: 'EMAIL', icon: Mail, color: 'text-amber-400 bg-amber-950/60 border-amber-500/40' };
    if (cat.includes('IP')) return { label: 'IP ADDRESS', icon: Server, color: 'text-red-400 bg-red-950/60 border-red-500/40' };
    if (cat.includes('SOCIAL') || cat.includes('PROFILE')) return { label: 'SOCIAL', icon: Globe, color: 'text-purple-400 bg-purple-950/60 border-purple-500/40' };
    if (cat.includes('BREACH')) return { label: 'BREACH', icon: Flame, color: 'text-pink-400 bg-pink-950/60 border-pink-500/40' };
    if (cat.includes('DOC') || cat.includes('WIKI')) return { label: 'DOCUMENT', icon: FileText, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-500/40' };
    if (cat.includes('ORG')) return { label: 'ORGANIZATION', icon: Building, color: 'text-orange-400 bg-orange-950/60 border-orange-500/40' };
    return { label: 'USERNAME', icon: User, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40' };
  };

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const d = (n.data || {}) as EntityNodeData;
      const matchesQuery =
        !searchQuery.trim() ||
        d.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const rawCat = (d.category || '').toLowerCase();
      const matchesCat =
        selectedCategory === 'all' ||
        rawCat.includes(selectedCategory.toLowerCase());

      return matchesQuery && matchesCat;
    });
  }, [nodes, searchQuery, selectedCategory]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060911] text-slate-100 overflow-hidden font-mono select-none">
      {/* Top Telemetry HUD */}
      <div className="p-4 border-b border-slate-800/80 bg-[#080d17]/80 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
        <div className="p-3 rounded-2xl bg-[#090f1d] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Entities</div>
            <div className="text-lg font-black text-slate-100 mt-0.5">{telemetry.total}</div>
          </div>
          <Layers className="w-5 h-5 text-cyan-400 opacity-60" />
        </div>

        <div className="p-3 rounded-2xl bg-[#090f1d] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Primary Targets</div>
            <div className="text-lg font-black text-amber-400 mt-0.5">{telemetry.primaries}</div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 opacity-60" />
        </div>

        <div className="p-3 rounded-2xl bg-[#090f1d] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Discovered Accounts</div>
            <div className="text-lg font-black text-purple-400 mt-0.5">{telemetry.accounts}</div>
          </div>
          <User className="w-5 h-5 text-purple-400 opacity-60" />
        </div>

        <div className="p-3 rounded-2xl bg-[#090f1d] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Network & Hosts</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{telemetry.network}</div>
          </div>
          <Globe className="w-5 h-5 text-emerald-400 opacity-60" />
        </div>

        <div className="p-3 rounded-2xl bg-[#090f1d] border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Breach Exposures</div>
            <div className="text-lg font-black text-rose-400 mt-0.5">{telemetry.breaches}</div>
          </div>
          <Flame className="w-5 h-5 text-rose-400 opacity-60" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-[#080d17]/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities by identifier, notes, or tags..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#090f1d] border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {[
            { id: 'all', label: 'All' },
            { id: 'username', label: 'Usernames' },
            { id: 'domain', label: 'Domains' },
            { id: 'ip', label: 'IPs' },
            { id: 'email', label: 'Emails' },
            { id: 'social', label: 'Social' },
            { id: 'breach', label: 'Breaches' },
          ].map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                    : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 bg-slate-900/40'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entities Grid Container */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {filteredNodes.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Layers className="w-10 h-10 text-slate-700" />
            <span>No entities found matching the current search parameters.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredNodes.map((n) => {
              const d = (n.data || {}) as EntityNodeData;
              const meta = getCategoryMeta(d.category || '');
              const Icon = meta.icon;
              const conns = connectionCounts[n.id] || d.metrics?.connections || 0;
              const rawConf = typeof d.confidence === 'number' ? d.confidence : 0.85;
              const confPct = rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100);

              return (
                <div
                  key={n.id}
                  onClick={() => onSelectEntity(d)}
                  className="p-4 rounded-2xl bg-[#090f1d] border border-slate-800/90 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.12)] transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle Neon Accents */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/5 to-transparent pointer-events-none rounded-tr-2xl" />

                  {/* Top Bar: Icon + Category Badge + Confidence Gauge */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-cyan-500/40 transition-colors">
                          <Icon className="w-4 h-4 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-bold ${meta.color}`}>
                              <span>{meta.label}</span>
                            </span>
                            {d.isPrimary && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/50 text-[9px] text-amber-300 font-extrabold uppercase">
                                Primary Target
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {d.subtitle || 'Identified Node'}
                          </div>
                        </div>
                      </div>

                      {/* Confidence Score Pill */}
                      <div className="flex flex-col items-end shrink-0">
                        <div className="text-[10px] text-slate-500">Confidence</div>
                        <div className={`text-xs font-black ${
                          confPct >= 85 ? 'text-emerald-400' : confPct >= 70 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {confPct}%
                        </div>
                      </div>
                    </div>

                    {/* Entity Main Identifier */}
                    <div className="mt-3">
                      <div className="text-sm font-black text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                        {d.label}
                      </div>
                    </div>

                    {/* Notes / Intelligence Summary */}
                    <p className="mt-2 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {d.notes || 'No analytical summary recorded for this entity node.'}
                    </p>

                    {/* Observed Dates */}
                    {d.observedDates?.first && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Observed: {d.observedDates.first} &rarr; {d.observedDates.last || 'Active'}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        <Network className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{conns} Links</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSelectEntity(d)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onViewInGraph(n.id)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title="Highlight on Investigation Graph"
                      >
                        <Network className="w-3 h-3" />
                        <span>Focus</span>
                      </button>

                      {d.url && (
                        <button
                          onClick={() => window.open(d.url, '_blank')}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-300 transition-colors"
                          title="Open External URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
