import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCases,
  createCase,
  deleteCase,
  createTarget,
  createScan,
  fetchStats,
  fetchActivity,
} from '../api/client';
import { Case } from '../types';

import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { TelemetrySidebar } from '../components/layout/TelemetrySidebar';

import {
  FolderKanban,
  Crosshair,
  Radar,
  Database,
  Box,
  Sparkles,
  Globe,
  Network,
  ArrowRight,
  MoreVertical,
  Plus,
  Play,
  Shield,
  Clock,
  CheckCircle2,
  Trash2,
  Layers,
  ChevronRight,
  Activity
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState({
    active_cases: 0,
    tracked_targets: 0,
    executed_scans: 0,
    discovered_artifacts: 0,
    active_agents: 3,
  });
  const [activity, setActivity] = useState<Array<{ id: string; type: string; message: string; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showAddTargetModal, setShowAddTargetModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);

  // Form states
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDesc, setCaseDesc] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [targetType, setTargetType] = useState('USERNAME');
  const [targetValue, setTargetValue] = useState('');
  const [scanEngine, setScanEngine] = useState<'whatsmyname' | 'sherlock' | 'merged'>('whatsmyname');

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [casesData, statsData, activityData] = await Promise.all([
        fetchCases(),
        fetchStats().catch(() => ({
          active_cases: 0,
          tracked_targets: 0,
          executed_scans: 0,
          discovered_artifacts: 0,
          active_agents: 3,
        })),
        fetchActivity().catch(() => []),
      ]);

      setCases(casesData);
      setStats({
        active_cases: statsData.active_cases ?? casesData.length,
        tracked_targets: statsData.tracked_targets ?? casesData.reduce((acc, c) => acc + (c.targets?.length || 0), 0),
        executed_scans: statsData.executed_scans ?? casesData.reduce((acc, c) => acc + (c.scans?.length || 0), 0),
        discovered_artifacts: statsData.discovered_artifacts ?? 0,
        active_agents: statsData.active_agents ?? 3,
      });
      setActivity(activityData);

      if (casesData.length > 0 && !selectedCaseId) {
        setSelectedCaseId(casesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseTitle.trim()) return;
    try {
      const created = await createCase({ title: caseTitle.trim(), description: caseDesc.trim() });
      setCaseTitle('');
      setCaseDesc('');
      setShowNewCaseModal(false);
      await loadDashboardData();
      navigate(`/cases/${created.id}`);
    } catch (err) {
      console.error('Failed to create case:', err);
    }
  };

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !targetValue.trim()) return;
    try {
      await createTarget(selectedCaseId, { type: targetType, value: targetValue.trim() });
      setTargetValue('');
      setShowAddTargetModal(false);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to add target:', err);
    }
  };

  const handleLaunchScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase || !currentCase.targets.length) return;
    try {
      await createScan(selectedCaseId, {
        target_id: currentCase.targets[0].id,
        module: 'clover',
        config: { engine: scanEngine, popular_only: true },
      });
      setShowScanModal(false);
      navigate(`/cases/${selectedCaseId}`);
    } catch (err) {
      console.error('Failed to launch scan:', err);
    }
  };

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this case?')) return;
    try {
      await deleteCase(id);
      loadDashboardData();
    } catch (err) {
      console.error('Failed to delete case:', err);
    }
  };

  const openFirstCaseGraph = () => {
    if (cases.length > 0) {
      navigate(`/cases/${cases[0].id}`);
    } else {
      setShowNewCaseModal(true);
    }
  };

  // Format relative time helper
  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a10] text-slate-100 font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        onOpenNewCase={() => setShowNewCaseModal(true)}
        onOpenGraph={openFirstCaseGraph}
      />

      {/* 2. Main Workspace (Center + TopBar) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar onSearch={() => {}} />

        {/* Scrollable Operations Hub */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {/* A. Hero Welcome Banner */}
          <div className="relative rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800/80 p-6 md:p-8 overflow-hidden shadow-2xl">
            {/* Surveillance Grid Overlay Graphic */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none bg-center bg-no-repeat bg-cover"
              style={{
                backgroundImage: `radial-gradient(ellipse at 70% 50%, rgba(6,182,212,0.2) 0%, transparent 60%), linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 24px 24px, 24px 24px',
              }}
            />

            {/* Glowing Neon "Totally Spies" Watermark Signature */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden lg:block opacity-25">
              <span className="text-4xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-cyan-400 font-serif">
                Totally Spies
              </span>
            </div>

            <div className="relative z-10 max-w-2xl space-y-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Welcome Back,{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Agent
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 font-medium">
                Continue your investigations or start a new case.
              </p>
              <div className="pt-2 text-xs font-mono text-cyan-400/90 italic tracking-wide">
                &ldquo;Information is never lost. It just waits to be found.&rdquo;
              </div>
            </div>
          </div>

          {/* B. Metrics Counter Row (5 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Active Cases */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg flex items-center gap-3.5 hover:border-cyan-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-100 font-mono leading-none">
                  {stats.active_cases}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase mt-1 truncate">
                  Active Cases
                </div>
              </div>
            </div>

            {/* 2. Tracked Targets */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg flex items-center gap-3.5 hover:border-emerald-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <Crosshair className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-100 font-mono leading-none">
                  {stats.tracked_targets}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase mt-1 truncate">
                  Tracked Targets
                </div>
              </div>
            </div>

            {/* 3. Executed Scans */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg flex items-center gap-3.5 hover:border-purple-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
                <Radar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-100 font-mono leading-none">
                  {stats.executed_scans}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase mt-1 truncate">
                  Executed Scans
                </div>
              </div>
            </div>

            {/* 4. Discovered Artifacts */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg flex items-center gap-3.5 hover:border-blue-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-100 font-mono leading-none">
                  {stats.discovered_artifacts}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase mt-1 truncate">
                  Discovered Artifacts
                </div>
              </div>
            </div>

            {/* 5. Active Agents */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg flex items-center gap-3.5 hover:border-amber-500/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-110 transition-transform">
                <Box className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-black text-slate-100 font-mono leading-none">
                  {stats.active_agents}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase mt-1 truncate">
                  Active Agents
                </div>
              </div>
            </div>
          </div>

          {/* C. 4 Module Launcher Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Clover - Identity Recon */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-rose-500/30 hover:border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.08)] flex flex-col justify-between transition-all group relative overflow-hidden">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-rose-300 transition-colors">
                    Clover
                  </h3>
                  <div className="text-xs font-mono text-rose-400 font-semibold">
                    Identity Recon
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cross-platform username discovery using multiple reconnaissance engines.
                </p>
              </div>

              <button
                onClick={() => navigate('/clover')}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              >
                <span>Launch Clover Recon</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 2. Breaches - Data Exposure */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-purple-500/30 hover:border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.08)] flex flex-col justify-between transition-all group relative overflow-hidden">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition-colors">
                    Breaches
                  </h3>
                  <div className="text-xs font-mono text-purple-400 font-semibold">
                    Data Exposure
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Search for leaked data, breach incidents, and exposed identifiers.
                </p>
              </div>

              <button
                onClick={() => navigate('/breaches')}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-purple-950/40 border border-purple-500/40 hover:border-purple-400 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              >
                <span>Search Breaches</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 3. Exposure - Host & Asset Intel */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-blue-500/30 hover:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.08)] flex flex-col justify-between transition-all group relative overflow-hidden">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                    Exposure
                  </h3>
                  <div className="text-xs font-mono text-blue-400 font-semibold">
                    Host & Asset Intel
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Discover publicly exposed infrastructure, services, and technologies.
                </p>
              </div>

              <button
                onClick={() => navigate('/exposure')}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-blue-950/40 border border-blue-500/40 hover:border-blue-400 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              >
                <span>Search Assets</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 4. Investigation Graph - Visual Analysis */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/30 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.08)] flex flex-col justify-between transition-all group relative overflow-hidden">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                    Investigation Graph
                  </h3>
                  <div className="text-xs font-mono text-emerald-400 font-semibold">
                    Visual Analysis
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Explore relationships and connections between discovered artifacts.
                </p>
              </div>

              <button
                onClick={openFirstCaseGraph}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                <span>Open Graph</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* D. Bottom Split Section: Recent Cases & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Recent Cases Table (7 Cols) */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  <FolderKanban className="w-4 h-4 text-cyan-400" />
                  <span>Recent Cases</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/cases')}
                    className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                  >
                    <span>View All Cases</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowNewCaseModal(true)}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <span>New Case</span>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>


              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Targets</th>
                      <th className="py-2.5 px-3">Scans</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Updated</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {cases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500 font-mono text-xs">
                          No active cases found. Launch a new investigation above!
                        </td>
                      </tr>
                    ) : (
                      cases.slice(0, 5).map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => navigate(`/cases/${c.id}`)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 text-slate-200 font-semibold group-hover:text-cyan-300 transition-colors">
                              <FolderKanban className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{c.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {c.targets?.length || 0}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {c.scans?.length || 0}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {formatTimeAgo(c.created_at)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => handleDeleteCase(c.id, e)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Delete Case"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Recent Activity Feed (5 Cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>Recent Activity</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Live Timeline</span>
              </div>

              <div className="space-y-3.5 overflow-hidden">
                {activity.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
                    <Activity className="w-6 h-6 text-slate-600" />
                    <span className="text-slate-400 font-medium">No recent activity logged yet</span>
                    <span className="text-[10px] text-slate-600 max-w-[200px]">Launch a recon scan or add targets to begin recording live telemetry.</span>
                  </div>
                ) : (
                  activity.slice(0, 5).map((act) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-semibold truncate">{act.type}</span>
                          <span className="text-[10px] font-mono text-slate-500">{formatTimeAgo(act.created_at)}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-mono">
                          {act.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 3. Right Column: Telemetry & Live Controls */}
      <TelemetrySidebar
        onNewCase={() => setShowNewCaseModal(true)}
        onAddTarget={() => {
          if (cases.length > 0) {
            setSelectedCaseId(cases[0].id);
            setShowAddTargetModal(true);
          } else {
            setShowNewCaseModal(true);
          }
        }}
        onRunScan={() => {
          if (cases.length > 0) {
            setSelectedCaseId(cases[0].id);
            setShowScanModal(true);
          } else {
            setShowNewCaseModal(true);
          }
        }}
        onOpenGraph={openFirstCaseGraph}
      />

      {/* MODAL 1: Create New Case */}
      {showNewCaseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-cyan-400" />
              New Investigation Case
            </h3>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Case Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Operation Dark Frost"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Description / Briefing
                </label>
                <textarea
                  rows={3}
                  placeholder="Classified case summary & intelligence objectives..."
                  value={caseDesc}
                  onChange={(e) => setCaseDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Target Modal */}
      {showAddTargetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-emerald-400" />
              Add Investigation Target
            </h3>
            <form onSubmit={handleAddTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Assign To Case
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Target Type
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="USERNAME">Username / Alias</option>
                  <option value="EMAIL">Email Address</option>
                  <option value="DOMAIN">Domain / Hostname</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Target Value / Handle
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. torvalds or handle"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTargetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Add Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Run Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              Deploy Agent (Clover)
            </h3>
            <form onSubmit={handleLaunchScan} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Case Selection
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-mono"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.targets?.length || 0} targets)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Intelligence Engine
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanEngine('whatsmyname')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all ${
                      scanEngine === 'whatsmyname'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md shadow-rose-950/50 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    WMN
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanEngine('sherlock')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all ${
                      scanEngine === 'sherlock'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md shadow-rose-950/50 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Sherlock
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanEngine('merged')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-mono transition-all ${
                      scanEngine === 'merged'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-md shadow-rose-950/50 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Merged
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScanModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-300 hover:to-pink-400 rounded-xl transition-all shadow-lg shadow-rose-500/20"
                >
                  Launch Mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
