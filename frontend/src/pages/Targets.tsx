import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllTargets,
  fetchTargetDetail,
  createTarget,
  updateTarget,
  deleteTarget,
  bulkImportTargets,
  triggerTargetScan,
  fetchCases,
} from '../api/client';
import { Target, TargetDetail, Case, Scan, Artifact } from '../types';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { formatTimeAgo, formatDate } from '../utils/formatters';

import {
  Crosshair,
  Plus,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  User,
  Globe,
  Mail,
  Server,
  Network,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pause,
  X,
  ArrowRight,
  Edit3,
  Trash2,
  ExternalLink,
  RefreshCw,
  Tag,
  FileText,
  Calendar,
  Layers,
  Activity,
  Check,
  ChevronDown,
  Copy,
  MoreVertical,
  Shield,
  Sparkles,
} from 'lucide-react';

export const Targets: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [targets, setTargets] = useState<Target[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [targetDetail, setTargetDetail] = useState<TargetDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Inspector tab: Overview, Artifacts, Scans, Notes
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'artifacts' | 'scans' | 'notes'>('overview');

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [caseFilter, setCaseFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'last_scanned' | 'value' | 'progress' | 'created'>('last_scanned');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Target Form state
  const [targetCaseId, setTargetCaseId] = useState('');
  const [targetType, setTargetType] = useState('USERNAME');
  const [targetValue, setTargetValue] = useState('');
  const [targetNotes, setTargetNotes] = useState('');
  const [targetTags, setTargetTags] = useState('');

  // Bulk Import state
  const [bulkCaseId, setBulkCaseId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Inspector Notes Editing state
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedFeedback, setNotesSavedFeedback] = useState(false);

  // Tag adding state in inspector
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Copy feedback
  const [copiedValue, setCopiedValue] = useState(false);

  // Load all targets and cases
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [targetsData, casesData] = await Promise.all([
        fetchAllTargets(),
        fetchCases(),
      ]);
      setTargets(targetsData);
      setCases(casesData);

      if (casesData.length > 0 && !targetCaseId) {
        setTargetCaseId(casesData[0].id);
        setBulkCaseId(casesData[0].id);
      }

      if (targetsData.length > 0 && !selectedTargetId) {
        setSelectedTargetId(targetsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load targets data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch detailed target info whenever selectedTargetId changes
  useEffect(() => {
    if (!selectedTargetId) {
      setTargetDetail(null);
      return;
    }

    let isMounted = true;
    const loadDetail = async () => {
      try {
        setIsLoadingDetail(true);
        const data = await fetchTargetDetail(selectedTargetId);
        if (isMounted) {
          setTargetDetail(data);
          setInspectorNotes(data.target.notes || '');
          setNotesSavedFeedback(false);
        }
      } catch (err) {
        console.error('Failed to fetch target detail:', err);
      } finally {
        if (isMounted) setIsLoadingDetail(false);
      }
    };

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedTargetId]);

  // Selected Target object
  const selectedTarget = useMemo(() => {
    if (!selectedTargetId) return targets[0] || null;
    return targets.find((t) => t.id === selectedTargetId) || targets[0] || null;
  }, [targets, selectedTargetId]);

  // KPI Metrics Calculation
  const kpis = useMemo(() => {
    const total = targets.length;
    const active = targets.filter((t) => (t.status || 'ACTIVE') === 'ACTIVE' || t.status === 'SCANNING').length;
    const completed = targets.filter((t) => t.status === 'COMPLETED').length;
    const paused = targets.filter((t) => t.status === 'PAUSED').length;
    const failed = targets.filter((t) => t.status === 'FAILED').length;
    return { total, active, completed, paused, failed };
  }, [targets]);

  // Filter & Sort Targets
  const filteredTargets = useMemo(() => {
    return targets
      .filter((t) => {
        // Type filter
        if (typeFilter !== 'ALL' && t.type.toUpperCase() !== typeFilter.toUpperCase()) return false;

        // Status filter
        if (statusFilter !== 'ALL' && (t.status || 'ACTIVE').toUpperCase() !== statusFilter.toUpperCase()) return false;

        // Case filter
        if (caseFilter !== 'ALL' && t.case_id !== caseFilter) return false;

        // Search filter (value, notes, case_title, tags)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchVal = t.value.toLowerCase().includes(q);
          const matchNotes = (t.notes || '').toLowerCase().includes(q);
          const matchCase = (t.case_title || '').toLowerCase().includes(q);
          const matchTags = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
          if (!matchVal && !matchNotes && !matchCase && !matchTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'value') {
          return a.value.localeCompare(b.value);
        }
        if (sortBy === 'progress') {
          return (b.progress || 0) - (a.progress || 0);
        }
        if (sortBy === 'created') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // Default: last_scanned
        const dateA = a.last_scanned_at ? new Date(a.last_scanned_at).getTime() : 0;
        const dateB = b.last_scanned_at ? new Date(b.last_scanned_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [targets, typeFilter, statusFilter, caseFilter, searchQuery, sortBy]);

  // Handle Multi-Select Checkboxes
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredTargets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTargets.map((t) => t.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Create Target
  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim() || !targetCaseId) return;

    try {
      setIsSubmitting(true);
      const parsedTags = targetTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter((t) => t.length > 0);

      const created = await createTarget(targetCaseId, {
        type: targetType,
        value: targetValue.trim(),
        notes: targetNotes.trim(),
        tags: parsedTags,
      });

      setShowAddModal(false);
      setTargetValue('');
      setTargetNotes('');
      setTargetTags('');
      await loadData();
      setSelectedTargetId(created.id);
    } catch (err) {
      console.error('Failed to create target:', err);
      alert('Failed to add target. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Bulk Import
  const handleBulkImport = async () => {
    if (!bulkText.trim() || !bulkCaseId) {
      setBulkError('Please select a case and provide target entries.');
      return;
    }

    try {
      setIsSubmitting(true);
      setBulkError(null);

      // Parse lines
      const lines = bulkText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const parsedTargets = lines.map((line) => {
        let type = 'USERNAME';
        let val = line;

        // Check if prefixed like "domain:example.com" or "ip:1.1.1.1"
        if (line.includes(':') && !line.includes('://')) {
          const parts = line.split(':');
          const prefix = parts[0].toLowerCase();
          if (['username', 'domain', 'email', 'ip'].includes(prefix)) {
            type = prefix.toUpperCase();
            val = parts.slice(1).join(':').trim();
          }
        } else if (line.includes('@') && line.includes('.')) {
          type = 'EMAIL';
        } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(line)) {
          type = 'IP';
        } else if (line.includes('.') && !line.includes(' ')) {
          type = 'DOMAIN';
        }

        return {
          type,
          value: val,
          notes: 'Bulk imported target',
          tags: ['imported'],
        };
      });

      await bulkImportTargets({
        case_id: bulkCaseId,
        targets: parsedTargets,
      });

      setShowImportModal(false);
      setBulkText('');
      await loadData();
    } catch (err: any) {
      console.error('Bulk import failed:', err);
      setBulkError(err.message || 'Failed to import targets.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Scan directly
  const handleTriggerScan = async (targetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      // Find target type
      const target = targets.find((t) => t.id === targetId);
      const mod = (target?.type === 'IP' || target?.type === 'DOMAIN') ? 'exposure' : 'clover';
      
      // Optimistic update
      setTargets((prev) =>
        prev.map((t) => (t.id === targetId ? { ...t, status: 'SCANNING', progress: 15 } : t))
      );

      await triggerTargetScan(targetId, mod);
      await loadData();
    } catch (err) {
      console.error('Failed to trigger scan:', err);
      alert('Failed to trigger scan on target.');
    }
  };

  // Delete Target
  const handleDeleteTarget = async (targetId: string, value: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete target "${value}" from case? All associated scans and discovered artifacts will be removed.`)) {
      return;
    }

    try {
      await deleteTarget(targetId);
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      if (selectedTargetId === targetId) {
        setSelectedTargetId(null);
      }
    } catch (err) {
      console.error('Failed to delete target:', err);
      alert('Failed to delete target.');
    }
  };

  // Save Notes from Inspector
  const handleSaveNotes = async () => {
    if (!selectedTarget) return;
    try {
      setIsSavingNotes(true);
      const updated = await updateTarget(selectedTarget.id, { notes: inspectorNotes });
      setTargets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, notes: updated.notes } : t)));
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
    if (!selectedTarget || !newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    const currentTags = selectedTarget.tags || [];
    if (currentTags.includes(cleanTag)) {
      setNewTagInput('');
      setIsAddingTag(false);
      return;
    }

    const updatedTags = [...currentTags, cleanTag];
    try {
      const updated = await updateTarget(selectedTarget.id, { tags: updatedTags });
      setTargets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, tags: updated.tags } : t)));
      setNewTagInput('');
      setIsAddingTag(false);
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  // Remove Tag in Inspector
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedTarget) return;
    const updatedTags = (selectedTarget.tags || []).filter((t) => t !== tagToRemove);
    try {
      const updated = await updateTarget(selectedTarget.id, { tags: updatedTags });
      setTargets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, tags: updated.tags } : t)));
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  // Copy target value
  const handleCopyValue = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  // Type badge helper
  const renderTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    switch (t) {
      case 'USERNAME':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
            <User className="w-3 h-3 text-cyan-400" />
            Username
          </span>
        );
      case 'DOMAIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950/70 border border-purple-500/40 text-purple-300">
            <Globe className="w-3 h-3 text-purple-400" />
            Domain
          </span>
        );
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/70 border border-amber-500/40 text-amber-300">
            <Mail className="w-3 h-3 text-amber-400" />
            Email
          </span>
        );
      case 'IP':
      case 'IP ADDRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/70 border border-rose-500/40 text-rose-300">
            <Server className="w-3 h-3 text-rose-400" />
            IP Address
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-300">
            {type}
          </span>
        );
    }
  };

  // Status badge helper
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'ACTIVE').toUpperCase();
    switch (s) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        );
      case 'SCANNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
            <RefreshCw className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
            Scanning
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40">
            <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
            Completed
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Pause className="w-2.5 h-2.5 text-amber-400" />
            Paused
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Avatar Icon per target type
  const renderTargetAvatar = (type: string, value: string) => {
    const t = type.toUpperCase();
    if (t === 'USERNAME') {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 p-[1px] flex items-center justify-center shrink-0 shadow-md">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-cyan-300 text-xs font-bold font-mono">
            {value.slice(0, 2).toUpperCase()}
          </div>
        </div>
      );
    }
    if (t === 'DOMAIN') {
      return (
        <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-400">
          <Globe className="w-4 h-4" />
        </div>
      );
    }
    if (t === 'EMAIL') {
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
          <Mail className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
        <Server className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#070b12] text-slate-100 overflow-hidden font-sans">
      {/* 1. Global Left Tactical Sidebar */}
      <Sidebar />

      {/* 2. Main Targets Operations Center */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search & status badges */}
        <TopBar
          onSearch={(q) => setSearchQuery(q)}
          placeholder="Search targets by name, domain, IP, tags..."
          showBadges={true}
        />

        {/* Scrollable Work Area */}
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">

          {/* A. Hero Surveillance Banner (matching media_1790752451372.png) */}
          <div className="relative rounded-3xl overflow-hidden border border-cyan-900/40 shadow-2xl bg-gradient-to-r from-[#070f1e] via-[#09152b] to-[#0d1e3d]">
            {/* Cyber Grid & Radar Reticle Overlays */}
            <div
              className="absolute inset-0 opacity-[0.12] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at 75% 50%, rgba(6, 182, 212, 0.4) 0%, transparent 60%), linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                backgroundSize: '100% 100%, 28px 28px, 28px 28px',
              }}
            />

            {/* Glowing Accent Lights */}
            <div className="absolute top-0 right-1/4 w-96 h-40 bg-cyan-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-10 left-1/3 w-80 h-32 bg-indigo-600/15 blur-[70px] pointer-events-none" />

            <div className="relative z-10 px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Left Title & Icon Section */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.35)] shrink-0">
                  <Crosshair className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-50 tracking-tight">
                      Targets
                    </h1>
                    {/* Neon Script Badge */}
                    <span className="hidden sm:inline-block font-serif italic text-cyan-400/90 text-xs tracking-wider px-3 py-0.5 rounded-full bg-cyan-950/30 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                      Totally Spies Recon
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed">
                    Manage investigation targets and track their reconnaissance progress.
                  </p>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex items-center gap-3 self-stretch sm:self-auto shrink-0">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 hover:text-slate-100 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:border-slate-600"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Import Targets</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add Target</span>
                </button>
              </div>
            </div>
          </div>

          {/* B. 5 KPI Summary Metric Cards (matching media_1790752451372.png) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Total Targets */}
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 shadow-lg flex items-center gap-3.5 hover:border-cyan-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-100 leading-none">
                  {kpis.total}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Total Targets</div>
              </div>
            </div>

            {/* 2. Active Targets */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 shadow-lg flex items-center gap-3.5 hover:border-emerald-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-100 leading-none">
                  {kpis.active}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Active Targets</div>
              </div>
            </div>

            {/* 3. Completed */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 shadow-lg flex items-center gap-3.5 hover:border-blue-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-100 leading-none">
                  {kpis.completed}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Completed</div>
              </div>
            </div>

            {/* 4. Paused */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-lg flex items-center gap-3.5 hover:border-amber-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Pause className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-100 leading-none">
                  {kpis.paused}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Paused</div>
              </div>
            </div>

            {/* 5. Failed */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-lg flex items-center gap-3.5 hover:border-rose-500/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-inner shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-100 leading-none">
                  {kpis.failed}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">Failed</div>
              </div>
            </div>
          </div>

          {/* C. Search, Filter, Sort & View Mode Controls Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800/80">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search targets by name, domain, IP, tags..."
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
              {/* Type Dropdown */}
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                >
                  <option value="ALL">Type: All</option>
                  <option value="USERNAME">Type: Username</option>
                  <option value="DOMAIN">Type: Domain</option>
                  <option value="EMAIL">Type: Email</option>
                  <option value="IP">Type: IP Address</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                >
                  <option value="ALL">Status: All</option>
                  <option value="ACTIVE">Status: Active</option>
                  <option value="SCANNING">Status: Scanning</option>
                  <option value="COMPLETED">Status: Completed</option>
                  <option value="PAUSED">Status: Paused</option>
                  <option value="FAILED">Status: Failed</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Case Dropdown */}
              <div className="relative">
                <select
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value)}
                  className="appearance-none bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/60 cursor-pointer max-w-[150px] truncate"
                >
                  <option value="ALL">Case: All Cases</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
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
                  <option value="last_scanned">Sort: Last Scanned</option>
                  <option value="value">Sort: Name (A-Z)</option>
                  <option value="progress">Sort: Progress</option>
                  <option value="created">Sort: Created Date</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Grid vs List Toggles */}
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
                onClick={loadData}
                disabled={isLoading}
                className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                title="Refresh Targets"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* D. Main Body: Split View (Targets Table on Left + Selected Target Inspector on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Content Area: Targets Table / List */}
            <div className="lg:col-span-8 space-y-4">
              {filteredTargets.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-slate-900/30 border border-slate-800/80 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Crosshair className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-200">No Targets Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {searchQuery
                        ? `No targets match "${searchQuery}". Try clearing filters.`
                        : 'No targets recorded yet. Add your first investigation target above!'}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                      + Add First Target
                    </button>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('ALL');
                          setStatusFilter('ALL');
                          setCaseFilter('ALL');
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : viewMode === 'list' ? (
                /* LIST VIEW (Table matching media_1790752451372.png) */
                <div className="rounded-2xl border border-slate-800/80 bg-[#0c121e]/90 overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedIds.length === filteredTargets.length && filteredTargets.length > 0}
                              onChange={handleToggleSelectAll}
                              className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 cursor-pointer"
                            />
                          </th>
                          <th className="py-3 px-3">Target</th>
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Case</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Progress</th>
                          <th className="py-3 px-3">Last Scan</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {filteredTargets.map((t) => {
                          const isSelected = selectedTarget?.id === t.id;
                          const isChecked = selectedIds.includes(t.id);
                          const progress = t.progress || 0;

                          return (
                            <tr
                              key={t.id}
                              onClick={() => setSelectedTargetId(t.id)}
                              className={`cursor-pointer transition-all group ${
                                isSelected
                                  ? 'bg-[#0f192b] text-cyan-100 shadow-[inset_0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50'
                                  : 'hover:bg-slate-800/40 text-slate-300'
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleToggleSelect(t.id, e as any)}
                                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 cursor-pointer"
                                />
                              </td>

                              {/* Target Avatar & Value */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  {renderTargetAvatar(t.type, t.value)}
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate max-w-[150px]">
                                      {t.value}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                                      {t.type === 'USERNAME' ? `@${t.value}` : t.type}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Type Badge */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {renderTypeBadge(t.type)}
                              </td>

                              {/* Case Name */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/cases/${t.case_id}`);
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors underline-offset-2 hover:underline truncate max-w-[130px] block"
                                  title={t.case_title || 'View Case'}
                                >
                                  {t.case_title || 'Case'}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {renderStatusBadge(t.status)}
                              </td>

                              {/* Progress Bar */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-2 min-w-[100px]">
                                  <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        progress >= 100
                                          ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                                          : progress > 0
                                          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                                          : 'bg-slate-800'
                                      }`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                                    {progress}%
                                  </span>
                                </div>
                              </td>

                              {/* Last Scan */}
                              <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-400">
                                {t.last_scanned_at ? formatTimeAgo(t.last_scanned_at) : 'Never'}
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Run Scan Button */}
                                  <button
                                    onClick={(e) => handleTriggerScan(t.id, e)}
                                    className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 transition-colors"
                                    title="Start Scan"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-emerald-400/20" />
                                  </button>

                                  {/* Open in Graph Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/cases/${t.case_id}`);
                                    }}
                                    className="p-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/60 transition-colors"
                                    title="View in Graph"
                                  >
                                    <Network className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Button */}
                                  <button
                                    onClick={(e) => handleDeleteTarget(t.id, t.value, e)}
                                    className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                                    title="Delete Target"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTargets.map((t) => {
                    const isSelected = selectedTarget?.id === t.id;
                    const progress = t.progress || 0;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTargetId(t.id)}
                        className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer border flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#0f192b] border-cyan-400 ring-1 ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                            : 'bg-[#0c121e]/90 border-slate-800/80 hover:border-slate-700 hover:bg-[#0f1827]'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {renderTargetAvatar(t.type, t.value)}
                              <div>
                                <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors text-sm">
                                  {t.value}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {t.case_title || 'Investigation Case'}
                                </div>
                              </div>
                            </div>
                            {renderStatusBadge(t.status)}
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                            {renderTypeBadge(t.type)}
                            <span>Scan: {t.last_scanned_at ? formatTimeAgo(t.last_scanned_at) : 'Never'}</span>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span>Recon Progress</span>
                              <span className="font-bold text-cyan-300">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-cyan-400 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <button
                            onClick={(e) => handleTriggerScan(t.id, e)}
                            className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-emerald-400/20" />
                            <span>Run Scan</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/cases/${t.case_id}`);
                            }}
                            className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            <span>Open Graph</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Target Detail Inspector Panel (matching media_1790752451372.png) */}
            <div className="lg:col-span-4">
              {selectedTarget ? (
                <div className="bg-[#0c121e]/95 border border-slate-800/90 rounded-2xl p-5 space-y-5 shadow-2xl backdrop-blur-md sticky top-6">
                  {/* Inspector Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      {renderTargetAvatar(selectedTarget.type, selectedTarget.value)}
                      <div>
                        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                          <span>{selectedTarget.value}</span>
                        </h2>
                        <div className="text-xs font-mono text-slate-500">
                          {selectedTarget.type === 'USERNAME' ? `@${selectedTarget.value}` : selectedTarget.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(selectedTarget.status)}
                    </div>
                  </div>

                  {/* Inspector Tabs (Overview, Artifacts, Scans, Notes) */}
                  <div className="flex items-center gap-1 border-b border-slate-800/80 pb-1">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'artifacts', label: `Artifacts`, count: targetDetail?.artifacts?.length ?? selectedTarget.artifacts_count ?? 0 },
                      { id: 'scans', label: `Scans`, count: targetDetail?.scans?.length ?? selectedTarget.scans_count ?? 0 },
                      { id: 'notes', label: 'Notes' },
                    ].map((tab) => {
                      const isActive = inspectorTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setInspectorTab(tab.id as any)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all relative border-b-2 -mb-[1px] ${
                            isActive
                              ? 'border-cyan-400 text-cyan-300'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count !== undefined && (
                            <span
                              className={`px-1 py-0.2 rounded-full text-[9px] font-mono ${
                                isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-500'
                              }`}
                            >
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab 1: Overview */}
                  {inspectorTab === 'overview' && (
                    <div className="space-y-5">
                      {/* Target Information */}
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Target Information
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5 text-xs font-mono">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <User className="w-3.5 h-3.5 text-cyan-400" />
                              Type:
                            </span>
                            <span className="text-slate-200">{selectedTarget.type}</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                              Value:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-cyan-300 font-bold">{selectedTarget.value}</span>
                              <button
                                onClick={() => handleCopyValue(selectedTarget.value)}
                                className="text-slate-500 hover:text-slate-300"
                                title="Copy Value"
                              >
                                {copiedValue ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              Case:
                            </span>
                            <span
                              onClick={() => navigate(`/cases/${selectedTarget.case_id}`)}
                              className="text-slate-200 hover:text-cyan-300 cursor-pointer truncate max-w-[160px]"
                            >
                              {selectedTarget.case_title || 'Case'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                              Added:
                            </span>
                            <span className="text-slate-200 text-[11px]">
                              {formatDate(selectedTarget.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              Last Scanned:
                            </span>
                            <span className="text-slate-200 text-[11px]">
                              {selectedTarget.last_scanned_at ? formatDate(selectedTarget.last_scanned_at) : 'Never'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                              <Activity className="w-3.5 h-3.5 text-emerald-400" />
                              Status:
                            </span>
                            {renderStatusBadge(selectedTarget.status)}
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase">Description / Scope:</span>
                            <p className="text-slate-300 font-sans text-xs leading-relaxed">
                              {selectedTarget.notes || 'No description provided.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Tags Section with + Add Tag */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-cyan-400" />
                            Target Tags
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(selectedTarget.tags || []).map((tag, idx) => (
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
                              <button onClick={handleAddTag} className="text-cyan-400 hover:text-cyan-300">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setIsAddingTag(false)} className="text-slate-500 hover:text-slate-300">
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

                      {/* 2x2 Quick Actions Grid */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Quick Actions
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleTriggerScan(selectedTarget.id)}
                            className="p-3 rounded-xl bg-slate-950/80 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
                          >
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
                              <Play className="w-4 h-4 fill-emerald-400/20 group-hover:scale-110 transition-transform" />
                              <span>Run Scan</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              Start new reconnaissance
                            </div>
                          </button>

                          <button
                            onClick={() => navigate(`/cases/${selectedTarget.case_id}`)}
                            className="p-3 rounded-xl bg-slate-950/80 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group"
                          >
                            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs font-mono">
                              <Network className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span>Open in Graph</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              View in investigation graph
                            </div>
                          </button>

                          <button
                            onClick={() => setShowEditModal(true)}
                            className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group"
                          >
                            <div className="flex items-center gap-2 text-slate-300 font-bold text-xs font-mono">
                              <Edit3 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                              <span>Edit Target</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              Modify target details
                            </div>
                          </button>

                          <button
                            onClick={() => handleDeleteTarget(selectedTarget.id, selectedTarget.value)}
                            className="p-3 rounded-xl bg-slate-950/80 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-left transition-all group"
                          >
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono">
                              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span>Delete Target</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">
                              Remove from case
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Recent Activity Chronological Feed */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          <span>Recent Activity</span>
                          <span
                            onClick={() => navigate(`/cases/${selectedTarget.case_id}`)}
                            className="text-cyan-400 hover:underline cursor-pointer text-[10px] normal-case"
                          >
                            View All →
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 font-mono text-xs">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-2 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Scan completed ({targetDetail?.artifacts?.length || 0} artifacts)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {selectedTarget.last_scanned_at ? formatTimeAgo(selectedTarget.last_scanned_at) : 'recently'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-2 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              Target intelligence updated
                            </span>
                            <span className="text-[10px] text-slate-500">today</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-2 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              New artifacts indexed in graph
                            </span>
                            <span className="text-[10px] text-slate-500">recent</span>
                          </div>

                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-2 text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              Target added to investigation
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatTimeAgo(selectedTarget.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Artifacts */}
                  {inspectorTab === 'artifacts' && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Discovered Artifacts ({targetDetail?.artifacts?.length || 0})
                      </div>

                      {isLoadingDetail ? (
                        <div className="p-8 text-center text-xs font-mono text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-cyan-400" />
                          Loading artifacts...
                        </div>
                      ) : (targetDetail?.artifacts?.length || 0) === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-500">
                          No artifacts discovered yet. Run a scan to discover intelligence!
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                          {targetDetail?.artifacts.map((a) => (
                            <div
                              key={a.id}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-200 truncate">{a.label}</div>
                                <div className="text-[10px] font-mono text-cyan-400 truncate">
                                  {a.node_type} &bull; {Math.round(a.confidence * 100)}% match
                                </div>
                              </div>
                              {a.url && (
                                <a
                                  href={a.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Scans */}
                  {inspectorTab === 'scans' && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Scan Executions ({targetDetail?.scans?.length || 0})
                      </div>

                      {isLoadingDetail ? (
                        <div className="p-8 text-center text-xs font-mono text-slate-500">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-cyan-400" />
                          Loading scan history...
                        </div>
                      ) : (targetDetail?.scans?.length || 0) === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-500">
                          No scans executed yet on this target.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                          {targetDetail?.scans.map((s) => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 font-mono text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-cyan-300 uppercase">{s.module}</span>
                                {renderStatusBadge(s.status)}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                                <span>Probes: {s.completed} / {s.total}</span>
                                <span>Matches: {s.matches_count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 4: Notes */}
                  {inspectorTab === 'notes' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          Reconnaissance Notes
                        </span>
                        {notesSavedFeedback && (
                          <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-1 animate-pulse">
                            <Check className="w-3 h-3" /> Saved!
                          </span>
                        )}
                      </div>

                      <textarea
                        value={inspectorNotes}
                        onChange={(e) => setInspectorNotes(e.target.value)}
                        placeholder="Log observations, investigative leads, cross-references..."
                        rows={6}
                        className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all resize-none leading-relaxed"
                      />

                      <div className="flex justify-end">
                        <button
                          onClick={handleSaveNotes}
                          disabled={isSavingNotes}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-500/40 text-xs font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isSavingNotes ? 'Saving...' : 'Save Notes'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 text-slate-500 text-xs font-mono">
                  Select a target on the left to inspect intelligence details.
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* 3. Modal: + Add Target */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c121e] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  Add Investigation Target
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTarget} className="p-6 space-y-4">
              {/* Select Case */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Associated Case <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={targetCaseId}
                  onChange={(e) => setTargetCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/60"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Type & Value */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Type
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="USERNAME">USERNAME</option>
                    <option value="DOMAIN">DOMAIN</option>
                    <option value="EMAIL">EMAIL</option>
                    <option value="IP">IP ADDRESS</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Target Value <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={
                      targetType === 'USERNAME'
                        ? 'e.g. torvalds'
                        : targetType === 'DOMAIN'
                        ? 'e.g. target-site.com'
                        : targetType === 'EMAIL'
                        ? 'e.g. contact@target.com'
                        : 'e.g. 192.168.1.1'
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Description / Notes
                </label>
                <textarea
                  value={targetNotes}
                  onChange={(e) => setTargetNotes(e.target.value)}
                  rows={2}
                  placeholder="Suspected identity, role in case, origin of lead..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-sans resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={targetTags}
                  onChange={(e) => setTargetTags(e.target.value)}
                  placeholder="social, darkweb, suspect"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-mono"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !targetValue.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Import Targets (Bulk Entry) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c121e] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  Import Multiple Targets
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {bulkError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center gap-2 text-xs font-mono text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{bulkError}</span>
                </div>
              )}

              {/* Case Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Assign to Case <span className="text-rose-400">*</span>
                </label>
                <select
                  value={bulkCaseId}
                  onChange={(e) => setBulkCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/60"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Targets List Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">
                  Targets List (one per line)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => {
                    setBulkText(e.target.value);
                    setBulkError(null);
                  }}
                  rows={7}
                  placeholder={`torvalds\nexample.com\n192.168.1.1\nlinus@kernel.org\nusername:jinsakai`}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 font-mono leading-relaxed resize-none"
                />
                <span className="text-[10px] font-mono text-slate-500">
                  Auto-detects Username, Domain, Email, or IP Address format.
                </span>
              </div>

              {/* Actions */}
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
                  onClick={handleBulkImport}
                  disabled={isSubmitting || !bulkText.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Import Targets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Target */}
      {showEditModal && selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0c121e] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  Edit Target: {selectedTarget.value}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">Status</label>
                <select
                  value={selectedTarget.status || 'ACTIVE'}
                  onChange={async (e) => {
                    const updated = await updateTarget(selectedTarget.id, { status: e.target.value });
                    setTargets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t)));
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/60"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">Description / Notes</label>
                <textarea
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/60 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await handleSaveNotes();
                    setShowEditModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
