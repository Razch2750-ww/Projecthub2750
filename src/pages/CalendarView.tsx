import React, { useState, useMemo } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  getDay, 
  parseISO, 
  startOfDay, 
  getDate, 
  differenceInDays, 
  differenceInWeeks, 
  differenceInMonths, 
  isAfter, 
  isBefore 
} from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  X, 
  Clock, 
  FileText, 
  Calendar as CalendarIcon, 
  MapPin, 
  Repeat, 
  Trash2, 
  Plus, 
  Globe, 
  Link, 
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, Task, CalendarEvent } from '../types';
import { toast } from 'sonner';

// Helper function to check if a calendar event (which can be recurring) falls on a given day
const isEventOnDay = (event: CalendarEvent, day: Date): boolean => {
  const eventDate = parseISO(event.date);
  const targetDay = startOfDay(day);
  const startDay = startOfDay(eventDate);
  
  // If target day is before the event start day, it cannot match
  if (isBefore(targetDay, startDay) && !isSameDay(targetDay, startDay)) {
    return false;
  }
  
  // If there's an until limit and the target day is after that limit, it cannot match
  if (event.recurrence?.until && isAfter(targetDay, startOfDay(parseISO(event.recurrence.until)))) {
    return false;
  }

  if (!event.isRecurring) {
    return isSameDay(startDay, targetDay);
  }

  const freq = event.recurrence?.frequency;
  const interval = event.recurrence?.interval || 1;
  const count = event.recurrence?.count;

  if (freq === 'DAILY') {
    const diff = differenceInDays(targetDay, startDay);
    if (diff < 0) return false;
    if (diff % interval !== 0) return false;
    if (count !== undefined && Math.floor(diff / interval) >= count) return false;
    return true;
  }

  if (freq === 'WEEKLY') {
    const diff = differenceInWeeks(targetDay, startDay);
    if (diff < 0) return false;
    if (diff % interval !== 0) return false;
    if (getDay(day) !== getDay(eventDate)) return false;
    if (count !== undefined && Math.floor(diff / interval) >= count) return false;
    return true;
  }

  if (freq === 'MONTHLY') {
    const diff = differenceInMonths(targetDay, startDay);
    if (diff < 0) return false;
    if (diff % interval !== 0) return false;
    if (getDate(day) !== getDate(eventDate)) return false;
    if (count !== undefined && Math.floor(diff / interval) >= count) return false;
    return true;
  }

  return isSameDay(startDay, targetDay);
};

