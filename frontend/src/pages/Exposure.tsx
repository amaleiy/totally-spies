import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import {
  lookupExposure,
  ExposureHostResult,
  fetchCases,
  createTarget,
  createScan
} from '../api/client';
import { Case } from '../types';
import {
  Globe,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Play,
  Plus,
  FolderKanban,
  Check,
  Copy,
  AlertTriangle,
  ArrowRight,
  Layers,
  Tag,
  Terminal,
  Activity,
  Network
} from 'lucide-react';

export const Exposure: React.FC = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('1.1.1.1');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExposureHostResult | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  // Attach to case modal state
  const [cases, setCases] = useState<Case[]>([]);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachedCaseId, setAttachedCaseId] = useState<string | null>(null);

  // Load cases on mount for attach modal
  useEffect(() => {
    fetchCases()
      .then((data) => {
        setCases(data);
        if (data.length > 0) setSelectedCaseId(data[0].id);
      })
      .catch((err) => console.error('Failed to load cases:', err));
  }, []);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setIsLoading(true);
    setAttachedCaseId(null);
    try {
      const data = await lookupExposure(q);
      setResult(data);
    } catch (err) {
      console.error('Exposure query error:', err);
      setResult({
        query: q,
        ip: null,
        error: 'Failed to contact host intelligence service. Please check network connectivity.',
        ports: [],
        hostnames: [],
        cpes: [],
        vulns: [],
        tags: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleAttachToCase = async () => {
    if (!result?.ip || !selectedCaseId) return;

    setIsAttaching(true);
    try {
      // 1. Add IP target to selected case
      const newTarget = await createTarget(selectedCaseId, {
        type: 'IP',
        value: result.ip,
        notes: `Shodan Exposure Intel: ${result.ports.length} open ports detected, hostnames: ${result.hostnames.join(', ') || 'None'}`
      });

      // 2. Launch exposure scan module on target
      await createScan(selectedCaseId, {
        target_id: newTarget.id,
        module: 'exposure',
        config: {}
      });

      setAttachedCaseId(selectedCaseId);
      setShowAttachModal(false);
    } catch (err) {
      console.error('Failed to attach host to case:', err);
    } finally {
      setIsAttaching(false);
    }
  };

  // Perform initial search on mount
  useEffect(() => {
    handleSearch('1.1.1.1');
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#080c14] overflow-hidden text-slate-200">
      {/* 1. Left Persistent Sidebar */}
      <Sidebar onOpenNewCase={() => navigate('/')} onOpenGraph={() => {}} />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TopBar with Live Engine Badges */}
        <TopBar
          showBadges={true}
          isWsConnected={true}
          placeholder="Search hosts, IPs, or domains in Shodan..."
          onSearch={(q) => {
            if (q.includes('.') && q.length > 3) setQuery(q);
          }}
        />

        {/* Subheader */}
        <div className="px-6 py-4 bg-[#090d16]/95 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.25)] shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">
                  Exposure & Host Intelligence
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 border border-blue-500/30 text-blue-400 tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  SHODAN_INTERNETDB • LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-2xl">
                Internet-wide infrastructure reconnaissance, open port scanning, and CVE vulnerability mapping.
              </p>
            </div>
          </div>

          {/* Quick Target Preset Chips */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-500 text-[11px] hidden xl:inline">Quick Probes:</span>
            {[
              { label: 'Cloudflare DNS', val: '1.1.1.1' },
              { label: 'Google DNS', val: '8.8.8.8' },
              { label: 'Quad9', val: '9.9.9.9' },
              { label: 'GitHub', val: 'github.com' },
            ].map((preset) => (
              <button
                key={preset.val}
                onClick={() => {
                  setQuery(preset.val);
                  handleSearch(preset.val);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition-colors text-[11px]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Command Bar */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-3 max-w-4xl"
          >
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter IP address or domain (e.g. 1.1.1.1, 8.8.8.8, scanme.nmap.org)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 font-mono transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  <span>Inspect Host</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs select-none scrollbar-thin scrollbar-thumb-slate-800">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Activity className="w-8 h-8 text-blue-400 animate-spin" />
              <div className="text-sm font-bold text-slate-300">
                Interrogating Shodan InternetDB...
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Retrieving open ports, banner fingerprints, and CVE vulnerability mappings for {query}.
              </p>
            </div>
          ) : result?.error ? (
            <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/40 text-rose-300 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-bold">Host Reconnaissance Failed</div>
                <p className="text-xs text-rose-200/80 font-sans">{result.error}</p>
              </div>
            </div>
          ) : result ? (
            <>
              {/* Host Overview Banner */}
              <div className="p-5 rounded-2xl bg-[#0b101b] border border-slate-800/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-100 tracking-wide font-mono">
                        {result.ip}
                      </span>
                      <button
                        onClick={() => result.ip && handleCopyIp(result.ip)}
                        className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                        title="Copy IP Address"
                      >
                        {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase">
                        {result.status || 'INDEXED'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-sans mt-0.5 flex items-center gap-2">
                      <span>Query Target: <span className="text-cyan-300 font-mono font-semibold">{result.query}</span></span>
                      <span>&bull;</span>
                      <span>Source: <span className="text-slate-300 font-mono">{result.source || 'Shodan InternetDB'}</span></span>
                    </div>
                  </div>
                </div>

                {/* Actions: Attach to Case */}
                <div className="flex items-center gap-3">
                  {attachedCaseId ? (
                    <button
                      onClick={() => navigate(`/cases/${attachedCaseId}`)}
                      className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-2 transition-all hover:bg-emerald-900"
                    >
                      <Network className="w-4 h-4" />
                      <span>View in Investigation Graph</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAttachModal(true)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-2 transition-all shadow-md group"
                    >
                      <Plus className="w-4 h-4 text-blue-400 group-hover:rotate-90 transition-transform" />
                      <span>Attach to Case Investigation</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Metric Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    {result.ports.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Open Ports</div>
                    <div className="text-[10px] text-slate-500 font-sans">Active network services</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                    {result.hostnames.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Hostnames</div>
                    <div className="text-[10px] text-slate-500 font-sans">Reverse DNS records</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold border ${
                    result.vulns.length > 0
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {result.vulns.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Known CVEs</div>
                    <div className="text-[10px] text-slate-500 font-sans">Published vulnerabilities</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                    {result.cpes.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">CPE Signatures</div>
                    <div className="text-[10px] text-slate-500 font-sans">Detected software platforms</div>
                  </div>
                </div>
              </div>

              {/* 3-Column Intelligence Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Discovered Open Ports */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-sans">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span>Discovered Ports & Services ({result.ports.length})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">TCP / UDP</span>
                  </div>

                  {result.ports.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 font-sans text-xs">
                      No open ports currently detected on this IP.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.ports.map((p) => {
                        const isWeb = p.port === 80 || p.port === 443 || p.port === 8080 || p.port === 8443;
                        const scheme = p.port === 443 || p.port === 8443 ? 'https' : 'http';
                        const url = isWeb && result.ip ? `${scheme}://${result.ip}:${p.port}` : null;

                        return (
                          <div
                            key={p.port}
                            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition-all flex items-center justify-between gap-3 group shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-xs group-hover:scale-105 transition-transform">
                                {p.port}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5 font-sans">
                                  <span>{p.service}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-800 text-slate-400 uppercase">
                                    {p.protocol}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  Status: <span className="text-emerald-400">OPEN</span>
                                </div>
                              </div>
                            </div>

                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                                title="Open service in browser"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Associated Hostnames Card */}
                  <div className="pt-4 space-y-3">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 font-sans pb-2 border-b border-slate-800">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span>Associated Reverse DNS & Subdomains ({result.hostnames.length})</span>
                    </div>

                    {result.hostnames.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 text-slate-500 font-sans text-xs">
                        No reverse DNS hostnames associated with this host.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {result.hostnames.map((host) => (
                          <div
                            key={host}
                            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                          >
                            <span className="text-cyan-300 font-mono font-semibold truncate">{host}</span>
                            <a
                              href={`https://${host}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px] font-sans"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Vulnerabilities (CVEs) & CPE Signatures */}
                <div className="space-y-4">
                  {/* Vulnerabilities (CVEs) */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3 shadow-inner">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between font-sans pb-2 border-b border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Vulnerabilities ({result.vulns.length})</span>
                      </span>
                      {result.vulns.length > 0 && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          ATTENTION
                        </span>
                      )}
                    </div>

                    {result.vulns.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs font-sans flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>No known published CVEs reported on this host.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                        {result.vulns.map((cve) => (
                          <a
                            key={cve}
                            href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 hover:bg-rose-900/40 flex items-center justify-between transition-colors group"
                          >
                            <span className="font-bold text-xs">{cve}</span>
                            <ExternalLink className="w-3 h-3 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CPE Technologies */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
                    <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans pb-2 border-b border-slate-800">
                      <Tag className="w-4 h-4 text-indigo-400" />
                      <span>Technology Signatures ({result.cpes.length})</span>
                    </div>

                    {result.cpes.length === 0 ? (
                      <div className="p-3 text-slate-500 text-xs font-sans">
                        No CPE software tags identified.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {result.cpes.map((cpe) => {
                          const clean = cpe.replace('cpe:/a:', '').replace('cpe:/h:', '').replace('cpe:/o:', '');
                          return (
                            <span
                              key={cpe}
                              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono"
                            >
                              {clean}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Modal: Attach Host to Investigation Case */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b101b] border border-blue-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-400" />
                Attach Host to Investigation
              </h2>
              <button
                onClick={() => setShowAttachModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <p className="text-slate-300 font-sans">
                Target IP <span className="text-cyan-300 font-bold">{result?.ip}</span> and its{' '}
                <span className="text-blue-400 font-bold">{result?.ports.length} open ports</span> will be added to the chosen case and mapped onto the investigation graph canvas.
              </p>

              <div>
                <label className="block text-slate-400 mb-1 font-sans">Select Active Case</label>
                {cases.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-900 text-slate-500 font-sans">
                    No active cases found. Please create a case from the dashboard first.
                  </div>
                ) : (
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 font-sans">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttachToCase}
                  disabled={isAttaching || cases.length === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50"
                >
                  {isAttaching ? 'Attaching & Scanning...' : 'Confirm Attachment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
