import React from 'react';
import { useProjects } from '../context/ProjectContext';
import { StatusBadge } from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { FolderKanban, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface DashboardProps {
  onNavigateToProject?: (projectId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToProject }) => {
  const { projects, tasks } = useProjects();

  const activeProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Selesai').length;
  const revisionTasks = tasks.filter(t => t.status === 'Butuh Revisi').length;

  const recentHistory = [...tasks]
    .flatMap(t => t.history.map(h => ({ ...h, taskTitle: t.title, projectName: projects.find(p => p.id === t.projectId)?.ptName, projectId: t.projectId })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Proyek Aktif', value: activeProjects, icon: FolderKanban, color: 'text-blue-500' },
          { label: 'Total Tugas', value: totalTasks, icon: Clock, color: 'text-emerald-500' },
          { label: 'Butuh Revisi', value: revisionTasks, icon: AlertCircle, color: 'text-rose-500' },
          { label: 'Tugas Selesai', value: completedTasks, icon: CheckCircle2, color: 'text-[var(--color-accent-500)]' }
        ].map((stat, i) => (
          <motion.div key={i} variants={item} className="p-6 bg-surface border border-divider rounded-xl shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-lg bg-surface-hover ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted">{stat.label}</p>
              <h3 className="text-2xl font-bold text-primary mt-1">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item} className="bg-surface border border-divider rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            Riwayat Aktivitas Terbaru
          </h2>
          {recentHistory.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">Belum ada aktivitas.</p>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-divider before:to-transparent">
              {recentHistory.map((hist, i) => (
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

        <motion.div variants={item} className="bg-surface border border-divider rounded-xl shadow-sm p-6">
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
                    className={`p-4 rounded-lg border border-divider hover:bg-surface-hover transition-colors flex items-start justify-between gap-4 ${onNavigateToProject ? 'cursor-pointer' : ''}`}
                    onClick={() => onNavigateToProject && onNavigateToProject(task.projectId)}
                  >
                    <div>
                      <h4 className="font-medium text-primary text-sm">{task.title}</h4>
                      <p className="text-xs text-secondary mt-1">{project?.ptName}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
