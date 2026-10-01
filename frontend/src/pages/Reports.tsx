import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchReports,
  generateReport,
  deleteReport,
  fetchCases,
  fetchAllTargets,
} from '../api/client';
import { Case, Target } from '../types';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { formatDate } from '../utils/formatters';
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
  Copy,
  Check,
  Trash2,
  Shield,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Lock,
  Layers,
  BarChart3,
  Calendar,
  User,
  Hash,
  X,
  ChevronRight,
  BookOpen,
  FileCheck,
} from 'lucide-react';

interface ReportItem {
  id: string;
  title: string;
  template: string;
  classification: string;
  case_id: string;
  case_title: string;
  target_value: string;
  created_at: string;
  risk_score: number;
  summary: string;
  artifacts_count: number;
  author: string;
  hash?: string;
  content_markdown?: string;
  notes?: string;
}

export const Reports: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('all');
  const [isCopied, setIsCopied] = useState(false);

  // Generate Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formCaseId, setFormCaseId] = useState('');
  const [formTargetId, setFormTargetId] = useState('');
  const [formTemplate, setFormTemplate] = useState('comprehensive_dossier');
  const [formClassification, setFormClassification] = useState('TOP SECRET // WOOHP TACTICAL');
  const [formNotes, setFormNotes] = useState('');

  // Initial Load
  const loadData = async () => {
    try {
      const [reportsData, casesData, targetsData] = await Promise.all([
        fetchReports(),
        fetchCases(),
        fetchAllTargets(),
      ]);
      setReports(reportsData || []);
      setCases(casesData || []);
      setTargets(targetsData || []);
      if (reportsData && reportsData.length > 0) {
        setSelectedReport(reportsData[0]);
      }
      if (casesData && casesData.length > 0) {
        setFormCaseId(casesData[0].id);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered targets when case selection changes in modal
  const caseTargets = useMemo(() => {
    if (!formCaseId) return targets;
    return targets.filter((t) => t.case_id === formCaseId);
  }, [formCaseId, targets]);

  // Handlers
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newReport = await generateReport({
        title: formTitle.trim() || undefined,
        case_id: formCaseId || undefined,
        target_id: formTargetId || undefined,
        template: formTemplate,
        classification: formClassification,
        notes: formNotes.trim() || undefined,
      });
      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setIsGenerateModalOpen(false);
      setFormTitle('');
      setFormNotes('');
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to permanently delete this intelligence dossier?')) return;
    try {
      await deleteReport(reportId);
      const remaining = reports.filter((r) => r.id !== reportId);
      setReports(remaining);
      if (selectedReport?.id === reportId) {
        setSelectedReport(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  const handleCopyMarkdown = () => {
    if (!selectedReport?.content_markdown) return;
    navigator.clipboard.writeText(selectedReport.content_markdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!selectedReport) return;
    const content = selectedReport.content_markdown || selectedReport.summary;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport.id}_${selectedReport.template}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    if (!selectedReport) return;
    const blob = new Blob([JSON.stringify(selectedReport, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedReport.id}_dossier.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = reports.length;
    const caseDossiers = reports.filter((r) => r.template === 'comprehensive_dossier').length;
    const targetProfiles = reports.filter((r) => r.template === 'target_profile').length;
    const threatAssessments = reports.filter((r) => r.template === 'threat_assessment' || r.template === 'executive_brief').length;
    return { total, caseDossiers, targetProfiles, threatAssessments };
  }, [reports]);

  // Filtered List
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedTemplateFilter !== 'all' && r.template !== selectedTemplateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesTarget = r.target_value.toLowerCase().includes(q);
        const matchesCase = r.case_title.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTarget && !matchesCase) return false;
      }
      return true;
    });
  }, [reports, selectedTemplateFilter, searchQuery]);

  // Helper for Classification Colors
  const getClassificationBadge = (classification: string) => {
    const c = (classification || '').toUpperCase();
    if (c.includes('TOP SECRET')) {
      return (
        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-black tracking-widest bg-rose-950/80 text-rose-300 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
          {classification}
        </span>
      );
    }
    if (c.includes('SECRET')) {
      return (
        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-amber-950/80 text-amber-300 border border-amber-500/60">
          {classification}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-cyan-950/80 text-cyan-300 border border-cyan-500/60">
        {classification}
      </span>
    );
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
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  CLASSIFIED INTELLIGENCE DOSSIER STUDIO
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                <FileText className="w-7 h-7 text-cyan-400" />
                Intelligence Reports & Briefings
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
                Generate tactical OSINT dossiers, target identity profiles, and executive threat briefs exportable to Markdown, JSON, and printable formats.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsGenerateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                GENERATE NEW DOSSIER
              </button>
            </div>
          </div>

          {/* KPI HUD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>TOTAL DOSSIERS</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono">{metrics.total}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Archived intelligence records</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>CASE DOSSIERS</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400 mt-2 font-mono">
                {metrics.caseDossiers}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Full operation overviews</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>TARGET PROFILES</span>
                <User className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2 font-mono">
                {metrics.targetProfiles}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Single-entity investigations</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
            </div>

            <div className="bg-[#0b111e]/80 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>EXECUTIVE BRIEFS</span>
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
                {metrics.threatAssessments}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Threat & exposure analysis</div>
              <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            </div>
          </div>

          {/* Main Studio Workspace: Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Saved Reports Catalog */}
            <div className="lg:col-span-4 bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-5 space-y-4 backdrop-blur-md">
              {/* Search & Filters */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dossiers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono">
                  {[
                    { id: 'all', label: 'ALL' },
                    { id: 'comprehensive_dossier', label: 'CASE' },
                    { id: 'target_profile', label: 'TARGET' },
                    { id: 'threat_assessment', label: 'THREAT' },
                    { id: 'executive_brief', label: 'BRIEF' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedTemplateFilter(filter.id)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedTemplateFilter === filter.id
                          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports List */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                {filteredReports.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs font-mono">
                    No intelligence dossiers match your search.
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const isSelected = selectedReport?.id === report.id;

                    return (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                            : 'bg-[#080c14]/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            ID: {report.id.toUpperCase()}
                          </span>
                          {getClassificationBadge(report.classification)}
                        </div>

                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 font-mono">
                          {report.title}
                        </h4>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                          <span>Target: <strong className="text-slate-300">{report.target_value}</strong></span>
                          <span>Score: <strong className="text-rose-400">{report.risk_score}/100</strong></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Classified Dossier Document Studio Viewer */}
            <div className="lg:col-span-8 bg-[#0b111e]/90 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md min-h-[600px] flex flex-col space-y-6">
              {selectedReport ? (
                <>
                  {/* Top Tactical Classification Bar */}
                  <div className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-black tracking-widest text-rose-300">
                          {selectedReport.classification}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          WOOHP TACTICAL INTELLIGENCE // AUTHORIZED PERSONNEL ONLY
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyMarkdown}
                        title="Copy Markdown"
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'COPIED' : 'COPY'}
                      </button>

                      <button
                        onClick={handleDownloadMarkdown}
                        title="Download Markdown Document"
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        MD
                      </button>

                      <button
                        onClick={handleDownloadJSON}
                        title="Download JSON Payload"
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        JSON
                      </button>

                      <button
                        onClick={handlePrint}
                        title="Print / Save as PDF"
                        className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        PRINT
                      </button>

                      <button
                        onClick={() => handleDeleteReport(selectedReport.id)}
                        title="Delete Dossier"
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-700 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Matrix Card */}
                  <div className="bg-[#080c14] border border-slate-800 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div>
                      <div className="text-slate-500 text-[10px]">DOSSIER ID</div>
                      <div className="text-white font-bold mt-0.5">{selectedReport.id.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">PRIMARY TARGET</div>
                      <div className="text-cyan-300 font-bold mt-0.5">{selectedReport.target_value}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">THREAT INDEX</div>
                      <div className="text-rose-400 font-bold mt-0.5">{selectedReport.risk_score} / 100</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px]">DATE GENERATED</div>
                      <div className="text-slate-300 mt-0.5">{formatDate(selectedReport.created_at)}</div>
                    </div>
                  </div>

                  {/* Document Body View (Rendered Markdown Style) */}
                  <div className="bg-[#080c14]/90 border border-slate-800 rounded-3xl p-8 font-mono text-xs text-slate-300 space-y-4 select-text shadow-inner overflow-x-auto leading-relaxed">
                    <pre className="whitespace-pre-wrap font-mono text-xs text-slate-200">
                      {selectedReport.content_markdown || selectedReport.summary}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-slate-500 font-mono space-y-3">
                  <FileText className="w-12 h-12 text-slate-700" />
                  <div className="text-sm font-bold text-slate-400">No Intelligence Dossier Selected</div>
                  <div className="text-xs max-w-sm">
                    Select an archived dossier from the left catalog or generate a new intelligence brief.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Generate New Report */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0b111e] border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)] rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-950/20 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                    Compile Classified Dossier
                  </h3>
                  <div className="text-[10px] font-mono text-slate-400">
                    WOOHP OSINT INTELLIGENCE REPORT COMPILER
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGenerateReport} className="p-6 space-y-4 text-xs font-mono">
              {/* Title */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  DOSSIER TITLE (OPTIONAL):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operation Clover Field Target Brief"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  REPORT TEMPLATE:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'comprehensive_dossier', label: 'Case Dossier', desc: 'Full case targets & artifacts' },
                    { id: 'target_profile', label: 'Target Profile', desc: 'Single-entity identity footprint' },
                    { id: 'threat_assessment', label: 'Threat Matrix', desc: 'CVEs & Shodan exposure' },
                    { id: 'executive_brief', label: 'Executive Brief', desc: 'Director-level summary' },
                  ].map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setFormTemplate(tpl.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        formTemplate === tpl.id
                          ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                          : 'bg-[#080c14] border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{tpl.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{tpl.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Case & Target Picker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                    SELECT CASE:
                  </label>
                  <select
                    value={formCaseId}
                    onChange={(e) => setFormCaseId(e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                    PRIMARY TARGET:
                  </label>
                  <select
                    value={formTargetId}
                    onChange={(e) => setFormTargetId(e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                  >
                    <option value="">All Case Targets</option>
                    {caseTargets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.value} ({t.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Classification Level */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  CLASSIFICATION BANNER:
                </label>
                <select
                  value={formClassification}
                  onChange={(e) => setFormClassification(e.target.value)}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                >
                  <option value="TOP SECRET // WOOHP TACTICAL">TOP SECRET // WOOHP TACTICAL</option>
                  <option value="SECRET // NOFORN">SECRET // NOFORN</option>
                  <option value="CONFIDENTIAL // RESTRICTED">CONFIDENTIAL // RESTRICTED</option>
                  <option value="UNCLASSIFIED // OSINT">UNCLASSIFIED // OSINT</option>
                </select>
              </div>

              {/* Analyst Notes */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  ANALYST DIRECTIVES & NOTES:
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter strategic directives or tactical notes for this dossier..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-[#080c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'COMPILING INTELLIGENCE...' : 'COMPILE CLASSIFIED REPORT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
