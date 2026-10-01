import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useNodesState, useEdgesState, Node, Edge } from '@xyflow/react';

import {
  fetchCase,
  fetchCaseGraph,
  fetchCaseScans,
  fetchCases,
  createCase,
  createTarget,
  createScan,
  deleteArtifact,
  cancelScan,
  exportCaseReport,
} from '../api/client';
import { Case, Scan, GraphNode, GraphEdge } from '../types';
import { useScanWebSocket } from '../hooks/useScanWebSocket';

import { Sidebar } from '../components/layout/Sidebar';
import { InvestigationGraph } from '../components/InvestigationGraph';
import { EntityNodeData } from '../components/EntityNode';
import { CaseTableView } from '../components/case/CaseTableView';
import { CaseEntitiesView } from '../components/case/CaseEntitiesView';
import { CaseRelationshipsView } from '../components/case/CaseRelationshipsView';
import { CaseEvidenceView } from '../components/case/CaseEvidenceView';
import { CaseTimelineView } from '../components/case/CaseTimelineView';

import {
  Network,
  Plus,
  Download,
  Filter,
  Sparkles,
  Search,
  X,
  ExternalLink,
  Shield,
  Clock,
  Layers,
  Activity,
  User,
  Globe,
  Mail,
  Server,
  Flame,
  FileText,
  Building,
  ChevronRight,
  MoreHorizontal,
  CheckCircle2,
  FolderPlus,
  Play,
  Share2,
} from 'lucide-react';
import { decodeHtmlEntities } from '../utils/formatters';

