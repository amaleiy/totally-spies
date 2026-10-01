import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Case } from '../types';
import { ArrowLeft, Play, Shield, UserPlus, Zap, Globe, Layers, Database, Square, Download } from 'lucide-react';

interface CaseHeaderProps {
  caseData: Case;
  isConnected: boolean;
  onAddTarget: (targetData: { type: string; value: string; notes?: string }) => Promise<void>;
  onDeployScan: (targetId: string, module: string, config?: any) => Promise<void>;
  isScanning: boolean;
  onCancelScan?: () => Promise<void>;
  onExportReport?: () => Promise<void>;
}

export const CaseHeader: React.FC<CaseHeaderProps> = ({
  caseData,
  isConnected,
  onAddTarget,
  onDeployScan,
  isScanning,
  onCancelScan,
  onExportReport,
}) => {
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [targetType, setTargetType] = useState('USERNAME');
  const [targetValue, setTargetValue] = useState('');
  const [targetNotes, setTargetNotes] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState(
    caseData.targets[0]?.id || ''
  );
  const [scanEngine, setScanEngine] = useState<'whatsmyname' | 'sherlock' | 'merged'>('whatsmyname');
  const [scanScope, setScanScope] = useState<'popular' | 'all' | 'social' | 'coding' | 'gaming'>('popular');

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim()) return;
    await onAddTarget({
      type: targetType,
      value: targetValue.trim(),
      notes: targetNotes.trim(),
    });
    setTargetValue('');
    setTargetNotes('');
    setShowTargetModal(false);
  };

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) return;

    const config: any = {
      concurrency: 25,
      timeout: 6.0,
      engine: scanEngine
    };
    if (scanScope === 'popular') {
      config.popular_only = true;
    } else if (scanScope !== 'all') {
      config.category = scanScope;
    }

    await onDeployScan(selectedTargetId, 'clover', config);
    setShowScanModal(false);
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left: Navigation and Case Details */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
          title="Return to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              {caseData.title}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              {caseData.status}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-full text-[11px] font-mono text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{isConnected ? 'LIVE WS' : 'DISCONNECTED'}</span>
            </div>
          </div>
          {caseData.description && (
            <p className="text-xs text-slate-400 mt-1 max-w-xl truncate">
              {caseData.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {onExportReport && (
          <button
            onClick={onExportReport}
            className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            title="Export full case intelligence dossier (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Dossier</span>
          </button>
        )}

        <button
          onClick={() => setShowTargetModal(true)}
          className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-2 transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          Add Target
        </button>

        {isScanning && onCancelScan && (
          <button
            onClick={onCancelScan}
            className="px-3.5 py-2 text-xs font-bold bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 text-rose-200 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950/50 animate-pulse"
            title="Abort active scan mission"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop Scan</span>
          </button>
        )}

        <button
          onClick={() => {
            if (caseData.targets.length > 0) {
              setSelectedTargetId(caseData.targets[0].id);
            }
            setShowScanModal(true);
          }}
          disabled={caseData.targets.length === 0 || isScanning}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg ${
            isScanning
              ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/40 cursor-wait'
              : caseData.targets.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isScanning ? 'Scan in Progress...' : 'Deploy Agent (Clover)'}
        </button>
      </div>

      {/* Add Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Add Investigation Target
            </h3>
            <form onSubmit={handleCreateTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Target Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="USERNAME">Username / Handle</option>
                  <option value="DOMAIN">Domain Name</option>
                  <option value="EMAIL">Email Address</option>
                  <option value="IP">IP Address</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Target Value</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jinsakai or amaleiy"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Investigator Notes</label>
                <textarea
                  placeholder="Optional context, subject aliases, or operational directives..."
                  value={targetNotes}
                  onChange={(e) => setTargetNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition-colors"
                >
                  Add Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deploy Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-cyan-400 fill-current" />
              Deploy Agent Clover (Identity Recon)
            </h3>
            <form onSubmit={handleStartScan} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Select Target</label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {caseData.targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.type}] {t.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Engine Toggle Selection */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  Select Intelligence Engine
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanEngine('whatsmyname')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      scanEngine === 'whatsmyname'
                        ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">WhatsMyName</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">717 Sites (Default)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanEngine('sherlock')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      scanEngine === 'sherlock'
                        ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Sherlock</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">482 Sites (Classic)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanEngine('merged')}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      scanEngine === 'merged'
                        ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Merged Mode</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">All Unique Sites</div>
                  </button>
                </div>
              </div>

              {/* Reconnaissance Scope */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Reconnaissance Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanScope('popular')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      scanScope === 'popular'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Quick Scan
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Top ~30 platforms (Fast)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanScope('all')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      scanScope === 'all'
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      Deep Recon
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">All engine platforms</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanScope('social')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      scanScope === 'social'
                        ? 'bg-purple-950/40 border-purple-500/80 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Social Media
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">200+ social networks</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScanScope('coding')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      scanScope === 'coding'
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Developer / Code
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Git, Repos, Packages</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl text-[11px] text-slate-400 leading-relaxed font-mono">
                <span className="text-emerald-400 font-bold">Heuristic Engine v2.0:</span> Pre-validates syntax, extracts OpenGraph metadata (display name, bio, avatar), and filters Cloudflare bot challenges to guarantee 0 false positives.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScanModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl transition-all shadow-md"
                >
                  Launch Mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
