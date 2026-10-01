import React from 'react';
import {
  Crosshair,
  Radio,
  CheckCircle2,
  Circle,
  Loader2,
  Server,
  Wifi,
  Cpu,
  Database,
  Plus,
  Network,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface TelemetrySidebarProps {
  activeScan?: {
    target: string;
    engine: string;
    progress: number;
    step: number; // 0 to 4
    isLive: boolean;
  } | null;
  systemStatus?: {
    api: boolean;
    ws: boolean;
    engine: boolean;
    db: boolean;
  };
  onNewCase?: () => void;
  onAddTarget?: () => void;
  onRunScan?: () => void;
  onOpenGraph?: () => void;
}

export const TelemetrySidebar: React.FC<TelemetrySidebarProps> = ({
  activeScan,
  systemStatus = { api: true, ws: true, engine: true, db: true },
  onNewCase,
  onAddTarget,
  onRunScan,
  onOpenGraph,
}) => {
  // Default fallback demonstration state if no active scan is streaming
  const scanData = activeScan || {
    target: 'torvalds',
    engine: 'Clover + Sherlock',
    progress: 67,
    step: 2,
    isLive: true,
  };

  const steps = [
    'Probing platforms',
    'Processing results',
    'Building graph',
    'Finalizing artifacts',
  ];

  return (
    <aside className="w-80 bg-[#080c14] border-l border-slate-800/80 p-5 flex flex-col gap-5 overflow-y-auto shrink-0 select-none scrollbar-thin scrollbar-thumb-slate-800">
      {/* 1. Ongoing Scan Widget */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl relative overflow-hidden group">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Ongoing Scan</span>
          </div>

          {scanData.isLive ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-500">Idle</span>
          )}
        </div>

        {/* Target Profile and Engine */}
        <div className="mt-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Crosshair className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-slate-100 font-mono truncate">
              {scanData.target}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {scanData.engine}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Mission Progress</span>
            <span className="text-cyan-400 font-bold">{scanData.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${scanData.progress}%` }}
            />
          </div>
        </div>

        {/* Pipeline Step Checklist */}
        <div className="mt-4 space-y-2 text-xs font-mono">
          {steps.map((stepLabel, idx) => {
            const isCompleted = idx < scanData.step;
            const isCurrent = idx === scanData.step;

            return (
              <div
                key={stepLabel}
                className={`flex items-center gap-2.5 ${
                  isCompleted
                    ? 'text-emerald-400 font-medium'
                    : isCurrent
                    ? 'text-cyan-300 font-semibold'
                    : 'text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-700 shrink-0" />
                )}
                <span className="text-[11px]">{stepLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. System Status Widget */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-3">
        <div className="pb-2.5 border-b border-slate-800/60">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>System Status</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>

        <div className="space-y-2.5 text-xs font-mono pt-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400">
              <Server className="w-3.5 h-3.5 text-cyan-400" /> API Server
            </span>
            <span className="text-emerald-400 font-semibold">Online</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" /> WebSocket
            </span>
            <span className="text-cyan-300 font-semibold">Connected</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-rose-400" /> Scanner Engine
            </span>
            <span className="text-emerald-400 font-semibold">Online</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400">
              <Database className="w-3.5 h-3.5 text-purple-400" /> Database
            </span>
            <span className="text-emerald-400 font-semibold">Online</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Widget */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider font-mono pb-2 border-b border-slate-800/60">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Quick Actions</span>
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={onNewCase}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs font-medium transition-all flex items-center justify-between group shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-emerald-400" /> New Case
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onAddTarget}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs font-medium transition-all flex items-center justify-between group shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-cyan-400" /> Add Target
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onRunScan}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs font-medium transition-all flex items-center justify-between group shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-rose-400" /> Run Clover Scan
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onOpenGraph}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-200 text-xs font-medium transition-all flex items-center justify-between group shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-emerald-400" /> Open Graph
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </aside>
  );
};
