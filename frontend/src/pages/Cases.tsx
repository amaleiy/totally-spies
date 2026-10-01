import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCases,
  createCase,
  updateCase,
  deleteCase,
  importCase,
  createTarget,
} from '../api/client';
import { Case } from '../types';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { formatTimeAgo, formatDate } from '../utils/formatters';

import {
  FolderKanban,
  Plus,
  Upload,
  Search,
  LayoutGrid,
  List,
  Crosshair,
  Radar,
  Database,
  Network,
  Clock,
  Calendar,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Edit3,
  Trash2,
  Download,
  Shield,
  Sparkles,
  ExternalLink,
  RefreshCw,
  FileCode,
  Check,
  ChevronDown,
  Layers,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';

export const Cases: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Filters & Controls
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'>('ALL');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'targets' | 'artifacts'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Case Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'CLOSED' | 'ARCHIVED'>('ACTIVE');
  const [newTags, setNewTags] = useState('');
  const [newTargetType, setNewTargetType] = useState('USERNAME');
  const [newTargetValue, setNewTargetValue] = useState('');

  // Import Modal state
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Inspector Notes Editing state
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedFeedback, setNotesSavedFeedback] = useState(false);

  // Tag adding state in inspector
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Load all cases from backend
  const loadCases = async () => {
    try {
      setIsLoading(true);
      const data = await fetchCases();
      setCases(data);
      if (data.length > 0 && !selectedCaseId) {
        setSelectedCaseId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // Currently selected case object
  const selectedCase = useMemo(() => {
    if (!selectedCaseId) return cases[0] || null;
    return cases.find((c) => c.id === selectedCaseId) || cases[0] || null;
  }, [cases, selectedCaseId]);

  // Sync notes when selected case changes
  useEffect(() => {
    if (selectedCase) {
      setInspectorNotes(selectedCase.notes || '');
      setNotesSavedFeedback(false);
    }
  }, [selectedCase?.id]);

  // Tab counters
  const counts = useMemo(() => {
    const active = cases.filter((c) => c.status === 'ACTIVE').length;
    const completed = cases.filter((c) => c.status === 'CLOSED').length;
    const archived = cases.filter((c) => c.status === 'ARCHIVED').length;
    return {
      all: cases.length,
      active,
      completed,
      archived,
    };
  }, [cases]);

  // Filter and sort cases
  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        // Tab filter
        if (statusTab === 'ACTIVE' && c.status !== 'ACTIVE') return false;
        if (statusTab === 'COMPLETED' && c.status !== 'CLOSED') return false;
        if (statusTab === 'ARCHIVED' && c.status !== 'ARCHIVED') return false;

        // Dropdown status filter
        if (statusFilter === 'ACTIVE' && c.status !== 'ACTIVE') return false;
        if (statusFilter === 'COMPLETED' && c.status !== 'CLOSED') return false;
        if (statusFilter === 'ARCHIVED' && c.status !== 'ARCHIVED') return false;

        // Search query filter (title, description, tags, id)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = c.title.toLowerCase().includes(q);
          const matchDesc = (c.description || '').toLowerCase().includes(q);
          const matchId = c.id.toLowerCase().includes(q);
          const matchTags = (c.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchId && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'targets') {
          const countA = a.targets_count ?? a.targets?.length ?? 0;
          const countB = b.targets_count ?? b.targets?.length ?? 0;
          return countB - countA;
        }
        if (sortBy === 'artifacts') {
          const countA = a.artifacts_count ?? 0;
          const countB = b.artifacts_count ?? 0;
          return countB - countA;
        }
        // Default: last updated or created
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
  }, [cases, statusTab, statusFilter, searchQuery, sortBy]);

  // Handle Create New Case
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const parsedTags = newTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter((t) => t.length > 0);

      const created = await createCase({
        title: newTitle.trim(),
        description: newDescription.trim(),
        status: newStatus,
        tags: parsedTags,
      });

      // If initial target was provided, create it automatically
      if (newTargetValue.trim()) {
        try {
          await createTarget(created.id, {
            type: newTargetType,
            value: newTargetValue.trim(),
            notes: 'Initial seed target from case creation',
          });
        } catch (tErr) {
          console.error('Failed to add initial target:', tErr);
        }
      }

      setShowNewCaseModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewTags('');
      setNewTargetValue('');
      await loadCases();
      setSelectedCaseId(created.id);
    } catch (err) {
      console.error('Failed to create case:', err);
      alert('Failed to create case. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Import Dossier
  const handleImportCase = async () => {
    if (!importJsonText.trim()) {
      setImportError('Please provide a valid JSON dossier string or file.');
      return;
    }

    try {
      setIsSubmitting(true);
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      const imported = await importCase(parsed);
      setShowImportModal(false);
      setImportJsonText('');
      await loadCases();
      setSelectedCaseId(imported.id);
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportError(err.message || 'Invalid JSON format or import error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      setImportError(null);
    };
    reader.onerror = () => {
      setImportError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  // Save Notes from Inspector
  const handleSaveNotes = async () => {
    if (!selectedCase) return;
    try {
      setIsSavingNotes(true);
      const updated = await updateCase(selectedCase.id, { notes: inspectorNotes });
      setCases((prev) => prev.map((c) => (c.id === updated.id ? { ...c, notes: updated.notes } : c)));
      setNotesSavedFeedback(true);
      setTimeout(() => setNotesSavedFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Add Tag in Inspector
  const handleAddTag = async () => {
    if (!selectedCase || !newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    const currentTags = selectedCase.tags || [];
    if (currentTags.includes(cleanTag)) {
      setNewTagInput('');
      setIsAddingTag(false);
      return;
    }

    const updatedTags = [...currentTags, cleanTag];
    try {
      const updated = await updateCase(selectedCase.id, { tags: updatedTags });
      setCases((prev) => prev.map((c) => (c.id === updated.id ? { ...c, tags: updated.tags } : c)));
      setNewTagInput('');
      setIsAddingTag(false);
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  // Remove Tag in Inspector
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedCase) return;
    const updatedTags = (selectedCase.tags || []).filter((t) => t !== tagToRemove);
    try {
      const updated = await updateCase(selectedCase.id, { tags: updatedTags });
      setCases((prev) => prev.map((c) => (c.id === updated.id ? { ...c, tags: updated.tags } : c)));
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  // Delete Case
  const handleDeleteCase = async (caseId: string, caseTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete case "${caseTitle}"? All associated targets, scans, and artifacts will be deleted.`)) {
      return;
    }

    try {
      await deleteCase(caseId);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      if (selectedCaseId === caseId) {
        setSelectedCaseId(null);
      }
    } catch (err) {
      console.error('Failed to delete case:', err);
      alert('Failed to delete case.');
    }
  };

  // Export Case Dossier
  const handleExportCase = async (caseId: string, caseTitle: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/export`);
      if (!res.ok) throw new Error('Failed to export case');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case_${caseTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dossier.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export case dossier.');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-purple-950/80 text-purple-300 border border-purple-500/40">
            <CheckCircle2 className="w-3 h-3 text-purple-400" />
            COMPLETED
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3 text-amber-400" />
            ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-slate-900 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#070b12] text-slate-100 overflow-hidden font-sans">
      {/* 1. Global Left Tactical Sidebar */}
      <Sidebar onOpenNewCase={() => setShowNewCaseModal(true)} />

      {/* 2. Main Investigation Operations Center */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search & status badges */}
        <TopBar
          onSearch={(q) => setSearchQuery(q)}
          placeholder="Search cases by name, description, tags..."
          showBadges={true}
        />

        {/* Scrollable Cases Work Area */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* A. Hero Surveillance Banner (matching media_1790750658779.jpg) */}
          <div className="relative rounded-3xl overflow-hidden border border-cyan-900/40 shadow-2xl bg-gradient-to-r from-[#070f1e] via-[#09152b] to-[#0d1e3d]">
            {/* Cyber Grid & Radar Reticle Decorative Overlays */}
            <div 
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 75% 50%, rgba(6, 182, 212, 0.4) 0%, transparent 60%), linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 28px 28px, 28px 28px'
              }}
            />
            
            {/* Glowing Accent Lights */}
            <div className="absolute top-0 right-1/4 w-96 h-40 bg-cyan-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-10 left-1/3 w-80 h-32 bg-indigo-600/15 blur-[70px] pointer-events-none" />

            <div className="relative z-10 px-8 py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Left Title & Watermark Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] font-mono tracking-widest text-cyan-300 uppercase shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    WOOHP Tactical Intelligence System
                  </div>
                  {/* Neon Script Badge */}
                  <span className="hidden sm:inline-block font-serif italic text-cyan-400/90 text-xs tracking-wider px-3 py-0.5 rounded-full bg-cyan-950/30 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                    Totally Spies Operations
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-black text-slate-50 tracking-tight flex items-center gap-3">
                  Investigation Cases
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
                  Active Dossiers &amp; Surveillance Records. Organize targets, coordinate multi-module scans, and explore unified link intelligence graphs.
                </p>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-3 self-stretch sm:self-auto shrink-0">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-slate-100 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:border-slate-600"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Import Case</span>
                </button>

                <button
                  onClick={() => setShowNewCaseModal(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ New Case</span>
                </button>
              </div>
            </div>
          </div>

          {/* B. Status Filter Tabs Row */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1">
            {[
              { id: 'ALL', label: 'All Cases', count: counts.all },
              { id: 'ACTIVE', label: 'Active', count: counts.active },
              { id: 'COMPLETED', label: 'Completed', count: counts.completed },
              { id: 'ARCHIVED', label: 'Archived', count: counts.archived },
            ].map((tab) => {
              const isActive = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative border-b-2 -mb-[1px] ${
                    isActive
                      ? 'border-cyan-400 text-cyan-300 font-extrabold shadow-[0_2px_10px_rgba(6,182,212,0.2)]'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* C. Search, Status Filter, Sort & View Mode Controls Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases by name, description, tags, ID..."
                className="w-full pl-10 pr-9 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Toggles */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                >
                  <option value="ALL">Status: All</option>
                  <option value="ACTIVE">Status: Active</option>
                  <option value="COMPLETED">Status: Completed</option>
                  <option value="ARCHIVED">Status: Archived</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                >
                  <option value="updated">Sort By: Last Updated</option>
                  <option value="title">Sort By: Title (A-Z)</option>
                  <option value="targets">Sort By: Targets Count</option>
                  <option value="artifacts">Sort By: Artifacts Count</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Grid vs List View Toggles */}
              <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadCases}
                disabled={isLoading}
                className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Refresh Cases"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* D. Main Body: Split View (Case Cards Grid/List on Left + Selected Case Inspector on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Content Area (Grid / List) */}
            <div className="lg:col-span-8 space-y-4">
              {filteredCases.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900/30 border border-slate-800/80 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <FolderKanban className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-200">No Investigation Cases Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {searchQuery
                        ? `No cases match the query "${searchQuery}". Try adjusting your filters.`
                        : 'No cases created yet in this status category.'}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowNewCaseModal(true)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                      + Create First Case
                    </button>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setStatusTab('ALL');
                          setStatusFilter('ALL');
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                /* GRID VIEW (3 columns layout matching media_1790750658779.jpg) */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.id === c.id;
                    const targetsCount = c.targets_count ?? c.targets?.length ?? 0;
                    const scansCount = c.scans_count ?? c.scans?.length ?? 0;
                    const artifactsCount = c.artifacts_count ?? 0;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCaseId(c.id)}
                        onDoubleClick={() => navigate(`/cases/${c.id}`)}
                        className={`group relative rounded-2xl p-4.5 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? 'bg-[#0f172a] border-cyan-400 ring-1 ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                            : 'bg-[#0c121e]/90 border-slate-800/80 hover:border-slate-700 hover:bg-[#0f1827] hover:shadow-lg'
                        }`}
                      >
                        {/* Selected Indicator Glow Corner */}
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl pointer-events-none">
                            <div className="absolute transform rotate-45 bg-cyan-500 text-slate-950 font-black text-[8px] py-0.5 right-[-35px] top-[14px] w-[110px] text-center shadow-md">
                              SELECTED
                            </div>
                          </div>
                        )}

                        <div className="space-y-3.5">
                          {/* Top Row: Status badge & Relative time */}
                          <div className="flex items-center justify-between pr-4">
                            {renderStatusBadge(c.status)}
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{formatTimeAgo(c.updated_at || c.created_at)}</span>
                            </div>
                          </div>

                          {/* Tactical Surveillance Artwork Thumbnail */}
                          <div className="relative h-28 rounded-xl overflow-hidden border border-slate-800/80 bg-gradient-to-br from-slate-950 via-[#0a1120] to-[#0d1d36] flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
                            {/* Grid Lines Pattern */}
                            <div 
                              className="absolute inset-0 opacity-[0.15]"
                              style={{
                                backgroundImage: `linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)`,
                                backgroundSize: '16px 16px'
                              }}
                            />

                            {/* Surveillance Reticle Visual */}
                            <div className="relative z-10 flex flex-col items-center justify-center gap-1 text-center px-3">
                              <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:scale-110 transition-transform">
                                <Radar className="w-5 h-5 text-cyan-400 animate-pulse" />
                              </div>
                              <span className="text-[10px] font-mono text-cyan-300 font-bold tracking-wider">
                                DOSSIER-{c.id.slice(0, 6).toUpperCase()}
                              </span>
                            </div>

                            {/* Subtle classification watermark */}
                            <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-600 tracking-widest uppercase">
                              TOP SECRET
                            </div>
                          </div>

                          {/* Title and Description */}
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                              {c.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[34px]">
                              {c.description || 'No case description provided.'}
                            </p>
                          </div>

                          {/* Metrics Counters Pills Row */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
                              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400">
                                <Crosshair className="w-3 h-3 text-cyan-400" />
                                <span>Targets</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                                {targetsCount}
                              </div>
                            </div>

                            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
                              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400">
                                <Radar className="w-3 h-3 text-pink-400" />
                                <span>Scans</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                                {scansCount}
                              </div>
                            </div>

                            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center">
                              <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-slate-400">
                                <Database className="w-3 h-3 text-amber-400" />
                                <span>Artifacts</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                                {artifactsCount}
                              </div>
                            </div>
                          </div>

                          {/* Tags row */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 min-h-[26px]">
                            {(c.tags && c.tags.length > 0) ? (
                              c.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-[10px] font-mono text-cyan-300"
                                >
                                  #{tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-mono text-slate-600 italic">No tags</span>
                            )}
                            {c.tags && c.tags.length > 3 && (
                              <span className="text-[10px] font-mono text-slate-500">
                                +{c.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Bottom Quick Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cases/${c.id}`);
                            }}
                            className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors group/btn"
                          >
                            <span>Open Investigation</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportCase(c.id, c.title);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                              title="Export Case Dossier"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCase(c.id, c.title);
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Case"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW */
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Case Title &amp; Description</th>
                          <th className="py-3 px-3 text-center">Targets</th>
                          <th className="py-3 px-3 text-center">Scans</th>
                          <th className="py-3 px-3 text-center">Artifacts</th>
                          <th className="py-3 px-4">Tags</th>
                          <th className="py-3 px-4">Updated</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {filteredCases.map((c) => {
                          const isSelected = selectedCase?.id === c.id;
                          return (
                            <tr
                              key={c.id}
                              onClick={() => setSelectedCaseId(c.id)}
                              className={`cursor-pointer transition-colors group ${
                                isSelected
                                  ? 'bg-cyan-950/30 text-cyan-200'
                                  : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              <td className="py-3 px-4 whitespace-nowrap">
                                {renderStatusBadge(c.status)}
                              </td>
                              <td className="py-3 px-4 font-sans">
                                <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                                  {c.title}
                                </div>
                                <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs font-mono">
                                  {c.description || 'No description'}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300">
                                {c.targets_count ?? c.targets?.length ?? 0}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300">
                                {c.scans_count ?? c.scans?.length ?? 0}
                              </td>
                              <td className="py-3 px-3 text-center text-slate-300">
                                {c.artifacts_count ?? 0}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1 flex-wrap max-w-[150px]">
                                  {(c.tags || []).slice(0, 2).map((t, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-[9px] text-cyan-300"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                                {formatTimeAgo(c.updated_at || c.created_at)}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/cases/${c.id}`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold"
                                >
                                  Open →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Right Inspector Panel (Selected Case Detail - matching media_1790750658779.jpg) */}
            <div className="lg:col-span-4">
              {selectedCase ? (
                <div className="bg-[#0c121e]/95 border border-slate-800/90 rounded-2xl p-5 space-y-5 shadow-2xl backdrop-blur-md sticky top-6">
                  {/* Inspector Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
                        Case Inspector
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-400">
                      ID: {selectedCase.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Inspector Banner Artwork */}
                  <div className="relative h-32 rounded-xl overflow-hidden border border-slate-800 bg-gradient-to-tr from-slate-950 via-[#0b1424] to-[#122442] flex items-center justify-center p-4">
                    <div 
                      className="absolute inset-0 opacity-[0.2]"
                      style={{
                        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.4) 0%, transparent 70%)`
                      }}
                    />
                    <div className="relative z-10 text-center space-y-1">
                      <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <Shield className="w-5 h-5 text-cyan-300" />
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-200 tracking-wide">
                        DOSSIER DOS-#{selectedCase.id.slice(0, 6).toUpperCase()}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400">
                        WOOHP SURVEILLANCE ACTIVE
                      </div>
                    </div>
                  </div>

                  {/* Case Title, Description & Status */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-100 leading-snug">
                        {selectedCase.title}
                      </h2>
                      {renderStatusBadge(selectedCase.status)}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {selectedCase.description || 'No description specified for this case.'}
                    </p>
                  </div>

                  {/* Metadata Rows */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        Created:
                      </span>
                      <span className="text-slate-200 text-[11px]">{formatDate(selectedCase.created_at)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Last Updated:
                      </span>
                      <span className="text-slate-200 text-[11px]">{formatTimeAgo(selectedCase.updated_at || selectedCase.created_at)}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                        Classification:
                      </span>
                      <span className="text-amber-400 font-bold text-[10px]">WOOHP TOP SECRET</span>
                    </div>
                  </div>

                  {/* 4 Statistics KPI Tiles (Targets, Scans, Artifacts, Relations) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Case Intelligence Metrics
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
                          <Crosshair className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold font-mono text-slate-100">
                            {selectedCase.targets_count ?? selectedCase.targets?.length ?? 0}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">Targets</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-pink-950/60 text-pink-400 border border-pink-500/30">
                          <Radar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold font-mono text-slate-100">
                            {selectedCase.scans_count ?? selectedCase.scans?.length ?? 0}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">Scans</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-500/30">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold font-mono text-slate-100">
                            {selectedCase.artifacts_count ?? 0}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">Artifacts</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                          <Network className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold font-mono text-slate-100">
                            {selectedCase.edges_count ?? 0}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">Relations</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Tags Section with + Add Tag */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                        Dossier Tags
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(selectedCase.tags || []).map((tag, idx) => (
                        <span
                          key={idx}
                          className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-xs font-mono text-cyan-300"
                        >
                          <span>#{tag}</span>
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="text-cyan-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity"
                            title="Remove tag"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {isAddingTag ? (
                        <div className="inline-flex items-center gap-1 bg-slate-950 border border-cyan-500/60 rounded-lg px-2 py-0.5">
                          <input
                            type="text"
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              } else if (e.key === 'Escape') {
                                setIsAddingTag(false);
                              }
                            }}
                            autoFocus
                            placeholder="tag name..."
                            className="bg-transparent text-xs font-mono text-cyan-200 outline-none w-20"
                          />
                          <button
                            onClick={handleAddTag}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsAddingTag(false)}
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingTag(true)}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Tag</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Editable Investigation Notes Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        Investigation Notes
                      </span>
                      {notesSavedFeedback && (
                        <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-1 animate-pulse">
                          <Check className="w-3 h-3" /> Saved!
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                        value={inspectorNotes}
                        onChange={(e) => setInspectorNotes(e.target.value)}
                        placeholder="Log observations, investigative leads, suspicious IPs or usernames..."
                        rows={4}
                        className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all resize-none leading-relaxed"
                      />
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>{isSavingNotes ? 'Saving...' : 'Save Notes'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons: Open Investigation → */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => navigate(`/cases/${selectedCase.id}`)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span>Open Investigation</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportCase(selectedCase.id, selectedCase.title)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Export Dossier</span>
                      </button>

                      <button
                        onClick={() => handleDeleteCase(selectedCase.id, selectedCase.title)}
                        className="py-2 px-3 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors"
                        title="Delete Case"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 text-slate-500 text-xs font-mono">
                  Select a case card on the left to inspect intelligence details.
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* 3. Modal: + New Case (with title, description, status, tags, and initial target) */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c121e] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  Create Investigation Case
                </h3>
              </div>
              <button
                onClick={() => setShowNewCaseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCase} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Case Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Operation Silk Net - Dark Web Target Recon"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Description / Objective
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Summarize target background, surveillance objective, or scope..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 font-sans resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="clover, breach, fraud"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Optional Initial Seed Target */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Optional Initial Seed Target</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newTargetType}
                    onChange={(e) => setNewTargetType(e.target.value)}
                    className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="USERNAME">USERNAME</option>
                    <option value="DOMAIN">DOMAIN</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="IP">IP</option>
                  </select>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={newTargetValue}
                      onChange={(e) => setNewTargetValue(e.target.value)}
                      placeholder="e.g. target_handle or domain.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Import Case Dossier (Upload or Paste JSON) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c121e] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  Import Case Dossier
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {importError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center gap-2 text-xs font-mono text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {/* File Upload Drop Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Upload Dossier File (.json)
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 cursor-pointer bg-slate-950/60 transition-all group">
                  <Upload className="w-7 h-7 text-slate-500 group-hover:text-cyan-400 group-hover:scale-110 transition-all mb-2" />
                  <span className="text-xs font-mono text-slate-300">
                    Click to select dossier JSON file
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 mt-0.5">
                    Supports Totally Spies OSINT export packages
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Paste Raw JSON Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Or Paste JSON Dossier String
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setImportError(null);
                  }}
                  rows={6}
                  placeholder={`{\n  "case": {\n    "title": "Operation Alpha",\n    "description": "Recon dossier"\n  }\n}`}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportCase}
                  disabled={isSubmitting || !importJsonText.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Import Dossier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
