import React, { useState, useEffect } from 'react';
import {
  fetchSettings,
  updateSettings,
  testApiKey,
  fetchDiagnostics,
  purgeCache,
  exportDatabase,
} from '../api/client';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { useTheme, ThemeType } from '../context/ThemeContext';
import {
  Settings as SettingsIcon,
  Key,
  Shield,
  Sliders,
  Palette,
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Download,
  Trash2,
  RefreshCw,
  Cpu,
  Server,
  Zap,
  Radio,
  Lock,
  Globe,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme: currentGlobalTheme, setTheme: setGlobalTheme, themesList } = useTheme();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'keys' | 'engine' | 'theme' | 'storage' | 'diagnostics'>('keys');

  // State
  const [settingsData, setSettingsData] = useState<any>(null);
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Key visibility toggles
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [keyTestStatus, setKeyTestStatus] = useState<Record<string, { status: string; message: string }>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Cache purge & export feedback
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  // Initial Load
  const loadData = async () => {
    try {
      const [settRes, diagRes] = await Promise.all([
        fetchSettings(),
        fetchDiagnostics(),
      ]);
      if (settRes?.settings) {
        setSettingsData(settRes.settings);
        setMaskedKeys(settRes.masked?.api_keys || {});
      }
      if (diagRes) {
        setDiagnostics(diagRes);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettings(settingsData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestKey = async (service: string, keyVal: string) => {
    setTestingKey(service);
    try {
      const res = await testApiKey(service, keyVal || 'test_key');
      setKeyTestStatus((prev) => ({
        ...prev,
        [service]: { status: 'valid', message: res.message || 'Key verified successfully.' },
      }));
    } catch (err: any) {
      setKeyTestStatus((prev) => ({
        ...prev,
        [service]: { status: 'invalid', message: err.message || 'Verification failed.' },
      }));
    } finally {
      setTestingKey(null);
    }
  };

  const handleExportDB = async () => {
    try {
      const data = await exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `totally_spies_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export database:', err);
    }
  };

  const handlePurgeCache = async () => {
    if (!confirm('Are you sure you want to purge event logs and cached recon sessions?')) return;
    try {
      const res = await purgeCache();
      setPurgeStatus(res.message || 'Cache successfully cleared.');
      setTimeout(() => setPurgeStatus(null), 3000);
      const diagRes = await fetchDiagnostics();
      setDiagnostics(diagRes);
    } catch (err) {
      console.error('Failed to purge cache:', err);
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setVisibleKeys((prev) => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  // Helper for deep setting update
  const updateField = (section: string, field: string, value: any) => {
    setSettingsData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <div className="flex h-screen bg-[#080c14] text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  WOOHP COMMAND & SYSTEM PREFERENCES
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <SettingsIcon className="w-7 h-7 text-cyan-400" />
                System Configuration
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
                Manage reconnaissance engine threads, external OSINT API keys, Tor/proxy routing, user-interface styling, and local database archives.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  CONFIGURATION SAVED
                </span>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={isSaving || !settingsData}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 fill-slate-950" />
                {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
              </button>
            </div>
          </div>

          {/* Settings Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80 text-xs font-mono">
            {[
              { id: 'keys', label: 'API Connectors', icon: Key },
              { id: 'engine', label: 'Recon & Stealth', icon: Sliders },
              { id: 'theme', label: 'Theme & UI', icon: Palette },
              { id: 'storage', label: 'Database & Storage', icon: Database },
              { id: 'diagnostics', label: 'System Diagnostics', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Areas */}
          {isLoading || !settingsData ? (
            <div className="py-24 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <span>READING CONFIGURATION MATRIX...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TAB 1: API KEYS */}
              {activeTab === 'keys' && (
                <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <Key className="w-4 h-4 text-cyan-400" />
                      External Intelligence API Connectors
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Configure third-party intelligence API credentials. Keys are encrypted at rest and masked in the UI.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        id: 'shodan',
                        name: 'Shodan API Key',
                        desc: 'InternetDB host, open ports, and CVE vulnerability scanning',
                        placeholder: 'shodan_api_key_xxxxxxxxxxxxxxxx',
                      },
                      {
                        id: 'hibp',
                        name: 'HaveIBeenPwned API Key',
                        desc: 'Breach verification and compromised identity lookups',
                        placeholder: 'hibp_api_key_xxxxxxxxxxxxxxxx',
                      },
                      {
                        id: 'dehashed',
                        name: 'DeHashed API Key',
                        desc: 'Leaked credential hash correlation engine',
                        placeholder: 'dehashed_api_key_xxxxxxxxxxxxxxxx',
                      },
                      {
                        id: 'hunter_io',
                        name: 'Hunter.io API Key',
                        desc: 'Corporate domain email pattern resolution',
                        placeholder: 'hunter_api_key_xxxxxxxxxxxxxxxx',
                      },
                      {
                        id: 'github_pat',
                        name: 'GitHub Personal Access Token',
                        desc: 'High rate-limit developer profile & commit history recon',
                        placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                      },
                      {
                        id: 'virustotal',
                        name: 'VirusTotal API Key',
                        desc: 'Domain malware analysis and infrastructure reputation',
                        placeholder: 'vt_api_key_xxxxxxxxxxxxxxxx',
                      },
                    ].map((keyItem) => {
                      const isVis = visibleKeys[keyItem.id];
                      const currentVal = settingsData.api_keys?.[keyItem.id] || '';
                      const maskedVal = maskedKeys[keyItem.id] || '';
                      const displayVal = isVis ? currentVal : (currentVal ? maskedVal : '');
                      const testInfo = keyTestStatus[keyItem.id];

                      return (
                        <div
                          key={keyItem.id}
                          className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 space-y-2.5 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white tracking-wide">{keyItem.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleKeyVisibility(keyItem.id)}
                              className="text-slate-400 hover:text-white text-[11px] flex items-center gap-1"
                            >
                              {isVis ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {isVis ? 'Hide' : 'Reveal'}
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500 leading-tight">
                            {keyItem.desc}
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type={isVis ? 'text' : 'password'}
                              placeholder={keyItem.placeholder}
                              value={currentVal}
                              onChange={(e) => updateField('api_keys', keyItem.id, e.target.value)}
                              className="flex-1 bg-[#0b111e] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                            />
                            <button
                              type="button"
                              onClick={() => handleTestKey(keyItem.id, currentVal)}
                              disabled={testingKey === keyItem.id}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0"
                            >
                              {testingKey === keyItem.id ? 'TESTING...' : 'TEST'}
                            </button>
                          </div>

                          {testInfo && (
                            <div
                              className={`p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                                testInfo.status === 'valid'
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-950/40 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {testInfo.status === 'valid' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{testInfo.message}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: RECON & STEALTH */}
              {activeTab === 'engine' && (
                <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      Reconnaissance Engine & Stealth Parameters
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Tune probe execution rate, request timeouts, proxy/Tor integration, and stealth evasion behaviors.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                    {/* Concurrency Limit */}
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">CONCURRENT THREADS</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                          {settingsData.scanner?.concurrency_limit || 10} workers
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Maximum parallel async HTTP workers executing platform probes.
                      </p>
                      <input
                        type="range"
                        min="1"
                        max="25"
                        value={settingsData.scanner?.concurrency_limit || 10}
                        onChange={(e) => updateField('scanner', 'concurrency_limit', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    {/* Request Timeout */}
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">PROBE TIMEOUT</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                          {settingsData.scanner?.request_timeout || 15}s
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Max duration before dropping sluggish or unresponsive remote endpoints.
                      </p>
                      <input
                        type="range"
                        min="3"
                        max="60"
                        value={settingsData.scanner?.request_timeout || 15}
                        onChange={(e) => updateField('scanner', 'request_timeout', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    {/* Stealth Delay */}
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">STEALTH THROTTLING</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                          {settingsData.scanner?.stealth_delay_ms || 100}ms
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Artificial jitter interval inserted between outbound HTTP requests to bypass WAF bans.
                      </p>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="50"
                        value={settingsData.scanner?.stealth_delay_ms || 100}
                        onChange={(e) => updateField('scanner', 'stealth_delay_ms', Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    {/* User Agent Selector */}
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <span className="font-bold text-white">USER-AGENT IDENTITY PROFILE</span>
                      <p className="text-[11px] text-slate-500">
                        Header signature presented to remote platforms during active probing.
                      </p>
                      <select
                        value={settingsData.scanner?.user_agent_profile || 'woohp_tactical'}
                        onChange={(e) => updateField('scanner', 'user_agent_profile', e.target.value)}
                        className="w-full bg-[#0b111e] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="woohp_tactical">WOOHP Tactical Intelligence Scanner v1.0</option>
                        <option value="chrome_macos">Chrome 128 / macOS Sequoia (Stealth)</option>
                        <option value="firefox_linux">Firefox 130 / Linux Ubuntu (Standard)</option>
                        <option value="tor_browser">Tor Browser 13.5 (Covert Onion)</option>
                        <option value="safari_ios">Mobile Safari / iOS 18 (Casual)</option>
                      </select>
                    </div>
                  </div>

                  {/* Tor & Proxy Routing */}
                  <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <Radio className="w-4 h-4 text-cyan-400" />
                          Tor / SOCKS5 Proxy Routing
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Tunnel all outbound OSINT requests through local Tor onion proxy or custom proxy node.
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settingsData.scanner?.proxy_enabled || false}
                          onChange={(e) => updateField('scanner', 'proxy_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
                      </label>
                    </div>

                    {settingsData.scanner?.proxy_enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase mb-1">PROXY PROTOCOL</label>
                          <select
                            value={settingsData.scanner?.proxy_type || 'socks5'}
                            onChange={(e) => updateField('scanner', 'proxy_type', e.target.value)}
                            className="w-full bg-[#0b111e] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                          >
                            <option value="socks5">SOCKS5 (Tor Default 127.0.0.1:9050)</option>
                            <option value="http">HTTP Proxy</option>
                            <option value="https">HTTPS Tunnel</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase mb-1">PROXY HOST & PORT</label>
                          <input
                            type="text"
                            value={settingsData.scanner?.proxy_host || '127.0.0.1:9050'}
                            onChange={(e) => updateField('scanner', 'proxy_host', e.target.value)}
                            className="w-full bg-[#0b111e] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: THEME & UI */}
              {activeTab === 'theme' && (
                <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-cyan-400" />
                      Interface Aesthetics & Tactical Styling
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Personalize the Totally Spies command console color accents, neon glow effects, and audio indicators.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                    {themesList.map((t) => {
                      const isSel = currentGlobalTheme === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            updateField('interface', 'theme', t.id);
                            setGlobalTheme(t.id);
                          }}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isSel
                              ? `bg-slate-900/90 ${t.borderClass} shadow-[0_0_20px_rgba(var(--theme-glow),0.35)] scale-[1.02]`
                              : 'bg-[#080c14] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.primary }} />
                            {isSel && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-white border border-slate-700">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-white text-sm mb-1">{t.label}</div>
                          <div className="text-[11px] text-slate-500 leading-tight">{t.sublabel}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* UI Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-2">
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">Radar & Globe Animations</div>
                        <div className="text-[11px] text-slate-500">Enable 3D globe arcs and animated radar sweeps</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsData.interface?.radar_animations !== false}
                        onChange={(e) => updateField('interface', 'radar_animations', e.target.checked)}
                        className="w-4 h-4 accent-cyan-400"
                      />
                    </div>

                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">Tactical Audio Feedback</div>
                        <div className="text-[11px] text-slate-500">Subtle sound cue when high-confidence artifact is found</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsData.interface?.sound_effects !== false}
                        onChange={(e) => updateField('interface', 'sound_effects', e.target.checked)}
                        className="w-4 h-4 accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: DATABASE & STORAGE */}
              {activeTab === 'storage' && (
                <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      Local Database Management & Archives
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Manage SQLite local database storage, export full system JSON backups, or purge temporary session event logs.
                    </p>
                  </div>

                  {purgeStatus && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{purgeStatus}</span>
                    </div>
                  )}

                  {/* Storage KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4">
                      <div className="text-slate-500 text-[10px]">DATABASE SIZE</div>
                      <div className="text-lg font-black text-cyan-300 mt-1">
                        {diagnostics?.database?.size_kb || 0} KB
                      </div>
                    </div>
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4">
                      <div className="text-slate-500 text-[10px]">TOTAL TARGETS</div>
                      <div className="text-lg font-black text-white mt-1">
                        {diagnostics?.database?.targets_count || 0}
                      </div>
                    </div>
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4">
                      <div className="text-slate-500 text-[10px]">TOTAL ARTIFACTS</div>
                      <div className="text-lg font-black text-rose-400 mt-1">
                        {diagnostics?.database?.artifacts_count || 0}
                      </div>
                    </div>
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4">
                      <div className="text-slate-500 text-[10px]">SCAN EVENT LOGS</div>
                      <div className="text-lg font-black text-amber-400 mt-1">
                        {diagnostics?.database?.events_count || 0}
                      </div>
                    </div>
                  </div>

                  {/* Backup & Purge Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Download className="w-4 h-4 text-cyan-400" />
                        Full OSINT Database Archive
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Export all cases, target reconnaissance dossiers, scans, and discovered graph nodes as a standalone JSON backup file.
                      </p>
                      <button
                        onClick={handleExportDB}
                        className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        DOWNLOAD JSON ARCHIVE
                      </button>
                    </div>

                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-5 space-y-3">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        Purge Scan Cache & Event Logs
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Clear temporary console terminal logs and transient HTTP cache while preserving discovered targets and cases.
                      </p>
                      <button
                        onClick={handlePurgeCache}
                        className="px-4 py-2 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-900/60 transition-all flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        PURGE TEMPORARY LOGS
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SYSTEM DIAGNOSTICS */}
              {activeTab === 'diagnostics' && (
                <div className="bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      Live System Telemetry & Diagnostics
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Health verification of core backend daemons, database query latency, and recon scanner modules.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="text-slate-500 text-[10px]">CORE BACKEND RUNTIME</div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        {diagnostics?.runtime || 'Python 3.14 (AsyncIO)'}
                      </div>
                      <div className="text-[11px] text-emerald-400">● FASTAPI SERVER HEALTHY</div>
                    </div>

                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="text-slate-500 text-[10px]">DATABASE ENGINE</div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-400" />
                        {diagnostics?.database?.engine || 'SQLite Async'}
                      </div>
                      <div className="text-[11px] text-emerald-400">● AIOSQLITE CONNECTED</div>
                    </div>

                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="text-slate-500 text-[10px]">CLOVER IDENTITY ENGINE</div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-rose-400" />
                        {diagnostics?.modules?.clover_scanner || 'READY'}
                      </div>
                      <div className="text-[11px] text-slate-400">Sherlock 400+ platform probes</div>
                    </div>

                    <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 space-y-2">
                      <div className="text-slate-500 text-[10px]">SHODAN EXPOSURE ENGINE</div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        {diagnostics?.modules?.exposure_scanner || 'READY'}
                      </div>
                      <div className="text-[11px] text-slate-400">InternetDB host & port resolution</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
