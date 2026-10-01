import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchBreachStats,
  fetchRecentBreaches,
  fetchLargestBreaches,
  lookupBreaches,
  attachBreachToCase,
  fetchCases,
  BreachStats,
  BreachIncident,
  BreachLookupResult,
} from '../api/client';
import { Case } from '../types';
import { Sidebar } from '../components/layout/Sidebar';
import { BreachGlobe, BreachNode } from '../components/BreachGlobe';
import { StreamingAssetMonitor } from '../components/StreamingAssetMonitor';

import {
  ShieldAlert,
  Flame,
  Search,
  Plus,
  Database,
  Bug,
  Users,
  Globe,
  Radio,
  TrendingUp,
  X,
  Layers,
  ChevronRight,
  Server,
  Activity,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';

export const Breaches: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState<BreachStats | null>(null);
  const [recentBreaches, setRecentBreaches] = useState<BreachIncident[]>([]);
  const [largestBreaches, setLargestBreaches] = useState<BreachIncident[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active View Tab: Global View, Monitor, Search, Results, Trends, Watchlist
  const [activeTab, setActiveTab] = useState<'global' | 'monitor' | 'search' | 'results' | 'trends' | 'watchlist'>('global');

  // Search State
  const [searchType, setSearchType] = useState<'email' | 'username' | 'domain' | 'ip' | 'hash'>('email');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BreachLookupResult | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Search Checkbox Options
  const [optExactMatch, setOptExactMatch] = useState(true);
  const [optPartialMatch, setOptPartialMatch] = useState(true);
  const [optMetadataOnly, setOptMetadataOnly] = useState(true);

  // Attach to Case Modal state
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedBreachToAttach, setSelectedBreachToAttach] = useState<any | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachFeedback, setAttachFeedback] = useState(false);

  // Selected Country / Node Dossier Modal
  const [selectedGlobeNode, setSelectedGlobeNode] = useState<BreachNode | null>(null);
  const [showCountryLeaderboardModal, setShowCountryLeaderboardModal] = useState(false);

  // Load breach dashboard data
  const loadBreachData = async () => {
    try {
      setIsLoading(true);
      const [statsData, recentData, largestData, casesData] = await Promise.all([
        fetchBreachStats(),
        fetchRecentBreaches(),
        fetchLargestBreaches(),
        fetchCases(),
      ]);
      setStats(statsData);
      setRecentBreaches(recentData);
      setLargestBreaches(largestData);
      setCases(casesData);
      if (casesData.length > 0 && !selectedCaseId) {
        setSelectedCaseId(casesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load breach intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBreachData();
  }, []);

  // Execute Breach Search
  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      const res = await lookupBreaches(searchQuery.trim(), searchType);
      setSearchResults(res);
      setShowResultsModal(true);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Failed to search breach database.');
    } finally {
      setIsSearching(false);
    }
  };

  // Attach Breach to Case
  const handleAttach = async () => {
    if (!selectedBreachToAttach || !selectedCaseId) return;

    try {
      setIsAttaching(true);
      await attachBreachToCase({
        case_id: selectedCaseId,
        breach_name: selectedBreachToAttach.breach_name || selectedBreachToAttach.name,
        query_value: searchResults?.query || searchQuery || 'target',
        data_classes: selectedBreachToAttach.data_classes || [],
        records_count: selectedBreachToAttach.records || 0,
      });

      setAttachFeedback(true);
      setTimeout(() => {
        setAttachFeedback(false);
        setShowAttachModal(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to attach breach to case:', err);
      alert('Failed to attach breach to case.');
    } finally {
      setIsAttaching(false);
    }
  };

  // Attach Regional Node Intel to Case
  const handleAttachRegion = async () => {
    if (!selectedGlobeNode || !selectedCaseId) return;

    try {
      setIsAttaching(true);
      await attachBreachToCase({
        case_id: selectedCaseId,
        breach_name: `${selectedGlobeNode.name} Regional Exposure Cluster`,
        query_value: selectedGlobeNode.code,
        data_classes: ['Government ID', 'Telecom Records', 'Banking Details', 'Credential Dumps'],
        records_count: selectedGlobeNode.records_num,
      });

      setAttachFeedback(true);
      setTimeout(() => {
        setAttachFeedback(false);
        setSelectedGlobeNode(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to attach region to case:', err);
      alert('Failed to attach region to case.');
    } finally {
      setIsAttaching(false);
    }
  };

  // Attach Streaming Asset Monitor finding to Case
  const handleAttachMonitorAsset = (asset: { label: string; ip: string; details: string; risk: string }) => {
    setSelectedBreachToAttach({
      breach_name: asset.label,
      name: asset.label,
      records: 1,
      data_classes: ['STREAMING_PROTOCOL', 'RTSP_PORT_554', `${asset.risk}_RISK`],
    });
    setShowAttachModal(true);
  };

  // Brand logos
  const getBrandLogo = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('linkedin')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-[#0077b5]/20 border border-[#0077b5]/40 flex items-center justify-center text-[#0077b5] font-black text-xs shrink-0">
          in
        </div>
      );
    }
    if (n.includes('adobe')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-[#ff0000]/20 border border-[#ff0000]/40 flex items-center justify-center text-[#ff0000] font-black text-xs shrink-0">
          A
        </div>
      );
    }
    if (n.includes('twitter') || n.includes('x')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-black text-xs shrink-0">
          𝕏
        </div>
      );
    }
    if (n.includes('canva')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-[#00c4cc]/20 border border-[#00c4cc]/40 flex items-center justify-center text-[#00c4cc] font-black text-xs shrink-0">
          C
        </div>
      );
    }
    if (n.includes('telegram')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-[#24a1de]/20 border border-[#24a1de]/40 flex items-center justify-center text-[#24a1de] font-black text-xs shrink-0">
          TG
        </div>
      );
    }
    if (n.includes('dropbox')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-[#0061ff]/20 border border-[#0061ff]/40 flex items-center justify-center text-[#0061ff] font-black text-xs shrink-0">
          DB
        </div>
      );
    }
    if (n.includes('tesla')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-[#e82127]/20 border border-[#e82127]/40 flex items-center justify-center text-[#e82127] font-black text-xs shrink-0">
          T
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-lg bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 font-black text-xs shrink-0">
        <ShieldAlert className="w-3.5 h-3.5" />
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#060910] text-slate-100 overflow-hidden font-sans">
      {/* 1. Global Left Tactical Sidebar */}
      <Sidebar />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar with tactical telemetry & breach status */}
        <header className="h-16 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 shrink-0 z-20">
          <div className="flex-1 max-w-md relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
                placeholder="Search breaches, emails, domains, IPs, usernames..."
                className="w-full pl-10 pr-16 py-2 bg-slate-900/80 border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 transition-all font-mono"
              />
              <div className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-mono text-slate-400 select-none">
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Badges matching reference */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Breach DB</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-[10px] font-bold text-emerald-200">
                  Online
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>Intel Feeds</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-900/60 text-[10px] font-bold text-cyan-200">
                  12/12
                </span>
              </div>

              {/* Demo Dataset Transparent Notice */}
              <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/40 border border-purple-500/30 text-[10px] font-mono text-purple-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>DEMO DATASET</span>
              </div>
            </div>

            {/* Tactical Anonymous Profile */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 p-[1px] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center text-rose-300 text-xs font-bold">
                <Flame className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">

          {/* A. Hero Surveillance Banner (matching media_1790754481031.jpg) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.35)] shrink-0 p-3">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-slate-50 tracking-tight flex items-center gap-3">
                  Breach Intelligence
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  Search leaked data, breach incidents, and exposed identifiers.
                </p>
              </div>
            </div>

            {/* Right Widget: Live Breach Feeds Waveform & + New Breach Search */}
            <div className="flex items-center gap-3.5 self-stretch sm:self-auto shrink-0">
              {/* Waveform Card */}
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-rose-950/20 border border-rose-500/30">
                <div className="w-6 h-6 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-200">Live Breach Feeds</div>
                  <div className="text-[9px] font-mono text-slate-500">Real-time breach intelligence streams</div>
                </div>
                {/* SVG Simulated Audio / Feed Waveform */}
                <div className="flex items-center gap-0.5 h-5 ml-1">
                  {[40, 70, 30, 90, 60, 100, 45, 80, 55, 95, 30, 85, 50, 75, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-rose-600 to-rose-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i * 0.1).toFixed(1)}s`,
                        animationDuration: '1.2s',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="Search breaches"]') as HTMLInputElement;
                  if (input) input.focus();
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-slate-50 text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ New Breach Search</span>
              </button>
            </div>
          </div>

          {/* B. View Tabs Row */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1">
            {[
              { id: 'global', label: 'Global View' },
              { id: 'monitor', label: 'Streaming & Camera Monitor' },
              { id: 'search', label: 'Search' },
              { id: 'results', label: 'Results' },
              { id: 'trends', label: 'Trends' },
              { id: 'watchlist', label: 'Watchlist' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-xs font-bold transition-all relative border-b-2 -mb-[1px] ${
                    isActive
                      ? 'border-rose-500 text-rose-300 font-extrabold shadow-[0_2px_10px_rgba(244,63,94,0.3)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab View Switcher */}
          {activeTab === 'monitor' ? (
            <StreamingAssetMonitor onAttachToCase={handleAttachMonitorAsset} />
          ) : (
            <>
              {/* C. Center Stage: Large Interactive 3D Globe with Floating Overlays + Right Analyst Workstation */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* Left 8 Cols: Large Interactive 3D Breach Globe Canvas Stage */}
            <div className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-slate-800/90 bg-gradient-to-b from-[#070d18] via-[#050914] to-[#03060c] shadow-2xl flex flex-col justify-between min-h-[580px]">
              
              {/* TOP LEFT OVERLAY: GLOBAL BREACH MAP LEGEND */}
              <div className="absolute top-5 left-5 z-20 space-y-3 pointer-events-auto">
                <div className="p-3.5 rounded-2xl bg-[#090f1d]/85 border border-slate-800/80 backdrop-blur-md shadow-2xl space-y-2 max-w-[210px]">
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                      Global Breach Map
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      Live visualization of breach sources
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-[10px] font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                      <span>&gt; 100M records</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                      <span>10M - 100M</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                      <span>1M - 10M</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>100K - 1M</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <span>&lt; 100K</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>Intensity:</span>
                    <span className="text-rose-400 font-bold">CRITICAL</span>
                  </div>
                </div>

                {/* BOTTOM LEFT OVERLAY: TOP AFFECTED COUNTRIES */}
                <div className="p-3.5 rounded-2xl bg-[#090f1d]/85 border border-slate-800/80 backdrop-blur-md shadow-2xl space-y-2.5 max-w-[220px]">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-mono font-bold tracking-wider text-rose-400 uppercase">
                      Top Affected Countries
                    </div>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    {(stats?.top_affected_countries || [
                      { flag: '🇺🇸', name: 'United States', records: '1.24B', code: 'US', records_num: 1242813991, lat: 38.0, lon: -97.0, threat_level: 'CRITICAL (Tier 1)', recent_breach: 'Collection #1, LinkedIn, Adobe' },
                      { flag: '🇷🇺', name: 'Russia', records: '632.4M', code: 'RU', records_num: 632400000, lat: 58.0, lon: 85.0, threat_level: 'CRITICAL (Breach Origin)', recent_breach: 'Exploit.in, Darknet Combolists' },
                      { flag: '🇨🇳', name: 'China', records: '511.8M', code: 'CN', records_num: 511800000, lat: 35.0, lon: 104.0, threat_level: 'HIGH (Exfiltration Target)', recent_breach: 'Weibo Cache, QQ Scrapes' },
                      { flag: '🇮🇳', name: 'India', records: '432.1M', code: 'IN', records_num: 432100000, lat: 21.0, lon: 78.5, threat_level: 'HIGH (Analysis Hub)', recent_breach: 'Telecom Dump, Aadhaar Mirrors' },
                      { flag: '🇩🇪', name: 'Germany', records: '298.6M', code: 'DE', records_num: 298600000, lat: 51.1, lon: 10.4, threat_level: 'MEDIUM (Processing Node)', recent_breach: 'Telekom Cache, Auto Scraping' },
                    ]).slice(0, 5).map((c: any, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedGlobeNode(c)}
                        className="flex items-center justify-between text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer group"
                      >
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <span>{c.flag}</span>
                          <span className="truncate max-w-[105px] group-hover:underline">{c.name}</span>
                        </span>
                        <span className="text-[11px] font-bold text-rose-400">{c.records}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-slate-800 text-right">
                    <button
                      onClick={() => setShowCountryLeaderboardModal(true)}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
                    >
                      View All →
                    </button>
                  </div>
                </div>
              </div>

              {/* CENTER 3D GLOBE (High-density large interactive Canvas) */}
              <div className="w-full h-full min-h-[580px] flex items-center justify-center relative">
                <BreachGlobe
                  nodes={stats?.top_affected_countries as any}
                  onSelectNode={(n) => setSelectedGlobeNode(n)}
                />
              </div>

              {/* TOP RIGHT OVERLAY: LIVE CONNECTIONS */}
              <div className="absolute top-5 right-18 z-20 pointer-events-auto">
                <div className="p-3.5 rounded-2xl bg-[#090f1d]/85 border border-slate-800/80 backdrop-blur-md shadow-2xl space-y-2.5 max-w-[220px]">
                  <div>
                    <div className="text-[10px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                      Live Connections
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      Real-time breach data flow
                    </div>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {(stats?.live_connections || [
                      { role: 'Collection Node', location: 'United States', color: '#ef4444' },
                      { role: 'Processing Node', location: 'Germany', color: '#06b6d4' },
                      { role: 'Breach Source', location: 'Russia', color: '#ef4444' },
                      { role: 'Mirror Node', location: 'Singapore', color: '#06b6d4' },
                      { role: 'Analysis Node', location: 'India', color: '#a855f7' },
                    ]).map((conn, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: conn.color }}
                          />
                          <span
                            className="absolute w-4 h-4 rounded-full animate-ping opacity-75"
                            style={{ backgroundColor: conn.color }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-slate-200 leading-tight">
                            {conn.role}
                          </div>
                          <div
                            className={`text-[9px] leading-tight font-semibold ${
                              conn.color === '#ef4444'
                                ? 'text-rose-400'
                                : conn.color === '#a855f7'
                                ? 'text-purple-400'
                                : 'text-slate-300'
                            }`}
                          >
                            {conn.location}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[8px] font-mono text-slate-500">
                    <span>Active Telemetry:</span>
                    <span className="text-emerald-400">4.8 MB/s</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right 4 Cols: Analyst Workstation Search & Recent Breach Intelligence Feed */}
            <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
              
              {/* Card 1: SEARCH BREACH DATA */}
              <div className="p-5 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Search Breach Data
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300">
                    OSINT Workstation
                  </span>
                </div>

                {/* Type Selection Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'email', label: 'Email' },
                    { id: 'username', label: 'Username' },
                    { id: 'domain', label: 'Domain' },
                    { id: 'ip', label: 'IP' },
                    { id: 'hash', label: 'Hash' },
                  ].map((t) => {
                    const isSelected = searchType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSearchType(t.id as any)}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                          isSelected
                            ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Input & Search Button */}
                <form onSubmit={handleExecuteSearch} className="space-y-3">
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchType === 'email'
                          ? 'Enter email address...'
                          : searchType === 'username'
                          ? 'Enter username handle...'
                          : searchType === 'domain'
                          ? 'Enter domain name...'
                          : searchType === 'ip'
                          ? 'Enter IP address...'
                          : 'Enter MD5, SHA1, or NTLM hash...'
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 font-mono transition-all"
                    />
                    <div className="text-[10px] font-mono text-slate-500">
                      {searchType === 'email' && 'Example: user@example.com'}
                      {searchType === 'username' && 'Example: torvalds, john_doe'}
                      {searchType === 'domain' && 'Example: target-corp.com'}
                      {searchType === 'ip' && 'Example: 192.168.1.1 or 8.8.8.8'}
                      {searchType === 'hash' && 'Example: 5d41402abc4b2a76b9719d911017c592'}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-slate-50 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isSearching ? 'Searching Leak DB...' : 'Search'}</span>
                  </button>
                </form>

                {/* Checkbox Options */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={optExactMatch}
                      onChange={(e) => setOptExactMatch(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500/40"
                    />
                    <span>Exact match</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={optPartialMatch}
                      onChange={(e) => setOptPartialMatch(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500/40"
                    />
                    <span>Include partial matches</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={optMetadataOnly}
                      onChange={(e) => setOptMetadataOnly(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500/40"
                    />
                    <span>Show metadata only</span>
                  </label>
                </div>
              </div>

              {/* Card 2: RECENT BREACH INTELLIGENCE (Scrolling Feed) */}
              <div className="p-5 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-xl space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Recent Breach Intelligence
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Live feed of newly indexed breaches
                  </div>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {recentBreaches.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBreachToAttach(b);
                        setShowAttachModal(true);
                      }}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-rose-500/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getBrandLogo(b.name)}
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-200 group-hover:text-rose-300 transition-colors truncate">
                            {b.name}
                          </div>
                          <div className="text-[10px] font-mono text-rose-400">
                            {b.records.toLocaleString()} records
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                        {b.time_ago}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>Feed Status: Synchronized</span>
                  <span className="text-cyan-400 hover:underline cursor-pointer" onClick={() => loadBreachData()}>
                    Refresh ⟳
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* D. 4 KPI Trend Cards Row with Mini Sparklines */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. Total Records */}
            <div className="p-4 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="text-2xl font-black font-mono text-slate-100">12.4B</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">Total Breach Records</div>
              </div>

              {/* Sparkline & Trend */}
              <div className="flex flex-col items-end gap-1">
                <svg className="w-14 h-6 text-emerald-400" viewBox="0 0 50 20" fill="none">
                  <path
                    d="M2 17 L12 14 L22 15 L32 8 L42 9 L48 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="flex items-center gap-0.5 text-xs font-mono font-bold text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" /> +12%
                </span>
              </div>
            </div>

            {/* 2. Incidents */}
            <div className="p-4 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-rose-400" />
                  <span className="text-2xl font-black font-mono text-slate-100">1,842</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">Breach Incidents</div>
              </div>

              {/* Sparkline & Trend */}
              <div className="flex flex-col items-end gap-1">
                <svg className="w-14 h-6 text-emerald-400" viewBox="0 0 50 20" fill="none">
                  <path
                    d="M2 16 L10 12 L20 14 L30 11 L40 6 L48 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="flex items-center gap-0.5 text-xs font-mono font-bold text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" /> +5%
                </span>
              </div>
            </div>

            {/* 3. Unique Identifiers */}
            <div className="p-4 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-2xl font-black font-mono text-slate-100">3.6B</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">Unique Identifiers</div>
              </div>

              {/* Sparkline & Trend */}
              <div className="flex flex-col items-end gap-1">
                <svg className="w-14 h-6 text-emerald-400" viewBox="0 0 50 20" fill="none">
                  <path
                    d="M2 18 L12 15 L22 13 L32 10 L40 8 L48 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="flex items-center gap-0.5 text-xs font-mono font-bold text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" /> +8%
                </span>
              </div>
            </div>

            {/* 4. Affected Services */}
            <div className="p-4 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-lg flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="text-2xl font-black font-mono text-slate-100">2,412</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">Affected Services</div>
              </div>

              {/* Sparkline & Trend */}
              <div className="flex flex-col items-end gap-1">
                <svg className="w-14 h-6 text-emerald-400" viewBox="0 0 50 20" fill="none">
                  <path
                    d="M2 17 L14 16 L24 11 L34 12 L42 7 L48 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="flex items-center gap-0.5 text-xs font-mono font-bold text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" /> +14%
                </span>
              </div>
            </div>
          </div>

          {/* E. Bottom Split: Largest Breaches Table + Breach Types Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Left 7 Cols: Largest Breaches Table */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Largest Breaches
                </div>
                <button
                  onClick={() => setShowCountryLeaderboardModal(true)}
                  className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Records</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {largestBreaches.map((b, idx) => (
                      <tr
                        key={b.id}
                        onClick={() => {
                          setSelectedBreachToAttach(b);
                          setShowAttachModal(true);
                        }}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 font-bold text-slate-200 group-hover:text-rose-300 transition-colors">
                            {getBrandLogo(b.name)}
                            <span>{b.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {b.records.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {b.date}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 5 Cols: Breach Types Donut Chart */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0c121e]/90 border border-slate-800/90 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800/80">
                Breach Types
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                {/* SVG Glowing Donut Chart */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#0f172a" strokeWidth="14" />
                    
                    {/* Email 42% (rose-500) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="14"
                      strokeDasharray="100.2 238.7"
                      strokeDashoffset="0"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Passwords 18% (blue-500) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="14"
                      strokeDasharray="43 238.7"
                      strokeDashoffset="-100.2"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Usernames 16% (purple-500) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="14"
                      strokeDasharray="38.2 238.7"
                      strokeDashoffset="-143.2"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Personal Information 12% (pink-500) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="14"
                      strokeDasharray="28.6 238.7"
                      strokeDashoffset="-181.4"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Financial Data 7% (amber-500) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="14"
                      strokeDasharray="16.7 238.7"
                      strokeDashoffset="-210"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Other 5% (slate-500) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#64748b"
                      strokeWidth="14"
                      strokeDasharray="12 238.7"
                      strokeDashoffset="-226.7"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>

                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black font-mono text-slate-100">12.4B</span>
                    <span className="text-[8px] font-mono text-slate-400 uppercase tracking-tight">
                      Total Records
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="space-y-1.5 font-mono text-xs w-full max-w-[200px]">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Email Addresses</span>
                    </span>
                    <span className="font-bold text-slate-100">42%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span>Passwords</span>
                    </span>
                    <span className="font-bold text-slate-100">18%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                      <span>Usernames</span>
                    </span>
                    <span className="font-bold text-slate-100">16%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                      <span>Personal Information</span>
                    </span>
                    <span className="font-bold text-slate-100">12%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Financial Data</span>
                    </span>
                    <span className="font-bold text-slate-100">7%</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0" />
                      <span>Other</span>
                    </span>
                    <span className="font-bold text-slate-200">5%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Vector Classification</span>
                <span>Algorithm: Hybrid Hash Match</span>
              </div>
            </div>

          </div>
          </>
          )}

        </main>
      </div>

      {/* MODAL 1: REGIONAL NODE INTELLIGENCE DOSSIER (Clicked on Globe Node) */}
      {selectedGlobeNode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#090f1d] border border-rose-500/60 rounded-3xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedGlobeNode.flag}</span>
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <span>{selectedGlobeNode.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40 font-mono">
                      {selectedGlobeNode.code}
                    </span>
                  </h3>
                  <div className="text-xs font-mono text-cyan-400">
                    Coordinates: {selectedGlobeNode.lat.toFixed(1)}° N, {selectedGlobeNode.lon.toFixed(1)}° E
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedGlobeNode(null)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Compromised Records</div>
                <div className="text-lg font-mono font-bold text-rose-400">
                  {selectedGlobeNode.records_num.toLocaleString()}
                </div>
                <div className="text-[9px] font-mono text-slate-400">Total verified in country</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Threat Classification</div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  {selectedGlobeNode.threat_level || 'CRITICAL HUB'}
                </div>
                <div className="text-[9px] font-mono text-slate-400">Active monitoring queue</div>
              </div>
            </div>

            {/* Intelligence Feeds */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase">
                Active Leak Sources & Feeds
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Major Incident:</span>
                  <span className="text-rose-400 font-bold">{selectedGlobeNode.recent_breach || 'Massive Combolist Leak'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Associated Sinkhole:</span>
                  <span className="text-cyan-400">Sinkhole Zeta-09 ({selectedGlobeNode.code})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Target Class:</span>
                  <span className="text-purple-400">Corporate & Government Identifiers</span>
                </div>
              </div>
            </div>

            {/* Attach to Case form */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-mono text-slate-400">
                Attach this Regional Intel to Investigation Case:
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedGlobeNode(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
              >
                Close
              </button>
              <button
                onClick={handleAttachRegion}
                disabled={isAttaching || cases.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-mono font-bold text-slate-50 flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                {attachFeedback ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Attached to Case!</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Attach Intel to Case</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SEARCH RESULTS MODAL */}
      {showResultsModal && searchResults && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#090f1d] border border-rose-500/60 rounded-3xl max-w-2xl w-full p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
                    <span>Search Query:</span>
                    <span className="text-rose-400">{searchResults.query}</span>
                  </h3>
                  <div className="text-xs font-mono text-slate-400">
                    Found {searchResults.total_found} compromise matches (Risk Score: {searchResults.risk_score}/100)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowResultsModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Results Table */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800 font-mono text-xs">
              {searchResults.breaches.map((b, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 hover:border-rose-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 text-sm">{b.breach_name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                      {b.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">{b.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Compromised: {b.records.toLocaleString()} records</span>
                    <span>Date: {b.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {b.data_classes.map((dc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 text-[10px] border border-slate-800">
                        {dc}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedBreachToAttach(b);
                        setShowResultsModal(false);
                        setShowAttachModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Attach to Case</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowResultsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ATTACH TO INVESTIGATION CASE MODAL */}
      {showAttachModal && selectedBreachToAttach && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#090f1d] border border-rose-500/60 rounded-3xl max-w-md w-full p-6 shadow-[0_0_50px_rgba(244,63,94,0.35)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-sm">
                <Layers className="w-4 h-4" />
                <span>Attach Breach to Case</span>
              </div>
              <button
                onClick={() => setShowAttachModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Selected Breach Source</div>
                <div className="font-bold text-slate-100 text-sm">
                  {selectedBreachToAttach.breach_name || selectedBreachToAttach.name}
                </div>
                <div className="text-rose-400">
                  {(selectedBreachToAttach.records || 0).toLocaleString()} exposed records
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400">Select Target Investigation Case:</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.id.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAttachModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAttach}
                disabled={isAttaching || cases.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-mono font-bold text-slate-50 flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                {attachFeedback ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Attached to Case!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Confirm Attachment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WORLDWIDE AFFECTED COUNTRIES LEADERBOARD */}
      {showCountryLeaderboardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#090f1d] border border-cyan-500/60 rounded-3xl max-w-xl w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.35)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-sm">
                <Globe className="w-4 h-4" />
                <span>Global Affected Countries Leaderboard</span>
              </div>
              <button
                onClick={() => setShowCountryLeaderboardModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
              {[
                { rank: 1, flag: '🇺🇸', name: 'United States', records: '1,242,813,991', pct: '26.8%', threat: 'CRITICAL' },
                { rank: 2, flag: '🇷🇺', name: 'Russia', records: '632,400,000', pct: '13.6%', threat: 'CRITICAL' },
                { rank: 3, flag: '🇨🇳', name: 'China', records: '511,800,000', pct: '11.0%', threat: 'HIGH' },
                { rank: 4, flag: '🇮🇳', name: 'India', records: '432,100,000', pct: '9.3%', threat: 'HIGH' },
                { rank: 5, flag: '🇩🇪', name: 'Germany', records: '298,600,000', pct: '6.4%', threat: 'MEDIUM' },
                { rank: 6, flag: '🇬🇧', name: 'United Kingdom', records: '245,100,000', pct: '5.3%', threat: 'ELEVATED' },
                { rank: 7, flag: '🇧🇷', name: 'Brazil', records: '189,400,000', pct: '4.1%', threat: 'HIGH' },
                { rank: 8, flag: '🇯🇵', name: 'Japan', records: '145,200,000', pct: '3.1%', threat: 'MONITORED' },
                { rank: 9, flag: '🇫🇷', name: 'France', records: '134,800,000', pct: '2.9%', threat: 'ELEVATED' },
                { rank: 10, flag: '🇦🇺', name: 'Australia', records: '112,500,000', pct: '2.4%', threat: 'MODERATE' },
                { rank: 11, flag: '🇨🇦', name: 'Canada', records: '108,200,000', pct: '2.3%', threat: 'MONITORED' },
                { rank: 12, flag: '🇸🇬', name: 'Singapore', records: '98,400,000', pct: '2.1%', threat: 'MONITORED' },
                { rank: 13, flag: '🇰🇷', name: 'South Korea', records: '94,100,000', pct: '2.0%', threat: 'MODERATE' },
                { rank: 14, flag: '🇮🇹', name: 'Italy', records: '88,900,000', pct: '1.9%', threat: 'MODERATE' },
                { rank: 15, flag: '🇪🇸', name: 'Spain', records: '79,200,000', pct: '1.7%', threat: 'MODERATE' },
              ].map((c) => (
                <div
                  key={c.rank}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-slate-500 font-bold">{c.rank}</span>
                    <span className="text-base">{c.flag}</span>
                    <span className="font-bold text-slate-200">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-rose-400 font-bold">{c.records}</span>
                    <span className="text-slate-500 text-[10px] w-12 text-right">{c.pct}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCountryLeaderboardModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
              >
                Close Leaderboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
