import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { StatusBadge } from '../components/ui/Badge';
import { format, parseISO, startOfWeek, subWeeks, isSameWeek } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  FolderKanban, CheckCircle2, Clock, AlertCircle, 
  ChevronLeft, ChevronRight, Search, Database, 
  AlertTriangle, MapPin, Calendar, LayoutGrid, Kanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, ProjectStatus, PROJECT_STATUSES } from '../types';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';

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
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'kanban'>('kanban'); // Default to Kanban as requested
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // 1. Filter out archived projects from active dashboard statistics and lists
  const activeProjects = projects.filter(p => !p.isArchived);
  const activeProjectIds = new Set(activeProjects.map(p => p.id));
  const activeTasks = tasks.filter(t => activeProjectIds.has(t.projectId));

  // Quick Stats Calculations (referencing active projects/tasks only)
  const activeProjectsCount = activeProjects.filter(p => p.status !== 'Tahap 6: Completed' && p.status !== 'Cancelled').length;
  const totalTasks = activeTasks.length;
  const completedTasks = activeTasks.filter(t => t.status === 'Selesai' || t.status === 'Approved' || t.status === 'Signed').length;
  const revisionTasks = activeTasks.filter(t => t.status === 'Butuh Revisi').length;

  // Pending drafting tasks: status is not Selesai, Approved, or Signed
  const pendingTasks = activeTasks.filter(t => t.status !== 'Selesai' && t.status !== 'Approved' && t.status !== 'Signed');
  const pendingTasksCount = pendingTasks.length;
  const newTasksCount = pendingTasks.filter(t => t.status === 'Baru').length;
  const workingTasksCount = pendingTasks.filter(t => t.status === 'Bekerja').length;
  const revisionTasksCount = pendingTasks.filter(t => t.status === 'Butuh Revisi').length;

  // 2. Weekly Productivity Trend: Completed projects per week over the last 6 weeks
  const completedProjects = projects.filter(p => p.status === 'Tahap 6: Completed');
  
  const getLast6WeeksData = () => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const weekCommencing = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Monday start
      const label = `Mgg ${format(weekCommencing, 'dd/MM')}`;
      
      const count = completedProjects.filter(p => {
        const dateStr = p.completedAt || p.entryDate || p.createdAt;
        if (!dateStr) return false;
        try {
          const pDate = parseISO(dateStr);
          return isSameWeek(pDate, weekCommencing, { weekStartsOn: 1 });
        } catch (err) {
          return false;
        }
      }).length;
      
      data.push({
        name: label,
        "Proyek Selesai": count,
      });
    }
    return data;
  };
  
  const chartData = getLast6WeeksData();

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
    // Hide archived projects on dashboard
    if (project.isArchived) return false;

    const query = searchQuery.toLowerCase();
    const matchesName = (project.ptName || '').toLowerCase().includes(query);
    const matchesAddress = (project.address || '').toLowerCase().includes(query);
    const locationsMatch = project.locations?.some(l => 
      (l.name || '').toLowerCase().includes(query) || 
      (l.address || '').toLowerCase().includes(query)
    ) || false;
    const matchesSearch = matchesName || matchesAddress || locationsMatch;

    const matchesStatus = statusFilter === 'All' || (project.status || 'Tahap 1: New') === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const orderA = STATUS_ORDER[a.status || 'Tahap 1: New'] || 99;
    const orderB = STATUS_ORDER[b.status || 'Tahap 1: New'] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
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
          <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mx-auto text-muted mb-2">
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
        <motion.div variants={item} className="p-6 bg-surface border border-divider rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Proyek Aktif</p>
              <h3 className="text-3xl font-extrabold text-primary mt-1">{activeProjectsCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <FolderKanban size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-divider/50 flex items-center justify-between text-xs text-secondary">
            <span>Selesai (Completed): <strong>{projects.filter(p => p.status === 'Tahap 6: Completed').length}</strong></span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Total Proyek: <strong>{projects.length}</strong></span>
          </div>
        </motion.div>

        {/* Card 2: Pending Drafting Tasks */}
        <motion.div variants={item} className="p-6 bg-surface border border-divider rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Tugas Gambar Pending</p>
              <h3 className="text-3xl font-extrabold text-primary mt-1">{pendingTasksCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-divider/50 flex flex-wrap items-center gap-2">
            {newTasksCount > 0 && (
              <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md">
                {newTasksCount} Baru
              </span>
            )}
            {workingTasksCount > 0 && (
              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md">
                {workingTasksCount} Bekerja
              </span>
            )}
            {revisionTasksCount > 0 && (
              <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-md">
                {revisionTasksCount} Revisi
              </span>
            )}
            {pendingTasksCount === 0 && (
              <span className="text-xs text-muted italic">Semua tugas gambar telah diselesaikan</span>
            )}
          </div>
        </motion.div>

        {/* Card 3: Upcoming Deadlines from Calendar */}
        <motion.div variants={item} className="p-6 bg-surface border border-divider rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Jadwal Kalender</p>
              <h3 className="text-3xl font-extrabold text-primary mt-1">{upcomingEventsCount}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-divider/50 space-y-1.5">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted italic py-0.5">Tidak ada jadwal terdekat</p>
            ) : (
              upcomingEvents.slice(0, 2).map(ev => (
                <div key={ev.id} className="flex items-center justify-between text-xs text-secondary gap-2">
                  <span className="truncate font-medium flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.type === 'Survey' ? 'bg-indigo-500' : 'bg-teal-500'}`} />
                    <span className="truncate" title={`${ev.title} (${ev.type})`}>{ev.title}</span>
                  </span>
                  <span className="shrink-0 font-bold text-primary text-[10px] bg-surface-hover border border-divider px-1.5 py-0.5 rounded">
                    {format(parseISO(ev.date), 'dd MMM')}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Productivity Trend Chart */}
      <motion.div 
        variants={item} 
        className="p-6 bg-surface border border-divider rounded-2xl shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--color-accent-600)]" />
              Tren Produktivitas Mingguan
            </h3>
            <p className="text-xs text-muted mt-0.5">Jumlah proyek yang diselesaikan per minggu (6 minggu terakhir)</p>
          </div>
          <div className="text-xs bg-[var(--color-accent-50)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)]/20 dark:text-[var(--color-accent-400)] px-2.5 py-1 rounded-lg font-semibold border border-[var(--color-accent-200)]/30">
            Total Selesai: {completedProjects.length}
          </div>
        </div>

        <div className="h-60 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-divider)" opacity={0.4} />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              />
              <Tooltip 
                cursor={{ fill: 'var(--color-surface-hover)', opacity: 0.4 }}
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface)', 
                  borderColor: 'var(--color-divider)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)'
                }}
                labelStyle={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}
              />
              <Bar 
                dataKey="Proyek Selesai" 
                fill="var(--color-accent-600)" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-divider pb-4">
        <div className="flex bg-surface-hover p-1 rounded-xl border border-divider/60">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'kanban' 
                ? 'bg-surface text-primary shadow-sm' 
                : 'text-muted hover:text-primary'
            }`}
          >
            <Kanban size={16} />
            Papan Kanban
          </button>
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'summary' 
                ? 'bg-surface text-primary shadow-sm' 
                : 'text-muted hover:text-primary'
            }`}
          >
            <LayoutGrid size={16} />
            Ringkasan & Aktivitas
          </button>
        </div>

        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Cari proyek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-divider rounded-xl pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-56 bg-surface border border-divider rounded-xl pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:border-[var(--color-accent-500)] text-primary appearance-none cursor-pointer"
              >
                <option value="All">Semua Status Proyek</option>
                {PROJECT_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {STATUS_META[status]?.label || status}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>
        )}
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
              <div className="text-center py-12 text-muted text-sm">
                Belum ada proyek yang dapat ditampilkan di Papan Kanban.
              </div>
            ) : (
              <div className="flex gap-4 min-w-[1200px] h-[550px] items-start">
                {PROJECT_STATUSES.map((status) => {
                  const statusProjects = filteredProjects.filter(p => (p.status || 'Tahap 1: New') === status);
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
                      className={`flex flex-col w-80 h-full bg-surface-hover/30 border rounded-2xl flex-shrink-0 overflow-hidden transition-all duration-200 ${
                        isOver ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-50)]/10 ring-2 ring-[var(--color-accent-500)]/10 scale-[1.01]' : 'border-divider'
                      }`}
                    >
                      {/* Column Header */}
                      <div className={`p-4 border-b border-divider bg-surface flex items-center justify-between border-t-4 ${meta.color}`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                          <span className="font-bold text-primary text-sm tracking-tight">{meta.label}</span>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-surface-hover text-secondary border border-divider rounded-full">
                          {statusProjects.length}
                        </span>
                      </div>

                      {/* Projects List in Column */}
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
                        {statusProjects.length === 0 ? (
                          <div className="h-28 border border-dashed border-divider/60 rounded-xl flex items-center justify-center text-xs text-muted">
                            Seret proyek ke sini
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
                                className="group relative bg-surface border border-divider hover:border-divider-hover rounded-xl p-4 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01]"
                              >
                                {/* Drag Indicator Accent */}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[10px] text-muted select-none">Tarik</span>
                                  <div className="grid grid-cols-2 gap-0.5 w-3">
                                    {[...Array(6)].map((_, i) => (
                                      <div key={i} className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                    ))}
                                  </div>
                                </div>

                                <h4 className="font-bold text-primary text-sm leading-snug pr-8 line-clamp-1">
                                  {project.ptName}
                                </h4>

                                {/* Project details */}
                                <div className="space-y-1.5 mt-2">
                                  {project.address && (
                                    <div className="flex items-center gap-1.5 text-xs text-secondary">
                                      <MapPin size={12} className="shrink-0 text-muted" />
                                      <span className="line-clamp-1">{project.address}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 text-xs text-secondary">
                                    <Calendar size={12} className="shrink-0 text-muted" />
                                    <span>Masuk: {project.entryDate ? format(parseISO(project.entryDate), 'dd MMM yyyy') : '-'}</span>
                                  </div>
                                </div>

                                {/* Task progress bar */}
                                {totalPrjTasks > 0 ? (
                                  <div className="mt-3.5 space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-medium">
                                      <span className="text-secondary">{completedPrjTasks}/{totalPrjTasks} Tugas Selesai</span>
                                      <span className="text-primary font-bold">{prjProgress}%</span>
                                    </div>
                                    <div className="w-full bg-divider h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-[var(--color-accent-500)] h-full rounded-full transition-all duration-300" 
                                        style={{ width: `${prjProgress}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-3.5 text-[10px] text-muted italic">
                                    Belum ada tugas dibuat
                                  </div>
                                )}

                                {/* Warning Badges */}
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {hasRevision && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-rose-500" />
                                      Butuh Revisi
                                    </span>
                                  )}
                                  {hasNew && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-blue-500" />
                                      Tugas Baru
                                    </span>
                                  )}
                                </div>

                                {/* Quick transitions & Nav Footer */}
                                <div className="mt-4 pt-3 border-t border-divider/60 flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      title="Geser Kiri"
                                      onClick={(e) => { e.stopPropagation(); moveProjectStatus(project, 'prev'); }}
                                      disabled={PROJECT_STATUSES.indexOf(status) === 0}
                                      className="p-1 rounded-md hover:bg-surface-hover text-muted hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    >
                                      <ChevronLeft size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      title="Geser Kanan"
                                      onClick={(e) => { e.stopPropagation(); moveProjectStatus(project, 'next'); }}
                                      disabled={PROJECT_STATUSES.indexOf(status) === PROJECT_STATUSES.length - 1}
                                      className="p-1 rounded-md hover:bg-surface-hover text-muted hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => onNavigateToProject && onNavigateToProject(project.id)}
                                    className="text-xs font-semibold text-[var(--color-accent-600)] hover:text-[var(--color-accent-700)] hover:underline flex items-center gap-0.5"
                                  >
                                    Lihat Detail
                                    <ChevronRight size={12} />
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
            {/* Recent Activity Card */}
            <motion.div variants={item} className="bg-surface border border-divider rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                Riwayat Aktivitas Terbaru
              </h2>
              {recentHistory.length === 0 ? (
                <p className="text-muted text-sm py-4 text-center">Belum ada aktivitas.</p>
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
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-divider bg-surface-hover shadow-sm">
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

            {/* Tasks Needing Attention Card */}
            <motion.div variants={item} className="bg-surface border border-divider rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Tugas Perlu Perhatian</h2>
              <div className="space-y-3">
                {tasks.filter(t => t.status === 'Butuh Revisi' || t.status === 'Baru').slice(0, 5).length === 0 ? (
                   <p className="text-muted text-sm py-4 text-center">Semua tugas aman terkendali.</p>
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
