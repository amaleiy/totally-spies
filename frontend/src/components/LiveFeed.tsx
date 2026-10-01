import React, { useState } from 'react';
import { TelemetryLog } from '../hooks/useScanWebSocket';
import { Scan } from '../types';
import {
  Terminal,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  Filter,
  Radar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Play
} from 'lucide-react';

interface LiveFeedProps {
  logs: TelemetryLog[];
  onClear: () => void;
  scanProgress?: {
    completed: number;
    total: number;
    matches: number;
    isScanning: boolean;
  };
  scans?: Scan[];
  onTriggerScan?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({
  logs,
  onClear,
  scanProgress,
  scans = [],
  onTriggerScan,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'scans'>('feed');
  const [filterMatchesOnly, setFilterMatchesOnly] = useState(false);

  const filteredLogs = filterMatchesOnly
    ? logs.filter((l) => l.type === 'MATCH')
    : logs;

  const progressPercent =
    scanProgress && scanProgress.total > 0
      ? Math.round((scanProgress.completed / scanProgress.total) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full bg-[#080d16]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Top Header with Dual Tabs & Collapse */}
      <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between select-none">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'feed'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Intelligence Stream</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-slate-950 rounded-full text-slate-400 border border-slate-800">
              {logs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('scans')}
            className={`px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'scans'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Scans ({scans.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {activeTab === 'feed' && (
            <>
              <button
                onClick={() => setFilterMatchesOnly(!filterMatchesOnly)}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                  filterMatchesOnly
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={filterMatchesOnly ? 'Show all events' : 'Show matches only'}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClear}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear feed logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-1"
              title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Active Scan Progress Bar */}
      {!isCollapsed && scanProgress?.isScanning && (
        <div className="px-4 py-2 bg-cyan-950/20 border-b border-cyan-500/30">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Probing platforms ({scanProgress.completed}/{scanProgress.total})
            </span>
            <span className="text-emerald-400 font-bold">
              {scanProgress.matches} Matches Found
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 select-none">
          {activeTab === 'feed' ? (
            filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-8">
                <Terminal className="w-8 h-8 mb-2 opacity-40 text-slate-600" />
                <p>Awaiting probe telemetry...</p>
                <p className="text-[11px] text-slate-600 mt-1 font-sans">
                  Deploy Clover agent to initiate real-time OSINT stream.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isMatch = log.type === 'MATCH';
                const isError = log.type === 'ERROR';
                const isInfo = log.type === 'INFO';

                // Determine display action label and subtitle
                let actionLabel = 'Probing platform';
                if (isMatch) actionLabel = 'Profile detected';
                else if (isError) actionLabel = 'Probe error';
                else if (log.message.toLowerCase().includes('meta') || log.message.toLowerCase().includes('extract')) {
                  actionLabel = 'Collecting metadata';
                }

                return (
                  <div
                    key={log.id}
                    className={`px-3 py-2 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                      isMatch
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                        : isError
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                          isMatch
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : isError
                            ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                            : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        }`}
                      >
                        {isMatch ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : isError ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <Terminal className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div
                          className={`font-semibold text-xs truncate ${
                            isMatch ? 'text-emerald-300' : isError ? 'text-rose-300' : 'text-slate-200'
                          }`}
                        >
                          {actionLabel}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {log.platform ? `${log.platform}` : log.message}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono shrink-0">
                      {log.time}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* Scans List */
            <div className="space-y-2">
              {scans.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-8">
                  <Radar className="w-8 h-8 mb-2 opacity-40 text-slate-600" />
                  <p>No scans recorded for this case.</p>
                  {onTriggerScan && (
                    <button
                      onClick={onTriggerScan}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Launch Scan Now
                    </button>
                  )}
                </div>
              ) : (
                scans.map((scan, idx) => (
                  <div
                    key={scan.id}
                    className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">
                          Scan #{String(scans.length - idx).padStart(3, '0')}
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] uppercase font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                          {scan.module}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          scan.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : scan.status === 'RUNNING'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {scan.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Platforms: {scan.completed}/{scan.total}</span>
                      <span className="text-emerald-400 font-semibold">{scan.completed} Probed</span>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span>Started: {scan.started_at ? new Date(scan.started_at).toLocaleTimeString() : 'N/A'}</span>
                      {scan.completed_at && (
                        <span>Finished: {new Date(scan.completed_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

