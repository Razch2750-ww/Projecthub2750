import React, { createContext, useContext, useEffect, useState } from 'react';
import { Project, Task, TaskStatus, HistoryEntry, HistoryFile, RoomType, PanelType, RoomDetails, ProjectLocation, ProjectStatus } from '../types';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface ProjectContextType {
  projects: Project[];
  tasks: Task[];
  addProject: (ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string }) => void;
  updateProject: (id: string, ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string }, quiet?: boolean) => void;
  deleteProject: (id: string) => void;
  addTask: (projectId: string, title: string, isAdditional?: boolean, locationId?: string) => void;
  updateTask: (id: string, title: string, isAdditional: boolean) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus, note?: string, files?: HistoryFile[]) => void;
  updateHistoryLog: (taskId: string, logId: string, note: string) => void;
  deleteHistoryLog: (taskId: string, logId: string) => void;
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
  const [loading, setLoading] = useState(true);

  // Initialize data from local storage if firestore is empty, or migrate
  useEffect(() => {
    let unsubscribeProjects: () => void;
    let unsubscribeTasks: () => void;

    // First time load local storage
    const syncLocalToCloud = async () => {
        const localP = localStorage.getItem('drafter_projects');
        const localT = localStorage.getItem('drafter_tasks');
        
        if (localP) {
            const parsedP = JSON.parse(localP);
            if (parsedP.length > 0) {
                 for (const p of parsedP) {
                     await setDoc(doc(db, 'projects', p.id), p, { merge: true });
                 }
            }
            localStorage.removeItem('drafter_projects');
        }

        if (localT) {
            const parsedT = JSON.parse(localT);
            if (parsedT.length > 0) {
                for (const t of parsedT) {
                    await setDoc(doc(db, 'tasks', t.id), t, { merge: true });
                }
            }
            localStorage.removeItem('drafter_tasks');
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
        });

        unsubscribeTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
            const t: Task[] = [];
            snapshot.forEach(doc => {
                t.push(doc.data() as Task);
            });
            setTasks(t);
        }, (error) => {
            console.error("Error fetching tasks", error);
        });
        
        setLoading(false);
    });

    return () => {
        if (unsubscribeProjects) unsubscribeProjects();
        if (unsubscribeTasks) unsubscribeTasks();
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
            newStatus = 'Tahap 6: Completed';
        } else if (projectTasks.some(t => t.status === 'Bekerja' || t.status === 'Butuh Revisi' || t.status === 'Revisi Selesai' || t.status === 'Lanjut Next Step' || t.status === 'Approved' || t.status === 'Signed')) {
            newStatus = 'Tahap 2: Design and Revision';
        } else if (projectTasks.every(t => t.status === 'Baru')) {
            newStatus = 'Tahap 1: New';
        }
    }
    
    if (newStatus !== project.status) {
       updateProject(projectId, project.ptName, project.address, project.entryDate, { status: newStatus }, true);
    }
  };

  const addProject = async (ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string }) => {
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
    try {
      await setDoc(doc(db, 'projects', id), newProject);
      toast.success('Proyek baru ditambahkan');
    } catch (e) {
      toast.error('Gagal menambahkan proyek');
    }
  };

  const updateProject = async (id: string, ptName: string, address: string, entryDate: string, details?: { status?: ProjectStatus, locations?: ProjectLocation[], rooms?: RoomDetails[], roomTypes?: RoomType[], panelThickness?: string, panelType?: PanelType, floorType?: string, outdoorMachine?: string, evaporator?: string }, quiet: boolean = false) => {
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
    }
  };

  const addTask = async (projectId: string, title: string, isAdditional: boolean = false, locationId?: string) => {
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
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'tasks', id), newTask);
      toast.success('Tugas baru ditambahkan');
      checkAndAutoUpdateProjectStatus(projectId, [...tasks, newTask]);
    } catch(e) {
      toast.error('Gagal menambah tugas');
    }
  };

  const updateTask = async (id: string, title: string, isAdditional: boolean) => {
    const existing = tasks.find(t => t.id === id);
    if (!existing) return;
    const updated = { ...existing, title, isAdditional };
    try {
      await setDoc(doc(db, 'tasks', id), updated);
      toast.success('Tugas berhasil diperbarui');
    } catch(e) {
      toast.error('Gagal memperbarui tugas');
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

    try {
      await setDoc(doc(db, 'tasks', taskId), updated);
      if (task.status !== newStatus) {
         toast.success(`Status diperbarui ke: ${newStatus}`);
      } else if (note) {
         toast.success('Log ditambahkan');
      }
      checkAndAutoUpdateProjectStatus(task.projectId, tasks.map(t => t.id === taskId ? updated : t));
    } catch(e) {
      toast.error('Gagal mengupdate status');
    }
  };

  const updateHistoryLog = async (taskId: string, logId: string, note: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedHistory = task.history.map(h => h.id === logId ? { ...h, note } : h);
    try {
      await setDoc(doc(db, 'tasks', taskId), { ...task, history: updatedHistory });
      toast.success('Log berhasil diperbarui');
    } catch(e) {
      toast.error('Gagal memperbarui log');
    }
  };

  const deleteHistoryLog = async (taskId: string, logId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedHistory = task.history.filter(h => h.id !== logId);
    try {
      await setDoc(doc(db, 'tasks', taskId), { ...task, history: updatedHistory });
      toast.success('Log dihapus');
    } catch(e) {
      toast.error('Gagal menghapus log');
    }
  };

  if (loading) return null;

  return (
    <ProjectContext.Provider value={{
      projects, tasks, addProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask, updateTaskStatus,
      updateHistoryLog, deleteHistoryLog
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
