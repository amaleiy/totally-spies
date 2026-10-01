import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { ArtifactQuickPreview } from './ArtifactQuickPreview';
import { decodeHtmlEntities } from '../utils/formatters';

const getPlatformBrand = (platformName: string) => {
  const p = platformName.toLowerCase();
  if (p.includes('github') || p.includes('git')) return { bg: 'bg-slate-900 border-slate-700 text-white', icon: Globe };
  if (p.includes('keybase')) return { bg: 'bg-teal-950/80 border-teal-500/50 text-teal-300', icon: ShieldCheck };
  if (p.includes('mastodon')) return { bg: 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300', icon: Globe };
  if (p.includes('chess') || p.includes('lichess')) return { bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300', icon: ShieldCheck };
  if (p.includes('soundcloud') || p.includes('spotify') || p.includes('bandcamp')) return { bg: 'bg-orange-950/80 border-orange-500/50 text-orange-300', icon: Globe };
  if (p.includes('pinterest')) return { bg: 'bg-red-950/80 border-red-500/50 text-red-300', icon: Globe };
  if (p.includes('disqus')) return { bg: 'bg-blue-950/80 border-blue-500/50 text-blue-300', icon: Globe };
  if (p.includes('pastebin')) return { bg: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300', icon: Globe };
  if (p.includes('reddit')) return { bg: 'bg-orange-950/80 border-orange-500/50 text-orange-400', icon: Globe };
  return { bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400', icon: Globe };
};

export const ArtifactNode = memo(({ data }: { data: any }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [positionClass, setPositionClass] = useState('left-full ml-3 top-0');
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platform = data?.label?.split(':')[0] || 'Platform';
  const brand = getPlatformBrand(platform);
  const BrandIcon = brand.icon;

  // Compute position relative to window bounds
  const updatePosition = useCallback(() => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    const previewWidth = 340;
    const previewHeight = 240;

    const openLeft = rect.right + previewWidth > winWidth;
    const openTop = rect.bottom + previewHeight > winHeight;

    const horizClass = openLeft ? 'right-full mr-3' : 'left-full ml-3';
    const vertClass = openTop ? 'bottom-0' : 'top-0';

    setPositionClass(`${horizClass} ${vertClass}`);
  }, []);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    enterTimerRef.current = setTimeout(() => {
      updatePosition();
      setShowPreview(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setShowPreview(false);
    }, 160);
  };

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={nodeRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative px-4 py-3 bg-[#080d16]/95 backdrop-blur-xl border rounded-2xl shadow-[0_4px_25px_rgba(6,182,212,0.12)] min-w-[190px] max-w-[230px] transition-all duration-200 group ${
        showPreview
          ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.35)] scale-[1.03]'
          : 'border-cyan-500/40 hover:border-cyan-400'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${brand.bg}`}>
          <BrandIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
            {decodeHtmlEntities(data.label)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 font-mono">
            <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-900 border border-slate-700/60 text-slate-400 rounded">
              {data.node_type || 'PROFILE'}
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" />
              {data.confidence ? `${Math.round(data.confidence * 100)}%` : '100%'}
            </span>
          </div>
        </div>
      </div>

      {data.url && (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-cyan-400/80 hover:text-cyan-300 flex items-center justify-between group/link"
        >
          <span className="truncate pr-1">View Profile</span>
          <ExternalLink className="w-3 h-3 shrink-0 group-hover/link:translate-x-0.5 transition-transform" />
        </a>
      )}

      {/* Handles for Edge Connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />

      {/* Quick Intelligence Hover Preview */}
      {showPreview && (
        <ArtifactQuickPreview
          data={data}
          positionClass={positionClass}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </div>
  );
});
