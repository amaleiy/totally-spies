import React, { useState, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { EntityNodeData } from '../EntityNode';
import {
  Network,
  Search,
  ArrowRight,
  ExternalLink,
  Shield,
  Layers,
  Filter,
  CheckCircle2,
  Share2,
  Sparkles,
  User,
  Globe,
  Mail,
  Server,
  Flame,
  FileText,
  Building,
} from 'lucide-react';

interface CaseRelationshipsViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectEntity: (entity: EntityNodeData) => void;
  onViewInGraph: (nodeId: string) => void;
}

export const CaseRelationshipsView: React.FC<CaseRelationshipsViewProps> = ({
  nodes,
  edges,
  onSelectEntity,
  onViewInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Map nodes by ID for fast lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, Node>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Extract unique edge labels / types
  const relationTypes = useMemo(() => {
    const types = new Set<string>();
    edges.forEach((e) => {
      const lbl = (e.label as string) || 'ASSOCIATED_WITH';
      types.add(lbl);
    });
    return Array.from(types).sort();
  }, [edges]);

  // Normalize category icon and color
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

  const getRelationBadgeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('USER') || t.includes('ACCOUNT')) return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300';
    if (t.includes('REGISTER') || t.includes('RESOLVE')) return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
    if (t.includes('EMAIL') || t.includes('MAIL')) return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
    if (t.includes('FOUND') || t.includes('BREACH')) return 'bg-rose-950/80 border-rose-500/50 text-rose-300';
    if (t.includes('SAME') || t.includes('IDENTIF')) return 'bg-purple-950/80 border-purple-500/50 text-purple-300';
    return 'bg-slate-900 border-slate-700 text-slate-300';
  };

  // Filtered Edges
  const filteredEdges = useMemo(() => {
    return edges.filter((e) => {
      const type = (e.label as string) || 'ASSOCIATED_WITH';
      const sourceNode = nodeMap.get(e.source);
      const targetNode = nodeMap.get(e.target);

      const sourceData = (sourceNode?.data || {}) as EntityNodeData;
      const targetData = (targetNode?.data || {}) as EntityNodeData;

      const matchesType = selectedType === 'all' || type === selectedType;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        type.toLowerCase().includes(q) ||
        sourceData.label?.toLowerCase().includes(q) ||
        targetData.label?.toLowerCase().includes(q) ||
        sourceData.category?.toLowerCase().includes(q) ||
        targetData.category?.toLowerCase().includes(q);

      return matchesType && matchesSearch;
    });
  }, [edges, nodeMap, selectedType, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060911] text-slate-100 overflow-hidden font-mono select-none">
      {/* Top Header / Stats */}
      <div className="p-4 border-b border-slate-800/80 bg-[#080d17]/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search source, target, or relationship type..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#090f1d] border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#090f1d] border border-slate-800/90 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/60 font-mono"
          >
            <option value="all">All Relationship Types</option>
            {relationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-400">
            Showing <strong className="text-cyan-400">{filteredEdges.length}</strong> of {edges.length} relationships
          </div>
        </div>
      </div>

      {/* Relationship Cards List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredEdges.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Network className="w-10 h-10 text-slate-700" />
            <span>No relationships match the selected criteria.</span>
          </div>
        ) : (
          filteredEdges.map((e) => {
            const sourceNode = nodeMap.get(e.source);
            const targetNode = nodeMap.get(e.target);

            const sourceData = (sourceNode?.data || { label: e.source, category: 'ENTITY' }) as EntityNodeData;
            const targetData = (targetNode?.data || { label: e.target, category: 'ENTITY' }) as EntityNodeData;

            const sourceMeta = getCategoryMeta(sourceData.category);
            const targetMeta = getCategoryMeta(targetData.category);

            const SourceIcon = sourceMeta.icon;
            const TargetIcon = targetMeta.icon;

            const relationLabel = (e.label as string) || 'ASSOCIATED_WITH';
            const badgeClass = getRelationBadgeColor(relationLabel);

            return (
              <div
                key={e.id}
                className="p-3.5 rounded-2xl bg-[#090f1d] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Source & Relation Flow */}
                <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Source Node */}
                  <div
                    onClick={() => onSelectEntity(sourceData)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 cursor-pointer min-w-0 flex-1 sm:flex-initial transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
                      <SourceIcon className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                        {sourceData.label}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">
                        {sourceMeta.label}
                      </div>
                    </div>
                  </div>

                  {/* Directed Relation Arrow Badge */}
                  <div className="flex items-center gap-1.5 shrink-0 px-1 text-center">
                    <div className="w-4 h-[1px] bg-slate-700 hidden sm:block" />
                    <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wide shadow-sm flex items-center gap-1.5 ${badgeClass}`}>
                      <span>{relationLabel}</span>
                      <ArrowRight className="w-3 h-3 opacity-70" />
                    </span>
                    <div className="w-4 h-[1px] bg-slate-700 hidden sm:block" />
                  </div>

                  {/* Target Node */}
                  <div
                    onClick={() => onSelectEntity(targetData)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 cursor-pointer min-w-0 flex-1 sm:flex-initial transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-950 flex items-center justify-center shrink-0">
                      <TargetIcon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                        {targetData.label}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase">
                        {targetMeta.label}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Bar */}
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => onViewInGraph(e.source)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    title="Focus on Graph"
                  >
                    <Network className="w-3 h-3" />
                    <span>Focus Source</span>
                  </button>

                  <button
                    onClick={() => onViewInGraph(e.target)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    title="Focus Target on Graph"
                  >
                    <Network className="w-3 h-3" />
                    <span>Focus Target</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
