import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Building2, X, Clock, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Task } from '../types';

export const CalendarView: React.FC = () => {
  const { projects, tasks } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = getDay(monthStart);
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const getDayDetails = (day: Date) => {
    const dayProjects = projects.filter(p => p.entryDate ? isSameDay(parseISO(p.entryDate), day) : false);
    
    // Find history logs on this day
    const dayHistory: { task: Task, log: any, project: Project | undefined }[] = [];
    tasks.forEach(task => {
      task.history.forEach(log => {
        if (log.timestamp && isSameDay(parseISO(log.timestamp), day)) {
          const project = projects.find(p => p.id === task.projectId);
          dayHistory.push({ task, log, project });
        }
      });
    });

    // Sort history by time
    dayHistory.sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());

    return { dayProjects, dayHistory };
  };

  return (
    <div className="bg-surface border border-divider rounded-xl shadow-sm p-4 md:p-6 overflow-hidden flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-xl font-bold text-primary capitalize flex items-center gap-2">
          {format(currentDate, 'MMMM yyyy', { locale: id })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} className="px-2"><ChevronLeft size={20} /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hari Ini</Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth} className="px-2"><ChevronRight size={20} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-divider border border-divider rounded-lg overflow-hidden flex-1 min-h-0">
        {weekDays.map(day => (
          <div key={day} className="bg-surface-hover p-2 text-center text-xs font-semibold text-secondary sticky top-0">
            {day}
          </div>
        ))}
        
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-surface p-2 opacity-50" />
        ))}
        
        {daysInMonth.map((day) => {
          const { dayProjects, dayHistory } = getDayDetails(day);
          const isToday = isSameDay(day, new Date());
          const hasActivity = dayProjects.length > 0 || dayHistory.length > 0;
          
          return (
            <div 
              key={day.toISOString()} 
              onClick={() => hasActivity && setSelectedDate(day)}
              className={`bg-surface p-2 flex flex-col min-h-[80px] md:min-h-[100px] transition-colors ${hasActivity ? 'cursor-pointer hover:bg-surface-hover cursor-pointer' : ''} ${isToday ? 'ring-2 ring-inset ring-[var(--color-accent-500)] bg-[var(--color-accent-50)] dark:bg-[var(--color-accent-950)]/30' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--color-accent-500)] text-white' : 'text-primary'}`}>
                  {format(day, 'd')}
                </span>
                {dayHistory.length > 0 && (
                  <span className="text-[10px] bg-[var(--color-accent-100)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-300)] px-1.5 py-0.5 rounded-full font-semibold">
                    {dayHistory.length}
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                <AnimatePresence>
                  {dayProjects.map(project => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={project.id} 
                      className="text-[10px] sm:text-xs px-1.5 py-1 rounded bg-[var(--color-accent-100)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-300)] truncate flex items-center gap-1 font-medium border border-[var(--color-accent-200)] dark:border-[var(--color-accent-800)]"
                      title={project.ptName}
                    >
                      <Building2 size={10} className="shrink-0" />
                      <span className="truncate">{project.ptName}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-divider shadow-xl rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-divider bg-surface-hover/50">
                <h3 className="text-lg font-semibold text-primary">
                  {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                </h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="p-1 rounded-md hover:bg-black/10 text-secondary"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-6">
                {(() => {
                  const { dayProjects, dayHistory } = getDayDetails(selectedDate);
                  
                  return (
                    <>
                      {dayProjects.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Building2 size={14} /> Proyek Dibuat/Masuk
                          </h4>
                          <div className="space-y-2">
                            {dayProjects.map(p => (
                              <div key={p.id} className="p-3 rounded-xl border border-divider bg-surface-hover/30">
                                <div className="font-medium text-primary">{p.ptName}</div>
                                {p.address && <div className="text-sm text-secondary mt-1">{p.address}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {dayHistory.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} /> Riwayat Aktivitas & Tugas
                          </h4>
                          <div className="space-y-3">
                            {dayHistory.map(({ task, log, project }) => (
                              <div key={log.id} className="relative pl-4 border-l-2 border-[var(--color-accent-500)] py-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
                                    {format(parseISO(log.timestamp), 'HH:mm')}
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/5 dark:bg-white/10 text-secondary">
                                    {log.status}
                                  </span>
                                </div>
                                <div className="font-medium text-primary text-sm mb-0.5">
                                  {task.title}
                                </div>
                                {project && (
                                  <div className="text-xs text-secondary mb-1 flex items-center gap-1">
                                    <Building2 size={12} /> {project.ptName}
                                  </div>
                                )}
                                <div className="text-sm text-muted bg-surface-hover/50 p-2 rounded-lg border border-divider">
                                  <FileText size={12} className="inline mr-1 opacity-70" />
                                  {log.note}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

