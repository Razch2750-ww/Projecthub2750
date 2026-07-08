import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Project, Task, TaskStatus, HistoryEntry, HistoryFile, RoomType, PanelType, RoomDetails, ProjectLocation, ProjectStatus, CalendarEvent, ProjectDocument, ProjectActivity } from '../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { db, auth } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (operationType === OperationType.LIST) {
    // Fail gracefully for read/list operations to prevent runtime crashes
    console.warn(`Firestore read warning for path "${path}". Operating in offline mode.`);
    return;
  }
  throw new Error(JSON.stringify(errInfo));
}

export interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  addProject: (ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string, documents?: ProjectDocument[], activities?: ProjectActivity[], description?: string, isArchived?: boolean, completedAt?: string }) => void;
  updateProject: (id: string, ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string, documents?: ProjectDocument[], activities?: ProjectActivity[], description?: string, isArchived?: boolean, completedAt?: string }, quiet?: boolean) => void;
  deleteProject: (id: string) => void;
  addTask: (projectId: string, title: string, isAdditional?: boolean, locationId?: string, assigneeId?: string, assigneeRole?: 'Drafting' | 'Review') => void;
  updateTask: (id: string, title: string, isAdditional: boolean, assigneeId?: string, assigneeRole?: 'Drafting' | 'Review') => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus, note?: string, files?: HistoryFile[]) => void;
  updateHistoryLog: (taskId: string, logId: string, note: string) => void;
  deleteHistoryLog: (taskId: string, logId: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>, token?: string | null) => Promise<void>;
  deleteCalendarEvent: (id: string, token?: string | null) => Promise<void>;
  restoreFromBackup: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const generateBQText = (project: Project): string => {
  const ptNameStr = project.ptName || 'Nama PT';
  let bqText = `berikut List Kebutuhan Material *${ptNameStr}* ,\n\n`;

  let totalCB = 0;
  let totalAlum = 0;
  let totalBesi = 0;

  project.locations?.forEach(loc => {
    loc.rooms?.forEach((room, index) => {
      const l = parseFloat(room.length || '0') / 1000;
      const w = parseFloat(room.width || '0') / 1000;
      const h = parseFloat(room.height || '0') / 1000;

      const panelThickness = room.panelThickness || '100mm';
      const panelType = room.panelType || 'PU';
      const thicknessNum = panelThickness.replace(/[^0-9.]/g, '');
      const thicknessUnit = panelThickness.replace(/[0-9.]/g, '') || 'mm';
      const thicknessM = (parseFloat(thicknessNum) || 0) / 1000;
      const lebarPanelNum = panelType === 'PIR' ? 1.16 : 1.2;
      const lebarPanelStr = panelType === 'PIR' ? '1,16' : '1,2';
      
      let wallLembar = 0;
      let floorLembar = 0;
      let roofLembar = 0;
      let panjangLantai = 0;
      let panjangAtap = 0;
      let tinggiDinding = 0;
      const dWidth = room.doorWidth || '1200';
      const dHeight = room.doorHeight || '2000';
      const dType = room.doorType || 'Swing Door';
      const dQty = room.doorQty || '1';

      if (l > 0 && w > 0 && h > 0) {
        const keliling = 2 * l + 2 * w;
        wallLembar = Math.ceil(keliling / lebarPanelNum);
        
        tinggiDinding = panelType === 'PIR' ? h - thicknessM : h;
        panjangAtap = w;
        panjangLantai = w - (thicknessM * 2);

        floorLembar = Math.ceil(l / lebarPanelNum);
        roofLembar = floorLembar;

        const colorbondLength = (4 * h) + (2 * l) + (2 * w);
        totalCB += Math.ceil(colorbondLength / 3);
        const alumuniumLength = (4 * h) + (4 * l) + (4 * w);
        totalAlum += Math.ceil(alumuniumLength / 6);
        const ironLength = (2 * l) + (2 * w);
        totalBesi += Math.ceil(ironLength / 6);
      }

      const formatNumberStr = (num: number) => {
        if (num <= 0) return '0';
        return Number(num.toFixed(4)).toString().replace('.', ',');
      };

      let floorSuffix = `${panelType} Slab`;
      const floorInput = (room.floorType || '').toLowerCase();
      if (floorInput.includes('insul')) {
        floorSuffix = 'Insulation Panel';
      } else if (floorInput.includes('concrete') || floorInput.includes('beton') || floorInput.includes('cor')) {
        floorSuffix = `${panelType} Slab`;
      }

      bqText += `*[${room.type || `Ruangan ${index+1}`}]*\n`;
      bqText += `Insulation Panel (Dinding, Lantai & Atap) & Door - thickness ${thicknessNum}${thicknessUnit}\n`;
      bqText += `Dinding         \t:  ${wallLembar} lembar (lebar ${lebarPanelStr}m x panjang ${formatNumberStr(tinggiDinding)} m)\n`;
      bqText += `Lantai\t \t:   ${floorLembar} lembar   (lebar ${lebarPanelStr}m x panjang ${formatNumberStr(panjangLantai)} m) - ${floorSuffix}\n`;
      bqText += `Atap\t \t:   ${roofLembar} lembar   (lebar ${lebarPanelStr}m x panjang ${formatNumberStr(panjangAtap)} m)\n`;
      bqText += `Door \t\t:  ${dWidth} x ${dHeight} ( ${dType} )  ${dQty} unit\n\n`;
    });
  });

  bqText += `Siku CB = ${totalCB} batang ( 5x10cm )\n`;
  bqText += `Siku Alumunium = ${totalAlum} batang\n`;
  bqText += `Siku Besi = ${totalBesi} batang\n`;
  bqText += `Mohon untuk di cek kembali, terimakasih`;

  return bqText;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize data from local storage if firestore is empty, or migrate
  useEffect(() => {
    let unsubscribeProjects: () => void;
    let unsubscribeTasks: () => void;
    let unsubscribeEvents: () => void;

    // First time load local storage
    const syncLocalToCloud = async () => {
        try {
            const localP = localStorage.getItem('drafter_projects');
            const localT = localStorage.getItem('drafter_tasks');
            
            if (localP) {
                const parsedP = JSON.parse(localP);
                if (parsedP.length > 0) {
                     // Keep a secure backup in localStorage before attempting the cloud write
                     localStorage.setItem('drafter_projects_backup', localP);
                     for (const p of parsedP) {
                         await setDoc(doc(db, 'projects', p.id), p, { merge: true });
                     }
                }
                localStorage.removeItem('drafter_projects');
            }

            if (localT) {
                const parsedT = JSON.parse(localT);
                if (parsedT.length > 0) {
                     // Keep a secure backup in localStorage before attempting the cloud write
                     localStorage.setItem('drafter_tasks_backup', localT);
                     for (const t of parsedT) {
                         await setDoc(doc(db, 'tasks', t.id), t, { merge: true });
                     }
                }
                localStorage.removeItem('drafter_tasks');
            }
        } catch (error) {
            console.error("Error migrating local storage to Firestore", error);
        }
    };

    syncLocalToCloud().then(() => {
        unsubscribeProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
            const p: Project[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Project;
                if (!data.locations || data.locations.length === 0) {
                    if (data.address || (data.rooms && data.rooms.length > 0)) {
                        data.locations = [{ id: crypto.randomUUID(), name: 'Utama', address: data.address || '', rooms: data.rooms || [] }];
                    } else {
                        data.locations = [];
                    }
                }
                p.push(data);
            });
            setProjects(p);
        }, (error) => {
            console.error("Error fetching projects", error);
            handleFirestoreError(error, OperationType.LIST, 'projects');
        });

        unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
            const t: Task[] = [];
            snapshot.forEach(doc => {
                t.push(doc.data() as Task);
            });
            setTasks(t);
        }, (error) => {
            console.error("Error fetching tasks", error);
            handleFirestoreError(error, OperationType.LIST, 'tasks');
        });

        unsubscribeEvents = onSnapshot(collection(db, 'calendar_events'), (snapshot) => {
            const evs: CalendarEvent[] = [];
            snapshot.forEach(doc => {
                evs.push(doc.data() as CalendarEvent);
            });
            setCalendarEvents(evs);
        }, (error) => {
            console.error("Error fetching calendar events", error);
            handleFirestoreError(error, OperationType.LIST, 'calendar_events');
        });
        
        setLoading(false);
    });

    return () => {
        if (unsubscribeProjects) unsubscribeProjects();
        if (unsubscribeTasks) unsubscribeTasks();
        if (unsubscribeEvents) unsubscribeEvents();
    };
  }, []);

  const checkAndAutoUpdateProjectStatus = async (projectId: string, currentTasks: Task[]) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    if (project.status === 'Paused' || project.status === 'Cancelled') return;
    
    const projectTasks = currentTasks.filter(t => t.projectId === projectId);
    let newStatus: ProjectStatus = project.status || 'Tahap 1: New';
    
    if (projectTasks.length > 0) {
        if (projectTasks.every(t => t.status === 'Selesai' || t.status === 'Approved' || t.status === 'Signed')) {
            newStatus = 'Tahap 4: Pre Construction';
        } else if (projectTasks.some(t => t.status === 'Bekerja' || t.status === 'Butuh Revisi' || t.status === 'Revisi Selesai' || t.status === 'Lanjut Next Step' || t.status === 'Approved' || t.status === 'Signed')) {
            newStatus = 'Tahap 2: Design and Revision';
        } else if (projectTasks.every(t => t.status === 'Baru')) {
            newStatus = 'Tahap 1: New';
        }
    }
    
    if (newStatus !== project.status) {
       const completedAt = newStatus === 'Tahap 6: Completed' ? new Date().toISOString() : undefined;
       updateProject(projectId, project.ptName, project.address, project.entryDate, { status: newStatus, completedAt }, true);
    }
  };

  const addProject = async (ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string, documents?: ProjectDocument[], activities?: ProjectActivity[], description?: string, isArchived?: boolean, completedAt?: string }) => {
    const id = crypto.randomUUID();
    const newProject: Project = {
      id,
      ptName,
      status: details?.status || 'Tahap 1: New',
      address,
      entryDate,
      ...details,
      createdAt: new Date().toISOString()
    };
    const cleanProject = JSON.parse(JSON.stringify(newProject));
    try {
      await setDoc(doc(db, 'projects', id), cleanProject);
      toast.success('Proyek baru ditambahkan');
    } catch (e) {
      toast.error('Gagal menambahkan proyek');
      handleFirestoreError(e, OperationType.WRITE, 'projects/' + id);
    }
  };

  const updateProject = async (id: string, ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string, documents?: ProjectDocument[], activities?: ProjectActivity[], description?: string, isArchived?: boolean, completedAt?: string }, quiet: boolean = false) => {
    const existing = projects.find(p => p.id === id);
    if (!existing) return;
    const updated = { ...existing, ptName, address, entryDate, ...details };
    // JSON parse/stringify is a quick way to strip undefined values which Firebase rejects
    const cleanUpdated = JSON.parse(JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'projects', id), cleanUpdated);
      if (!quiet) toast.success('Proyek berhasil diperbarui');
    } catch (e) {
      console.error(e);
      if (!quiet) toast.error('Gagal memperbarui proyek');
      handleFirestoreError(e, OperationType.WRITE, 'projects/' + id);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      // Delete associated tasks
      const relatedTasks = tasks.filter(t => t.projectId === id);
      for (const t of relatedTasks) {
          await deleteDoc(doc(db, 'tasks', t.id));
      }
      toast.success('Proyek dihapus');
    } catch (e) {
      toast.error('Gagal menghapus proyek');
      handleFirestoreError(e, OperationType.DELETE, 'projects/' + id);
    }
  };

  const addTask = async (projectId: string, title: string, isAdditional: boolean = false, locationId?: string, assigneeId?: string, assigneeRole?: 'Drafting' | 'Review') => {
    const project = projects.find(p => p.id === projectId);
    let initialNote = 'Tugas dibuat';

    if (title.toLowerCase().includes('bq') && project) {
      initialNote = generateBQText(project);
    }

    const id = crypto.randomUUID();
    const newTask: Task = {
      id,
      projectId,
      locationId,
      title,
      status: 'Baru',
      history: [{
        id: crypto.randomUUID(),
        status: 'Baru',
        note: initialNote,
        timestamp: new Date().toISOString()
      }],
      isAdditional,
      createdAt: new Date().toISOString(),
      assigneeId,
      assigneeRole
    };
    const cleanTask = JSON.parse(JSON.stringify(newTask));
    try {
      await setDoc(doc(db, 'tasks', id), cleanTask);
      toast.success('Tugas baru ditambahkan');
      checkAndAutoUpdateProjectStatus(projectId, [...tasks, newTask]);
    } catch(e) {
      toast.error('Gagal menambah tugas');
      handleFirestoreError(e, OperationType.WRITE, 'tasks/' + id);
    }
  };

  const updateTask = async (id: string, title: string, isAdditional: boolean, assigneeId?: string, assigneeRole?: 'Drafting' | 'Review') => {
    const existing = tasks.find(t => t.id === id);
    if (!existing) return;
    const updated = { ...existing, title, isAdditional, assigneeId, assigneeRole };
    const cleanUpdated = JSON.parse(JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'tasks', id), cleanUpdated);
      toast.success('Tugas berhasil diperbarui');
    } catch(e) {
      toast.error('Gagal memperbarui tugas');
      handleFirestoreError(e, OperationType.WRITE, 'tasks/' + id);
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('Tugas dihapus');
      if (task) {
          checkAndAutoUpdateProjectStatus(task.projectId, tasks.filter(t => t.id !== id));
      }
    } catch(e) {
      toast.error('Gagal menghapus tugas');
      handleFirestoreError(e, OperationType.DELETE, 'tasks/' + id);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus, note?: string, files?: HistoryFile[]) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let newHistory = task.history;
    if (note || task.status !== newStatus || (files && files.length > 0)) {
        newHistory = [...task.history, {
            id: crypto.randomUUID(),
            status: newStatus,
            note: note || `Status diubah ke ${newStatus}`,
            timestamp: new Date().toISOString(),
            files: files || []
        }];
    }

    const updated = {
      ...task,
      status: newStatus,
      history: newHistory
    };

    const cleanUpdated = JSON.parse(JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'tasks', taskId), cleanUpdated);
      if (task.status !== newStatus) {
         toast.success(`Status diperbarui ke: ${newStatus}`);
      } else if (note) {
         toast.success('Log ditambahkan');
      }
      checkAndAutoUpdateProjectStatus(task.projectId, tasks.map(t => t.id === taskId ? updated : t));
    } catch(e) {
      toast.error('Gagal mengupdate status');
      handleFirestoreError(e, OperationType.WRITE, 'tasks/' + taskId);
    }
  };

  const updateHistoryLog = async (taskId: string, logId: string, note: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedHistory = task.history.map(h => h.id === logId ? { ...h, note } : h);
    const cleanUpdated = JSON.parse(JSON.stringify({ ...task, history: updatedHistory }));
    try {
      await setDoc(doc(db, 'tasks', taskId), cleanUpdated);
      toast.success('Log berhasil diperbarui');
    } catch(e) {
      toast.error('Gagal memperbarui log');
      handleFirestoreError(e, OperationType.WRITE, 'tasks/' + taskId);
    }
  };

  const deleteHistoryLog = async (taskId: string, logId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedHistory = task.history.filter(h => h.id !== logId);
    const cleanUpdated = JSON.parse(JSON.stringify({ ...task, history: updatedHistory }));
    try {
      await setDoc(doc(db, 'tasks', taskId), cleanUpdated);
      toast.success('Log dihapus');
    } catch(e) {
      toast.error('Gagal menghapus log');
      handleFirestoreError(e, OperationType.WRITE, 'tasks/' + taskId);
    }
  };

  const syncEventToGoogleCalendar = async (event: CalendarEvent, token: string): Promise<string | null> => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const eventDate = event.date; // YYYY-MM-DD
      const startDateTime = event.time ? `${eventDate}T${event.time}:00` : null;
      
      const body: any = {
        summary: `[${event.type === 'Meeting' ? 'Meeting' : 'Survey'}] ${event.title}`,
        description: event.notes || '',
        location: event.location || '',
      };

      if (startDateTime) {
        body.start = {
          dateTime: startDateTime,
          timeZone,
        };
        const [h, m] = event.time!.split(':').map(Number);
        const endHour = (h + 1) % 24;
        const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        body.end = {
          dateTime: `${eventDate}T${endTimeStr}`,
          timeZone,
        };
      } else {
        body.start = { date: eventDate };
        body.end = { date: eventDate };
      }

      if (event.isRecurring && event.recurrence) {
        let rrule = `RRULE:FREQ=${event.recurrence.frequency}`;
        if (event.recurrence.interval) {
          rrule += `;INTERVAL=${event.recurrence.interval}`;
        }
        if (event.recurrence.count) {
          rrule += `;COUNT=${event.recurrence.count}`;
        } else if (event.recurrence.until) {
          const cleanUntil = event.recurrence.until.replace(/-/g, '');
          rrule += `;UNTIL=${cleanUntil}T235959Z`;
        }
        body.recurrence = [rrule];
      }

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Calendar error response:', errorData);
        throw new Error(errorData.error?.message || 'Gagal sinkronisasi Google Calendar');
      }

      const data = await response.json();
      return data.id || null;
    } catch (e) {
      console.error('Error syncEventToGoogleCalendar:', e);
      throw e;
    }
  };

  const deleteEventFromGoogleCalendar = async (gcalEventId: string, token: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      if (!response.ok) {
        console.error('Failed to delete Google Calendar event:', await response.text());
      }
    } catch (e) {
      console.error('Error deleteEventFromGoogleCalendar:', e);
    }
  };

  const addCalendarEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt'>, token?: string | null) => {
    const id = crypto.randomUUID();
    const newEvent: CalendarEvent = {
      ...event,
      id,
      createdAt: new Date().toISOString()
    };

    if (token) {
      try {
        const gcalEventId = await syncEventToGoogleCalendar(newEvent, token);
        if (gcalEventId) {
          newEvent.gcalEventId = gcalEventId;
        }
      } catch (gcalErr) {
        console.error('Gagal sinkron ke Google Calendar:', gcalErr);
        toast.error('Gagal sinkron ke Google Calendar, menyimpan lokal saja.');
      }
    }

    const cleanEvent = JSON.parse(JSON.stringify(newEvent));
    try {
      await setDoc(doc(db, 'calendar_events', id), cleanEvent);
      toast.success('Jadwal baru berhasil ditambahkan');
    } catch (e) {
      toast.error('Gagal menyimpan jadwal');
      handleFirestoreError(e, OperationType.WRITE, 'calendar_events/' + id);
    }
  };

  const deleteCalendarEvent = async (id: string, token?: string | null) => {
    const event = calendarEvents.find(e => e.id === id);
    if (!event) return;

    if (token && event.gcalEventId) {
      const confirmed = window.confirm('Apakah Anda ingin menghapus jadwal ini juga dari Google Calendar?');
      if (confirmed) {
        try {
          await deleteEventFromGoogleCalendar(event.gcalEventId, token);
        } catch (gcalErr) {
          console.error('Error deleting from Google Calendar:', gcalErr);
        }
      }
    }

    try {
      await deleteDoc(doc(db, 'calendar_events', id));
      toast.success('Jadwal berhasil dihapus');
    } catch (e) {
      toast.error('Gagal menghapus jadwal');
      handleFirestoreError(e, OperationType.DELETE, 'calendar_events/' + id);
    }
  };

  const restoreFromBackup = async () => {
    try {
      const localP = localStorage.getItem('drafter_projects_backup');
      const localT = localStorage.getItem('drafter_tasks_backup');
      
      let countP = 0;
      let countT = 0;
      
      if (localP) {
          const parsedP = JSON.parse(localP);
          for (const p of parsedP) {
              const cleanP = JSON.parse(JSON.stringify(p));
              await setDoc(doc(db, 'projects', p.id), cleanP, { merge: true });
              countP++;
          }
      }

      if (localT) {
          const parsedT = JSON.parse(localT);
          for (const t of parsedT) {
              const cleanT = JSON.parse(JSON.stringify(t));
              await setDoc(doc(db, 'tasks', t.id), cleanT, { merge: true });
              countT++;
          }
      }
      
      if (countP > 0 || countT > 0) {
        toast.success(`Berhasil memulihkan ${countP} proyek dan ${countT} tugas dari cadangan lokal.`);
      } else {
        toast.info("Tidak ada data cadangan yang ditemukan di browser ini.");
      }
    } catch (e) {
      console.error("Gagal memulihkan dari cadangan", e);
      toast.error("Gagal memulihkan cadangan.");
    }
  };

  const notifiedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (loading || !calendarEvents || calendarEvents.length === 0) return;

    const now = new Date();
    calendarEvents.forEach((ev) => {
      try {
        const [year, month, day] = ev.date.split('-').map(Number);
        const eventDateTime = new Date(year, month - 1, day);
        if (ev.time) {
          const [hours, minutes] = ev.time.split(':').map(Number);
          eventDateTime.setHours(hours, minutes, 0, 0);
        } else {
          eventDateTime.setHours(9, 0, 0, 0);
        }

        const diffMs = eventDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // If the event starts in the next 24 hours and is not in the past (allow brief buffer for ongoing events)
        if (diffHours >= -1 && diffHours <= 24) {
          if (!notifiedEventsRef.current.has(ev.id)) {
            const timeStr = ev.time ? ` pukul ${ev.time}` : '';
            toast.warning(`Tenggat Dekat: Jadwal "${ev.title}" (${ev.type === 'Meeting' ? 'Rapat' : 'Survei'}) akan berlangsung dalam 24 jam ke depan (${format(eventDateTime, 'dd MMM yyyy')}${timeStr})!`, {
              id: `deadline-alert-${ev.id}`,
              duration: 12000,
            });
            notifiedEventsRef.current.add(ev.id);
          }
        }
      } catch (err) {
        console.error('Error parsing calendar event date:', err);
      }
    });
  }, [calendarEvents, loading]);

  if (loading) return null;

  return (
    <ProjectContext.Provider value={{
      projects, tasks, calendarEvents, addProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask, updateTaskStatus,
      updateHistoryLog, deleteHistoryLog, addCalendarEvent, deleteCalendarEvent,
      restoreFromBackup
    }}>
      {children}
    </ProjectContext.Provider>
  );
};


export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
