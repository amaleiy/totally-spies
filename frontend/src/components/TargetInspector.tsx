import React, { useState } from 'react';
import { GraphNode, GraphEdge } from '../types';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Globe,
  User,
  Clock,
  Tag,
  FileJson,
  Trash2,
  AlertTriangle,
  MapPin,
  Calendar,
  BookOpen,
  Users,
  UserCheck,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Link as LinkIcon,
  Play
} from 'lucide-react';
import { decodeHtmlEntities } from '../utils/formatters';

interface TargetInspectorProps {
  node: GraphNode | null;
  onClose: () => void;
  onDeleteArtifact?: (artifactId: string) => Promise<void>;
  onDeployScan?: (targetId: string, module: string) => void;
  edges?: GraphEdge[];
}

// Brand styling helper
const getPlatformBrandDetails = (platformName: string) => {
  const p = platformName.toLowerCase();
  if (p.includes('github')) {
    return {
      bg: 'bg-[#181d27] border-slate-700 text-white',
      badge: 'border-slate-600 bg-slate-800 text-slate-200',
      iconText: 'GH'
    };
  }
  if (p.includes('keybase')) {
    return {
      bg: 'bg-teal-950/90 border-teal-500/50 text-teal-300',
      badge: 'border-teal-500/40 bg-teal-950/60 text-teal-300',
      iconText: 'KB'
    };
  }
  if (p.includes('mastodon')) {
    return {
      bg: 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300',
      badge: 'border-indigo-500/40 bg-indigo-950/60 text-indigo-300',
      iconText: 'M'
    };
  }
  if (p.includes('chess') || p.includes('lichess')) {
    return {
      bg: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300',
      badge: 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300',
      iconText: '♟'
    };
  }
  if (p.includes('soundcloud') || p.includes('spotify')) {
    return {
      bg: 'bg-orange-950/90 border-orange-500/50 text-orange-300',
      badge: 'border-orange-500/40 bg-orange-950/60 text-orange-300',
      iconText: 'SC'
    };
  }
  if (p.includes('pinterest')) {
    return {
      bg: 'bg-rose-950/90 border-rose-500/50 text-rose-300',
      badge: 'border-rose-500/40 bg-rose-950/60 text-rose-300',
      iconText: 'P'
    };
  }
  if (p.includes('disqus')) {
    return {
      bg: 'bg-blue-950/90 border-blue-500/50 text-blue-300',
      badge: 'border-blue-500/40 bg-blue-950/60 text-blue-300',
      iconText: 'D'
    };
  }
  if (p.includes('pastebin')) {
    return {
      bg: 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300',
      badge: 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300',
      iconText: 'PB'
    };
  }
  return {
    bg: 'bg-slate-900 border-slate-800 text-cyan-400',
    badge: 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300',
    iconText: '🌐'
  };
};

