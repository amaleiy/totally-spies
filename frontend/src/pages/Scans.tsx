import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllScans,
  launchScanDirect,
  rerunScan,
  cancelScan,
  deleteScan,
  fetchCases,
  fetchScanEvents,
} from '../api/client';
import { Case, ScanEvent } from '../types';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { formatTimeAgo, formatDate } from '../utils/formatters';
import {
  Radar,
  Play,
  RotateCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Terminal,
  ExternalLink,
  Trash2,
  Square,
  Sparkles,
  Globe,
  Database,
  Server,
  User,
  Mail,
  Zap,
  Shield,
  Layers,
  Activity,
  Sliders,
  X,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface ScanItem {
  id: string;
  case_id: string;
  case_title: string;
  target_id: string;
  target_value: string;
  target_type: string;
  module: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total: number;
  completed: number;
  matches_count: number;
  error?: string;
  config?: any;
}

export const Scans: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modals
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [activeScanForLogs, setActiveScanForLogs] = useState<ScanItem | null>(null);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'MATCH' | 'INFO' | 'ERROR'>('ALL');
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Form State for Launch Scan
  const [formCaseId, setFormCaseId] = useState('');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formTargetType, setFormTargetType] = useState('USERNAME');
  const [formModule, setFormModule] = useState('clover');
  const [formConcurrency, setFormConcurrency] = useState(15);
  const [formStealthDelay, setFormStealthDelay] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launchError, setLaunchError] = useState('');

  // Initial Load
  const loadData = async () => {
    try {
      const [scansData, casesData] = await Promise.all([
        fetchAllScans(),
        fetchCases(),
      ]);
      setScans(scansData || []);
      setCases(casesData || []);
      if (casesData && casesData.length > 0 && !formCaseId) {
        setFormCaseId(casesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load scans data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAllScans().then((data) => {
        if (data) setScans(data);
      }).catch((e) => console.error('Auto refresh failed:', e));
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Logs live polling when log modal is open
  useEffect(() => {
    if (!isLogsModalOpen || !activeScanForLogs) return;

    let isMounted = true;
    const fetchLogs = async () => {
      try {
        setIsFetchingLogs(true);
        const events = await fetchScanEvents(activeScanForLogs.id);
        if (isMounted) {
          setScanEvents(events || []);
          if (autoScrollLogs) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        if (isMounted) setIsFetchingLogs(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLogsModalOpen, activeScanForLogs, autoScrollLogs]);

  // Handlers
  const handleLaunchScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTargetValue.trim()) {
      setLaunchError('Target value is required');
      return;
    }
    setLaunchError('');
    setIsSubmitting(true);
    try {
      await launchScanDirect({
        case_id: formCaseId,
        target_value: formTargetValue.trim(),
        target_type: formTargetType,
        module: formModule,
        config: {
          concurrency: formConcurrency,
          stealth_delay_ms: formStealthDelay,
        },
      });
      setIsLaunchModalOpen(false);
      setFormTargetValue('');
      await loadData();
    } catch (err: any) {
      setLaunchError(err.message || 'Failed to start scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRerun = async (scanId: string) => {
    try {
      await rerunScan(scanId);
      await loadData();
    } catch (err) {
      console.error('Failed to rerun scan:', err);
    }
  };

  const handleCancel = async (scanId: string) => {
    try {
      await cancelScan(scanId);
      await loadData();
    } catch (err) {
      console.error('Failed to cancel scan:', err);
    }
  };

  const handleDelete = async (scanId: string) => {
    if (!confirm('Are you sure you want to delete this scan and its event records?')) return;
    try {
      await deleteScan(scanId);
      setScans((prev) => prev.filter((s) => s.id !== scanId));
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
  };

  const handleOpenLogs = (scan: ScanItem) => {
    setActiveScanForLogs(scan);
    setScanEvents([]);
    setIsLogsModalOpen(true);
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = scans.length;
    const running = scans.filter((s) => s.status === 'RUNNING' || s.status === 'PENDING').length;
    const completed = scans.filter((s) => s.status === 'COMPLETED').length;
    const artifacts = scans.reduce((acc, s) => acc + (s.matches_count || 0), 0);
    const failed = scans.filter((s) => s.status === 'FAILED' || s.status === 'CANCELLED').length;
    return { total, running, completed, artifacts, failed };
  }, [scans]);

  // Filtered Scans
  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
      if (selectedModule !== 'all' && s.module.toLowerCase() !== selectedModule.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTarget = s.target_value.toLowerCase().includes(q);
        const matchesCase = s.case_title.toLowerCase().includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        if (!matchesTarget && !matchesCase && !matchesId) return false;
      }
      return true;
    });
  }, [scans, selectedStatus, selectedModule, searchQuery]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (logFilter === 'ALL') return scanEvents;
    return scanEvents.filter((e) => {
      if (logFilter === 'MATCH') return e.event_type === 'MATCH';
      if (logFilter === 'ERROR') return e.event_type === 'ERROR';
      return e.event_type !== 'MATCH' && e.event_type !== 'ERROR';
    });
  }, [scanEvents, logFilter]);

  // Helpers
  const getTargetIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'DOMAIN': return Globe;
      case 'IP': return Server;
      case 'EMAIL': return Mail;
      case 'USERNAME':
      default:
        return User;
    }
  };

  const getModuleBadge = (moduleName: string) => {
    const m = (moduleName || '').toLowerCase();
    if (m === 'clover') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950/40 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]">
          <Sparkles className="w-3 h-3 text-rose-400" />
          CLOVER RECON
        </span>
      );
    }
    if (m === 'exposure') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950/40 text-blue-300 border border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.15)]">
          <Globe className="w-3 h-3 text-blue-400" />
          SHODAN EXPOSURE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950/40 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
        <Database className="w-3 h-3 text-purple-400" />
        BREACH INTEL
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-[#080c14] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Header & Hero */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  WOOHP SCAN MANAGEMENT & ORCHESTRATION
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <Radar className="w-7 h-7 text-cyan-400" />
                Reconnaissance Scans
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
                Autonomous multi-threaded OSINT probe execution across Clover identity recon, Shodan InternetDB infrastructure scanning, and breach verification.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                  autoRefresh
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'LIVE POLLING: ON' : 'POLLING: PAUSED'}
              </button>

              <button
                onClick={() => setIsLaunchModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                LAUNCH NEW SCAN
              </button>
            </div>
          </div>

          {/* KPI HUD Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>ACTIVE SCANS</span>
                <Radar className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono flex items-center gap-2">
                {metrics.running}
                {metrics.running > 0 && (
                  <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                    LIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Parallel background workers</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>COMPLETED SCANS</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                {metrics.completed}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                {metrics.total > 0 ? `${Math.round((metrics.completed / metrics.total) * 100)}% execution success` : 'No runs recorded'}
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>DISCOVERED ARTIFACTS</span>
                <Database className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2 font-mono">
                {metrics.artifacts}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Profiles, hosts & breach leaks</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>FAILED / CANCELLED</span>
                <XCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
                {metrics.failed}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Interrupted or timed out</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-2xl p-4 space-y-3 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by target, case, or scan ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {[
                  { id: 'all', label: 'ALL', count: metrics.total },
                  { id: 'RUNNING', label: 'RUNNING', count: metrics.running },
                  { id: 'COMPLETED', label: 'COMPLETED', count: metrics.completed },
                  { id: 'FAILED', label: 'FAILED', count: scans.filter(s => s.status === 'FAILED').length },
                  { id: 'CANCELLED', label: 'CANCELLED', count: scans.filter(s => s.status === 'CANCELLED').length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                      selectedStatus === tab.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-900/60'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Module Filter Chips */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 text-xs font-mono">
              <span className="text-slate-500 text-[11px] uppercase tracking-wider">MODULE:</span>
              {[
                { id: 'all', label: 'All Modules' },
                { id: 'clover', label: '🌸 Clover (Identity)' },
                { id: 'exposure', label: '🌐 Exposure (Shodan)' },
                { id: 'breaches', label: '🗄️ Breaches' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModule(m.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                    selectedModule === m.id
                      ? 'bg-slate-800 text-white font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scans Grid / List */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3 font-mono">
              <Radar className="w-10 h-10 animate-spin text-cyan-400" />
              <div className="text-xs">SYNCHRONIZING SCAN ORCHESTRATOR TELEMETRY...</div>
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="bg-[#0b111e]/40 border border-slate-800/80 rounded-2xl py-16 px-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Radar className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-white font-mono">No Matching Recon Scans</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {searchQuery || selectedStatus !== 'all' || selectedModule !== 'all'
                    ? 'No scans match your current filter parameters. Try clearing your filters or query.'
                    : 'No automated recon scans have been initiated yet. Launch your first target probe.'}
                </p>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-300" />
                LAUNCH NEW SCAN
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScans.map((scan) => {
                const TargetIcon = getTargetIcon(scan.target_type);
                const isRunning = scan.status === 'RUNNING' || scan.status === 'PENDING';
                const progressPct = scan.total > 0 ? Math.round((scan.completed / scan.total) * 100) : isRunning ? 45 : 100;

                return (
                  <div
                    key={scan.id}
                    className="bg-[#0b111e]/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 transition-all group backdrop-blur-md relative overflow-hidden"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Target & Case info */}
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                            isRunning
                              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                              : scan.status === 'COMPLETED'
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                              : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                          }`}
                        >
                          {isRunning ? (
                            <Radar className="w-5 h-5 animate-spin" />
                          ) : (
                            <TargetIcon className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-bold text-white font-mono tracking-tight">
                              {scan.target_value}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {scan.target_type}
                            </span>
                            {getModuleBadge(scan.module)}

                            {isRunning && (
                              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono animate-pulse font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                PROBING
                              </span>
                            )}
                            {scan.status === 'COMPLETED' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                COMPLETED
                              </span>
                            )}
                            {scan.status === 'FAILED' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/40 text-[10px] font-mono">
                                <AlertCircle className="w-3 h-3 text-rose-400" />
                                FAILED
                              </span>
                            )}
                            {scan.status === 'CANCELLED' && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700 text-[10px] font-mono">
                                <XCircle className="w-3 h-3" />
                                CANCELLED
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono flex-wrap">
                            <span>Case: <strong className="text-slate-300">{scan.case_title}</strong></span>
                            <span>•</span>
                            <span>Started: {scan.started_at ? formatTimeAgo(scan.started_at) : 'N/A'}</span>
                            {scan.completed_at && (
                              <>
                                <span>•</span>
                                <span>Finished: {formatDate(scan.completed_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics & Actions */}
                      <div className="flex items-center gap-6 lg:justify-end">
                        {/* Discovered Counter */}
                        <div className="text-right">
                          <div className="text-xs font-mono text-slate-400">DISCOVERED</div>
                          <div className="text-lg font-black text-rose-400 font-mono flex items-center justify-end gap-1.5">
                            <Sparkles className="w-4 h-4 text-rose-400" />
                            {scan.matches_count} artifacts
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-28 hidden sm:block">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>PROGRESS</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isRunning
                                  ? 'bg-gradient-to-r from-cyan-400 to-teal-400 animate-pulse'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                          <button
                            onClick={() => handleOpenLogs(scan)}
                            title="Inspect Live Terminal Logs"
                            className="p-2 rounded-xl bg-slate-900/80 hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-all"
                          >
                            <Terminal className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => navigate(`/cases/${scan.case_id}`)}
                            title="Open in Case Graph"
                            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {isRunning ? (
                            <button
                              onClick={() => handleCancel(scan.id)}
                              title="Stop / Cancel Scan"
                              className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 transition-all"
                            >
                              <Square className="w-4 h-4 fill-rose-300" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRerun(scan.id)}
                              title="Rerun Scan"
                              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(scan.id)}
                            title="Delete Scan Record"
                            className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error Banner if scan failed */}
                    {scan.error && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{scan.error}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Launch New Scan */}
      {isLaunchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0b111e] border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)] rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-950/20 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Play className="w-4 h-4 fill-cyan-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                    Launch Autonomous Recon Probe
                  </h3>
                  <div className="text-[10px] font-mono text-slate-400">
                    WOOHP TACTICAL INTERCEPTION PROTOCOL
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsLaunchModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLaunchScan} className="p-6 space-y-4 text-xs font-mono">
              {launchError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{launchError}</span>
                </div>
              )}

              {/* Case Picker */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  TARGET CASE DOSSIER:
                </label>
                <select
                  value={formCaseId}
                  onChange={(e) => setFormCaseId(e.target.value)}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.targets_count || 0} targets)
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Input & Type */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                    TARGET VALUE:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. torvalds, 1.1.1.1, kernel.org"
                    value={formTargetValue}
                    onChange={(e) => setFormTargetValue(e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                    TYPE:
                  </label>
                  <select
                    value={formTargetType}
                    onChange={(e) => setFormTargetType(e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="USERNAME">USERNAME</option>
                    <option value="DOMAIN">DOMAIN</option>
                    <option value="IP">IP HOST</option>
                    <option value="EMAIL">EMAIL</option>
                  </select>
                </div>
              </div>

              {/* Recon Module Selection Cards */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  SELECT RECON ENGINE:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setFormModule('clover')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formModule === 'clover'
                        ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'bg-[#080c14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-rose-400" />
                      Clover Identity
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Sherlock 400+ social & dev profile matching
                    </div>
                  </div>

                  <div
                    onClick={() => setFormModule('exposure')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      formModule === 'exposure'
                        ? 'bg-blue-950/40 border-blue-500 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'bg-[#080c14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Globe className="w-4 h-4 text-blue-400" />
                      Shodan Exposure
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Open ports, CVE vulnerabilities & reverse DNS
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Controls */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">
                    THREADS (CONCURRENCY): {formConcurrency}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={formConcurrency}
                    onChange={(e) => setFormConcurrency(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">
                    STEALTH DELAY (MS): {formStealthDelay}ms
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={formStealthDelay}
                    onChange={(e) => setFormStealthDelay(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'DISPATCHING PROBE...' : 'INITIALIZE RECON SCAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Live Scan Logs Terminal */}
      {isLogsModalOpen && activeScanForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#080c14] border border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.25)] rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col h-[75vh]">
            {/* Terminal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-[#0b111e] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-4 w-[1px] bg-slate-800 mx-1" />
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  LOG STREAM: {activeScanForLogs.target_value} ({activeScanForLogs.module.toUpperCase()})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  {(['ALL', 'MATCH', 'INFO', 'ERROR'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={`px-2 py-0.5 rounded ${
                        logFilter === filter
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsLogsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-2 select-text scrollbar-thin scrollbar-thumb-slate-800">
              <div className="text-slate-500 text-[11px] pb-2 border-b border-slate-900 flex justify-between items-center">
                <span>[SCAN ID: {activeScanForLogs.id}] -- STATUS: {activeScanForLogs.status}</span>
                <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScrollLogs}
                    onChange={(e) => setAutoScrollLogs(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  Auto-scroll
                </label>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="py-16 text-center text-slate-600">
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No events logged yet for this scan run.
                </div>
              ) : (
                filteredEvents.map((evt) => {
                  const isMatch = evt.event_type === 'MATCH';
                  const isError = evt.event_type === 'ERROR';

                  return (
                    <div
                      key={evt.id}
                      className={`p-2 rounded-lg flex items-start gap-2.5 transition-all ${
                        isMatch
                          ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                          : isError
                          ? 'bg-rose-950/30 border border-rose-500/30 text-rose-300'
                          : 'hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                        {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : '00:00:00'}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          isMatch
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isError
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {evt.event_type}
                      </span>
                      <span className="flex-1 break-all leading-relaxed">
                        {evt.message}
                        {evt.payload?.url && (
                          <a
                            href={evt.payload.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 ml-2 text-cyan-400 hover:underline font-bold"
                          >
                            [Open Link <ExternalLink className="w-3 h-3 inline" />]
                          </a>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Terminal Footer */}
            <div className="px-5 py-3 border-t border-slate-800/80 bg-[#0b111e] flex items-center justify-between text-xs font-mono text-slate-400">
              <div>Total Log Events: {filteredEvents.length}</div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/cases/${activeScanForLogs.case_id}`)}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  View Case Graph <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
