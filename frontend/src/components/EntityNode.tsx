import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  User,
  Globe,
  Mail,
  Server,
  Flame,
  FileText,
  Building,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export type EntityCategory =
  | 'PERSON'
  | 'USERNAME'
  | 'DOMAIN'
  | 'EMAIL'
  | 'IP_ADDRESS'
  | 'SOCIAL'
  | 'BREACH'
  | 'DOCUMENT'
  | 'ORGANIZATION';

export interface EntityNodeData extends Record<string, unknown> {
  label: string;
  category?: EntityCategory | string;
  subtitle?: string;
  confidence?: number;
  isPrimary?: boolean;
  flag?: string;
  platform?: string;
  metrics?: {
    connections?: number;
    scans?: number;
    evidence?: number;
    records?: string;
  };
  notes?: string;
  url?: string;
  metadata?: Record<string, any>;
  observedDates?: { first?: string; last?: string };
  [key: string]: unknown;
}

export const EntityNode = memo(({ data, selected }: { data: EntityNodeData; selected?: boolean }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [positionClass, setPositionClass] = useState('left-full ml-3 top-0');

  const nodeRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawCat = (data.category || 'USERNAME').toUpperCase();
  let category: EntityCategory = 'USERNAME';
  if (rawCat.includes('PERSON')) category = 'PERSON';
  else if (rawCat.includes('DOMAIN')) category = 'DOMAIN';
  else if (rawCat.includes('EMAIL') || rawCat.includes('MAIL')) category = 'EMAIL';
  else if (rawCat.includes('IP')) category = 'IP_ADDRESS';
  else if (rawCat.includes('SOCIAL') || rawCat.includes('PROFILE')) category = 'SOCIAL';
  else if (rawCat.includes('BREACH')) category = 'BREACH';
  else if (rawCat.includes('DOC') || rawCat.includes('WIKI')) category = 'DOCUMENT';
  else if (rawCat.includes('ORG')) category = 'ORGANIZATION';
  else category = 'USERNAME';

  const isPrimary = !!data.isPrimary;
  const confidence = data.confidence !== undefined ? Math.round(data.confidence > 1 ? data.confidence : data.confidence * 100) : 92;

  // Category Configuration
  const catConfig = {
    PERSON: {
      color: '#3b82f6',
      borderClass: 'border-blue-500/60 hover:border-blue-400',
      bgGlow: 'bg-blue-950/40',
      pillClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: User,
      label: 'PERSON',
    },
    USERNAME: {
      color: '#06b6d4',
      borderClass: 'border-cyan-500/70 hover:border-cyan-400',
      bgGlow: 'bg-cyan-950/40',
      pillClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: User,
      label: 'USERNAME',
    },
    DOMAIN: {
      color: '#10b981',
      borderClass: 'border-emerald-500/60 hover:border-emerald-400',
      bgGlow: 'bg-emerald-950/40',
      pillClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: Globe,
      label: 'DOMAIN',
    },
    EMAIL: {
      color: '#f59e0b',
      borderClass: 'border-amber-500/60 hover:border-amber-400',
      bgGlow: 'bg-amber-950/40',
      pillClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: Mail,
      label: 'EMAIL',
    },
    IP_ADDRESS: {
      color: '#ef4444',
      borderClass: 'border-rose-500/60 hover:border-rose-400',
      bgGlow: 'bg-rose-950/40',
      pillClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: Server,
      label: 'IP ADDRESS',
    },
    SOCIAL: {
      color: '#8b5cf6',
      borderClass: 'border-purple-500/60 hover:border-purple-400',
      bgGlow: 'bg-purple-950/40',
      pillClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: Globe,
      label: 'SOCIAL',
    },
    BREACH: {
      color: '#ec4899',
      borderClass: 'border-pink-500/60 hover:border-pink-400',
      bgGlow: 'bg-pink-950/40',
      pillClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      icon: Flame,
      label: 'BREACH',
    },
    DOCUMENT: {
      color: '#6366f1',
      borderClass: 'border-indigo-500/60 hover:border-indigo-400',
      bgGlow: 'bg-indigo-950/40',
      pillClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: FileText,
      label: 'DOCUMENT',
    },
    ORGANIZATION: {
      color: '#f97316',
      borderClass: 'border-orange-500/60 hover:border-orange-400',
      bgGlow: 'bg-orange-950/40',
      pillClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      icon: Building,
      label: 'ORGANIZATION',
    },
  }[category];

  const CatIcon = catConfig.icon;

  // Platform Brand Icon if available
  const getBrandIcon = () => {
    const p = (data.platform || data.label).toLowerCase();
    if (p.includes('github')) {
      return (
        <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
          ⌥
        </div>
      );
    }
    if (p.includes('twitter') || p.includes('x (twitter)')) {
      return (
        <div className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-100 text-xs font-black shrink-0">
          𝕏
        </div>
      );
    }
    if (p.includes('wikipedia')) {
      return (
        <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-300 text-xs font-black shrink-0">
          W
        </div>
      );
    }
    return (
      <div
        className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
        style={{
          borderColor: `${catConfig.color}60`,
          backgroundColor: `${catConfig.color}25`,
          color: catConfig.color,
        }}
      >
        <CatIcon className="w-3.5 h-3.5" />
      </div>
    );
  };

  // Hover Preview position calculation
  const updatePosition = useCallback(() => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    const previewWidth = 320;
    const previewHeight = 220;

    const openLeft = rect.right + previewWidth > winWidth - 360; // account for right drawer
    const openTop = rect.bottom + previewHeight > winHeight - 160; // account for bottom bar

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
      className={`relative rounded-2xl p-3.5 select-none transition-all duration-200 backdrop-blur-xl ${
        isPrimary
          ? 'min-w-[240px] max-w-[270px] bg-[#071320]/95 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.4)]'
          : `min-w-[200px] max-w-[240px] bg-[#080d16]/95 border ${catConfig.borderClass} shadow-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]`
      } ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105' : ''}`}
      style={{
        boxShadow: selected ? `0 0 30px ${catConfig.color}80` : undefined,
      }}
    >
      {/* Top Category Badge */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border ${catConfig.pillClass}`}
        >
          {catConfig.label}
        </span>

        {isPrimary && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-[9px] font-mono font-bold text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            High Confidence
          </span>
        )}

        {data.flag && (
          <span className="text-sm shrink-0" title={data.subtitle || ''}>
            {data.flag}
          </span>
        )}
      </div>

      {/* Main Node Body */}
      <div className="flex items-center gap-2.5">
        {getBrandIcon()}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-100 font-mono tracking-tight truncate leading-tight group-hover:text-cyan-300">
            {data.label}
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate leading-tight mt-0.5">
            {data.subtitle || catConfig.label}
          </div>
        </div>
      </div>

      {/* Metrics Row (Connections, Scans, Evidence) */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 hover:text-cyan-300" title="Connected Relationships">
            <span className="text-cyan-400">🔗</span>
            <span>{data.metrics?.connections ?? (isPrimary ? 12 : 3)}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-emerald-300" title="Scans / Evidence">
            <span className="text-emerald-400">🛡️</span>
            <span>{data.metrics?.scans ?? 2}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-purple-300" title="Verified Artifacts">
            <span className="text-purple-400">📄</span>
            <span>{data.metrics?.evidence ?? 1}</span>
          </span>
        </div>

        <span className="text-[9px] font-bold" style={{ color: catConfig.color }}>
          {confidence}%
        </span>
      </div>

      {/* 4 Handles on All Sides for Flexible Routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-2.5 !h-2.5 !bg-cyan-400 !border-2 !border-slate-900 rounded-full"
      />

      {/* Floating Hover Intelligence Preview Card */}
      {showPreview && (
        <div
          className={`absolute ${positionClass} z-50 pointer-events-none w-72 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="bg-[#090f1d]/98 border border-cyan-500/70 rounded-2xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.35)] backdrop-blur-2xl space-y-3 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                {catConfig.label} ENTITY
              </span>
              <span className="text-[10px] font-bold text-emerald-400">
                {confidence}% correlation
              </span>
            </div>

            {/* Title */}
            <div>
              <div className="text-sm font-black text-slate-100 truncate">
                {data.label}
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {data.notes || data.subtitle || 'Identified intelligence node in current investigation.'}
              </div>
            </div>

            {/* Key-Value Details */}
            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-500 block">Relationships:</span>
                <span className="text-slate-200 font-bold">
                  {data.metrics?.connections ?? 12} direct
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Observed:</span>
                <span className="text-slate-200 font-bold">
                  {data.observedDates?.last || 'Active'}
                </span>
              </div>
            </div>

            {/* Action hint */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
              <span className="text-cyan-400 font-bold">Click to pin details</span>
              <span>Double-click to expand</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