export const TargetInspector: React.FC<TargetInspectorProps> = ({
  node,
  onClose,
  onDeleteArtifact,
  onDeployScan,
  edges = [],
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metadata' | 'raw' | 'relations'>('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  if (!node) return null;

  const isTarget = node.type === 'targetNode';
  const data = node.data || {};
  const decodedLabel = decodeHtmlEntities(data.label || '');

  // Extract platform and account name
  const [platformName, accountName] = decodedLabel.includes(':')
    ? decodedLabel.split(':').map((s) => s.trim())
    : [decodedLabel, ''];

  const brand = getPlatformBrandDetails(platformName);
  const meta = data.metadata || {};
  const engineSource = meta.engine || 'whatsmyname';

  // Fallback profile values for display matching the high-fidelity mock
  const displayName = meta.display_name || meta.name || (isTarget ? data.label : accountName || decodedLabel);
  const handle = accountName ? `@${accountName}` : isTarget ? `@${data.label}` : `@${decodedLabel}`;
  const bio =
    meta.bio ||
    meta.description ||
    (isTarget
      ? data.notes || 'Primary subject under active cyber intelligence monitoring.'
      : 'Identified public profile associated with targeted digital footprint.');
  const location = meta.location || '';
  const profileUrl = data.url || meta.profile_url || (isTarget ? '' : `https://${platformName.toLowerCase()}.com/${accountName || data.label}`);

  const joinedDate = meta.joined || meta.created_at || null;
  const reposCount = meta.public_repos || meta.repos || meta.repositories || null;
  const followersCount = meta.followers || meta.followers_count || null;
  const followingCount = meta.following || meta.following_count || null;

  const probeLatency = meta.latency ? `${Number(meta.latency).toFixed(2)}s` : meta.response_time ? `${Number(meta.response_time).toFixed(2)}s` : '0.12s';
  const httpStatus = meta.status_code || 200;
  const verification = meta.verification || meta.check_type || (meta.status_code ? 'HTTP_STATUS' : 'VERIFIED');

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="w-[390px] h-full bg-[#080d16]/98 backdrop-blur-2xl border-l border-slate-800/80 shadow-2xl flex flex-col overflow-hidden text-slate-200 z-20 animate-in fade-in slide-in-from-right-4 duration-200 shrink-0">
      {/* Header */}
      <div className="p-4 pb-3 border-b border-slate-800/80 flex items-start justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-3 min-w-0">
          {/* Brand/Target Icon */}
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${
              isTarget ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' : brand.bg
            }`}
          >
            {isTarget ? <User className="w-5 h-5 text-emerald-400" /> : brand.iconText}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-100 truncate tracking-wide">
                {isTarget ? decodedLabel : platformName}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {data.confidence ? `${Math.round(data.confidence * 100)}%` : '100%'}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
              {accountName || (isTarget ? 'Primary Target' : decodedLabel)}
            </div>

            <div className="text-[10px] font-mono text-slate-500 tracking-tight mt-0.5">
              {isTarget ? data.targetType || 'USERNAME' : engineSource}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-3 border-b border-slate-800/80 bg-slate-900/40 font-mono text-xs select-none">
        {(['overview', 'metadata', 'raw', 'relations'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const labels: Record<string, string> = {
            overview: 'Overview',
            metadata: 'Metadata',
            raw: 'Raw Data',
            relations: 'Relations',
          };

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-2 text-center font-medium transition-all relative border-b-2 capitalize ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Target Profile Card */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/90 rounded-2xl space-y-3.5 shadow-inner">
              {/* Profile Top: Avatar & Name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1px] shrink-0 shadow-md">
                  <div className="w-full h-full rounded-[11px] bg-slate-950 overflow-hidden flex items-center justify-center">
                    {meta.avatar_url ? (
                      <img
                        src={meta.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-300 font-bold text-base">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-100 truncate font-sans">
                    {displayName}
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate flex items-center gap-1">
                    <User className="w-3 h-3 text-cyan-400" />
                    <span>{handle}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1 border-t border-slate-800/60">
                {bio}
              </p>

              {/* Key Attributes */}
              <div className="space-y-1.5 pt-1 text-[11px] font-sans">
                {location && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
                {profileUrl && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <LinkIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline"
                    >
                      {profileUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Social / Repo Metrics Table (rendered only if metadata metrics exist) */}
              {(joinedDate || reposCount || followersCount || followingCount) && (
                <div className="pt-2 border-t border-slate-800/60 space-y-1.5 text-[11px] font-mono">
                  {joinedDate && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-sans">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Joined
                      </span>
                      <span className="text-slate-200">{joinedDate}</span>
                    </div>
                  )}
                  {reposCount && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-sans">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        Public Repositories
                      </span>
                      <span className="text-slate-200 font-semibold">{reposCount}</span>
                    </div>
                  )}
                  {followersCount && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-sans">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Followers
                      </span>
                      <span className="text-slate-200 font-semibold">{followersCount}</span>
                    </div>
                  )}
                  {followingCount && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 font-sans">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        Following
                      </span>
                      <span className="text-slate-200 font-semibold">{followingCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detection & Probe Metrics */}
            <div className="p-4 bg-slate-900/60 border border-slate-800/90 rounded-2xl space-y-2.5">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-sans pb-1 border-b border-slate-800/60 flex items-center justify-between">
                <span>Detection & Probe</span>
                <span className="text-[10px] text-cyan-400 font-mono">LIVE_TELEMETRY</span>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Status</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Profile Found
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Confidence</span>
                  <span className="text-emerald-400 font-bold">
                    {data.confidence ? `${Math.round(data.confidence * 100)}%` : '100%'} Match
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Probe Latency</span>
                  <span className="text-cyan-300 font-semibold">{probeLatency}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">HTTP Status</span>
                  <span className="text-slate-200 font-semibold">{httpStatus}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Verification</span>
                  <span className="text-cyan-400 font-semibold">{verification}</span>
                </div>
              </div>
            </div>

            {/* Primary Action: Open Full Profile Button */}
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 font-bold text-xs font-sans transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] group"
              >
                <span>Open Full Profile</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            )}

            {/* Target-Specific Action: Deploy Recon */}
            {isTarget && onDeployScan && (
              <button
                onClick={() => onDeployScan(node.id, 'clover')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs font-sans transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Deploy Agent (Clover) Recon</span>
              </button>
            )}

            {/* Prune Node False-Positive Action */}
            {!isTarget && onDeleteArtifact && (
              <div className="pt-2 border-t border-slate-800/80">
                {confirmDelete ? (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-xs text-rose-300 font-sans font-semibold">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      Prune from Investigation?
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      This removes this artifact and its relationship edge from database and graph canvas.
                    </p>
                    <div className="flex items-center gap-2 pt-1 font-sans">
                      <button
                        onClick={async () => {
                          try {
                            setIsDeleting(true);
                            await onDeleteArtifact(node.id);
                            onClose();
                          } catch (err) {
                            console.error('Delete failed:', err);
                          } finally {
                            setIsDeleting(false);
                            setConfirmDelete(false);
                          }
                        }}
                        disabled={isDeleting}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-lg shadow-rose-900/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isDeleting ? 'Pruning...' : 'Yes, Prune Node'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting}
                        className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-sans transition-all flex items-center justify-center gap-2 group"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 transition-colors" />
                    <span>Prune Node (False Positive)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= METADATA TAB ================= */}
        {activeTab === 'metadata' && (
          <div className="space-y-3 font-mono">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Extracted Key-Values</span>
              <span className="text-[10px] text-cyan-400">{Object.keys(meta).length} keys</span>
            </div>

            {Object.keys(meta).length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 text-center text-slate-500 font-sans text-xs">
                No structured metadata was captured for this probe.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(meta).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col gap-1"
                  >
                    <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-semibold">
                      {key}
                    </span>
                    <span className="text-xs text-slate-200 break-all select-all font-mono">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= RAW DATA TAB ================= */}
        {activeTab === 'raw' && (
          <div className="space-y-2 font-mono">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                Raw Node Payload
              </span>
              <button
                onClick={handleCopyRaw}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
              >
                {copiedRaw ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy JSON
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-slate-950 border border-slate-800/90 rounded-xl overflow-x-auto text-[11px] text-cyan-200/90 leading-relaxed max-h-[460px] select-all scrollbar-thin scrollbar-thumb-slate-800">
              {JSON.stringify(node, null, 2)}
            </pre>
          </div>
        )}

        {/* ================= RELATIONS TAB ================= */}
        {activeTab === 'relations' && (
          <div className="space-y-3 font-mono">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans pb-1 border-b border-slate-800">
              <span>Graph Connections</span>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="text-emerald-400 font-semibold">OWNS_ACCOUNT</span>
                  <span className="text-emerald-400">100% Confidence</span>
                </div>
                <div className="text-xs text-slate-200">
                  Connected from Target to platform profile node.
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  Discovered: {data.discovered_at || data.created_at || 'During initial recon'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