export const CalendarView: React.FC = () => {
  const { projects, tasks, calendarEvents, addCalendarEvent, deleteCalendarEvent } = useProjects();
  const { user, accessToken, connectCalendar } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Add Event Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'Meeting' | 'Survey'>('Meeting');
  const [eventDateStr, setEventDateStr] = useState('');
  const [eventTimeStr, setEventTimeStr] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  
  // Recurrence States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceLimitType, setRecurrenceLimitType] = useState<'FOREVER' | 'UNTIL' | 'COUNT'>('FOREVER');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(5);
  
  // Google Calendar Connection Loading State
  const [isConnectingGCal, setIsConnectingGCal] = useState(false);
  const [syncToGCal, setSyncToGCal] = useState(true);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = getDay(monthStart);
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const handleConnectGCal = async () => {
    setIsConnectingGCal(true);
    try {
      const token = await connectCalendar();
      if (token) {
        toast.success('Berhasil terhubung dengan Google Calendar!');
      } else {
        toast.error('Gagal menghubungkan Google Calendar.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghubungkan Google Calendar.');
    } finally {
      setIsConnectingGCal(false);
    }
  };

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

    // Find custom meeting / survey events on this day
    const dayEvents = calendarEvents.filter(event => isEventOnDay(event, day));

    // Sort history by time
    dayHistory.sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());

    return { dayProjects, dayHistory, dayEvents };
  };

  const openAddEventModal = (date?: Date) => {
    const targetDate = date || selectedDate || new Date();
    setEventDateStr(format(targetDate, 'yyyy-MM-dd'));
    setEventTitle('');
    setEventType('Meeting');
    setEventTimeStr('');
    setEventLocation('');
    setEventNotes('');
    setIsRecurring(false);
    setRecurrenceFreq('WEEKLY');
    setRecurrenceInterval(1);
    setRecurrenceLimitType('FOREVER');
    setRecurrenceUntil('');
    setRecurrenceCount(5);
    setIsAddModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error('Judul jadwal tidak boleh kosong');
      return;
    }
    if (!eventDateStr) {
      toast.error('Tanggal wajib dipilih');
      return;
    }

    const recurrenceDetails = isRecurring ? {
      frequency: recurrenceFreq,
      interval: Number(recurrenceInterval) || 1,
      ...(recurrenceLimitType === 'COUNT' ? { count: Number(recurrenceCount) || 1 } : {}),
      ...(recurrenceLimitType === 'UNTIL' ? { until: recurrenceUntil || undefined } : {}),
    } : undefined;

    const eventPayload = {
      title: eventTitle.trim(),
      type: eventType,
      date: eventDateStr,
      time: eventTimeStr || undefined,
      location: eventLocation.trim() || undefined,
      notes: eventNotes.trim() || undefined,
      isRecurring,
      recurrence: recurrenceDetails,
    };

    // Only pass accessToken if the user is connected and wants to sync
    const activeToken = (accessToken && syncToGCal) ? accessToken : null;

    try {
      await addCalendarEvent(eventPayload, activeToken);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus jadwal ini?');
    if (!confirmed) return;

    try {
      await deleteCalendarEvent(id, accessToken);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface border border-divider rounded-xl shadow-sm p-4 md:p-6 overflow-hidden flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)]">
      
      {/* Google Calendar Link Status Header */}
      <div className="mb-4 shrink-0 bg-surface-hover/40 border border-divider rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className={`flex h-3 w-3 rounded-full ${accessToken ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-secondary'}`} />
          </div>
          <div>
            <p className="font-semibold text-primary flex items-center gap-1.5">
              Status Google Calendar: {accessToken ? 'Terhubung & Sinkron Aktif' : 'Belum Terhubung'}
            </p>
            <p className="text-[11px] text-secondary mt-0.5">
              {accessToken 
                ? 'Jadwal meeting & survey akan otomatis ditambahkan ke Google Calendar Anda.'
                : 'Hubungkan Google Calendar agar jadwal meeting & survey Anda langsung sinkron dua arah.'
              }
            </p>
            {!accessToken && (
              <p className="text-[11px] text-amber-500 font-semibold mt-1 flex flex-wrap items-center gap-1">
                ⚠️ Pastikan selalu terhubung ketika login awal agar jadwal meeting & survey tersinkron otomatis.
                {window.self !== window.top && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                    (Jika popup gagal dibuka di dalam preview tersemat, silakan buka aplikasi di <strong>Tab Baru / Open in New Tab</strong> di kanan atas)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        
        {accessToken ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
            <CheckCircle size={14} /> Terkoneksi ke {user?.email}
          </div>
        ) : (
          <Button 
            onClick={handleConnectGCal} 
            disabled={isConnectingGCal}
            size="sm"
            variant="outline"
            className="gap-1.5 font-medium border-[var(--color-accent-200)] hover:bg-[var(--color-accent-50)] text-[var(--color-accent-700)] dark:border-[var(--color-accent-800)] dark:text-[var(--color-accent-400)]"
          >
            <Globe size={14} className={isConnectingGCal ? 'animate-spin' : ''} />
            {isConnectingGCal ? 'Menghubungkan...' : 'Hubungkan ke Google Calendar'}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold text-primary capitalize flex items-center gap-2">
            {format(currentDate, 'MMMM yyyy', { locale: id })}
          </h2>
          <div className="hidden sm:flex items-center gap-3 text-xs bg-surface-hover/60 px-2.5 py-1 rounded-lg border border-divider">
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/20 border border-blue-500/30" /> <span className="text-secondary font-medium">Meeting</span></div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/30" /> <span className="text-secondary font-medium">Survey</span></div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} className="px-2"><ChevronLeft size={20} /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hari Ini</Button>
          <Button variant="outline" size="sm" onClick={handleNextMonth} className="px-2"><ChevronRight size={20} /></Button>
          <Button onClick={() => openAddEventModal()} size="sm" className="gap-1 bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)]">
            <Plus size={16} /> Jadwal Baru
          </Button>
        </div>
      </div>

      {/* Grid Calendar */}
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
          const { dayProjects, dayHistory, dayEvents } = getDayDetails(day);
          const isToday = isSameDay(day, new Date());
          const hasActivity = dayProjects.length > 0 || dayHistory.length > 0 || dayEvents.length > 0;
          
          return (
            <div 
              key={day.toISOString()} 
              onClick={() => setSelectedDate(day)}
              className={`bg-surface p-2 flex flex-col min-h-[80px] md:min-h-[100px] transition-colors cursor-pointer hover:bg-surface-hover ${isToday ? 'ring-2 ring-inset ring-[var(--color-accent-500)] bg-[var(--color-accent-50)]/30 dark:bg-[var(--color-accent-950)]/10' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs md:text-sm font-medium w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--color-accent-500)] text-white' : 'text-primary'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-1">
                  {dayHistory.length > 0 && (
                    <span className="text-[9px] bg-divider text-secondary px-1.5 py-0.5 rounded-full font-semibold" title={`${dayHistory.length} Riwayat Aktivitas`}>
                      {dayHistory.length}
                    </span>
                  )}
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] bg-[var(--color-accent-500)] text-white px-1.5 py-0.5 rounded-full font-semibold animate-pulse" title={`${dayEvents.length} Jadwal`}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-[10px] md:text-xs">
                {/* Render Projects created on this day */}
                {dayProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="px-1.5 py-0.5 rounded bg-surface border border-divider text-primary truncate flex items-center gap-1 font-medium"
                    title={project.ptName}
                  >
                    <Building2 size={10} className="shrink-0 text-secondary" />
                    <span className="truncate">{project.ptName}</span>
                  </div>
                ))}

                {/* Render Custom Calendar Events (Meetings / Surveys) */}
                {dayEvents.map(event => {
                  const isMeeting = event.type === 'Meeting';
                  return (
                    <div 
                      key={event.id} 
                      className={`px-1.5 py-0.5 rounded truncate flex items-center justify-between gap-1 font-semibold border ${
                        isMeeting 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                      title={`${event.title}${event.time ? ` (${event.time})` : ''}`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        {isMeeting ? <CalendarIcon size={10} className="shrink-0" /> : <MapPin size={10} className="shrink-0" />}
                        <span className="truncate">{event.title}</span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {event.isRecurring && <Repeat size={9} className="opacity-70" />}
                        {event.gcalEventId && <span title="Sinkron ke Google Calendar"><Link size={9} className="text-emerald-500" /></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Details Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-divider shadow-xl rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-divider bg-surface-hover/50">
                <div>
                  <h3 className="text-lg font-bold text-primary">
                    {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: id })}
                  </h3>
                  <p className="text-xs text-secondary">Aktivitas dan Agenda Drafter Tracker</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => {
                      openAddEventModal(selectedDate);
                    }} 
                    size="sm" 
                    className="gap-1 bg-[var(--color-accent-600)] text-white"
                  >
                    <Plus size={14} /> Tambah Jadwal
                  </Button>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="p-1 rounded-md hover:bg-black/10 text-secondary"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-6">
                {(() => {
                  const { dayProjects, dayHistory, dayEvents } = getDayDetails(selectedDate);
                  
                  if (dayProjects.length === 0 && dayHistory.length === 0 && dayEvents.length === 0) {
                    return (
                      <div className="text-center py-12 text-secondary space-y-3">
                        <CalendarIcon size={40} className="mx-auto opacity-30 text-secondary" />
                        <div>
                          <p className="font-semibold">Tidak ada agenda hari ini</p>
                          <p className="text-xs">Klik tombol &quot;Tambah Jadwal&quot; untuk membuat meeting atau survey.</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Meetings & Surveys */}
                      {dayEvents.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                            <CalendarIcon size={14} /> Jadwal Meeting & Survey ({dayEvents.length})
                          </h4>
                          <div className="space-y-3">
                            {dayEvents.map(event => {
                              const isMeeting = event.type === 'Meeting';
                              return (
                                <div 
                                  key={event.id} 
                                  className={`p-3.5 rounded-xl border flex justify-between items-start gap-4 ${
                                    isMeeting 
                                      ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/15' 
                                      : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15'
                                  }`}
                                >
                                  <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isMeeting 
                                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {event.type}
                                      </span>
                                      {event.isRecurring && (
                                        <span className="bg-divider text-secondary px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                                          <Repeat size={10} /> Repetitif
                                        </span>
                                      )}
                                      {event.gcalEventId && (
                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border border-emerald-500/20">
                                          <Link size={10} /> Google Calendar
                                        </span>
                                      )}
                                    </div>

                                    <h5 className="font-bold text-primary text-base min-w-0 break-words">{event.title}</h5>

                                    <div className="space-y-1 text-xs text-secondary">
                                      {event.time && (
                                        <div className="flex items-center gap-1.5">
                                          <Clock size={12} className="opacity-70" />
                                          <span>Waktu: <strong>{event.time}</strong></span>
                                        </div>
                                      )}
                                      {event.location && (
                                        <div className="flex items-center gap-1.5">
                                          <MapPin size={12} className="opacity-70" />
                                          <span className="truncate">Lokasi: <strong>{event.location}</strong></span>
                                        </div>
                                      )}
                                      {event.notes && (
                                        <div className="flex items-start gap-1.5 bg-surface/50 p-2 rounded-lg border border-divider/50 mt-1">
                                          <Info size={12} className="opacity-70 mt-0.5 shrink-0" />
                                          <p className="whitespace-pre-wrap">{event.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <button 
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="p-1.5 text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                    title="Hapus Agenda"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Projects Created */}
                      {dayProjects.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Building2 size={14} /> Proyek Dibuat ({dayProjects.length})
                          </h4>
                          <div className="space-y-2">
                            {dayProjects.map(p => (
                              <div key={p.id} className="p-3 rounded-xl border border-divider bg-surface-hover/30">
                                <div className="font-semibold text-primary">{p.ptName}</div>
                                {p.address && <div className="text-xs text-secondary mt-1">{p.address}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Activities / Tasks Logs */}
                      {dayHistory.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} /> Riwayat Aktivitas & Tugas ({dayHistory.length})
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
                                <div className="font-semibold text-primary text-sm mb-0.5">
                                  {task.title}
                                </div>
                                {project && (
                                  <div className="text-xs text-secondary mb-1 flex items-center gap-1">
                                    <Building2 size={12} /> {project.ptName}
                                  </div>
                                )}
                                <div className="text-xs text-secondary bg-surface-hover/50 p-2 rounded-lg border border-divider max-w-full overflow-hidden">
                                  <FileText size={12} className="inline mr-1 opacity-70 shrink-0" />
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

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-divider shadow-2xl rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-divider bg-surface-hover/50">
                <div>
                  <h3 className="text-lg font-bold text-primary">Tambah Jadwal Baru</h3>
                  <p className="text-xs text-secondary">Meeting atau survey pekerjaan drafter</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-md hover:bg-black/10 text-secondary"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs md:text-sm">
                
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-primary">Judul Agenda / Nama PT</label>
                  <input 
                    type="text" 
                    value={eventTitle}
                    onChange={e => setEventTitle(e.target.value)}
                    placeholder="Contoh: Survey Cold Room PT Maspion"
                    className="flex h-9 w-full rounded-lg border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                    required
                  />
                </div>

                {/* Event Type Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-primary">Tipe Agenda</label>
                    <select
                      value={eventType}
                      onChange={e => setEventType(e.target.value as 'Meeting' | 'Survey')}
                      className="flex h-9 w-full rounded-lg border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Survey">Survey</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-primary">Tanggal</label>
                    <input 
                      type="date" 
                      value={eventDateStr}
                      onChange={e => setEventDateStr(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                      required
                    />
                  </div>
                </div>

                {/* Time & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-primary">Waktu (Opsional)</label>
                    <input 
                      type="time" 
                      value={eventTimeStr}
                      onChange={e => setEventTimeStr(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-primary">Lokasi (Opsional)</label>
                    <input 
                      type="text" 
                      value={eventLocation}
                      onChange={e => setEventLocation(e.target.value)}
                      placeholder="Contoh: Ruang Rapat Lt. 2 / Site Project"
                      className="flex h-9 w-full rounded-lg border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-primary">Catatan Detail / Notes (Opsional)</label>
                  <textarea 
                    value={eventNotes}
                    onChange={e => setEventNotes(e.target.value)}
                    placeholder="Tulis detail pembahasan, hal yang perlu dibawa, dll..."
                    rows={2}
                    className="flex w-full rounded-lg border border-divider bg-surface px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                  />
                </div>

                {/* Google Calendar Sync Checkbox */}
                {accessToken ? (
                  <div className="flex items-center gap-2 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <input 
                      type="checkbox" 
                      id="syncGCal" 
                      checked={syncToGCal}
                      onChange={e => setSyncToGCal(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="syncGCal" className="font-medium text-emerald-700 dark:text-emerald-400 cursor-pointer select-none">
                      Sinkronisasikan ke Google Calendar Saya
                    </label>
                  </div>
                ) : (
                  <div className="bg-surface-hover/50 p-2.5 rounded-lg border border-divider text-[11px] text-secondary flex items-start gap-1.5">
                    <HelpCircle size={14} className="shrink-0 mt-0.5 text-secondary" />
                    <span>Google Calendar belum terhubung. Jadwal ini hanya akan disimpan secara lokal di Drafter Tracker.</span>
                  </div>
                )}

                {/* Recurrence (Repetitive) Settings */}
                <div className="bg-surface-hover/30 p-3 rounded-xl border border-divider space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="isRecurring" 
                      checked={isRecurring}
                      onChange={e => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded border-divider text-[var(--color-accent-600)] focus:ring-[var(--color-accent-500)]"
                    />
                    <label htmlFor="isRecurring" className="font-bold text-primary cursor-pointer select-none">
                      Buat Jadwal Repetitif (Berulang)
                    </label>
                  </div>

                  {isRecurring && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-2 border-t border-divider text-xs"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-semibold text-secondary">Frekuensi</label>
                          <select
                            value={recurrenceFreq}
                            onChange={e => setRecurrenceFreq(e.target.value as any)}
                            className="flex h-8 w-full rounded border border-divider bg-surface px-2 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-600)]"
                          >
                            <option value="DAILY">Harian</option>
                            <option value="WEEKLY">Mingguan</option>
                            <option value="MONTHLY">Bulanan</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-secondary">Setiap (Interval)</label>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              min="1"
                              value={recurrenceInterval}
                              onChange={e => setRecurrenceInterval(Number(e.target.value) || 1)}
                              className="flex h-8 w-16 rounded border border-divider bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-600)] text-center"
                            />
                            <span className="text-secondary">
                              {recurrenceFreq === 'DAILY' ? 'Hari' : recurrenceFreq === 'WEEKLY' ? 'Minggu' : 'Bulan'} sekali
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recurrence Limit/End Type */}
                      <div className="space-y-1.5">
                        <label className="font-semibold text-secondary block">Berakhir Pada</label>
                        <div className="flex items-center gap-4 mt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="radio" 
                              name="limitType"
                              checked={recurrenceLimitType === 'FOREVER'}
                              onChange={() => setRecurrenceLimitType('FOREVER')}
                              className="text-[var(--color-accent-600)]"
                            />
                            <span>Selamanya</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="radio" 
                              name="limitType"
                              checked={recurrenceLimitType === 'UNTIL'}
                              onChange={() => setRecurrenceLimitType('UNTIL')}
                              className="text-[var(--color-accent-600)]"
                            />
                            <span>Hingga Tanggal</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="radio" 
                              name="limitType"
                              checked={recurrenceLimitType === 'COUNT'}
                              onChange={() => setRecurrenceLimitType('COUNT')}
                              className="text-[var(--color-accent-600)]"
                            />
                            <span>Sebanyak</span>
                          </label>
                        </div>

                        {recurrenceLimitType === 'UNTIL' && (
                          <div className="pt-2">
                            <input 
                              type="date" 
                              value={recurrenceUntil}
                              onChange={e => setRecurrenceUntil(e.target.value)}
                              className="flex h-8 w-full rounded border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-600)]"
                              required
                            />
                          </div>
                        )}

                        {recurrenceLimitType === 'COUNT' && (
                          <div className="pt-2 flex items-center gap-2">
                            <input 
                              type="number" 
                              min="1"
                              value={recurrenceCount}
                              onChange={e => setRecurrenceCount(Number(e.target.value) || 1)}
                              className="flex h-8 w-20 rounded border border-divider bg-surface px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-600)] text-center"
                              required
                            />
                            <span className="text-secondary">Pertemuan/Kejadian</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2 border-t border-divider">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)]"
                  >
                    Simpan Jadwal
                  </Button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
