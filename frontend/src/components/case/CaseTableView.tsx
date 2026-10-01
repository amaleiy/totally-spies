import React, { useState, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { EntityNodeData } from '../EntityNode';
import {
  Search,
  ExternalLink,
  Download,
  Filter,
  Eye,
  Network,
  Shield,
  ArrowUpDown,
  User,
  Globe,
  Mail,
  Server,
  Flame,
  FileText,
  Building,
} from 'lucide-react';

interface CaseTableViewProps {
  nodes: Node[];
  edges: Edge[];
  onSelectEntity: (entity: EntityNodeData) => void;
  onViewInGraph: (nodeId: string) => void;
}

export const CaseTableView: React.FC<CaseTableViewProps> = ({
  nodes,
  edges,
  onSelectEntity,
  onViewInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'label' | 'confidence' | 'connections' | 'category'>('confidence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Precompute connection counts per node ID
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((e) => {
      counts[e.source] = (counts[e.source] || 0) + 1;
      counts[e.target] = (counts[e.target] || 0) + 1;
    });
    return counts;
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

  // Filtered & sorted records
  const filteredNodes = useMemo(() => {
    return nodes
      .filter((n) => {
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
      })
      .sort((a, b) => {
        const da = (a.data || {}) as EntityNodeData;
        const db = (b.data || {}) as EntityNodeData;

        let res = 0;
        if (sortBy === 'label') {
          res = (da.label || '').localeCompare(db.label || '');
        } else if (sortBy === 'confidence') {
          const confA = typeof da.confidence === 'number' ? (da.confidence > 1 ? da.confidence : da.confidence * 100) : 0;
          const confB = typeof db.confidence === 'number' ? (db.confidence > 1 ? db.confidence : db.confidence * 100) : 0;
          res = confA - confB;
        } else if (sortBy === 'connections') {
          const connA = connectionCounts[a.id] || da.metrics?.connections || 0;
          const connB = connectionCounts[b.id] || db.metrics?.connections || 0;
          res = connA - connB;
        } else if (sortBy === 'category') {
          res = (da.category || '').localeCompare(db.category || '');
        }

        return sortOrder === 'desc' ? -res : res;
      });
  }, [nodes, searchQuery, selectedCategory, sortBy, sortOrder, connectionCounts]);

  const toggleSort = (field: 'label' | 'confidence' | 'connections' | 'category') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Label', 'Category', 'Confidence', 'Connections', 'First Observed', 'Last Observed', 'Notes', 'URL'];
    const rows = filteredNodes.map((n) => {
      const d = (n.data || {}) as EntityNodeData;
      const conf = typeof d.confidence === 'number' ? (d.confidence > 1 ? d.confidence : Math.round(d.confidence * 100)) : 0;
      const conns = connectionCounts[n.id] || d.metrics?.connections || 0;
      return [
        `"${n.id}"`,
        `"${(d.label || '').replace(/"/g, '""')}"`,
        `"${d.category || ''}"`,
        conf,
        conns,
        `"${d.observedDates?.first || ''}"`,
        `"${d.observedDates?.last || ''}"`,
        `"${(d.notes || '').replace(/"/g, '""')}"`,
        `"${d.url || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `investigation_entities_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060911] text-slate-100 overflow-hidden font-mono select-none">
      {/* Control & Filter Header */}
      <div className="p-4 border-b border-slate-800/80 bg-[#080d17]/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter entities, categories, notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#090f1d] border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#090f1d] border border-slate-800/90 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/60 font-mono"
          >
            <option value="all">All Categories</option>
            <option value="username">Username</option>
            <option value="person">Person</option>
            <option value="domain">Domain</option>
            <option value="email">Email</option>
            <option value="ip">IP Address</option>
            <option value="social">Social</option>
            <option value="breach">Breach</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="text-[11px] text-slate-400 mr-2">
            Showing <strong className="text-cyan-400">{filteredNodes.length}</strong> of {nodes.length} entities
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#080d16] text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 font-bold">
                <button
                  onClick={() => toggleSort('label')}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  <span>Entity / Identifier</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-4 font-bold">
                <button
                  onClick={() => toggleSort('category')}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  <span>Category</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-4 font-bold">
                <button
                  onClick={() => toggleSort('confidence')}
                  className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-4 font-bold text-center">
                <button
                  onClick={() => toggleSort('connections')}
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                >
                  <span>Links</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-4 font-bold">Observed Period</th>
              <th className="py-3 px-4 font-bold">Notes / Assessment</th>
              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredNodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-slate-600 opacity-40" />
                    <span>No entities match the selected filters or search query.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredNodes.map((n) => {
                const d = (n.data || {}) as EntityNodeData;
                const meta = getCategoryMeta(d.category || '');
                const Icon = meta.icon;
                const conns = connectionCounts[n.id] || d.metrics?.connections || 0;
                const rawConf = typeof d.confidence === 'number' ? d.confidence : 0.85;
                const confPct = rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100);

                return (
                  <tr
                    key={n.id}
                    onClick={() => onSelectEntity(d)}
                    className="hover:bg-slate-900/50 transition-colors cursor-pointer group"
                  >
                    {/* Entity Identifier */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                              {d.label}
                            </span>
                            {d.isPrimary && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/50 text-[9px] text-amber-300 font-extrabold uppercase">
                                Primary Target
                              </span>
                            )}
                          </div>
                          {d.subtitle && (
                            <div className="text-[10px] text-slate-500 truncate">
                              {d.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{meta.label}</span>
                      </span>
                    </td>

                    {/* Confidence Meter */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              confPct >= 85 ? 'bg-emerald-400' : confPct >= 70 ? 'bg-amber-400' : 'bg-rose-400'
                            }`}
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-300 w-8 text-right">
                          {confPct}%
                        </span>
                      </div>
                    </td>

                    {/* Connections Count */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                        <Network className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{conns}</span>
                      </span>
                    </td>

                    {/* Observed Range */}
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-400">
                      {d.observedDates?.first ? (
                        <span>
                          {d.observedDates.first} &rarr; {d.observedDates.last || 'Present'}
                        </span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>

                    {/* Notes / Assessment */}
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-400">
                      {d.notes || <span className="text-slate-600 italic">No notes recorded</span>}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectEntity(d)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Inspect Entity Details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => onViewInGraph(n.id)}
                          className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="View on Interactive Graph"
                        >
                          <Network className="w-2.5 h-2.5" />
                          <span>Graph</span>
                        </button>

                        {d.url && (
                          <button
                            onClick={() => window.open(d.url, '_blank')}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-300 transition-colors"
                            title="Open Observed Source URL"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
