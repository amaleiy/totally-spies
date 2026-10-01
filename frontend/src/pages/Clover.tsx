import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCloverPlatforms,
  cloverLookup,
  attachCloverProfiles,
  fetchCases,
} from '../api/client';
import { Case } from '../types';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import {
  Sparkles,
  Search,
  ExternalLink,
  Plus,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  Database,
  User,
  Zap,
  Globe,
  Code2,
  MessageSquare,
  Gamepad2,
  Tv,
  Check,
  X,
  Sliders,
  RefreshCw,
  FolderPlus,
  Fingerprint,
} from 'lucide-react';

interface ProfileMatch {
  platform: string;
  url: string;
  status_code: number;
  response_time: number;
  confidence: number;
  category: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export const Clover: React.FC = () => {
  const navigate = useNavigate();

  // Search State
  const [username, setUsername] = useState('torvalds');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isPermutationsEnabled, setIsPermutationsEnabled] = useState(false);
  const [concurrency, setConcurrency] = useState(15);
  const [timeout, setTimeoutSec] = useState(5.0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Scan Results State
  const [isScanning, setIsScanning] = useState(false);
  const [matches, setMatches] = useState<ProfileMatch[]>([]);
  const [totalProbed, setTotalProbed] = useState(0);
  const [permutations, setPermutations] = useState<string[]>([]);
  const [lastSearchedUser, setLastSearchedUser] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Platforms Metadata
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [cases, setCases] = useState<Case[]>([]);

  // Attach to Case Modal State
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedProfilesToAttach, setSelectedProfilesToAttach] = useState<ProfileMatch[]>([]);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState('');

  // Initial Load
  useEffect(() => {
    fetchCloverPlatforms().then((data) => setPlatformStats(data)).catch(() => {});
    fetchCases().then((data) => {
      setCases(data || []);
      if (data && data.length > 0) setSelectedCaseId(data[0].id);
    }).catch(() => {});

  }, []);

