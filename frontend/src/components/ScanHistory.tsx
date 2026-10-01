import React from 'react';
import { Scan } from '../types';
import { History, CheckCircle2, Clock, XCircle, Play, Sparkles } from 'lucide-react';

interface ScanHistoryProps {
  scans: Scan[];
  selectedScanId?: string | null;
  onSelectScan: (scanId: string | null) => void;
  onTriggerScan: () => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({
  scans,
  selectedScanId,
  onSelectScan,
  onTriggerScan,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Scan History
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded">
            {scans.length}
          </span>
        </div>

        <button
          onClick={onTriggerScan}
          className="px-2.5 py-1 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Play className="w-3 h-3 fill-current" />
          New Scan
        </button>
      </div>

      {/* List of Scans */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {scans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-8">
            <Sparkles className="w-8 h-8 mb-2 opacity-40 text-slate-600" />
            <p className="text-xs">No reconnaissance scans executed yet.</p>
            <button
              onClick={onTriggerScan}
              className="mt-3 text-xs text-cyan-400 hover:underline"
            >
              Deploy Clover Scanner &rarr;
            </button>
          </div>
        ) : (
          scans.map((scan, idx) => {
            const isSelected = selectedScanId === scan.id;
            const scanNumber = scans.length - idx;
            const isRunning = scan.status === 'RUNNING';
            const isCompleted = scan.status === 'COMPLETED';
            const isFailed = scan.status === 'FAILED';

            return (
              <div
                key={scan.id}
                onClick={() => onSelectScan(isSelected ? null : scan.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      Scan #{String(scanNumber).padStart(3, '0')}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-slate-800 text-cyan-300">
                      {scan.module}
                    </span>
                  </div>

                  <div>
                    {isRunning && (
                      <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        Running
                      </span>
                    )}
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Done
                      </span>
                    )}
                    {isFailed && (
                      <span className="flex items-center gap-1 text-[11px] text-rose-400 font-mono">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span>
                      <strong className="text-slate-200">{scan.completed}</strong>/{scan.total} platforms
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {scan.matches_count} matches
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(scan.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