export const CaseView: React.FC = () => {
  const { id: routeCaseId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeCaseId, setActiveCaseId] = useState<string | null>(routeCaseId || null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityNodeData | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'graph' | 'table' | 'entities' | 'relationships' | 'evidence' | 'timeline'>('graph');
  const [activeEntityTab, setActiveEntityTab] = useState<'overview' | 'relationships' | 'evidence' | 'timeline'>('overview');

  // Search & Filter State
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Progressive Disclosure State
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());

  // Modals state
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [targetType, setTargetType] = useState('USERNAME');
  const [targetValue, setTargetValue] = useState('');
  const [targetNotes, setTargetNotes] = useState('');
  const [exportFeedback, setExportFeedback] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 1. Initial Load of Case & Graph
  const loadCaseAndGraph = useCallback(async () => {
    try {
      let cId = activeCaseId;
      if (!cId) {
        const existingCases = await fetchCases();
        if (existingCases.length > 0) {
          cId = existingCases[0].id;
          setActiveCaseId(cId);
        } else {
          // Auto-seed an initial investigation case if none exist
          const created = await createCase({
            title: 'Primary OSINT Investigation',
            description: 'OSINT reconnaissance mapping identity, accounts, domain infrastructure, and breach exposures.',
            tags: ['recon', 'investigation'],
          });
          cId = created.id;
          setActiveCaseId(cId);
        }
      }

      const [fetchedCase, fetchedGraph, fetchedScans] = await Promise.all([
        fetchCase(cId),
        fetchCaseGraph(cId),
        fetchCaseScans(cId),
      ]);

      setCaseData(fetchedCase);
      setScans(fetchedScans);

      // If backend graph has nodes, normalize and merge
      if (fetchedGraph.nodes && fetchedGraph.nodes.length > 0) {
        const degreeCounts: Record<string, number> = {};
        (fetchedGraph.edges || []).forEach((e) => {
          degreeCounts[e.source] = (degreeCounts[e.source] || 0) + 1;
          degreeCounts[e.target] = (degreeCounts[e.target] || 0) + 1;
        });

        const mappedNodes: Node[] = fetchedGraph.nodes.map((n, idx) => {
          const isTarget = n.type === 'targetNode';
          const cat = isTarget ? (n.data?.targetType || 'USERNAME') : (n.data?.node_type || 'SOCIAL');
          const connCount = degreeCounts[n.id] || 0;
          return {
            id: n.id,
            type: 'entityNode',
            position: n.position || { x: 350 + (idx % 4) * 220, y: 200 + Math.floor(idx / 4) * 160 },
            data: {
              label: n.data?.label || 'Entity',
              category: cat,
              subtitle: isTarget ? `${n.data?.targetType || 'Target'} Profile` : n.data?.node_type || 'Artifact',
              confidence: n.data?.confidence ?? 0.9,
              isPrimary: isTarget && idx === 0,
              metrics: { connections: connCount, scans: fetchedScans.length, evidence: connCount > 0 ? 1 : 0 },
              notes: n.data?.notes || '',
              url: n.data?.url,
              metadata: n.data?.metadata,
              created_at: n.data?.created_at,
            },
          };
        });

        const mappedEdges: Edge[] = (fetchedGraph.edges || []).map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || 'ASSOCIATED_WITH',
          type: 'labeledEdge',
          animated: true,
        }));

        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setVisibleNodeIds(new Set(mappedNodes.map((n) => n.id)));
        if (mappedNodes.length > 0) {
          setSelectedEntity(mappedNodes[0].data as EntityNodeData);
        } else {
          setSelectedEntity(null);
        }
      } else {
        setNodes([]);
        setEdges([]);
        setVisibleNodeIds(new Set());
        setSelectedEntity(null);
      }
    } catch (err) {
      console.error('Failed to load case data or graph:', err);
      setNodes([]);
      setEdges([]);
      setVisibleNodeIds(new Set());
      setSelectedEntity(null);
    }
  }, [activeCaseId, setNodes, setEdges]);

  useEffect(() => {
    loadCaseAndGraph();
  }, [loadCaseAndGraph]);

  // 2. Real-time Node & Edge Discovered Handlers via WebSocket
  const handleNodeDiscovered = useCallback(
    (newNode: GraphNode) => {
      setNodes((nds) => {
        if (nds.some((n) => n.id === newNode.id)) return nds;
        const targetNodes = nds.filter((n) => (n.data as any)?.isPrimary);
        const center = targetNodes[0]?.position || { x: 420, y: 280 };
        const radius = 260;
        const currentCount = nds.length;
        const angle = (currentCount * 40 * Math.PI) / 180;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);

        return [
          ...nds,
          {
            id: newNode.id,
            type: 'entityNode',
            position: { x: Math.round(x), y: Math.round(y) },
            data: {
              label: newNode.data.label,
              category: newNode.data.node_type || 'SOCIAL',
              subtitle: newNode.data.node_type || 'Discovered Artifact',
              confidence: newNode.data.confidence || 0.88,
              metrics: { connections: 3, scans: 1, evidence: 1 },
              url: newNode.data.url,
              metadata: newNode.data.metadata,
            },
          },
        ];
      });
      setVisibleNodeIds((prev) => new Set([...prev, newNode.id]));
    },
    [setNodes]
  );

  const handleEdgeDiscovered = useCallback(
    (newEdge: GraphEdge) => {
      setEdges((eds) => {
        if (eds.some((e) => e.id === newEdge.id)) return eds;
        return [
          ...eds,
          {
            id: newEdge.id,
            source: newEdge.source,
            target: newEdge.target,
            label: newEdge.label || 'ASSOCIATED_WITH',
            type: 'labeledEdge',
            animated: true,
          },
        ];
      });
    },
    [setEdges]
  );

  // 3. WebSocket Setup
  const { isConnected } = useScanWebSocket({
    caseId: activeCaseId || '',
    onNodeDiscovered: handleNodeDiscovered,
    onEdgeDiscovered: handleEdgeDiscovered,
  });

  // Action: Select Node
  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedEntity(node.data as EntityNodeData);
  };

  // Action: Progressive Expansion on Double Click or Button
  const handleNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    handleExpandNode(node.id);
  };

  const handleExpandNode = (nodeId?: string) => {
    const targetId = nodeId || (selectedEntity && nodes.find((n) => n.data?.label === selectedEntity.label)?.id);
    if (!targetId) return;

    setExpandedNodeIds((prev) => new Set([...prev, targetId]));
    // Reveal all edges connected to this node
    const connectedNodeIds = new Set<string>();
    edges.forEach((e) => {
      if (e.source === targetId) connectedNodeIds.add(e.target);
      if (e.target === targetId) connectedNodeIds.add(e.source);
    });

    setVisibleNodeIds((prev) => {
      const next = new Set(prev);
      connectedNodeIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // Action: Auto-Expand All Nodes
  const handleAutoExpand = () => {
    setVisibleNodeIds(new Set(nodes.map((n) => n.id)));
    setExpandedNodeIds(new Set(nodes.map((n) => n.id)));
  };

  // Action: Auto-Organize Layout Radially
  const handleOrganizeLayout = () => {
    const primaryNode = nodes.find((n) => (n.data as any)?.isPrimary) || nodes[0];
    if (!primaryNode) return;

    const center = { x: 420, y: 280 };
    const radius = 280;
    const otherNodes = nodes.filter((n) => n.id !== primaryNode.id);

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === primaryNode.id) {
          return { ...n, position: center };
        }
        const idx = otherNodes.findIndex((o) => o.id === n.id);
        const angle = (2 * Math.PI * idx) / Math.max(otherNodes.length, 1);
        return {
          ...n,
          position: {
            x: Math.round(center.x + radius * Math.cos(angle)),
            y: Math.round(center.y + radius * Math.sin(angle)),
          },
        };
      })
    );
  };

  // Action: Switch to Graph View and Focus on a Specific Node
  const handleViewInGraph = useCallback(
    (nodeId: string) => {
      setActiveViewTab('graph');
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (targetNode) {
        setSelectedEntity(targetNode.data as EntityNodeData);
        setExpandedNodeIds((prev) => new Set([...prev, nodeId]));
        setVisibleNodeIds((prev) => new Set([...prev, nodeId]));
      }
    },
    [nodes]
  );

  // Filtered Nodes & Edges based on Category & Search
  const visibleNodes = useMemo(() => {
    return nodes
      .filter((n) => visibleNodeIds.has(n.id))
      .filter((n) => {
        const d = n.data as EntityNodeData;
        const matchesSearch =
          !searchFilter.trim() ||
          d.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (d.subtitle && d.subtitle.toLowerCase().includes(searchFilter.toLowerCase()));

        if (!matchesSearch) return false;

        if (selectedCategory === 'all') return true;
        const cat = (d.category || '').toLowerCase();
        return cat.includes(selectedCategory.toLowerCase());
      });
  }, [nodes, visibleNodeIds, searchFilter, selectedCategory]);

  const visibleEdges = useMemo(() => {
    const visibleIdSet = new Set(visibleNodes.map((n) => n.id));
    return edges.filter((e) => visibleIdSet.has(e.source) && visibleIdSet.has(e.target));
  }, [edges, visibleNodes]);

  // Action: Add Target to Case
  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim() || !activeCaseId) return;

    await createTarget(activeCaseId, {
      type: targetType,
      value: targetValue.trim(),
      notes: targetNotes.trim(),
    });
    setTargetValue('');
    setTargetNotes('');
    setShowTargetModal(false);
    await loadCaseAndGraph();
  };

  // Action: Export Graph Dossier
  const handleExportGraph = async () => {
    if (!activeCaseId) return;
    try {
      setExportFeedback(true);
      const data = await exportCaseReport(activeCaseId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TotallySpies-Graph-${activeCaseId.slice(0, 8)}.json`;
      a.click();
      setTimeout(() => setExportFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to export graph:', err);
      setExportFeedback(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#060910] text-slate-100 overflow-hidden font-sans">
      {/* 1. Left Tactical Sidebar */}
      <Sidebar />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar matching reference image */}
        <header className="h-16 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex-1 max-w-md relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search entities, domains, IPs, usernames, emails..."
                className="w-full pl-10 pr-16 py-2 bg-slate-900/80 border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
              />
              <div className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-mono text-slate-400 select-none">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Graph Engine</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-[10px] font-bold text-emerald-200">
                  Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Live WS</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-900/60 text-[10px] font-bold text-cyan-200">
                  Connected
                </span>
              </div>
            </div>

            {/* Tactical Anonymous Profile Avatar */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1px] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center text-cyan-300 text-xs font-bold">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Subheader Toolbar matching media_1790758048229.jpg */}
        <div className="px-6 py-3.5 border-b border-slate-800/80 bg-[#080d16]/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <span>Investigation Graph</span>
              </h1>
              <p className="text-xs text-slate-400 font-normal">
                Visualize relationships between entities from multiple OSINT sources.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTargetModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add to Case</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Import Data</span>
            </button>

            <button
              onClick={handleAutoExpand}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
              title="Progressively reveal all hidden relationships"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Expand</span>
            </button>

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                showFilters
                  ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            <button
              onClick={handleExportGraph}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all"
            >
              {exportFeedback ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Exported!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Graph</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Tabs Row */}
        <div className="px-6 border-b border-slate-800/80 bg-[#080c14]/40 flex items-center gap-3">
          {[
            { id: 'graph', label: 'Graph View' },
            { id: 'table', label: 'Table View' },
            { id: 'entities', label: 'Entities' },
            { id: 'relationships', label: 'Relationships' },
            { id: 'evidence', label: 'Evidence' },
            { id: 'timeline', label: 'Timeline' },
          ].map((tab) => {
            const isActive = activeViewTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveViewTab(tab.id as any)}
                className={`py-2 px-3 text-xs font-bold transition-all relative border-b-2 -mb-[1px] ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 font-extrabold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Optional Collapsible Filter Bar */}
        {showFilters && (
          <div className="px-6 py-2 border-b border-slate-800/80 bg-[#080d16]/95 flex items-center gap-2 flex-wrap text-xs font-mono select-none">
            <span className="text-slate-400 mr-2 text-[10px] font-bold uppercase tracking-wider">Category Filters:</span>
            {[
              { id: 'all', label: 'All Entities' },
              { id: 'person', label: 'Person' },
              { id: 'username', label: 'Username' },
              { id: 'domain', label: 'Domain' },
              { id: 'email', label: 'Email' },
              { id: 'ip_address', label: 'IP Address' },
              { id: 'social', label: 'Social' },
              { id: 'breach', label: 'Breach' },
            ].map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                    isActive
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                      : 'border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Center Expanse: Main View Canvas (Graph / Table / Entities / Relationships / Evidence / Timeline) + Right Entity Intelligence Panel */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Main Active View Area */}
          <div className="flex-1 h-full relative overflow-hidden">
            {activeViewTab === 'graph' && (
              <InvestigationGraph
                nodes={visibleNodes}
                edges={visibleEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onPaneClick={() => {}}
                onOrganizeLayout={handleOrganizeLayout}
                searchQuery={searchFilter}
                onSearchChange={setSearchFilter}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
            )}

            {activeViewTab === 'table' && (
              <CaseTableView
                nodes={visibleNodes}
                edges={edges}
                onSelectEntity={setSelectedEntity}
                onViewInGraph={handleViewInGraph}
              />
            )}

            {activeViewTab === 'entities' && (
              <CaseEntitiesView
                nodes={visibleNodes}
                edges={edges}
                onSelectEntity={setSelectedEntity}
                onViewInGraph={handleViewInGraph}
              />
            )}

            {activeViewTab === 'relationships' && (
              <CaseRelationshipsView
                nodes={nodes}
                edges={edges}
                onSelectEntity={setSelectedEntity}
                onViewInGraph={handleViewInGraph}
              />
            )}

            {activeViewTab === 'evidence' && (
              <CaseEvidenceView
                nodes={visibleNodes}
                edges={edges}
                onSelectEntity={setSelectedEntity}
                onViewInGraph={handleViewInGraph}
              />
            )}

            {activeViewTab === 'timeline' && (
              <CaseTimelineView
                nodes={visibleNodes}
                edges={edges}
                onSelectEntity={setSelectedEntity}
                onViewInGraph={handleViewInGraph}
              />
            )}
          </div>

          {/* Right Entity Details Drawer matching media_1790758048229.jpg */}
          {selectedEntity && (
            <aside className="w-80 lg:w-96 border-l border-slate-800/90 bg-[#090f1d]/95 backdrop-blur-2xl flex flex-col h-full z-20 shadow-2xl shrink-0 overflow-hidden animate-in slide-in-from-right duration-200 font-mono">
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-800/90 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Entity Details
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs Row */}
              <div className="flex items-center border-b border-slate-800 px-4 text-xs">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'relationships', label: `Relationships (${selectedEntity.metrics?.connections ?? 0})` },
                  { id: 'evidence', label: `Evidence (${selectedEntity.metrics?.evidence ?? 0})` },
                  { id: 'timeline', label: 'Timeline' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveEntityTab(t.id as any)}
                    className={`py-2 px-2.5 text-[11px] font-bold border-b-2 -mb-[1px] transition-colors ${
                      activeEntityTab === t.id
                        ? 'border-cyan-400 text-cyan-300'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
                {/* Hero Entity Card */}
                <div className="p-3.5 rounded-2xl bg-[#060910]/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-100 truncate">
                        {selectedEntity.label}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        Verified Intel
                      </span>
                    </div>
                  </div>

                  <button className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Key-Value Properties List */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Entity Type</span>
                    <span className="text-slate-200 font-bold">{selectedEntity.category || 'Entity'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Identifier</span>
                    <span className="text-cyan-300 font-bold truncate max-w-[180px]">{selectedEntity.label}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Confidence</span>
                    <span className="text-emerald-400 font-bold">
                      {typeof selectedEntity.confidence === 'number'
                        ? (selectedEntity.confidence > 1 ? Math.round(selectedEntity.confidence) : Math.round(selectedEntity.confidence * 100))
                        : 100}%
                    </span>
                  </div>

                  {selectedEntity.metadata?.engine && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Recon Engine</span>
                      <span className="text-cyan-400 font-mono font-semibold uppercase">{selectedEntity.metadata.engine}</span>
                    </div>
                  )}

                  {selectedEntity.metadata?.status_code && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">HTTP Status</span>
                      <span className="text-emerald-400 font-mono font-semibold">{selectedEntity.metadata.status_code} OK</span>
                    </div>
                  )}

                  {selectedEntity.metadata?.response_time && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Response Latency</span>
                      <span className="text-slate-300 font-mono">{Number(selectedEntity.metadata.response_time).toFixed(2)}s</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">Relationship Count</span>
                    <span className="text-slate-200 font-mono">
                      <strong className="text-cyan-400">{selectedEntity.metrics?.connections ?? 0}</strong> direct
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 text-[11px] block mb-1">Notes:</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      {selectedEntity.notes || (selectedEntity.url ? `Source URL: ${selectedEntity.url}` : 'No analyst notes recorded for this entity.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-4 border-t border-slate-800/90 grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExpandNode()}
                  className="py-2 px-2 rounded-xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Expand Node</span>
                </button>

                <button
                  onClick={() => setActiveEntityTab('evidence')}
                  className="py-2 px-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  <span>View Evidence</span>
                </button>

                <button
                  onClick={() => {
                    if (selectedEntity.url) window.open(selectedEntity.url, '_blank');
                  }}
                  disabled={!selectedEntity.url}
                  className="py-2 px-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-40"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Profile</span>
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD TARGET TO CASE */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#090f1d] border border-cyan-500/60 rounded-3xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.35)] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Target to Investigation Case</span>
              </div>
              <button
                onClick={() => setShowTargetModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTarget} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Target Type:</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="USERNAME">Username</option>
                  <option value="DOMAIN">Domain Name</option>
                  <option value="EMAIL">Email Address</option>
                  <option value="IP">IP Address</option>
                  <option value="PERSON">Person Identity</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Target Value:</label>
                <input
                  type="text"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g. torvalds, kernel.org, 185.199.110.153"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Reconnaissance Notes (Optional):</label>
                <textarea
                  rows={2}
                  value={targetNotes}
                  onChange={(e) => setTargetNotes(e.target.value)}
                  placeholder="Additional context or intelligence objective..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold"
                >
                  Add Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT DATA DOSSIER */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#090f1d] border border-cyan-500/60 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.35)] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <FolderPlus className="w-4 h-4" />
                <span>Import Investigation Dossier</span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Upload or drop an exported OSINT Dossier JSON file containing targets, artifacts, and relationship edges.
              </p>
              <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/60">
                <Share2 className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-80" />
                <span className="text-slate-300 block font-bold">Click to select JSON file</span>
                <span className="text-slate-500 text-[10px] block mt-1">Supports Totally Spies & Maltego JSON exports</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