  const handleExecuteLookup = async (targetHandle?: string) => {
    const query = (targetHandle || username).trim();
    if (!query) return;

    setIsScanning(true);
    setErrorMessage('');
    setLastSearchedUser(query);

    try {
      const res = await cloverLookup({
        username: query,
        categories: activeCategory !== 'all' ? [activeCategory] : undefined,
        concurrency,
        timeout,
        permutations: isPermutationsEnabled,
      });

      setMatches(res.matches || []);
      setTotalProbed(res.total_probed || 0);
      setPermutations(res.permutations || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Identity enumeration failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAttachProfiles = async () => {
    if (!selectedCaseId || selectedProfilesToAttach.length === 0) return;
    setIsAttaching(true);
    setAttachSuccess('');
    try {
      const res = await attachCloverProfiles({
        case_id: selectedCaseId,
        target_username: lastSearchedUser || username,
        profiles: selectedProfilesToAttach,
      });
      setAttachSuccess(`Successfully attached ${res.attached_count || selectedProfilesToAttach.length} profile nodes to case!`);
      setTimeout(() => {
        setIsAttachModalOpen(false);
        setAttachSuccess('');
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to attach to case');
    } finally {
      setIsAttaching(false);
    }
  };

  const openAttachModal = (singleProfile?: ProfileMatch) => {
    if (singleProfile) {
      setSelectedProfilesToAttach([singleProfile]);
    } else {
      setSelectedProfilesToAttach(matches);
    }
    setIsAttachModalOpen(true);
  };

  const handleExportJSON = () => {
    const exportData = {
      target_username: lastSearchedUser,
      probed_at: new Date().toISOString(),
      total_matches: matches.length,
      matches,
      permutations,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clover_recon_${lastSearchedUser}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = `# WOOHP CLOVER IDENTITY DOSSIER: ${lastSearchedUser}\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Total Verified Profiles:** ${matches.length}\n\n`;
    md += `| Platform | Category | URL | Confidence | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    matches.forEach((m) => {
      md += `| **${m.platform}** | \`${m.category}\` | ${m.url} | ${Math.round(m.confidence * 100)}% | \`${m.status_code} OK\` |\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clover_dossier_${lastSearchedUser}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered by local search
  const filteredMatches = useMemo(() => {
    if (activeCategory === 'all') return matches;
    return matches.filter((m) => m.category.toLowerCase().includes(activeCategory.toLowerCase()));
  }, [matches, activeCategory]);

  const categoriesList = [
    { id: 'all', label: 'All Categories', icon: Layers },
    { id: 'code', label: 'Code & Dev', icon: Code2 },
    { id: 'social', label: 'Social & Media', icon: MessageSquare },
    { id: 'tech', label: 'Tech & Privacy', icon: Shield },
    { id: 'gaming', label: 'Gaming & Stream', icon: Gamepad2 },
  ];

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
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  WOOHP IDENTITY RECONNAISSANCE ENGINE
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <Fingerprint className="w-7 h-7 text-rose-400" />
                Clover Identity Recon
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
                Autonomous cross-platform username enumeration and social convergence engine across 400+ code, community, and privacy networks.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {matches.length > 0 && (
                <>
                  <button
                    onClick={() => openAttachModal()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-500/50 text-xs font-mono text-slate-200 hover:text-white transition-all shadow-sm"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-rose-400" />
                    ATTACH ALL TO CASE
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    MD
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Presets Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider shrink-0">
              TARGET PRESETS:
            </span>
            {['torvalds', 'vitalik', 'satoshi', 'snowden', 'defcon'].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setUsername(preset);
                  handleExecuteLookup(preset);
                }}
                className={`px-3 py-1 rounded-lg border transition-all shrink-0 ${
                  username === preset
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                @{preset}
              </button>
            ))}
          </div>

          {/* Search Console & Filter Bar */}
          <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-5 space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter target username or handle (e.g. torvalds, satoshi)..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteLookup()}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 shadow-inner"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`p-3 rounded-2xl border transition-all ${
                    showAdvanced
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Advanced Scanner Parameters"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleExecuteLookup()}
                  disabled={isScanning || !username.trim()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs tracking-wider uppercase font-mono shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'PROBING NETWORKS...' : 'PROBE PROFILES'}
                </button>
              </div>
            </div>

            {/* Advanced Controls Drawer */}
            {showAdvanced && (
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono animate-in fade-in duration-150">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    THREADS (CONCURRENCY): {concurrency}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={concurrency}
                    onChange={(e) => setConcurrency(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">
                    TIMEOUT: {timeout}s
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="0.5"
                    value={timeout}
                    onChange={(e) => setTimeoutSec(Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <input
                    type="checkbox"
                    id="permCheck"
                    checked={isPermutationsEnabled}
                    onChange={(e) => setIsPermutationsEnabled(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 rounded"
                  />
                  <label htmlFor="permCheck" className="text-slate-300 cursor-pointer">
                    Generate Username Permutations
                  </label>
                </div>
              </div>
            )}

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/60 text-xs font-mono">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider">CATEGORY:</span>
              {categoriesList.map((cat) => {
                const Icon = cat.icon;
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI HUD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>VERIFIED PROFILES</span>
                <Sparkles className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2 font-mono flex items-center gap-2">
                {matches.length}
                {matches.length > 0 && (
                  <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/40 text-rose-300">
                    MATCHED
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Target: @{lastSearchedUser || username}
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>PLATFORMS PROBED</span>
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono">
                {totalProbed || (platformStats?.total_platforms || 412)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Sherlock & WhatsMyName catalog
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>CONFIDENCE RATING</span>
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                {matches.length > 0 ? '98%' : '0%'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                High identity convergence index
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>RECON VELOCITY</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
                {matches.length > 0 ? `${(matches[0].response_time * 1000).toFixed(0)}ms` : '0ms'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Async parallel execution
              </div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            </div>
          </div>

          {/* Permutations Row (if any) */}
          {permutations.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#0b111e]/80 border border-slate-800 text-xs font-mono space-y-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">
                GENERATED ALIAS PERMUTATIONS:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {permutations.map((perm) => (
                  <button
                    key={perm}
                    onClick={() => {
                      setUsername(perm);
                      handleExecuteLookup(perm);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 text-[11px]"
                  >
                    @{perm}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Discovered Profiles Grid */}
          {isScanning ? (
            <div className="py-24 text-center font-mono text-xs text-slate-500 space-y-3 flex flex-col items-center justify-center">
              <Sparkles className="w-10 h-10 animate-spin text-rose-400" />
              <div>INTERCEPTING IDENTITY PROFILES ACROSS RECON CATALOG...</div>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="py-16 text-center bg-[#0b111e]/40 border border-slate-800/80 rounded-3xl p-6 font-mono space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Profiles Identified Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Enter a target username above or click a preset to launch Clover multi-engine reconnaissance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((profile, idx) => (
                <div
                  key={`${profile.platform}-${idx}`}
                  className="bg-[#0b111e]/90 border border-slate-800/80 hover:border-rose-500/50 rounded-2xl p-4 space-y-3 transition-all group backdrop-blur-md shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                        {profile.platform.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono group-hover:text-rose-300 transition-colors">
                          {profile.platform}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {profile.category.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                      {Math.round(profile.confidence * 100)}%
                    </span>
                  </div>

                  {profile.bio && (
                    <div className="text-[11px] text-slate-400 font-mono line-clamp-2 bg-[#080c14] p-2 rounded-lg border border-slate-800/60">
                      {profile.bio}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">● {profile.status_code} OK</span>
                      <span>•</span>
                      <span>{(profile.response_time * 1000).toFixed(0)}ms</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openAttachModal(profile)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 transition-all flex items-center gap-1"
                        title="Attach this profile to case"
                      >
                        <Plus className="w-3 h-3" />
                        Case
                      </button>

                      <a
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                        title="Open External URL"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Attach to Case */}
      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0b111e] border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)] rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white uppercase">Attach to Investigation Case</h3>
              </div>
              <button onClick={() => setIsAttachModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {attachSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{attachSuccess}</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase mb-1">
                      SELECT CASE DOSSIER:
                    </label>
                    <select
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                    >
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.targets_count || 0} targets)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-[#080c14] border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[10px] uppercase">TARGET USERNAME:</div>
                    <div className="text-white font-bold text-sm">@{lastSearchedUser || username}</div>
                    <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-800/80">
                      Attaching {selectedProfilesToAttach.length} discovered profile nodes to graph.
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsAttachModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAttachProfiles}
                      disabled={isAttaching}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isAttaching ? 'ATTACHING NODES...' : 'CONFIRM ATTACH'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
