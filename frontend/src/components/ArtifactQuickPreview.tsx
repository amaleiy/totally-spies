import React from 'react';
import {
  ExternalLink,
  Globe,
  ShieldCheck,
  Clock,
  MapPin,
  User,
  Info,
  Layers,
  Cpu
} from 'lucide-react';
import { decodeHtmlEntities } from '../utils/formatters';

interface ArtifactQuickPreviewProps {
  data: any;
  positionClass: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const ArtifactQuickPreview: React.FC<ArtifactQuickPreviewProps> = ({
  data,
  positionClass,
  onMouseEnter,
  onMouseLeave,
}) => {
  const metadata = data?.metadata || {};
  const platform = data?.label?.split(':')[0] || 'Platform';
  const username = data?.label?.split(':')[1]?.trim() || '';

  // Extract metadata attributes with decoded HTML entities
  const displayName = decodeHtmlEntities(metadata.display_name);
  const bio = decodeHtmlEntities(metadata.bio);
  const avatarUrl = metadata.avatar_url;
  const location = decodeHtmlEntities(metadata.location);
  const category = metadata.category || data.node_type || 'Profile';
  const responseTime = metadata.response_time;
  const verifiedBy = metadata.verified_by;
  const engine = metadata.engine || 'WhatsMyName';
  const confidence = data.confidence !== undefined ? Math.round(data.confidence * 100) : 100;

  const hasRichMeta = Boolean(displayName || bio || location || avatarUrl);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-50 pointer-events-auto w-80 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.25)] p-4 text-slate-100 transition-all duration-200 animate-in fade-in zoom-in-95 cursor-default ${positionClass}`}
    >
      {/* Glow highlight line */}
      <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

      {/* Header with Avatar / Platform Icon */}
      <div className="flex items-start gap-3 pb-3 border-b border-slate-800/80">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={platform}
            className="w-10 h-10 rounded-xl object-cover border border-cyan-500/40 shadow-sm shrink-0 bg-slate-900"
            onError={(e) => {
              // Fallback to icon if avatar fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono truncate">
              {platform}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700/60 text-slate-400">
              {engine}
            </span>
          </div>

          <div className="text-sm font-extrabold text-slate-100 truncate">
            {displayName || username || data.label}
          </div>

          {username && displayName && (
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <User className="w-3 h-3 text-slate-500" />
              @{username}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="py-3 space-y-2.5 text-xs">
        {/* Bio */}
        {bio && (
          <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 italic line-clamp-3">
            "{bio}"
          </p>
        )}

        {/* Location if present */}
        {location && (
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Category & Confidence Pills */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono uppercase tracking-wider">
            <Layers className="w-3 h-3" />
            {category}
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
            <ShieldCheck className="w-3 h-3" />
            {confidence}% Match
          </div>
        </div>

        {/* Technical Probe Signals */}
        <div className="p-2 bg-slate-900/40 rounded-xl border border-slate-800/60 space-y-1 font-mono text-[10px] text-slate-400">
          {responseTime && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Probe Latency:
              </span>
              <span className="text-slate-200">{responseTime}s</span>
            </div>
          )}

          {verifiedBy && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-400" /> Verification:
              </span>
              <span className="text-slate-200">{verifiedBy}</span>
            </div>
          )}
        </div>

        {/* Limited metadata notice if minimal info */}
        {!hasRichMeta && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono italic">
            <Info className="w-3 h-3" />
            <span>Profile verified via response signature</span>
          </div>
        )}
      </div>

      {/* Footer Link */}
      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-full mt-1 py-1.5 px-3 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 hover:from-cyan-500/20 hover:to-emerald-500/20 border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all group"
        >
          <span>Open Full Profile</span>
          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      )}
    </div>
  );
};
