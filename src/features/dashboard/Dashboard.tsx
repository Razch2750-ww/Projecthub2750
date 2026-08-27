import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { StatusBadge } from '../../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { 
  FolderKanban, CheckCircle2, Clock, AlertCircle, 
  ChevronLeft, ChevronRight, Search, Database, X, 
  AlertTriangle, MapPin, Calendar, LayoutGrid, Kanban, PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, ProjectStatus, PROJECT_STATUSES } from '../../types';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';

export interface DashboardProps {
  onNavigateToProject?: (projectId: string) => void;
}

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; dot: string }> = {
  'Tahap 1: New': { label: 'Baru (New)', color: 'border-t-blue-500', bg: 'bg-blue-500/10 hover:bg-blue-500/20', dot: 'bg-blue-500' },
  'Tahap 2: Design and Revision': { label: 'Desain & Revisi', color: 'border-t-amber-500', bg: 'bg-amber-500/10 hover:bg-amber-500/20', dot: 'bg-amber-500' },
  'Tahap 3: Waiting for Approval': { label: 'Waiting for Approval', color: 'border-t-cyan-500', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20', dot: 'bg-cyan-500' },
  'Tahap 4: Pre Construction': { label: 'Pra Konstruksi', color: 'border-t-indigo-500', bg: 'bg-indigo-500/10 hover:bg-indigo-500/20', dot: 'bg-indigo-500' },
  'Tahap 5: Under Construction': { label: 'Konstruksi', color: 'border-t-purple-500', bg: 'bg-purple-500/10 hover:bg-purple-500/20', dot: 'bg-purple-500' },
  'Tahap 6: Completed': { label: 'Selesai (Completed)', color: 'border-t-teal-500', bg: 'bg-teal-500/10 hover:bg-teal-500/20', dot: 'bg-teal-500' },
  'Paused': { label: 'Ditunda', color: 'border-t-slate-500', bg: 'bg-slate-500/10 hover:bg-slate-500/20', dot: 'bg-slate-500' },
  'Cancelled': { label: 'Dibatalkan', color: 'border-t-rose-500', bg: 'bg-rose-500/10 hover:bg-rose-500/20', dot: 'bg-rose-500' },
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToProject }) => {
  const { projects, tasks, calendarEvents, updateProject, restoreFromBackup } = useProjects();
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'kanban'>('summary'); // Default to Summary & Activities as requested
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  // Helper functions for project categorization across both active and archived/cancelled projects
  const isCancelledProject = (p: Project) => {
    const s = (p.status as string) || '';
    if (s === 'Cancelled' || s === 'Dibatalkan' || s === 'Cancel' || s === 'Batal') return true;
    if (s.toLowerCase().includes('cancel') || s.toLowerCase().includes('batal')) return true;
    if (p.isArchived && s !== 'Tahap 6: Completed') return true;
    return false;
  };

  const isCompletedProject = (p: Project) => {
    const s = (p.status as string) || '';
    if (s === 'Tahap 6: Completed') return true;
    if (s.toLowerCase().includes('selesai') || s.toLowerCase().includes('completed')) return true;
    return false;
  };

  const isPausedProject = (p: Project) => {
    const s = (p.status as string) || '';
    if (s === 'Paused') return true;
    if (s.toLowerCase().includes('ditunda') || s.toLowerCase().includes('pause')) return true;
    return false;
  };

  const isOngoingProject = (p: Project) => {
    return !isCancelledProject(p) && !isCompletedProject(p) && !isPausedProject(p);
  };

  // 1. Filter out archived projects from active dashboard statistics and lists
  const activeProjects = projects.filter(p => !p.isArchived);
  const activeProjectIds = new Set(activeProjects.map(p => p.id));
  const activeTasks = tasks.filter(t => activeProjectIds.has(t.projectId));

  // Quick Stats Calculations (referencing ongoing/active projects)
  const activeProjectsCount = projects.filter(p => isOngoingProject(p)).length;
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter(t => t.status === 'Selesai' || t.status === 'Approved' || t.status === 'Signed').length;
  const revisionTasks = activeTasks.filter(t => t.status === 'Butuh Revisi').length;

  // Pending drafting tasks: status is active drafting work (not Selesai, Approved, Signed, Paused, or Cancelled)
  const pendingTasks = activeTasks.filter(t => t.status !== 'Selesai' && t.status !== 'Approved' && t.status !== 'Signed' && t.status !== 'Paused' && t.status !== 'Cancelled');
  const pendingTasksCount = pendingTasks.length;
  const newTasksCount = pendingTasks.filter(t => t.status === 'Baru').length;
  const workingTasksCount = pendingTasks.filter(t => t.status === 'Bekerja').length;
  const revisionTasksCount = pendingTasks.filter(t => t.status === 'Butuh Revisi').length;

  // 2. Weekly Productivity Trend: Completed projects per week over the last 6 weeks
  const completedProjects = projects.filter(p => p.status === 'Tahap 6: Completed');
  

  // Upcoming deadlines from calendarEvents
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingEvents = (calendarEvents || [])
    .filter(ev => ev.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcomingEventsCount = upcomingEvents.length;

  const hasLocalBackup = !!(localStorage.getItem('drafter_projects_backup') || localStorage.getItem('drafter_tasks_backup'));

  const handleRestoreBackup = async () => {
    setRestoring(true);
    try {
      await restoreFromBackup();
    } finally {
      setRestoring(false);
    }
  };

  const recentHistory = [...tasks]
    .flatMap(t => (t.history || []).map(h => ({ 
      ...h, 
      taskTitle: t.title, 
      projectName: projects.find(p => p.id === t.projectId)?.ptName || 'Proyek Tidak Dikenal', 
      projectId: t.projectId 
    })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('text/plain', projectId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ProjectStatus) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const projectId = e.dataTransfer.getData('text/plain');
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (project) {
      if (project.status === targetStatus) return;
      try {
        await updateProject(project.id, project.ptName, project.address, project.entryDate, { status: targetStatus });
        toast.success(`Status ${project.ptName} berhasil dipindahkan ke ${STATUS_META[targetStatus].label}`);
      } catch (error) {
        toast.error('Gagal memperbarui status proyek');
      }
    }
  };

  const moveProjectStatus = async (project: Project, direction: 'prev' | 'next') => {
    const currentStatus = project.status || 'Tahap 1: New';
    const currentIndex = PROJECT_STATUSES.indexOf(currentStatus);
    if (currentIndex === -1) return;
    
    let newIndex = currentIndex;
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < PROJECT_STATUSES.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
      const targetStatus = PROJECT_STATUSES[newIndex];
      try {
        await updateProject(project.id, project.ptName, project.address, project.entryDate, { status: targetStatus });
        toast.success(`Status ${project.ptName} berhasil diubah ke ${STATUS_META[targetStatus].label}`);
      } catch (e) {
        toast.error('Gagal memperbarui status proyek');
      }
    }
  };

  const STATUS_ORDER: Record<string, number> = {
    'Tahap 1: New': 1,
    'Tahap 2: Design and Revision': 2,
    'Tahap 3: Waiting for Approval': 3,
    'Tahap 4: Pre Construction': 4,
    'Tahap 5: Under Construction': 5,
    'Tahap 6: Completed': 6,
    'Paused': 7,
    'Cancelled': 8
  };

  // Filter projects based on search query and status filter
  const filteredProjects = projects.filter(project => {
    // Hide archived projects on dashboard unless it is cancelled or specifically filtered
    if (project.isArchived && !isCancelledProject(project) && statusFilter === 'All') return false;

    const query = searchQuery.toLowerCase().trim();
    const matchesName = (project.ptName || '').toLowerCase().includes(query);
    const matchesAddress = (project.address || '').toLowerCase().includes(query);
    const locationsMatch = project.locations?.some(l => 
      (l.name || '').toLowerCase().includes(query) || 
      (l.address || '').toLowerCase().includes(query)
    ) || false;
    const matchesSearch = !query || matchesName || matchesAddress || locationsMatch;

    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Cancelled' ? isCancelledProject(project) :
       statusFilter === 'Tahap 6: Completed' ? isCompletedProject(project) :
       statusFilter === 'Paused' ? isPausedProject(project) :
       (project.status || 'Tahap 1: New') === statusFilter);

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const orderA = STATUS_ORDER[a.status || 'Tahap 1: New'] || 99;
    const orderB = STATUS_ORDER[b.status || 'Tahap 1: New'] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Calculations for Project Status Distribution Donut Chart across all projects
  const ongoingProjectsCount = projects.filter(p => isOngoingProject(p)).length;
  const pausedProjectsCount = projects.filter(p => isPausedProject(p)).length;
  const cancelledProjectsCount = projects.filter(p => isCancelledProject(p)).length;
  const completedProjectsCount = projects.filter(p => isCompletedProject(p)).length;
  
  const chartTotalProjects = ongoingProjectsCount + pausedProjectsCount + cancelledProjectsCount + completedProjectsCount;
  
  const chartDataSegments = [
    { 
      label: 'Sedang Berlanjut', 
      count: ongoingProjectsCount, 
      colorClass: 'stroke-indigo-500', 
      hoverColorClass: 'stroke-indigo-400',
      bgClass: 'bg-indigo-500', 
      textClass: 'text-indigo-500 dark:text-indigo-400',
      percentage: chartTotalProjects > 0 ? (ongoingProjectsCount / chartTotalProjects) * 100 : 0 
    },
    { 
      label: 'Selesai', 
      count: completedProjectsCount, 
      colorClass: 'stroke-teal-500', 
      hoverColorClass: 'stroke-teal-400',
      bgClass: 'bg-teal-500', 
      textClass: 'text-teal-500 dark:text-teal-400',
      percentage: chartTotalProjects > 0 ? (completedProjectsCount / chartTotalProjects) * 100 : 0 
    },
    { 
      label: 'Ditunda', 
      count: pausedProjectsCount, 
      colorClass: 'stroke-slate-500', 
      hoverColorClass: 'stroke-slate-400',
      bgClass: 'bg-slate-500', 
      textClass: 'text-slate-500 dark:text-slate-400',
      percentage: chartTotalProjects > 0 ? (pausedProjectsCount / chartTotalProjects) * 100 : 0 
    },
    { 
      label: 'Batal/Cancel', 
      count: cancelledProjectsCount, 
      colorClass: 'stroke-rose-500', 
      hoverColorClass: 'stroke-rose-400',
      bgClass: 'bg-rose-500', 
      textClass: 'text-rose-500 dark:text-rose-400',
      percentage: chartTotalProjects > 0 ? (cancelledProjectsCount / chartTotalProjects) * 100 : 0 
    },
  ];

  // Calculate cumulative percentages for drawing pie segments
  let accumulatedPercent = 0;
  const chartSegmentsWithGeometry = chartDataSegments.map(seg => {
    const strokeDasharray = `${(seg.percentage / 100) * 314.159} ${314.159 - (seg.percentage / 100) * 314.159}`;
    const strokeDashoffset = 314.159 - (accumulatedPercent / 100) * 314.159;
    accumulatedPercent += seg.percentage;
    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >
      {/* Backup Sync Banner if no projects and backup exists */}
      {projects.length === 0 && hasLocalBackup && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl mt-0.5">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-primary text-base">Riwayat Proyek Terdeteksi di Browser</h3>
              <p className="text-secondary text-sm mt-0.5">
                Kami menemukan data cadangan lokal Anda di browser ini. Apakah Anda ingin menyinkronkan data tersebut ke akun cloud Firebase Anda?
              </p>
            </div>
          </div>
          <Button 
            onClick={handleRestoreBackup} 
            disabled={restoring}
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-sm"
          >
            {restoring ? 'Memulihkan...' : 'Pulihkan Cadangan Lokal Sekarang'}
          </Button>
        </motion.div>
      )}

      {/* Suggestion banner if no projects and NO backup exists */}
      {projects.length === 0 && !hasLocalBackup && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-5 bg-surface border border-divider rounded-2xl text-center max-w-2xl mx-auto space-y-4 shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto text-muted mb-2 animate-pulse-soft">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <h3 className="font-bold text-primary text-lg">Belum Ada Proyek</h3>
          <p className="text-secondary text-sm max-w-md mx-auto leading-relaxed">
            Jika sebelumnya Anda pernah membuat proyek di perangkat lain, silakan ekspor file cadangan dari perangkat lama Anda di tab <strong>Pengaturan</strong> lalu impor ke sini, atau pastikan Anda masuk dengan alamat email yang sama.
          </p>
          <Button onClick={() => onNavigateToProject && onNavigateToProject('NEW')} className="mt-2">
            Buat Proyek Pertama
          </Button>
        </motion.div>
      )}

      {/* Top statistics cards (Quick Stats Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Active Projects */}
        <motion.div variants={item} className="relative p-6 bg-surface border border-divider rounded-xl shadow-xs overflow-hidden hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-accent-400)] group">
          <div className="relative flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Proyek Aktif</p>
              <h3 className="text-4xl font-extrabold text-primary tracking-tight">{activeProjectsCount}</h3>
            </div>
            <div className="p-3 bg-[var(--color-accent-50)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)] rounded-xl border border-divider/40">
              <FolderKanban size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="relative pt-4 border-t border-divider/60 flex items-center justify-between text-xs font-medium text-secondary">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]"/> Selesai: <span className="text-primary font-bold">{projects.filter(p => p.status === 'Tahap 6: Completed').length}</span></span>
            <span className="flex items-center gap-1.5"><LayoutGrid size={13} className="text-muted"/> Total: <span className="text-primary font-bold">{projects.length}</span></span>
          </div>
        </motion.div>

        {/* Card 2: Pending Drafting Tasks */}
        <motion.div variants={item} className="relative p-6 bg-surface border border-divider rounded-xl shadow-xs overflow-hidden hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-accent-400)] group">
          <div className="relative flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Tugas Pending</p>
              <h3 className="text-4xl font-extrabold text-primary tracking-tight">{pendingTasksCount}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-divider/40">
              <Clock size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="relative pt-4 border-t border-divider/60 flex flex-wrap items-center gap-2">
            {newTasksCount > 0 && <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{newTasksCount} Baru</span>}
            {workingTasksCount > 0 && <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">{workingTasksCount} Bekerja</span>}
            {revisionTasksCount > 0 && <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">{revisionTasksCount} Revisi</span>}
            {pendingTasksCount === 0 && <span className="text-xs text-muted font-medium flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500"/> Semua selesai</span>}
          </div>
        </motion.div>

        {/* Card 3: Upcoming Deadlines from Calendar */}
        <motion.div variants={item} className="relative p-6 bg-surface border border-divider rounded-xl shadow-xs overflow-hidden hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-accent-400)] group">
          <div className="relative flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Jadwal Terdekat</p>
              <h3 className="text-4xl font-extrabold text-primary tracking-tight">{upcomingEventsCount}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-divider/40">
              <Calendar size={20} strokeWidth={2.5} />
            </div>
          </div>
          <div className="relative pt-4 border-t border-divider/60 space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs font-medium text-muted flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500"/> Tidak ada jadwal</p>
            ) : (
              upcomingEvents.slice(0, 2).map(ev => (
                <div key={ev.id} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ev.type === 'Survey' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                    <span className="truncate text-secondary" title={`${ev.title} (${ev.type})`}>{ev.title}</span>
                  </div>
                  <span className="shrink-0 text-primary bg-surface-hover px-2 py-0.5 rounded border border-divider/50">
                    {format(parseISO(ev.date), 'dd MMM')}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Controls: Tabs & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface p-2 pl-4 rounded-2xl border border-divider shadow-sm">
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shrink-0 active:scale-95 ${
              activeSubTab === 'kanban' 
                ? 'bg-surface-hover text-primary shadow-sm ring-1 ring-divider' 
                : 'text-muted hover:bg-surface-hover/50 hover:text-primary'
            }`}
          >
            <Kanban size={16} />
            Papan Kanban
          </button>
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shrink-0 active:scale-95 ${
              activeSubTab === 'summary' 
                ? 'bg-surface-hover text-primary shadow-sm ring-1 ring-divider' 
                : 'text-muted hover:bg-surface-hover/50 hover:text-primary'
            }`}
          >
            <LayoutGrid size={16} />
            Ringkasan & Aktivitas
          </button>
        </div>

        
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center px-2 lg:px-0">
            {/* Search Input */}
            <div className="relative group flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 group-focus-within:text-[var(--color-accent-500)] transition-colors" />
              <input
                type="text"
                placeholder="Cari proyek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-hover/50 border border-divider rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-500)] focus:bg-surface focus:ring-1 focus:ring-[var(--color-accent-500)]/20 text-primary transition-all duration-300 placeholder:text-muted hover:shadow-sm active:scale-[0.99]"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors p-0.5 rounded-full hover:bg-surface active:scale-90" 
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative flex-1 sm:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-surface-hover/50 border border-divider rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-500)] focus:bg-surface focus:ring-1 focus:ring-[var(--color-accent-500)]/20 text-primary appearance-none cursor-pointer transition-all duration-300 font-medium hover:shadow-sm active:scale-[0.99]"
              >
                <option value="All">Semua Status Proyek</option>
                {PROJECT_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {STATUS_META[status]?.label || status}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>
        
      </div>

      {/* View Content Rendering */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'kanban' ? (
          <motion.div
            key="kanban-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="overflow-x-auto pb-4"
          >
            {projects.length === 0 ? (
              <div className="text-center py-20 text-muted text-sm bg-surface/50 border border-divider rounded-2xl animate-pulse-soft">
                Belum ada proyek yang dapat ditampilkan di Papan Kanban.
              </div>
            ) : (
              <div className="flex gap-5 min-w-[1200px] h-[600px] items-start pb-4">
                {PROJECT_STATUSES.map((status) => {
                  const statusProjects = filteredProjects.filter(p => {
                    if (status === 'Cancelled') return isCancelledProject(p);
                    if (status === 'Tahap 6: Completed') return isCompletedProject(p);
                    if (status === 'Paused') return isPausedProject(p);
                    return (p.status || 'Tahap 1: New') === status;
                  });
                  const isOver = draggedOverColumn === status;
                  const meta = STATUS_META[status];

                  return (
                    <div
                      key={status}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDraggedOverColumn(status);
                      }}
                      onDragLeave={() => setDraggedOverColumn(null)}
                      onDrop={(e) => handleDrop(e, status)}
                      className={`flex flex-col w-80 h-full bg-surface-hover/40 rounded-2xl flex-shrink-0 transition-all duration-200 ${
                        isOver ? 'ring-2 ring-[var(--color-accent-500)] bg-[var(--color-accent-50)]/10 scale-[1.02] shadow-lg' : 'border border-divider/50 shadow-sm'
                      }`}
                    >
                      {/* Column Header */}
                      <div className={`p-4 border-b border-divider/50 bg-surface/50 rounded-t-2xl flex items-center justify-between border-t-4 ${meta.color}`}>
                        <div className="flex items-center gap-2.5">
                          <span className={`w-3 h-3 rounded-full ${meta.dot} shadow-sm`} />
                          <span className="font-bold text-primary text-sm tracking-tight">{meta.label}</span>
                        </div>
                        <span className="px-2.5 py-0.5 text-xs font-bold bg-surface text-secondary border border-divider shadow-sm rounded-full">
                          {statusProjects.length}
                        </span>
                      </div>

                      {/* Projects List in Column */}
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-divider hover:scrollbar-thumb-muted">
                        {statusProjects.length === 0 ? (
                          <div className="h-32 border-2 border-dashed border-divider/60 rounded-xl flex flex-col items-center justify-center text-muted gap-2 bg-surface/30">
                            <FolderKanban size={24} className="opacity-20" />
                            <span className="text-xs font-medium">Seret proyek ke sini</span>
                          </div>
                        ) : (
                          statusProjects.map((project) => {
                            const projectTasks = tasks.filter(t => t.projectId === project.id);
                            const totalPrjTasks = projectTasks.length;
                            const completedPrjTasks = projectTasks.filter(t => t.status === 'Selesai' || t.status === 'Approved' || t.status === 'Signed').length;
                            const prjProgress = totalPrjTasks > 0 ? Math.round((completedPrjTasks / totalPrjTasks) * 100) : 0;
                            const hasRevision = projectTasks.some(t => t.status === 'Butuh Revisi');
                            const hasNew = projectTasks.some(t => t.status === 'Baru');

                            return (
                              <div
                                key={project.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, project.id)}
                                className="group relative bg-surface border border-divider hover:border-divider-hover rounded-xl p-4 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
                              >
                                {/* Drag Indicator Accent */}
                                <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="grid grid-cols-2 gap-0.5 w-3 text-muted">
                                    {[...Array(6)].map((_, i) => (
                                      <div key={i} className="w-1 h-1 rounded-full bg-current opacity-40" />
                                    ))}
                                  </div>
                                </div>

                                <h4 className="font-bold text-primary text-[15px] leading-snug pr-8 line-clamp-2">
                                  {project.ptName}
                                </h4>

                                {/* Project details */}
                                <div className="space-y-2 mt-3">
                                  {project.address && (
                                    <div className="flex items-start gap-2 text-xs text-secondary">
                                      <MapPin size={14} className="shrink-0 text-muted mt-0.5" />
                                      <span className="line-clamp-2 leading-relaxed">{project.address}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-secondary">
                                    <Calendar size={14} className="shrink-0 text-muted" />
                                    <span className="font-medium">Masuk: {project.entryDate ? format(parseISO(project.entryDate), 'dd MMM yyyy') : '-'}</span>
                                  </div>
                                </div>

                                {/* Task progress bar */}
                                {totalPrjTasks > 0 ? (
                                  <div className="mt-4 p-3 bg-surface-hover/50 rounded-lg border border-divider/50">
                                    <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                                      <span className="text-secondary tracking-wide">{completedPrjTasks} / {totalPrjTasks} TUGAS SELESAI</span>
                                      <span className="text-primary">{prjProgress}%</span>
                                    </div>
                                    <div className="w-full bg-divider/80 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${prjProgress === 100 ? 'bg-emerald-500' : 'bg-[var(--color-accent-500)]'}`}
                                        style={{ width: `${prjProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-4 p-3 bg-surface-hover/30 rounded-lg border border-divider/30 text-[11px] text-muted italic text-center">
                                    Belum ada tugas dibuat
                                  </div>
                                )}

                                {/* Warning Badges */}
                                {(hasRevision || hasNew) && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {hasRevision && (
                                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                                        <AlertCircle size={10} strokeWidth={3} />
                                        Butuh Revisi
                                      </span>
                                    )}
                                    {hasNew && (
                                      <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Tugas Baru
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Quick transitions & Nav Footer */}
                                <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between">
                                  <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-0.5 border border-divider">
                                    <button
                                      type="button"
                                      title="Geser Kiri"
                                      onClick={(e) => { e.stopPropagation(); moveProjectStatus(project, 'prev'); }}
                                      disabled={PROJECT_STATUSES.indexOf(status) === 0}
                                      className="p-1 rounded hover:bg-surface hover:shadow-sm text-secondary hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all duration-300 active:scale-90"
                                    >
                                      <ChevronLeft size={14} strokeWidth={2.5} />
                                    </button>
                                    <div className="w-px h-3 bg-divider" />
                                    <button
                                      type="button"
                                      title="Geser Kanan"
                                      onClick={(e) => { e.stopPropagation(); moveProjectStatus(project, 'next'); }}
                                      disabled={PROJECT_STATUSES.indexOf(status) === PROJECT_STATUSES.length - 1}
                                      className="p-1 rounded hover:bg-surface hover:shadow-sm text-secondary hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all duration-300 active:scale-90"
                                    >
                                      <ChevronRight size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => onNavigateToProject && onNavigateToProject(project.id)}
                                    className="text-[11px] font-bold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] flex items-center gap-1 group/btn px-2 py-1.5 rounded-md hover:bg-[var(--color-accent-500)]/10 transition-all duration-300 active:scale-95"
                                  >
                                    Lihat Detail
                                    <ChevronRight size={12} strokeWidth={3} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="summary-view"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: {
                opacity: 1,
                y: 0,
                transition: { staggerChildren: 0.1, duration: 0.2 }
              }
            }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left Column: Donut Chart & Tasks Needing Attention */}
            <div className="space-y-6">
              {/* Donut Chart: Project Status Distribution */}
              <motion.div variants={item} className="bg-surface border border-divider rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <PieChart className="text-[var(--color-accent-600)]" size={20} />
                    Penyebaran Status Proyek
                  </h2>
                  <span className="text-xs text-muted font-medium bg-surface-hover border border-divider/40 px-2 py-1 rounded-md">
                    {chartTotalProjects} Total Proyek
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-4">
                  {/* Interactive SVG Donut */}
                  <div className="relative w-44 h-44 flex-shrink-0">
                    <svg width="176" height="176" viewBox="0 0 120 120" className="transform -rotate-90">
                      {chartTotalProjects === 0 ? (
                        <circle 
                          cx="60" 
                          cy="60" 
                          r="50" 
                          fill="transparent" 
                          className="stroke-zinc-200 dark:stroke-zinc-800" 
                          strokeWidth="10" 
                        />
                      ) : (
                        chartSegmentsWithGeometry.map((seg, idx) => {
                          if (seg.count === 0) return null;
                          const isHovered = hoveredChartIndex === idx;
                          return (
                            <circle
                              key={seg.label}
                              cx="60"
                              cy="60"
                              r="50"
                              fill="transparent"
                              className={`${isHovered ? seg.hoverColorClass : seg.colorClass} transition-all duration-300 ease-out`}
                              strokeWidth={isHovered ? 14 : 10}
                              strokeDasharray={seg.strokeDasharray}
                              strokeDashoffset={seg.strokeDashoffset}
                              strokeLinecap="round"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredChartIndex(idx)}
                              onMouseLeave={() => setHoveredChartIndex(null)}
                            />
                          );
                        })
                      )}
                    </svg>

                    {/* Center details display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      {hoveredChartIndex === null ? (
                        <>
                          <span className="text-3xl font-extrabold text-primary tracking-tight">{chartTotalProjects}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Total Proyek</span>
                        </>
                      ) : (
                        <>
                          <span className={`text-3xl font-extrabold tracking-tight ${chartDataSegments[hoveredChartIndex].textClass}`}>
                            {chartDataSegments[hoveredChartIndex].count}
                          </span>
                          <span className="text-[10px] font-bold text-center px-3 text-secondary leading-tight max-w-[120px]">
                            {chartDataSegments[hoveredChartIndex].label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive Legend List */}
                  <div className="flex-1 w-full space-y-2">
                    {chartDataSegments.map((seg, idx) => {
                      const isHovered = hoveredChartIndex === idx;
                      const isAnyHovered = hoveredChartIndex !== null;
                      return (
                        <div
                          key={seg.label}
                          onMouseEnter={() => setHoveredChartIndex(idx)}
                          onMouseLeave={() => setHoveredChartIndex(null)}
                          className={`flex items-center justify-between p-2 rounded-xl border border-transparent transition-all duration-300 ${
                            isHovered 
                              ? 'bg-surface-hover/80 border-divider shadow-xs scale-[1.01]' 
                              : isAnyHovered 
                                ? 'opacity-40' 
                                : 'hover:bg-surface-hover/40'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${seg.bgClass} shadow-xs shrink-0`} />
                            <span className="font-semibold text-secondary text-xs">{seg.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-secondary bg-surface-hover px-1.5 py-0.5 rounded border border-divider/40">
                              {Math.round(seg.percentage)}%
                            </span>
                            <span className="font-bold text-primary text-xs">{seg.count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Tasks Needing Attention Card */}
              <motion.div variants={item} className="bg-surface border border-divider rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-primary mb-4">Tugas Perlu Perhatian</h2>
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'Butuh Revisi' || t.status === 'Baru').slice(0, 5).length === 0 ? (
                     <p className="text-muted text-sm py-10 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl text-center animate-pulse-soft">Semua tugas aman terkendali.</p>
                  ) : (
                    tasks.filter(t => t.status === 'Butuh Revisi' || t.status === 'Baru').slice(0, 5).map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <div 
                          key={task.id} 
                          className={`p-4 rounded-xl border border-divider hover:bg-surface-hover transition-colors flex items-start justify-between gap-4 ${onNavigateToProject ? 'cursor-pointer' : ''}`}
                          onClick={() => onNavigateToProject && onNavigateToProject(task.projectId)}
                        >
                          <div>
                            <h4 className="font-medium text-primary text-sm">{task.title}</h4>
                            <p className="text-xs text-secondary mt-1">{project?.ptName || 'Proyek Tidak Dikenal'}</p>
                          </div>
                          <StatusBadge status={task.status} />
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column: Recent Activity Card */}
            <motion.div variants={item} className="bg-surface border border-divider rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                Riwayat Aktivitas Terbaru
              </h2>
              {recentHistory.length === 0 ? (
                <p className="text-muted text-sm py-10 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl text-center animate-pulse-soft">Belum ada aktivitas.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-divider before:to-transparent">
                  {recentHistory.map((hist) => (
                    <div 
                      key={hist.id} 
                      className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active ${onNavigateToProject ? 'cursor-pointer' : ''}`}
                      onClick={() => onNavigateToProject && onNavigateToProject(hist.projectId)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-surface bg-[var(--color-accent-100)] text-[var(--color-accent-600)] dark:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-400)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 hover:scale-110 transition-transform">
                        <Clock size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-divider bg-surface-hover shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-[var(--color-accent-300)] group-active:scale-[0.98]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                           <span className="font-semibold text-primary text-sm">{hist.taskTitle}</span>
                           <span className="text-xs text-muted">{format(parseISO(hist.timestamp), 'dd MMM HH:mm')}</span>
                        </div>
                        <div className="text-xs text-secondary mb-2 flex items-center gap-2 font-medium">
                           <span>{hist.projectName}</span>
                           <span>•</span>
                           <StatusBadge status={hist.status} />
                        </div>
                        <p className="text-sm text-secondary italic">"{hist.note}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
