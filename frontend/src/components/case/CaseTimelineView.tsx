import React, { useState, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { EntityNodeData } from '../EntityNode';
import {
  Clock,
  Search,
  Calendar,
  Network,
  Eye,
  Shield,
  Flame,
  Globe,
  User,
  Server,
  Sparkles,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface CaseTimelineViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectEntity: (entity: EntityNodeData) => void;
  onViewInGraph: (nodeId: string) => void;
}

interface TimelineEvent {
  id: string;
  dateStr: string;
  dateSort: number;
  title: string;
  category: 'REGISTRATION' | 'BREACH' | 'ACTIVITY' | 'SCAN' | 'INFRASTRUCTURE';
  summary: string;
  entityId?: string;
  entityLabel?: string;
  entityCategory?: string;
  color: string;
  icon: any;
}

export const CaseTimelineView: React.FC<CaseTimelineViewProps> = ({
  nodes,
  edges,
  onSelectEntity,
  onViewInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'REGISTRATION' | 'BREACH' | 'ACTIVITY' | 'INFRASTRUCTURE'>('all');

  // Synthesize chronological milestones from nodes and relationships
  const events: TimelineEvent[] = useMemo(() => {
    const list: TimelineEvent[] = [];

    nodes.forEach((n) => {
      const d = (n.data || {}) as EntityNodeData;
      const rawCat = (d.category || '').toUpperCase();

      const isDomain = rawCat.includes('DOMAIN');
      const isIP = rawCat.includes('IP');
      const isBreach = rawCat.includes('BREACH');

      // Primary date stamp
      const firstDateStr =
        d.observedDates?.first ||
        d.metadata?.created_at?.split('T')[0] ||
        (d as any).created_at?.split('T')[0];

      if (firstDateStr) {
        let cat: TimelineEvent['category'] = 'REGISTRATION';
        let color = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50';
        let Icon = Globe;

        if (isBreach) {
          cat = 'BREACH';
          color = 'text-rose-400 bg-rose-950/80 border-rose-500/50';
          Icon = Flame;
        } else if (isIP) {
          cat = 'INFRASTRUCTURE';
          color = 'text-red-400 bg-red-950/80 border-red-500/50';
          Icon = Server;
        } else if (d.isPrimary) {
          cat = 'REGISTRATION';
          color = 'text-cyan-400 bg-cyan-950/80 border-cyan-500/50';
          Icon = User;
        } else if (!isDomain) {
          cat = 'ACTIVITY';
          color = 'text-purple-400 bg-purple-950/80 border-purple-500/50';
          Icon = Sparkles;
        }

        const date = new Date(firstDateStr);
        const sortVal = isNaN(date.getTime()) ? 0 : date.getTime();

        list.push({
          id: `ev-first-${n.id}`,
          dateStr: firstDateStr,
          dateSort: sortVal,
          title: d.isPrimary
            ? `Target Enlisted: ${d.label}`
            : isDomain
            ? `Domain Identified: ${d.label}`
            : isBreach
            ? `Breach Telemetry: ${d.label}`
            : `Profile Discovered: ${d.label}`,
          category: cat,
          summary: d.notes || (d.url ? `Resolved target asset: ${d.url}` : `Discovered intelligence sighting for entity ${d.label}.`),
          entityId: n.id,
          entityLabel: d.label,
          entityCategory: d.category || 'ENTITY',
          color,
          icon: Icon,
        });
      }

      // 2. Last Observed / Verification
      if (d.observedDates?.last && d.observedDates.last !== firstDateStr) {
        const date = new Date(d.observedDates.last);
        const sortVal = isNaN(date.getTime()) ? 0 : date.getTime();

        list.push({
          id: `ev-last-${n.id}`,
          dateStr: d.observedDates.last,
          dateSort: sortVal,
          title: `Telemetry Verification: ${d.label}`,
          category: 'ACTIVITY',
          summary: `Active telemetry confirmed across associated network and identity nodes.`,
          entityId: n.id,
          entityLabel: d.label,
          entityCategory: d.category || 'ENTITY',
          color: 'text-cyan-400 bg-cyan-950/80 border-cyan-500/50',
          icon: Sparkles,
        });
      }
    });

    // Sort chronologically (oldest to newest)
    return list.sort((a, b) => a.dateSort - b.dateSort);
  }, [nodes]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesCat = selectedFilter === 'all' || ev.category === selectedFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        ev.summary.toLowerCase().includes(q) ||
        ev.dateStr.toLowerCase().includes(q) ||
        ev.entityLabel?.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [events, selectedFilter, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060911] text-slate-100 overflow-hidden font-mono select-none">
      {/* Top Header & Filter Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-[#080d17]/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline milestones, dates, or entities..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#090f1d] border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'REGISTRATION', label: 'Origins' },
              { id: 'BREACH', label: 'Breaches' },
              { id: 'INFRASTRUCTURE', label: 'Network' },
              { id: 'ACTIVITY', label: 'Activity' },
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
            Timeline: <strong className="text-cyan-400">{filteredEvents.length}</strong> chronological milestones
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {filteredEvents.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Clock className="w-10 h-10 text-slate-700" />
            <span>No chronological events match the query.</span>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
            {filteredEvents.map((ev) => {
              const Icon = ev.icon;
              const parentNode = ev.entityId ? nodes.find((n) => n.id === ev.entityId) : null;
              const entityData = (parentNode?.data || {}) as EntityNodeData;

              return (
                <div key={ev.id} className="relative group">
                  {/* Glowing Node Dot on Timeline Spine */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-[#090f1d] border-2 border-slate-700 flex items-center justify-center group-hover:border-cyan-400 transition-colors shadow-lg">
                    <Icon className="w-3 h-3 text-cyan-400" />
                  </div>

                  {/* Event Card */}
                  <div className="p-4 rounded-2xl bg-[#090f1d] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-bold">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>{ev.dateStr}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase ${ev.color}`}>
                          {ev.category}
                        </span>
                      </div>

                      {ev.entityLabel && (
                        <div className="text-[10px] text-slate-500">
                          Target: <strong className="text-slate-300">{ev.entityLabel}</strong>
                        </div>
                      )}
                    </div>

                    <div className="text-sm font-black text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {ev.title}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {ev.summary}
                    </p>

                    {/* Action Bar */}
                    {ev.entityId && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectEntity(entityData)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold transition-colors"
                        >
                          Inspect Entity
                        </button>

                        <button
                          onClick={() => onViewInGraph(ev.entityId!)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Network className="w-3 h-3" />
                          <span>Focus in Graph</span>
                        </button>
                      </div>
                    )}
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
