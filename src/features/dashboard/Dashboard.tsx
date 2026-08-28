import React, { useState } from 'react';
import { useProjects } from '../../context/ProjectContext';
import { StatusBadge } from '../../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { 
  FolderKanban, CheckCircle2, Clock, AlertCircle, 
  ChevronLeft, ChevronRight, Search, Database, X, 
  AlertTriangle, MapPin, Calendar, LayoutGrid, Kanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const revisionTasks = activeTasks.filter(t => t.status === 'Butuh Revisi').length;

  // Pending drafting tasks: status is active drafting work (not Selesai, Approved, Signed, Paused, or Cancelled)
  const pendingTasks = activeTasks.filter(t => t.status !== 'Selesai' && t.status !== 'Approved' && t.status !== 'Signed' && t.status !== 'Paused' && t.status !== 'Cancelled');
  const pendingTasksCount = pendingTasks.length;
  const newTasksCount = pendingTasks.filter(t => t.status === 'Baru').length;
  const workingTasksCount = pendingTasks.filter(t => t.status === 'Bekerja').length;

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

  // Calculations for the project status distribution summary.
  const ongoingProjectsCount = projects.filter(p => isOngoingProject(p)).length;
  const pausedProjectsCount = projects.filter(p => isPausedProject(p)).length;
  const cancelledProjectsCount = projects.filter(p => isCancelledProject(p)).length;
  const completedProjectsCount = projects.filter(p => isCompletedProject(p)).length;
  
  const chartTotalProjects = ongoingProjectsCount + pausedProjectsCount + cancelledProjectsCount + completedProjectsCount;
  
  const chartDataSegments = [
    { 
      label: 'Sedang Berlanjut', 
      count: ongoingProjectsCount, 
      textClass: 'text-indigo-500 dark:text-indigo-400',
      percentage: chartTotalProjects > 0 ? (ongoingProjectsCount / chartTotalProjects) * 100 : 0 
    },
    { 
      label: 'Selesai', 
      count: completedProjectsCount, 
      textClass: 'text-teal-500 dark:text-teal-400',
      percentage: chartTotalProjects > 0 ? (completedProjectsCount / chartTotalProjects) * 100 : 0 
    },
    { 
      label: 'Ditunda', 
      count: pausedProjectsCount, 
      textClass: 'text-slate-500 dark:text-slate-400',
      percentage: chartTotalProjects > 0 ? (pausedProjectsCount / chartTotalProjects) * 100 : 0 
    },
    { 
      label: 'Batal/Cancel', 
      count: cancelledProjectsCount, 
      textClass: 'text-rose-500 dark:text-rose-400',
      percentage: chartTotalProjects > 0 ? (cancelledProjectsCount / chartTotalProjects) * 100 : 0 
    },
  ];

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
            className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
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
          className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-divider bg-surface p-5 text-center"
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

      {/* Flat operational metrics */}
      <motion.section variants={item} className="grid grid-cols-2 border-y border-divider bg-surface-elevated md:grid-cols-12" aria-label="Ringkasan operasional">
        <article className="border-b border-r border-divider p-5 md:col-span-4 md:border-b-0 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <FolderKanban size={17} className="text-[var(--color-accent-600)]" aria-hidden="true" />
            Proyek aktif
          </div>
          <p className="data-value mt-5 text-4xl font-semibold text-primary sm:text-5xl">{activeProjectsCount}</p>
          <p className="mt-3 text-xs leading-5 text-secondary">
            {completedProjectsCount} selesai dari {projects.length} total proyek
          </p>
        </article>

        <article className="border-b border-divider p-5 md:col-span-3 md:border-b-0 md:border-r sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Clock size={17} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            Tugas drafting
          </div>
          <p className="data-value mt-5 text-4xl font-semibold text-primary sm:text-5xl">{pendingTasksCount}</p>
          <p className="mt-3 text-xs leading-5 text-secondary">
            {newTasksCount} baru, {workingTasksCount} sedang dikerjakan
          </p>
        </article>

        <article className="border-r border-divider p-5 md:col-span-2 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <AlertCircle size={17} className="text-rose-600 dark:text-rose-400" aria-hidden="true" />
            Butuh revisi
          </div>
          <p className="data-value mt-5 text-4xl font-semibold text-primary sm:text-5xl">{revisionTasks}</p>
          <p className="mt-3 text-xs leading-5 text-secondary">Perlu ditindaklanjuti tim</p>
        </article>

        <article className="p-5 md:col-span-3 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Calendar size={17} className="text-[var(--color-accent-600)]" aria-hidden="true" />
            Agenda mendatang
          </div>
          <p className="data-value mt-5 text-4xl font-semibold text-primary sm:text-5xl">{upcomingEventsCount}</p>
          <p className="mt-3 truncate text-xs leading-5 text-secondary">
            {upcomingEvents[0] ? `${upcomingEvents[0].title}, ${format(parseISO(upcomingEvents[0].date), 'dd MMM')}` : 'Tidak ada jadwal terdekat'}
          </p>
        </article>
      </motion.section>

      {/* Controls: Tabs & Filters */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-divider pb-4 lg:flex-row lg:items-center">
        <div className="flex w-full items-center gap-5 overflow-x-auto pb-2 lg:w-auto lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('kanban')}
            aria-pressed={activeSubTab === 'kanban'}
            className={`flex min-h-11 shrink-0 items-center gap-2 border-b px-1 text-sm font-semibold transition-colors duration-200 active:translate-y-px ${
              activeSubTab === 'kanban'
                ? 'border-[var(--color-accent-600)] text-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Kanban size={16} />
            Papan Kanban
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('summary')}
            aria-pressed={activeSubTab === 'summary'}
            className={`flex min-h-11 shrink-0 items-center gap-2 border-b px-1 text-sm font-semibold transition-colors duration-200 active:translate-y-px ${
              activeSubTab === 'summary'
                ? 'border-[var(--color-accent-600)] text-primary'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <LayoutGrid size={16} />
            Ringkasan & Aktivitas
          </button>
        </div>

        
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:w-auto">
            {/* Search Input */}
            <div className="relative group flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 group-focus-within:text-[var(--color-accent-500)] transition-colors" />
              <input
                type="text"
                placeholder="Cari proyek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-[var(--radius-control)] border border-divider bg-surface-elevated pl-9 pr-10 text-sm text-primary placeholder:text-muted transition-colors hover:border-divider-hover focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/20"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery("")} 
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors p-0.5 rounded-full hover:bg-surface active:scale-90" 
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative flex-1 sm:w-56">
              <select
                aria-label="Filter status proyek"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 w-full appearance-none rounded-[var(--radius-control)] border border-divider bg-surface-elevated pl-4 pr-10 text-sm font-medium text-primary transition-colors hover:border-divider-hover focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/20"
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
                        isOver ? 'ring-2 ring-[var(--color-accent-500)] bg-[var(--color-accent-50)]/10 scale-[1.01]' : 'border border-divider/50'
                      }`}
                    >
                      {/* Column Header */}
                      <div className={`p-4 border-b border-divider/50 bg-surface/50 rounded-t-2xl flex items-center justify-between border-t-4 ${meta.color}`}>
                        <div className="flex items-center gap-2.5">
                          <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
                          <span className="font-bold text-primary text-sm tracking-tight">{meta.label}</span>
                        </div>
                        <span className="rounded-full border border-divider bg-surface px-2.5 py-0.5 text-xs font-bold text-secondary">
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
                                className="group relative cursor-grab rounded-xl border border-divider bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-divider-hover active:cursor-grabbing"
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
                                      <span className="text-secondary">{completedPrjTasks} / {totalPrjTasks} tugas selesai</span>
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
                                      className="rounded p-1 text-secondary transition-all duration-300 hover:bg-surface hover:text-primary active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
                                    >
                                      <ChevronLeft size={14} strokeWidth={2.5} />
                                    </button>
                                    <div className="w-px h-3 bg-divider" />
                                    <button
                                      type="button"
                                      title="Geser Kanan"
                                      onClick={(e) => { e.stopPropagation(); moveProjectStatus(project, 'next'); }}
                                      disabled={PROJECT_STATUSES.indexOf(status) === PROJECT_STATUSES.length - 1}
                                      className="rounded p-1 text-secondary transition-all duration-300 hover:bg-surface hover:text-primary active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent"
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
              {/* Project status distribution */}
              <motion.div variants={item} className="app-card overflow-hidden">
                <div className="flex items-end justify-between gap-4 border-b border-divider p-6">
                  <div>
                    <h2 className="text-lg font-semibold text-primary">Penyebaran status proyek</h2>
                    <p className="mt-1 text-xs text-secondary">Ringkasan seluruh proyek yang tersimpan.</p>
                  </div>
                  <span className="data-value text-3xl font-semibold text-primary">{chartTotalProjects}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  {chartDataSegments.map((seg, index) => (
                    <div key={seg.label} className={`p-5 ${index < chartDataSegments.length - 1 ? 'border-r border-divider' : ''}`}>
                      <p className={`data-value text-3xl font-semibold ${seg.textClass}`}>{seg.count}</p>
                      <p className="mt-3 text-xs font-semibold text-primary">{seg.label}</p>
                      <p className="mt-1 text-xs text-muted">{Math.round(seg.percentage)}% dari total</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tasks Needing Attention Card */}
              <motion.div variants={item} className="app-card p-6">
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
            <motion.div variants={item} className="app-card p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                Riwayat Aktivitas Terbaru
              </h2>
              {recentHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="mx-auto h-7 w-7 text-muted" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-primary">Belum ada aktivitas</p>
                  <p className="mt-1 text-xs text-muted">Perubahan tugas terbaru akan muncul di sini.</p>
                </div>
              ) : (
                <div className="divide-y divide-divider">
                  {recentHistory.map((hist) => (
                    <button
                      type="button"
                      key={hist.id} 
                      className="group grid w-full grid-cols-[auto_1fr] gap-3 py-4 text-left transition-colors first:pt-0 last:pb-0 hover:text-primary"
                      onClick={() => onNavigateToProject && onNavigateToProject(hist.projectId)}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-accent-50)] text-[var(--color-accent-600)]">
                        <Clock size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                          <span className="truncate text-sm font-semibold text-primary">{hist.taskTitle}</span>
                          <span className="shrink-0 text-xs text-muted">{format(parseISO(hist.timestamp), 'dd MMM HH:mm')}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-secondary">
                          <span>{hist.projectName}</span>
                          <StatusBadge status={hist.status} />
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-secondary">{hist.note}</p>
                      </div>
                    </button>
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
