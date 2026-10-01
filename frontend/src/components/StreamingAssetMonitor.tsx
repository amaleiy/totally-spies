import React, { useState } from 'react';
import {
  lookupExposure,
  ExposureHostResult,
} from '../api/client';
import {
  Video,
  Search,
  ShieldAlert,
  Server,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Plus,
  RefreshCw,
  Globe,
  Radio,
  Lock,
  Layers,
  CheckCircle2,
  Eye,
  Camera,
  Flame,
  Activity,
} from 'lucide-react';

interface StreamingAsset {
  id: string;
  ip: string;
  flag: string;
  country: string;
  organization: string;
  deviceModel: string;
  deviceType: 'IP_CAMERA' | 'DVR_NVR' | 'STREAMING_SERVER' | 'IOT_GATEWAY';
  openPorts: number[];
  streamingProtocols: string[];
  firmwareVersion?: string;
  cves: string[];
  riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  exposureDetails: string;
  lastAudited: string;
}

const CANONICAL_MONITORED_ASSETS: StreamingAsset[] = [
  {
    id: 'cam-01',
    ip: '194.26.29.112',
    flag: '🇩🇪',
    country: 'Germany',
    organization: 'Hetzner Online GmbH',
    deviceModel: 'Hikvision DS-2CD2042WD Network Camera',
    deviceType: 'IP_CAMERA',
    openPorts: [80, 554, 8000, 8080],
    streamingProtocols: ['RTSP/1.0', 'HTTP-MJPEG', 'ONVIF'],
    firmwareVersion: 'v5.4.5 build 170123',
    cves: ['CVE-2021-36260', 'CVE-2017-7921'],
    riskTier: 'CRITICAL',
    exposureDetails: 'Unauthenticated RTSP streaming port 554 exposed publicly with unpatched command injection CVE.',
    lastAudited: '10 mins ago',
  },
  {
    id: 'cam-02',
    ip: '82.165.197.84',
    flag: '🇬🇧',
    country: 'United Kingdom',
    organization: 'IONOS SE Corporate Hosting',
    deviceModel: 'Dahua DH-SD59230U-HNI PTZ Dome',
    deviceType: 'IP_CAMERA',
    openPorts: [80, 554, 37777],
    streamingProtocols: ['RTSP/1.0', 'Dahua-Private-RPC'],
    firmwareVersion: 'DH_IPC-HX5X3X-Rhea',
    cves: ['CVE-2021-33044'],
    riskTier: 'HIGH',
    exposureDetails: 'Authentication bypass flaw in device RPC daemon; media stream publicly queryable.',
    lastAudited: '28 mins ago',
  },
  {
    id: 'cam-03',
    ip: '142.250.180.46',
    flag: '🇺🇸',
    country: 'United States',
    organization: 'Edgecast Media Infrastructure',
    deviceModel: 'Axis Communications Q3505-V Network Camera',
    deviceType: 'IP_CAMERA',
    openPorts: [80, 443, 554],
    streamingProtocols: ['RTSPS (TLS)', 'HTTPS'],
    firmwareVersion: 'AXIS OS 10.12.189',
    cves: [],
    riskTier: 'LOW',
    exposureDetails: 'Mutual TLS mandatory; authenticated RTSPS streams properly segmented on edge perimeter.',
    lastAudited: '1 hour ago',
  },
  {
    id: 'cam-04',
    ip: '45.138.16.205',
    flag: '🇳🇱',
    country: 'Netherlands',
    organization: 'Serverion B.V.',
    deviceModel: 'Avigilon Control Center Gateway (NVR)',
    deviceType: 'DVR_NVR',
    openPorts: [8080, 554, 1935],
    streamingProtocols: ['RTMP', 'RTSP/1.0', 'HLS'],
    firmwareVersion: 'ACC 7.14.8.12',
    cves: ['CVE-2022-43680'],
    riskTier: 'MEDIUM',
    exposureDetails: 'Live RTMP stream endpoint advertised in DNS without IP access-control whitelist.',
    lastAudited: '2 hours ago',
  },
  {
    id: 'cam-05',
    ip: '118.27.32.19',
    flag: '🇯🇵',
    country: 'Japan',
    organization: 'GMO Internet Inc.',
    deviceModel: 'Panasonic i-PRO Extreme Surveillance Terminal',
    deviceType: 'IP_CAMERA',
    openPorts: [80, 443, 554, 8080],
    streamingProtocols: ['RTSP/1.0', 'H.264/AAC'],
    firmwareVersion: 'WV-S2531LTN v2.41',
    cves: ['CVE-2020-11651'],
    riskTier: 'HIGH',
    exposureDetails: 'Factory default credentials banner detected on secondary HTTP port 8080.',
    lastAudited: '3 hours ago',
  },
];

interface StreamingAssetMonitorProps {
  onAttachToCase?: (asset: { label: string; ip: string; details: string; risk: string }) => void;
}

export const StreamingAssetMonitor: React.FC<StreamingAssetMonitorProps> = ({ onAttachToCase }) => {
  const [assets, setAssets] = useState<StreamingAsset[]>(CANONICAL_MONITORED_ASSETS);
  const [filterType, setFilterType] = useState<'all' | 'RTSP' | 'CVE' | 'CRITICAL'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Shodan InternetDB Audit State
  const [auditQuery, setAuditQuery] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<ExposureHostResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Filtered Assets
  const filteredAssets = assets.filter((item) => {
    if (filterType === 'RTSP' && !item.openPorts.includes(554)) return false;
    if (filterType === 'CVE' && item.cves.length === 0) return false;
    if (filterType === 'CRITICAL' && item.riskTier !== 'CRITICAL') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.ip.toLowerCase().includes(q) ||
        item.deviceModel.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Execute Live Shodan Exposure Audit
  const handleLiveAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = auditQuery.trim();
    if (!target) return;

    try {
      setIsAuditing(true);
      setAuditError(null);
      const res = await lookupExposure(target);
      setAuditResult(res);

      // Check if ports include streaming protocols (554 RTSP, 80/8080 HTTP, 1935 RTMP)
      const portNumbers = res.raw_ports || res.ports.map((p) => p.port);
      const hasRTSP = portNumbers.includes(554);
      const hasStreaming = hasRTSP || portNumbers.includes(1935) || portNumbers.includes(8080);

      // Create new monitored asset entry
      const newAsset: StreamingAsset = {
        id: `audit-${Date.now()}`,
        ip: res.ip || target,
        flag: '🌐',
        country: 'Global',
        organization: res.hostnames && res.hostnames.length > 0 ? res.hostnames[0] : (res.source || 'Detected Host'),
        deviceModel: hasRTSP ? 'Generic RTSP Video Endpoint' : 'Network Host with Open Web Services',
        deviceType: hasRTSP ? 'IP_CAMERA' : 'STREAMING_SERVER',
        openPorts: portNumbers,
        streamingProtocols: hasRTSP ? ['RTSP/1.0'] : hasStreaming ? ['HTTP/MJPEG'] : ['TCP Services'],
        cves: res.vulns || [],
        riskTier: hasRTSP ? 'CRITICAL' : (res.vulns && res.vulns.length > 0) ? 'HIGH' : 'LOW',
        exposureDetails: hasRTSP
          ? `Discovered open RTSP media streaming port 554 on public interface.`
          : `Audited ${portNumbers.length} open ports via Shodan InternetDB.`,
        lastAudited: 'Just now',
      };

      setAssets((prev) => [newAsset, ...prev]);
    } catch (err: any) {
      setAuditError(err.message || 'Host not indexed or query failed');
    } finally {
      setIsAuditing(false);
    }
  };

  const getRiskBadge = (tier: StreamingAsset['riskTier']) => {
    if (tier === 'CRITICAL') {
      return 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]';
    }
    if (tier === 'HIGH') {
      return 'bg-amber-950/80 border-amber-500/60 text-amber-300';
    }
    if (tier === 'MEDIUM') {
      return 'bg-purple-950/80 border-purple-500/60 text-purple-300';
    }
    return 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300';
  };

  return (
    <div className="space-y-6 font-mono text-slate-100 select-none animate-in fade-in duration-200">
      {/* 1. Header & Live Shodan Audit Form */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0c1322] via-[#090f1d] to-[#0a101f] border border-slate-800/90 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-500/10 via-cyan-500/5 to-transparent pointer-events-none rounded-tr-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Camera className="w-4 h-4" />
              <span>WOOHP Tactical Surveillance & Perimeter Defense</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <span>Streaming & Camera Protocol Monitor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                Shodan Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Defensive security auditing for internet-exposed video endpoints, RTSP media daemons (Port 554),
              hardware firmware banners, and unauthenticated streaming interfaces across your organizational perimeter.
            </p>
          </div>

          {/* Quick Shodan Audit Form */}
          <form onSubmit={handleLiveAudit} className="flex flex-col sm:flex-row items-stretch gap-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
                placeholder="Audit IP (e.g. 194.26.29.112)..."
                className="pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono w-full sm:w-64"
              />
            </div>
            <button
              type="submit"
              disabled={isAuditing || !auditQuery.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.35)] transition-all"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>Audit Asset</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error message */}
        {auditError && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{auditError}</span>
          </div>
        )}
      </div>

      {/* 2. Telemetry HUD (4 Metric Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800/90 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Exposed Endpoints</div>
            <div className="text-xl font-black text-rose-400 mt-1">{assets.length} Assets</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Video className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800/90 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">RTSP Streams (Port 554)</div>
            <div className="text-xl font-black text-cyan-400 mt-1">
              {assets.filter((a) => a.openPorts.includes(554)).length} Active
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800/90 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Known Camera CVEs</div>
            <div className="text-xl font-black text-amber-400 mt-1">
              {assets.filter((a) => a.cves.length > 0).length} Vulnerable
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a101d] border border-slate-800/90 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Audit Status</div>
            <div className="text-xl font-black text-emerald-400 mt-1">LIVE SECURED</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#090f1d] border border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by IP, model, organization, or country..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500/60 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {[
            { id: 'all', label: 'All Assets' },
            { id: 'RTSP', label: 'RTSP (554)' },
            { id: 'CVE', label: 'Known CVEs' },
            { id: 'CRITICAL', label: 'Critical Risk' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id as any)}
              className={`px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                filterType === btn.id
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Monitored Assets Grid */}
      <div className="space-y-3.5">
        {filteredAssets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-[#090f1d] border border-slate-800 rounded-3xl">
            <Video className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <span>No streaming assets match the selected filter.</span>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-5 rounded-3xl bg-[#090f1d] border border-slate-800/90 hover:border-rose-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
            >
              {/* Left Column: Device Info & Location */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base">{asset.flag}</span>
                  <span className="text-sm font-black text-slate-100 group-hover:text-rose-300 transition-colors">
                    {asset.ip}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold uppercase ${getRiskBadge(asset.riskTier)}`}>
                    {asset.riskTier} RISK
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {asset.country} • {asset.organization}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{asset.deviceModel}</span>
                  {asset.firmwareVersion && (
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({asset.firmwareVersion})
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {asset.exposureDetails}
                </p>

                {/* Ports & Protocols Pills */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500">Open Ports:</span>
                  {asset.openPorts.map((port) => (
                    <span
                      key={port}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        port === 554
                          ? 'bg-rose-950 border border-rose-500/50 text-rose-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {port === 554 ? '554/RTSP' : port === 8080 ? '8080/MJPEG' : `${port}`}
                    </span>
                  ))}

                  {asset.streamingProtocols.map((proto) => (
                    <span
                      key={proto}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/60 border border-cyan-500/40 text-cyan-300"
                    >
                      {proto}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right Column: CVEs & Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                {/* Vulnerability Tags */}
                {asset.cves.length > 0 ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {asset.cves.map((cve) => (
                      <a
                        key={cve}
                        href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-bold hover:bg-rose-900/60 transition-colors flex items-center gap-1"
                      >
                        <ShieldAlert className="w-2.5 h-2.5" />
                        <span>{cve}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>No Known CVEs</span>
                  </span>
                )}

                <div className="text-[10px] text-slate-500">
                  Audited: {asset.lastAudited}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {onAttachToCase && (
                    <button
                      onClick={() =>
                        onAttachToCase({
                          label: `${asset.deviceModel} (${asset.ip})`,
                          ip: asset.ip,
                          details: asset.exposureDetails,
                          risk: asset.riskTier,
                        })
                      }
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-cyan-400" />
                      <span>+ Case</span>
                    </button>
                  )}

                  <a
                    href={`https://www.shodan.io/host/${asset.ip}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Shodan Raw</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
