import React, { useState, useEffect } from 'react';
import { useProjects, generateBQText } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { TaskStatus, Project, Task, RoomType, PanelType, ProjectLocation, RoomDetails, PROJECT_STATUSES, ProjectStatus, HistoryFile, ProjectDocument, ProjectActivity, TeamMember } from '../types';
import { format, parseISO } from 'date-fns';
import { Plus, Building2, MapPin, Calendar, Clock, MessageSquarePlus, Maximize2, FolderKanban, Edit2, Trash2, ChevronDown, ChevronUp, Map, ExternalLink, Box, Image as ImageIcon, Search, Calculator, Upload, RefreshCw, Copy, LayoutList, Grid, Grid3X3, X, Paperclip, FileText, MessageSquare, FileUp, Folder, FileSpreadsheet, Eye, Download, Info, Archive, ArchiveRestore, Users, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColdRoomCalculator } from './ColdRoomCalculator';
import { CombinedRoomCanvas } from '../components/ui/CombinedRoomCanvas';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const TEAM_MEMBERS_FALLBACK: TeamMember[] = [];

export interface ProjectsProps {
  selectedProjectId?: string | null;
  setSelectedProjectId?: React.Dispatch<React.SetStateAction<string | null>>;
}

const getTaskGradient = (status: TaskStatus) => {
  if (status === 'Selesai' || status === 'Approved') return 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/10 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600';
  if (status === 'Signed') return 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-green-600';
  if (status.includes('Revisi')) return 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/10 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600';
  if (status === 'Baru') return 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/10 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600';
  return 'bg-surface border-divider hover:border-[var(--color-accent-300)]';
};

const getProjectGradient = (status?: ProjectStatus) => {
  if (status === 'Tahap 6: Completed') return 'bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10 border-green-200/50 hover:border-green-300/80';
  if (status === 'Tahap 2: Design and Revision') return 'bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/50 hover:border-orange-300/80';
  if (status === 'Tahap 3: Design Approved') return 'bg-gradient-to-br from-teal-50/50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10 border-teal-200/50 hover:border-teal-300/80';
  if (status === 'Tahap 4: Pre Construction') return 'bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/50 hover:border-purple-300/80';
  if (status === 'Tahap 5: Under Construction') return 'bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200/50 hover:border-amber-300/80';
  if (status === 'Paused') return 'bg-gradient-to-br from-gray-50/50 to-gray-100/30 dark:from-gray-950/20 dark:to-gray-900/10 border-gray-200/50 hover:border-gray-300/80 text-muted';
  if (status === 'Cancelled') return 'bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 border-red-200/50 hover:border-red-300/80 opacity-70';
  if (!status || status === 'Tahap 1: New') return 'bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50 hover:border-blue-300/80';

  return 'bg-surface border-divider hover:border-[var(--color-accent-300)]';
};

const normalizeFloorType = (type: string | undefined) => {
  if (!type) return 'tanpa lantai';
  const t = type.toLowerCase();
  if (t === 'insul' || t === 'insulation panel') return 'insulation panel';
  if (t === 'concrete' || t === 'beton' || t === 'cor') return 'concrete';
  return 'tanpa lantai';
};

const getMaterialEstimation = (room: any) => {
  const lengthM = parseFloat(room.length || '0') / 1000;
  const widthM = parseFloat(room.width || '0') / 1000;
  const heightM = parseFloat(room.height || '0') / 1000;
  
  if (!lengthM || !widthM || !heightM || isNaN(lengthM) || isNaN(widthM) || isNaN(heightM)) {
    return null;
  }

  const roofFloorArea = lengthM * widthM;
  const wall1_3Area = lengthM * heightM;
  const wall2_4Area = widthM * heightM;

  const colorbondBatang = Math.ceil((2 * lengthM + 2 * widthM + 4 * heightM) / 6);
  const alumuniumBatang = Math.ceil((2 * lengthM + 2 * widthM + 4 * heightM) / 6);
  const ironBatang = Math.ceil((2 * lengthM + 2 * widthM) / 6);

  return {
    roofFloorArea,
    wall1_3Area,
    wall2_4Area,
    colorbondBatang,
    alumuniumBatang,
    ironBatang
  };
};

const normalizeThickness = (thickness: string | undefined) => {
  if (!thickness) return '100mm';
  const t = thickness.toLowerCase().replace(/\s+/g, '');
  if (t === '50mm' || t === '50') return '50mm';
  if (t === '75mm' || t === '75') return '75mm';
  if (t === '100mm' || t === '100') return '100mm';
  if (t === '150mm' || t === '150') return '150mm';
  return t; // Keep fallback
};

const normalizePanelType = (type: string | undefined) => {
  if (!type) return 'PU';
  const t = type.toUpperCase();
  if (t === 'PIR') return 'PIR';
  return 'PU';
};

export const Projects: React.FC<ProjectsProps> = ({ selectedProjectId: highlightProjectId, setSelectedProjectId: setHighlightProjectId }) => {
  const { projects, tasks, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, updateTaskStatus, updateHistoryLog, deleteHistoryLog, restoreFromBackup } = useProjects();
  const { user, userProfile, usersList: TEAM_MEMBERS } = useAuth();
  const isAdmin = userProfile?.systemRole === 'admin';

  const [activeActivityProjectId, setActiveActivityProjectId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [projectTabs, setProjectTabs] = useState<Record<string, 'details' | 'tasks' | 'documents' | 'resources'>>({});
  const [documentIsDragging, setDocumentIsDragging] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [colsCount, setColsCount] = useState<1 | 2 | 3>(() => {
    const saved = localStorage.getItem('projects_layout_cols');
    if (saved === '1' || saved === '2' || saved === '3') {
      return parseInt(saved) as 1 | 2 | 3;
    }
    return 2;
  });

  useEffect(() => {
    localStorage.setItem('projects_layout_cols', colsCount.toString());
  }, [colsCount]);
  const [isAddProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setEditProjectModalOpen] = useState(false);

  const [isAddTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setEditTaskModalOpen] = useState(false);

  const [isStatusModalOpen, setStatusModalOpen] = useState(false);
  const [isEditLogModalOpen, setEditLogModalOpen] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedLogId, setSelectedLogId] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<HistoryFile[]>([]);

  const [heatLoadModalOpen, setHeatLoadModalOpen] = useState(false);
  const [heatLoadInitials, setHeatLoadInitials] = useState<{l: string, w: string, h: string, ref: string} | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<string[]>([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([]);
  const [expandedRoomViews, setExpandedRoomViews] = useState<string[]>([]);

  const [inlineEditLogId, setInlineEditLogId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');

  const [isDragging, setIsDragging] = useState(false);

  const handleFileAttach = (files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (maksimal 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const newAttachedFile: HistoryFile = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            url: e.target.result as string
          };
          setAttachedFiles(prev => [...prev, newAttachedFile]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToAttach: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          filesToAttach.push(file);
        }
      }
    }

    if (filesToAttach.length > 0) {
      handleFileAttach(filesToAttach);
      toast.success(`${filesToAttach.length} file berhasil ditempel`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileAttach(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    if (highlightProjectId === 'NEW') {
      setAddProjectModalOpen(true);
      if (setHighlightProjectId) setHighlightProjectId(null);
    } else if (highlightProjectId) {
      if (!expandedProjectIds.includes(highlightProjectId)) {
        setExpandedProjectIds(prev => [...prev, highlightProjectId]);
      }
      setTimeout(() => {
        const el = document.getElementById(`project-${highlightProjectId}`);
        if(el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if(setHighlightProjectId) setHighlightProjectId(null);
        }
      }, 100);
    }
  }, [highlightProjectId, expandedProjectIds, setHighlightProjectId]);


  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const toggleTaskCollapsed = (taskId: string) => {
    setCollapsedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjectIds(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  const toggleRoomView = (roomId: string) => {
    setExpandedRoomViews(prev => prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]);
  };

  const handleUpdateProjectStatus = async (project: Project, newStatus: ProjectStatus) => {
    const activityContent = `Mengubah status proyek dari '${project.status || 'Tahap 1: New'}' menjadi '${newStatus}'`;
    const newActivity: ProjectActivity = {
      id: crypto.randomUUID(),
      type: 'update',
      user: user?.email || 'Anggota Tim',
      content: activityContent,
      timestamp: new Date().toISOString()
    };
    const updatedActivities = [newActivity, ...(project.activities || [])];
    await updateProject(project.id, project.ptName, project.address, project.entryDate, {
      status: newStatus,
      activities: updatedActivities
    }, false);
  };

  const handleUploadProjectDocument = async (
    project: Project,
    files: FileList | File[],
    category: 'Drawings' | 'Specs' | 'Correspondence'
  ) => {
    const currentDocs = project.documents || [];
    const newDocs: ProjectDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`Berkas ${file.name} terlalu besar (maksimal 15MB)`);
        continue;
      }

      const filePromise = new Promise<ProjectDocument | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type || 'application/octet-stream',
              url: e.target.result as string,
              category,
              uploadedAt: new Date().toISOString(),
              uploadedBy: user?.email || 'Anggota Tim'
            });
          } else {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

      const docObj = await filePromise;
      if (docObj) {
        newDocs.push(docObj);
      }
    }

    if (newDocs.length === 0) return;

    const updatedDocs = [...currentDocs, ...newDocs];

    const docNames = newDocs.map(d => d.name).join(', ');
    const activityContent = `Mengunggah ${newDocs.length} berkas ke kategori '${category}': ${docNames}`;

    const newActivity: ProjectActivity = {
      id: crypto.randomUUID(),
      type: 'update',
      user: user?.email || 'Anggota Tim',
      content: activityContent,
      timestamp: new Date().toISOString()
    };
    const updatedActivities = [newActivity, ...(project.activities || [])];

    await updateProject(project.id, project.ptName, project.address, project.entryDate, {
      documents: updatedDocs,
      activities: updatedActivities
    }, true);

    toast.success(`${newDocs.length} berkas berhasil diunggah`);
  };

  const handleDeleteProjectDocument = async (project: Project, docId: string) => {
    const docToDelete = project.documents?.find(d => d.id === docId);
    if (!docToDelete) return;

    const updatedDocs = (project.documents || []).filter(d => d.id !== docId);

    const activityContent = `Menghapus berkas dari kategori '${docToDelete.category}': ${docToDelete.name}`;
    const newActivity: ProjectActivity = {
      id: crypto.randomUUID(),
      type: 'update',
      user: user?.email || 'Anggota Tim',
      content: activityContent,
      timestamp: new Date().toISOString()
    };
    const updatedActivities = [newActivity, ...(project.activities || [])];

    await updateProject(project.id, project.ptName, project.address, project.entryDate, {
      documents: updatedDocs,
      activities: updatedActivities
    }, true);

    toast.success(`Berkas ${docToDelete.name} berhasil dihapus`);
  };

  const handleAddProjectComment = async (projectId: string) => {
    if (!newCommentText.trim()) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newActivity: ProjectActivity = {
      id: crypto.randomUUID(),
      type: 'comment',
      user: user?.email || 'Anggota Tim',
      content: newCommentText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedActivities = [newActivity, ...(project.activities || [])];

    await updateProject(project.id, project.ptName, project.address, project.entryDate, {
      activities: updatedActivities
    }, true);

    setNewCommentText('');
    toast.success('Komentar berhasil ditambahkan');
  };

  const [ptName, setPtName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [locations, setLocations] = useState<ProjectLocation[]>([
    { id: crypto.randomUUID(), name: 'Utama', address: '', rooms: [] }
  ]);
  const [activeLocationId, setActiveLocationId] = useState<string>('');

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLength, setNewRoomLength] = useState('0');
  const [newRoomWidth, setNewRoomWidth] = useState('0');
  const [newRoomHeight, setNewRoomHeight] = useState('0');
  const [newRoomFloorType, setNewRoomFloorType] = useState('tanpa lantai');
  const [newRoomThickness, setNewRoomThickness] = useState('100mm');
  const [newRoomPanelType, setNewRoomPanelType] = useState<PanelType>('PU');

  const [newRoomMachineType, setNewRoomMachineType] = useState('');
  const [newRoomMountingType, setNewRoomMountingType] = useState('Roof Mount');
  const [newRoomMachineCapacity, setNewRoomMachineCapacity] = useState('');
  const [newRoomOutdoorMachine, setNewRoomOutdoorMachine] = useState('');
  const [newRoomEvaporator, setNewRoomEvaporator] = useState('');
  const [newRoomDoorType, setNewRoomDoorType] = useState('');
  const [newRoomDoorWidth, setNewRoomDoorWidth] = useState('');
  const [newRoomDoorHeight, setNewRoomDoorHeight] = useState('');
  const [newRoomDoorQty, setNewRoomDoorQty] = useState('');

  const handleAddLocation = () => {
    const newId = crypto.randomUUID();
    setLocations(prev => [...prev, { id: newId, name: `Lokasi ${prev.length + 1}`, address: '', rooms: [] }]);
    setActiveLocationId(newId);
  };

  const handleRemoveLocation = (id: string) => {
    if (locations.length === 1) return;
    setLocations(prev => {
      const newLocs = prev.filter(l => l.id !== id);
      if (activeLocationId === id) setActiveLocationId(newLocs[0].id);
      return newLocs;
    });
  };

  const updateLocation = (id: string, field: keyof ProjectLocation, value: any) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const toggleRoomType = (locationId: string, type: RoomType) => {
    setLocations(prev => prev.map(l => {
      if (l.id === locationId) {
        const hasRoom = l.rooms?.find(r => r.type === type);
        return {
          ...l,
          rooms: hasRoom ? l.rooms?.filter(r => r.type !== type) : [...(l.rooms || []), {
            id: crypto.randomUUID(),
            type,
            length: '0',
            width: '0',
            height: '0',
            floorType: 'tanpa lantai',
            panelThickness: '100mm',
            panelType: 'PU'
          }]
        };
      }
      return l;
    }));
  };

  const updateRoomDetail = (locationId: string, roomIndex: number, field: keyof RoomDetails, value: string) => {
    setLocations(prev => prev.map(l => {
      if (l.id === locationId && l.rooms) {
        const newRooms = [...l.rooms];
        newRooms[roomIndex] = { ...newRooms[roomIndex], [field]: value };
        return { ...l, rooms: newRooms };
      }
      return l;
    }));
  };

  const updateRoomPosition = (locationId: string, roomIndex: number, x: number, y: number) => {
    setLocations(prev => prev.map(l => {
      if (l.id === locationId && l.rooms) {
        const newRooms = [...l.rooms];
        newRooms[roomIndex] = { ...newRooms[roomIndex], x, y };
        return { ...l, rooms: newRooms };
      }
      return l;
    }));
  };

  const handleAddRoomToLocation = (locationId: string) => {
    if (!newRoomName.trim()) {
      toast.error('Mohon masukkan nama ruangan');
      return;
    }

    setLocations(prev => prev.map(l => {
      if (l.id === locationId) {
        const exists = l.rooms?.some(r => r.type.toLowerCase() === newRoomName.trim().toLowerCase());
        if (exists) {
          toast.error(`Ruangan "${newRoomName}" sudah ada di lokasi ini.`);
          return l;
        }
        return {
          ...l,
          rooms: [...(l.rooms || []), {
            id: crypto.randomUUID(),
            type: newRoomName.trim(),
            length: newRoomLength || '0',
            width: newRoomWidth || '0',
            height: newRoomHeight || '0',
            floorType: newRoomFloorType,
            panelThickness: newRoomThickness,
            panelType: newRoomPanelType,
            machineType: newRoomMachineType,
            mountingType: newRoomMachineType === 'Plug-In' ? newRoomMountingType : '',
            machineCapacity: newRoomMachineType === 'Plug-In' ? newRoomMachineCapacity : '',
            outdoorMachine: newRoomMachineType === 'Split' ? newRoomOutdoorMachine : '',
            evaporator: newRoomMachineType === 'Split' ? newRoomEvaporator : '',
            doorType: newRoomDoorType,
            doorWidth: newRoomDoorWidth,
            doorHeight: newRoomDoorHeight,
            doorQty: newRoomDoorQty,
            x: 0,
            y: 0
          }]
        };
      }
      return l;
    }));

    // Reset inputs
    setNewRoomName('');
    setNewRoomLength('0');
    setNewRoomWidth('0');
    setNewRoomHeight('0');
    setNewRoomFloorType('tanpa lantai');
    setNewRoomThickness('100mm');
    setNewRoomPanelType('PU');
    setNewRoomMachineType('');
    setNewRoomMountingType('Roof Mount');
    setNewRoomMachineCapacity('');
    setNewRoomOutdoorMachine('');
    setNewRoomEvaporator('');
    setNewRoomDoorType('');
    setNewRoomDoorWidth('');
    setNewRoomDoorHeight('');
    setNewRoomDoorQty('');
    toast.success('Ruangan berhasil ditambahkan');
  };

  const [taskTitle, setTaskTitle] = useState('');
  const [isAdditional, setIsAdditional] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | undefined>(undefined);
  const [taskAssigneeRole, setTaskAssigneeRole] = useState<'Drafting' | 'Review' | undefined>(undefined);

  const [newStatus, setNewStatus] = useState<TaskStatus>('Baru');
  const [statusNote, setStatusNote] = useState('');

  const statuses: TaskStatus[] = ['Baru', 'Bekerja', 'Butuh Revisi', 'Revisi Selesai', 'Lanjut Next Step', 'Selesai', 'Approved', 'Signed'];

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (ptName && locations.length > 0 && entryDate) {
      addProject(ptName, locations[0].address, entryDate, { locations });
      setAddProjectModalOpen(false);
      setPtName('');
      setLocations([{ id: crypto.randomUUID(), name: 'Utama', address: '', rooms: [] }]);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProjectId && taskTitle) {
      addTask(selectedProjectId, taskTitle, isAdditional, selectedLocationId || undefined, taskAssigneeId, taskAssigneeRole);
      setAddTaskModalOpen(false);
      setTaskTitle('');
      setIsAdditional(false);
      setSelectedLocationId('');
      setTaskAssigneeId(undefined);
      setTaskAssigneeRole(undefined);
    }
  };

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskId && newStatus) { // Note is now optional
      updateTaskStatus(selectedTaskId, newStatus, statusNote, attachedFiles);
      setStatusModalOpen(false);
      setStatusNote('');
      setAttachedFiles([]);
    }
  };

  const openEditProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setPtName(project.ptName);
    setEntryDate(project.entryDate);

    if (project.locations && project.locations.length > 0) {
      setLocations(project.locations);
      setActiveLocationId(project.locations[0].id);
    } else {
      let migratedRooms = project.rooms || [];
      if (migratedRooms.length === 0 && project.roomTypes && project.roomTypes.length > 0) {
        migratedRooms = project.roomTypes.map(t => ({
          id: crypto.randomUUID(),
          type: t,
          panelThickness: project.panelThickness,
          panelType: project.panelType,
          floorType: project.floorType,
          outdoorMachine: project.outdoorMachine,
          evaporator: project.evaporator
        }));
      }
      const newLocId = crypto.randomUUID();
      setLocations([{ id: newLocId, name: 'Utama', address: project.address || '', rooms: migratedRooms }]);
      setActiveLocationId(newLocId);
    }

    setEditProjectModalOpen(true);
  };

  const handleEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (ptName && locations.length > 0 && entryDate && selectedProjectId) {
      updateProject(selectedProjectId, ptName, locations[0].address, entryDate, { locations });
      setEditProjectModalOpen(false);
    }
  };

  const handleDeleteProject = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Proyek",
      message: "Yakin ingin menghapus proyek ini beserta seluruh tugasnya?",
      onConfirm: () => {
        deleteProject(id);
        setConfirmDialog(null);
      }
    });
  };

  const openEditTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setTaskTitle(task.title);
    setIsAdditional(task.isAdditional);
    setTaskAssigneeId(task.assigneeId);
    setTaskAssigneeRole(task.assigneeRole);
    setEditTaskModalOpen(true);
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskId && taskTitle) {
      updateTask(selectedTaskId, taskTitle, isAdditional, taskAssigneeId, taskAssigneeRole);
      setEditTaskModalOpen(false);
      setTaskTitle('');
      setIsAdditional(false);
      setTaskAssigneeId(undefined);
      setTaskAssigneeRole(undefined);
    }
  };

  const handleDeleteTask = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Tugas",
      message: "Yakin ingin menghapus tugas ini?",
      onConfirm: () => {
        deleteTask(id);
        setConfirmDialog(null);
      }
    });
  };

  const handleInlineEditSave = (taskId: string) => {
    if (inlineEditLogId && inlineEditValue !== undefined) {
      updateHistoryLog(taskId, inlineEditLogId, inlineEditValue);
      setInlineEditLogId(null);
    }
  };

  const renderTaskItem = (task: Task, project: Project) => {
    return (
      <div key={task.id} className={`p-4 rounded-lg border transition-colors group ${getTaskGradient(task.status)}`}>
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${collapsedTaskIds.includes(task.id) ? '' : 'mb-3'}`}>
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 cursor-pointer select-none hover:opacity-85 active:scale-[0.98] transition-all"
              onClick={() => toggleTaskCollapsed(task.id)}
              title={collapsedTaskIds.includes(task.id) ? "Klik untuk membuka detail tugas" : "Klik untuk me-minimize detail tugas"}
            >
              <div className="text-muted opacity-50 hover:opacity-100 transition-opacity shrink-0">
                {collapsedTaskIds.includes(task.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
              <h4 className="font-semibold text-primary text-sm">{task.title}</h4>
            </div>
            {task.isAdditional && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800 uppercase tracking-wider">
                Tambahan
              </span>
            )}
            {task.assigneeId && (() => {
              const member = TEAM_MEMBERS.find(m => m.id === task.assigneeId);
              if (!member) return null;
              return (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                  task.assigneeRole === 'Review'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                }`} title={`Ditugaskan untuk ${task.assigneeRole}`}>
                  <Users size={10} />
                  {member.name} ({task.assigneeRole === 'Review' ? 'Review' : 'Drafting'})
                </span>
              );
            })()}
          </div>
          <div className="flex items-center gap-1 w-full sm:w-auto">
            {task.title.toLowerCase().includes('bq') && task.history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 mr-1"
                title="Regenerate BQ"
                onClick={() => {
                  const newBqText = generateBQText(project);
                  updateHistoryLog(task.id, task.history[0].id, newBqText);
                  toast.success('BQ berhasil diperbarui dari data terbaru');
                }}
              >
                <RefreshCw size={14} />
              </Button>
            )}
            <StatusBadge status={task.status} />
            <div className="flex items-center ml-auto sm:ml-2">
              {isAdmin && (
                <>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Tugas" onClick={() => openEditTask(task)}><Edit2 size={14} /></Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Hapus Tugas" onClick={() => handleDeleteTask(task.id)}><Trash2 size={14} /></Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-1"
                onClick={() => {
                  setSelectedTaskId(task.id);
                  setNewStatus(task.status);
                  setStatusNote('');
                  setAttachedFiles([]);
                  setStatusModalOpen(true);
                }}
                title="Perbarui Status"
              >
                <MessageSquarePlus size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 ml-1 text-muted hover:text-primary"
                onClick={() => toggleTaskCollapsed(task.id)}
                title={collapsedTaskIds.includes(task.id) ? "Buka Detail Tugas" : "Minimize Detail Tugas"}
              >
                {collapsedTaskIds.includes(task.id) ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </Button>
            </div>
          </div>
        </div>

        {!collapsedTaskIds.includes(task.id) && (() => {
          const isBQTask = task.title.toLowerCase().includes('bq');
          const bqLog = isBQTask ? task.history.find(l => l.note.includes('berikut List Kebutuhan Material')) || task.history[0] : null;
          const historyLogs = bqLog ? task.history.filter(l => l.id !== bqLog.id) : task.history;
          const hasLogs = historyLogs.length > 0;
          const displayLogs = expandedTaskIds.includes(task.id) ? historyLogs : (historyLogs.length > 0 ? [historyLogs[historyLogs.length - 1]] : []);

          return (
            <>
              {/* BQ Text Block outside of history */}
              {bqLog && (
                <div className="mt-3 bg-surface border border-divider rounded-md p-4 text-sm text-secondary group/bq relative shadow-sm">
                  {inlineEditLogId === bqLog.id ? (
                    <Textarea
                      autoFocus
                      value={inlineEditValue}
                      onChange={(e) => setInlineEditValue(e.target.value)}
                      onBlur={() => handleInlineEditSave(task.id)}
                      className="text-xs p-2 min-h-[120px] w-full bg-surface"
                    />
                  ) : (
                    <div className="flex justify-between items-start gap-4">
                      <div
                        className="italic leading-relaxed text-xs whitespace-pre-wrap cursor-text hover:bg-surface p-1.5 rounded -ml-1.5 transition-colors flex-1"
                        onClick={() => {
                          setInlineEditLogId(bqLog.id);
                          setInlineEditValue(bqLog.note);
                        }}
                        title="Klik untuk edit"
                      >
                        {bqLog.note}
                      </div>
                      <div className="opacity-0 group-hover/bq:opacity-100 transition-opacity flex items-center shrink-0 bg-surface border border-divider rounded overflow-hidden mt-1 mr-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(bqLog.note);
                            toast.success('Berhasil disalin');
                          }}
                          className="p-1.5 hover:bg-surface-hover hover:text-primary text-secondary transition-colors"
                          title="Salin Teks"
                        >
                          <Copy size={12}/>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Task History Logs */}
              {hasLogs && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted mb-1 px-1">
                    <span>Riwayat Status ({historyLogs.length})</span>
                    {historyLogs.length > 1 && (
                      <button onClick={() => toggleTaskExpanded(task.id)} className="flex items-center gap-1 hover:text-primary transition-colors focus:outline-none">
                        {expandedTaskIds.includes(task.id) ? <><ChevronUp size={12}/> Tutup</> : <><ChevronDown size={12}/> Buka</>}
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {displayLogs.map(log => (
                      <div key={log.id} className="bg-surface-hover rounded-md p-2.5 border border-divider text-secondary flex items-start justify-between gap-2 group/log">
                        <div className="flex items-start gap-2 w-full">
                          <Clock size={14} className="mt-0.5 shrink-0 opacity-70" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold not-italic mr-1.5 opacity-90 text-xs">{log.status}:</span>
                            {inlineEditLogId === log.id ? (
                              <Textarea
                                autoFocus
                                value={inlineEditValue}
                                onChange={(e) => setInlineEditValue(e.target.value)}
                                onBlur={() => handleInlineEditSave(task.id)}
                                className="text-xs p-2 min-h-[120px] mt-1 w-full bg-surface"
                              />
                            ) : (
                              <div
                                className="italic leading-relaxed text-xs whitespace-pre-wrap cursor-text hover:bg-surface p-1.5 rounded -ml-1.5 transition-colors mt-0.5"
                                onClick={() => {
                                  setInlineEditLogId(log.id);
                                  setInlineEditValue(log.note);
                                }}
                                title="Klik untuk edit"
                              >
                                {log.note}
                              </div>
                            )}
                            <span className="block text-[10px] text-muted not-italic mt-1">
                              {format(parseISO(log.timestamp), 'dd MMM yyyy, HH:mm')}
                            </span>
                            {log.files && log.files.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {log.files.some(f => f.type?.startsWith('image/')) && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {log.files.filter(f => f.type?.startsWith('image/')).map(file => (
                                      <div key={file.id} className="relative group/thumb border border-divider rounded overflow-hidden bg-surface shadow-xs">
                                        <img
                                          src={file.url}
                                          alt={file.name}
                                          className="h-14 w-auto max-w-[100px] object-cover cursor-zoom-in"
                                          onClick={() => {
                                            const w = window.open();
                                            if (w) w.document.write(`<img src="${file.url}" style="max-width:100%; max-height:100%; display:block; margin:auto;" />`);
                                          }}
                                          title="Klik untuk memperbesar"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {log.files.map(file => {
                                    const isImage = file.type?.startsWith('image/');
                                    return (
                                      <a
                                        key={file.id}
                                        href={file.url}
                                        download={file.name}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-divider text-[10px] font-medium text-secondary hover:text-primary hover:border-[var(--color-accent-500)] transition-all max-w-[180px] truncate"
                                        title={`Unduh ${file.name}`}
                                      >
                                        {isImage ? (
                                          <ImageIcon size={10} className="text-blue-500 shrink-0" />
                                        ) : (
                                          <FileText size={10} className="text-amber-500 shrink-0" />
                                        )}
                                        <span className="truncate">{file.name}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {expandedTaskIds.includes(task.id) && (
                          <div className="opacity-0 group-hover/log:opacity-100 transition-opacity flex items-center shrink-0 bg-surface border border-divider rounded overflow-hidden">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(log.note);
                                toast.success('Berhasil disalin');
                              }}
                              className="p-1.5 hover:bg-surface-hover hover:text-primary text-secondary transition-colors"
                              title="Salin Teks"
                            >
                              <Copy size={12}/>
                            </button>
                            <div className="w-[1px] h-4 bg-divider"></div>
                            <button onClick={() => openEditLog(task.id, log.id, log.note)} className="p-1.5 hover:bg-surface-hover hover:text-primary text-secondary transition-colors" title="Edit Log"><Edit2 size={12}/></button>
                            <div className="w-[1px] h-4 bg-divider"></div>
                            <button onClick={() => handleDeleteLog(task.id, log.id)} className="p-1.5 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 text-red-400 transition-colors" title="Hapus Log"><Trash2 size={12}/></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    );
  };

  const openEditLog = (taskId: string, logId: string, note: string) => {
    setSelectedTaskId(taskId);
    setSelectedLogId(logId);
    setStatusNote(note);
    setEditLogModalOpen(true);
  };

  const handleEditLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskId && selectedLogId && statusNote) {
      updateHistoryLog(selectedTaskId, selectedLogId, statusNote);
      setEditLogModalOpen(false);
      setStatusNote('');
    }
  };

  const handleDeleteLog = (taskId: string, logId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Log",
      message: "Yakin hapus log ini?",
      onConfirm: () => {
        deleteHistoryLog(taskId, logId);
        setConfirmDialog(null);
      }
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let count = 0;
        for (const row of data as any[]) {
          const ptName = row['PT'] || row['NAMA PT'] || row['Nama PT'] || row['Nama Perusahaan'] || row['Company'] || row['Nama'] || row['ptName'];
          const address = row['LOKASI'] || row['Lokasi'] || row['Alamat'] || row['Address'] || row['address'] || '';
          const entryDate = row['TANGGAL MASUK'] || row['Tanggal Masuk'] || row['Tanggal'] || row['Date'] || row['entryDate'];
          const jenisRuangan = row['JENIS RUANGAN'] || row['Jenis Ruangan'];

          if (ptName) {
            let parsedDate = format(new Date(), 'yyyy-MM-dd');
            if (entryDate) {
               // Try to parse excel date if it's a number
               if (typeof entryDate === 'number') {
                  const date = new Date((entryDate - (25567 + 2)) * 86400 * 1000);
                  if (!isNaN(date.getTime())) {
                      parsedDate = format(date, 'yyyy-MM-dd');
                  }
               } else if (typeof entryDate === 'string') {
                  const parts = entryDate.split('/');
                  if (parts.length === 3) {
                     // DD/MM/YYYY -> YYYY-MM-DD
                     parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                  } else {
                     parsedDate = entryDate;
                  }
               }
            }

            let locations = [];
            if (address || jenisRuangan) {
               const roomNames = jenisRuangan ? jenisRuangan.split(',').map((r: string) => r.trim()) : [];
               const rooms = roomNames.map((name: string) => ({
                  id: crypto.randomUUID(),
                  type: name as any
               }));

               locations.push({
                 id: crypto.randomUUID(),
                 name: 'Lokasi Utama',
                 address: address || '',
                 rooms: rooms.length > 0 ? rooms : undefined
               });
            }

            addProject(String(ptName), String(address), parsedDate, { locations: locations.length > 0 ? locations : undefined });
            count++;
          }
        }

        toast.success(`Berhasil mengimpor ${count} proyek dari Excel`);
      } catch (error) {
        console.error(error);
        toast.error('Gagal mengimpor file Excel. Pastikan formatnya benar.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (e.target) {
        e.target.value = '';
    }
  };

  const handleExportSummaryReport = () => {
    try {
      if (projects.length === 0) {
        toast.error('Tidak ada proyek untuk diekspor.');
        return;
      }

      const reportData = projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.status === 'Selesai' || t.status === 'Approved' || t.status === 'Signed').length;

        // Format locations & rooms
        const locationsStr = project.locations?.map(l => {
          const roomsStr = l.rooms?.map(r => `${r.type} (${r.length || 0}x${r.width || 0}x${r.height || 0}m)`).join(', ') || '';
          return `${l.name}${roomsStr ? `: [${roomsStr}]` : ''}`;
        }).join(' | ') || project.address || '';

        // Format tasks
        const tasksStr = projectTasks.map(t => `${t.title} (${t.status})`).join('; ') || 'Belum ada tugas';

        return {
          'Nama PT/Perusahaan': project.ptName,
          'Status Proyek': project.status || 'Tahap 1: New',
          'Tanggal Masuk': project.entryDate ? format(parseISO(project.entryDate), 'dd MMM yyyy') : '-',
          'Lokasi & Detail Ruangan': locationsStr,
          'Total Tugas': total,
          'Tugas Selesai': completed,
          'Persentase Selesai': total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%',
          'Daftar Tugas & Status': tasksStr,
          'Tanggal Dibuat': project.createdAt ? format(parseISO(project.createdAt), 'dd MMM yyyy HH:mm') : '-'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Proyek");

      // Auto-fit column widths
      const maxColWidths = Object.keys(reportData[0] || {}).map(key => {
        return Math.max(
          key.length,
          ...reportData.map(row => String((row as any)[key] || '').length)
        ) + 2;
      });
      worksheet['!cols'] = maxColWidths.map(w => ({ wch: Math.min(w, 50) })); // limit width to 50 max

      XLSX.writeFile(workbook, `Laporan_Proyek_Drafter_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Laporan ringkasan proyek berhasil diekspor ke Excel!');
    } catch (error) {
      console.error('Error exporting summary report:', error);
      toast.error('Gagal mengekspor laporan proyek.');
    }
  };

  const STATUS_ORDER: Record<string, number> = {
    'Tahap 1: New': 1,
    'Tahap 2: Design and Revision': 2,
    'Tahap 3: Design Approved': 3,
    'Tahap 4: Pre Construction': 4,
    'Tahap 5: Under Construction': 5,
    'Tahap 6: Completed': 6,
    'Paused': 7,
    'Cancelled': 8
  };

  const filteredProjects = projects.filter(project => {
    if (!!project.isArchived !== showArchived) return false;

    const query = searchQuery.toLowerCase();
    const tasksForProject = tasks.filter(t => t.projectId === project.id);
    const matchesName = (project.ptName || '').toLowerCase().includes(query);
    const matchesLocations = project.locations?.some(loc =>
      (loc.name || '').toLowerCase().includes(query) ||
      (loc.address || '').toLowerCase().includes(query) ||
      loc.rooms?.some(r => (r.type || '').toLowerCase().includes(query))
    ) || false;
    const matchesTask = tasksForProject.some(t => (t.title || '').toLowerCase().includes(query) || (t.status || '').toLowerCase().includes(query));
    return matchesName || matchesLocations || matchesTask;
  }).sort((a, b) => {
      const orderA = STATUS_ORDER[a.status || 'Tahap 1: New'] || 99;
      const orderB = STATUS_ORDER[b.status || 'Tahap 1: New'] || 99;
      return orderA - orderB;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-primary">Daftar Proyek</h2>
          <div className="flex bg-surface-hover p-1 rounded-xl border border-divider/60 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                !showArchived 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Aktif ({projects.filter(p => !p.isArchived).length})
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                showArchived 
                  ? 'bg-surface text-primary shadow-sm' 
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Arsip ({projects.filter(p => p.isArchived).length})
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center border border-divider rounded-lg p-0.5 bg-surface select-none shrink-0" title="Atur Tampilan">
            <button
              onClick={() => setColsCount(1)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                colsCount === 1
                  ? 'bg-muted text-[var(--color-accent-600)] shadow-sm border border-divider/50'
                  : 'text-muted hover:text-secondary hover:bg-surface-hover'
              }`}
              title="Tampilan 1 Kolom"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setColsCount(2)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                colsCount === 2
                  ? 'bg-muted text-[var(--color-accent-600)] shadow-sm border border-divider/50'
                  : 'text-muted hover:text-secondary hover:bg-surface-hover'
              }`}
              title="Tampilan 2 Kolom"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setColsCount(3)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                colsCount === 3
                  ? 'bg-muted text-[var(--color-accent-600)] shadow-sm border border-divider/50'
                  : 'text-muted hover:text-secondary hover:bg-surface-hover'
              }`}
              title="Tampilan 3 Kolom"
            >
              <Grid3X3 size={16} />
            </button>
          </div>
          <div className="relative flex-1 sm:w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <Input
              placeholder="Cari proyek, lokasi, tugas, atau status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              id="excel-upload"
              onChange={handleImportExcel}
            />
            {isAdmin && (
              <>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  id="excel-upload"
                  onChange={handleImportExcel}
                />
                <Button variant="outline" className="gap-2 shrink-0" onClick={() => document.getElementById('excel-upload')?.click()}>
                  <Upload size={18} /> Import Excel
                </Button>
              </>
            )}
            <Button variant="outline" className="gap-2 shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" onClick={handleExportSummaryReport}>
              <FileText size={18} /> Ekspor Laporan
            </Button>
            {isAdmin && (
              <Button onClick={() => setAddProjectModalOpen(true)} className="gap-2 shrink-0">
                <Plus size={18} /> Proyek Baru
              </Button>
            )}
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-divider rounded-xl">
          <FolderKanban size={48} className="mx-auto text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-primary mb-2">Belum Ada Proyek</h3>
          <p className="text-muted text-sm max-w-sm mx-auto mb-6">Mulai pemantauan pekerjaan Anda dengan menambahkan proyek pertama.</p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <Button onClick={() => setAddProjectModalOpen(true)}>Buat Proyek</Button>
            {(localStorage.getItem('drafter_projects_backup') || localStorage.getItem('drafter_tasks_backup')) && (
              <Button variant="outline" onClick={restoreFromBackup}>Pulihkan Cadangan Lokal</Button>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid gap-6 items-start ${
          colsCount === 1
            ? 'grid-cols-1'
            : colsCount === 2
              ? 'grid-cols-1 xl:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        }`}>
          {Array.from({ length: colsCount }).map((_, colIdx) => {
            const colProjects = filteredProjects.filter((_, idx) => idx % colsCount === colIdx);
            return (
              <div key={colIdx} className="flex flex-col gap-6">
                {colProjects.map(project => {
                  const projectTasks = tasks.filter(t => t.projectId === project.id);
                  return (
                    <motion.div
                key={project.id}
                id={`project-${project.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors ${getProjectGradient(project.status)}`}
              >
                <div className="p-5 border-b border-divider bg-surface-hover/50">
                  <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4 mb-2">
                     <h3
                       className="text-lg font-bold text-primary flex items-center gap-2 cursor-pointer hover:text-[var(--color-accent-600)] transition-colors select-none flex-1 min-w-[200px]"
                       onClick={() => toggleProjectExpanded(project.id)}
                     >
                       <Building2 size={20} className="text-[var(--color-accent-500)] shrink-0" />
                       <span className="break-words leading-tight">{project.ptName}</span>
                       <div className="ml-1 text-muted opacity-50 hover:opacity-100 transition-opacity shrink-0">
                         {expandedProjectIds.includes(project.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                       </div>
                     </h3>
                     <div className="flex items-center gap-1 shrink-0 flex-wrap">
                       <select
                         value={project.status || 'Tahap 1: New'} disabled={!isAdmin}
                         onChange={(e) => handleUpdateProjectStatus(project, e.target.value as ProjectStatus)}
                         className={`h-8 text-[11px] font-semibold tracking-wide rounded-md border px-2 py-1 mr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors cursor-pointer truncate max-w-[140px] sm:max-w-[200px] ${
                           project.status === 'Tahap 6: Completed'
                             ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                             : project.status === 'Paused'
                               ? 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-800'
                               : project.status === 'Cancelled'
                                 ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
                             : project.status?.includes('Tahap 1')
                               ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
                               : 'bg-[var(--color-accent-50)] text-[var(--color-accent-800)] border-[var(--color-accent-200)] dark:bg-[var(--color-accent-950)/30] dark:text-[var(--color-accent-300)] dark:border-[var(--color-accent-800)]'
                         }`}
                         title="Status Proyek"
                       >
                         {PROJECT_STATUSES.map(status => (
                           <option key={status} value={status}>{status}</option>
                         ))}
                       </select>
                       {isAdmin && <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Proyek" onClick={() => openEditProject(project)}><Edit2 size={16} /></Button>}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" 
                          title={project.isArchived ? "Kembalikan dari Arsip" : "Arsipkan Proyek"} 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await updateProject(project.id, project.ptName, project.address, project.entryDate, { 
                                isArchived: !project.isArchived 
                              });
                              toast.success(project.isArchived ? 'Proyek diaktifkan kembali' : 'Proyek berhasil diarsipkan');
                            } catch (err) {
                              toast.error('Gagal memperbarui status arsip');
                            }
                          }}
                        >
                          {project.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                        </Button>
                       {isAdmin && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Hapus Proyek" onClick={() => handleDeleteProject(project.id)}><Trash2 size={16} /></Button>}
                       {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedProjectId(project.id); setAddTaskModalOpen(true); }}
                          className="gap-1 text-xs h-8 ml-2"
                        >
                          <Plus size={14} /> Tugas
                        </Button>
                       )}
                       <Button
                         variant={activeActivityProjectId === project.id ? "primary" : "outline"}
                         size="sm"
                         onClick={() => setActiveActivityProjectId(activeActivityProjectId === project.id ? null : project.id)}
                         className="gap-1.5 text-xs h-8 ml-1.5"
                         title="Buka Aktivitas Tim & Komentar"
                       >
                         <MessageSquare size={14} />
                         Aktivitas ({project.activities?.length || 0})
                       </Button>
                     </div>
                  </div>
                  {!expandedProjectIds.includes(project.id) && (
                    <div
                      className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted cursor-pointer hover:text-secondary transition-colors"
                      onClick={() => toggleProjectExpanded(project.id)}
                    >
                      <div className="flex items-center gap-1.25">
                        <Calendar size={12} className="opacity-70" />
                        {format(parseISO(project.entryDate), 'dd MMM yyyy')}
                      </div>
                      {project.locations && project.locations.length > 0 && (
                        <div className="flex items-center gap-1.25 truncate max-w-[200px]">
                          <MapPin size={12} className="shrink-0 opacity-70" />
                          <span className="truncate">{project.locations.map(l => l.name).join(', ')}</span>
                        </div>
                      )}
                      {project.locations && project.locations.some(l => l.rooms && l.rooms.length > 0) && (
                        <div className="flex items-center gap-1.25 truncate max-w-[200px]">
                          <Box size={12} className="shrink-0 opacity-70" />
                          <span className="truncate">{Array.from(new Set(project.locations.flatMap(l => l.rooms?.map(r => r.type) || []))).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {expandedProjectIds.includes(project.id) && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-divider mt-2 bg-surface/40"
                      >
                        {/* Tab header bar */}
                        <div className="flex border-b border-divider gap-2 bg-surface-hover/30 px-5 pt-2">
                          <button
                            type="button"
                            onClick={() => setProjectTabs(prev => ({ ...prev, [project.id]: 'details' }))}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                              (projectTabs[project.id] || 'details') === 'details'
                                ? 'border-[var(--color-accent-600)] text-[var(--color-accent-600)] bg-surface'
                                : 'border-transparent text-muted hover:text-secondary'
                            }`}
                          >
                            <Box size={14} />
                            Lokasi & Estimasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectTabs(prev => ({ ...prev, [project.id]: 'tasks' }))}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                              projectTabs[project.id] === 'tasks'
                                ? 'border-[var(--color-accent-600)] text-[var(--color-accent-600)] bg-surface'
                                : 'border-transparent text-muted hover:text-secondary'
                            }`}
                          >
                            <LayoutList size={14} />
                            Tugas & Revisi ({projectTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectTabs(prev => ({ ...prev, [project.id]: 'documents' }))}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                              projectTabs[project.id] === 'documents'
                                ? 'border-[var(--color-accent-600)] text-[var(--color-accent-600)] bg-surface'
                                : 'border-transparent text-muted hover:text-secondary'
                            }`}
                          >
                            <FileText size={14} />
                            Berkas & Dokumen ({project.documents?.length || 0})
                          </button>
                          <button
                            type="button"
                            onClick={() => setProjectTabs(prev => ({ ...prev, [project.id]: 'resources' }))}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                              projectTabs[project.id] === 'resources'
                                ? 'border-[var(--color-accent-600)] text-[var(--color-accent-600)] bg-surface'
                                : 'border-transparent text-muted hover:text-secondary'
                            }`}
                          >
                            <Users size={14} />
                            Sumber Daya Tim
                          </button>
                        </div>

                        <div className="p-5">
                          {/* Tab 1: Lokasi & Estimasi */}
                          {(projectTabs[project.id] || 'details') === 'details' && (
                            <div>
                              <ProjectDescriptionEditor project={project} />
                              <span className="flex items-center gap-1.5 text-xs mb-3 text-secondary"><Calendar size={14} /> Tanggal Masuk: {format(parseISO(project.entryDate), 'dd MMM yyyy')}</span>
                              {project.locations && project.locations.length > 0 ? (
                                <div className="space-y-4">
                                  {project.locations.map((loc, lIdx) => (
                                    <div key={loc.id} className="border border-divider rounded-lg p-3 bg-surface-hover/30">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-divider pb-2">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-primary">{loc.name}</h4>
                                        </div>
                                        <span className="flex items-center gap-1.5 text-xs text-muted">
                                          <MapPin size={12} className="shrink-0" />
                                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent-600)] underline decoration-dotted underline-offset-2 decoration-[var(--color-accent-300)] transition-colors flex items-center gap-1" title="Buka di Google Maps">
                                            {loc.address} <ExternalLink size={10} className="opacity-50" />
                                          </a>
                                        </span>
                                      </div>
                                      
                                      <div className="mb-4">
                                        <CombinedRoomCanvas rooms={loc.rooms || []} />
                                      </div>

                                      {loc.rooms && loc.rooms.length > 0 ? (
                                        <div className="space-y-3">
                                          {loc.rooms.map((room, rIdx) => {
                                            const isExpanded = expandedRoomViews.includes(room.id);
                                            const materialResults = getMaterialEstimation(room);
                                            
                                            return (
                                              <div key={room.id} className="border border-divider rounded-lg overflow-hidden bg-surface">
                                                <div 
                                                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-hover transition-colors select-none"
                                                  onClick={() => toggleRoomView(room.id)}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <Box size={16} className="text-secondary" />
                                                    <div>
                                                      <span className="text-sm font-semibold text-primary">{room.type}</span>
                                                      <span className="text-[10px] text-muted block">Panjang: {room.length || '-'}m | Lebar: {room.width || '-'}m | Tinggi: {room.height || '-'}m</span>
                                                    </div>
                                                  </div>
                                                  <div className="text-muted">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                  </div>
                                                </div>

                                                <AnimatePresence>
                                                  {isExpanded && (
                                                    <motion.div
                                                      initial={{ height: 0, opacity: 0 }}
                                                      animate={{ height: 'auto', opacity: 1 }}
                                                      exit={{ height: 0, opacity: 0 }}
                                                      className="border-t border-divider p-3 bg-surface-hover/10 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs"
                                                    >
                                                      {/* Material Estimation Details */}
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Suhu (°C)</span>
                                                        <span className="font-semibold text-primary">{room.temperature || '-'} °C</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Tebal Panel</span>
                                                        <span className="font-semibold text-primary">{room.panelThickness || '-'} mm</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Jenis Panel</span>
                                                        <span className="font-semibold text-primary">{room.panelType || '-'}</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Jenis Lantai</span>
                                                        <span className="font-semibold text-primary">{room.floorType || '-'}</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Outdoor Machine</span>
                                                        <span className="font-semibold text-primary">{room.outdoorMachine || '-'}</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Evaporator</span>
                                                        <span className="font-semibold text-primary">{room.evaporator || '-'}</span>
                                                      </div>

                                                      {materialResults ? (
                                                        <>
                                                          <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-wider font-semibold text-secondary mb-1 mt-2">Estimasi Panel Polyurethane</div>
                                                          <div>
                                                            <span className="text-muted block mb-0.5">Atap & Lantai (P x L)</span>
                                                            <span className="font-semibold text-primary">2 x {materialResults.roofFloorArea.toFixed(2)} m²</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted block mb-0.5">Sisi 1 & 3 (P x T)</span>
                                                            <span className="font-semibold text-primary">2 x {materialResults.wall1_3Area.toFixed(2)} m²</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted block mb-0.5">Sisi 2 & 4 (L x T)</span>
                                                            <span className="font-semibold text-primary">2 x {materialResults.wall2_4Area.toFixed(2)} m²</span>
                                                          </div>

                                                          <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-wider font-semibold text-secondary mb-1 mt-2">Estimasi Material Siku</div>
                                                          <div>
                                                            <span className="text-muted block mb-0.5">Siku Colorbond</span>
                                                            <span className="font-semibold text-primary">{materialResults.colorbondBatang} btg</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted block mb-0.5">Siku Alumunium</span>
                                                            <span className="font-semibold text-primary">{materialResults.alumuniumBatang} btg</span>
                                                          </div>
                                                          <div>
                                                            <span className="text-muted block mb-0.5">Siku Besi</span>
                                                            <span className="font-semibold text-primary">{materialResults.ironBatang} btg</span>
                                                          </div>
                                                        </>
                                                      ) : (
                                                        <div className="p-4 text-center text-muted col-span-2 sm:col-span-3">
                                                          <p className="text-xs">Dimensi belum lengkap untuk estimasi material.</p>
                                                        </div>
                                                      )}
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted">Belum ada ruangan di lokasi ini.</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted mt-2">Tidak ada data lokasi.</p>
                              )}
                            </div>
                          )}

                          {/* Tab 2: Tugas & Revisi */}
                          {projectTabs[project.id] === 'tasks' && (
                            <div className="space-y-4">
                              {isAdmin && <QuickTaskCreator project={project} />}
                              {/* Tugas Umum */}
                              <div className="border border-divider rounded-lg p-4 bg-surface">
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-divider">
                                  <h5 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <LayoutList size={14} className="text-[var(--color-accent-500)]" />
                                    Tugas Umum / Global ({projectTasks.filter(t => !t.locationId).length})
                                  </h5>
                                  {isAdmin && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => { setSelectedProjectId(project.id); setSelectedLocationId(''); setAddTaskModalOpen(true); }}
                                      className="gap-1 h-6 px-2 text-[10px]"
                                    >
                                      <Plus size={10} /> Tambah Tugas
                                    </Button>
                                  )}
                                </div>
                                {projectTasks.filter(t => !t.locationId).length === 0 ? (
                                  <p className="text-xs text-muted py-2 text-center">Belum ada tugas umum di proyek ini.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {projectTasks.filter(t => !t.locationId).map(task => renderTaskItem(task, project))}
                                  </div>
                                )}
                              </div>

                              {/* Tugas Lokasi */}
                              {project.locations && project.locations.length > 0 && (
                                <div className="space-y-4">
                                  {project.locations.map((loc) => {
                                    const locTasks = projectTasks.filter(t => t.locationId === loc.id);
                                    return (
                                      <div key={loc.id} className="border border-divider rounded-lg p-4 bg-surface">
                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-divider">
                                          <h5 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                            <MapPin size={14} className="text-[var(--color-accent-500)] shrink-0" />
                                            Tugas di {loc.name} ({locTasks.length})
                                          </h5>
                                          {isAdmin && (
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              onClick={() => { setSelectedProjectId(project.id); setSelectedLocationId(loc.id); setAddTaskModalOpen(true); }}
                                              className="gap-1 h-6 px-2 text-[10px]"
                                            >
                                              <Plus size={10} /> Tambah Tugas
                                            </Button>
                                          )}
                                        </div>
                                        {locTasks.length === 0 ? (
                                          <p className="text-xs text-muted py-2 text-center">Belum ada tugas di lokasi ini.</p>
                                        ) : (
                                          <div className="space-y-3">
                                            {locTasks.map(task => renderTaskItem(task, project))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tab 3: Berkas / Penyimpanan Dokumen */}
                          {projectTabs[project.id] === 'documents' && (
                            <div className="space-y-4">
                              <div className="border border-divider rounded-lg p-4 bg-surface">
                                <h4 className="text-sm font-bold text-primary mb-1">Penyimpanan Dokumen</h4>
                                <p className="text-xs text-muted mb-4">Kelola gambar teknik (Drawings), spesifikasi teknis (Specs), dan korespondensi drafting tim di sini.</p>

                                {/* Inline upload form with drag & drop */}
                                <div className="mb-6 bg-surface-hover/30 p-4 rounded-xl border border-divider">
                                  <label className="text-xs font-semibold text-secondary block mb-1.5">Kategori Dokumen:</label>
                                  <div className="flex gap-4 mb-3">
                                    {['Drawings', 'Specs', 'Correspondence'].map((cat) => (
                                      <label key={cat} className="flex items-center gap-1.5 text-xs text-primary cursor-pointer">
                                        <input 
                                          type="radio" 
                                          name={`upload-cat-${project.id}`} 
                                          value={cat} 
                                          defaultChecked={cat === 'Drawings'}
                                          id={`cat-choice-${project.id}-${cat}`}
                                          className="accent-[var(--color-accent-600)]"
                                        />
                                        <span>
                                          {cat === 'Drawings' ? 'Drawings (Gambar)' : cat === 'Specs' ? 'Specs (Spesifikasi)' : 'Correspondence (Surat)'}
                                        </span>
                                      </label>
                                    ))}
                                  </div>

                                  <div 
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setDocumentIsDragging(prev => ({ ...prev, [project.id]: true }));
                                    }}
                                    onDragLeave={() => {
                                      setDocumentIsDragging(prev => ({ ...prev, [project.id]: false }));
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setDocumentIsDragging(prev => ({ ...prev, [project.id]: false }));
                                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        const choiceEl = document.querySelector(`input[name="upload-cat-${project.id}"]:checked`) as HTMLInputElement;
                                        const cat = (choiceEl?.value || 'Drawings') as 'Drawings' | 'Specs' | 'Correspondence';
                                        handleUploadProjectDocument(project, e.dataTransfer.files, cat);
                                      }
                                    }}
                                    onClick={() => {
                                      const inputEl = document.getElementById(`doc-file-input-${project.id}`);
                                      if (inputEl) inputEl.click();
                                    }}
                                    className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                                      documentIsDragging[project.id]
                                        ? 'border-[var(--color-accent-600)] bg-[var(--color-accent-50)]/50 dark:bg-[var(--color-accent-950)]/20'
                                        : 'border-divider bg-surface-hover/30 hover:border-secondary hover:bg-surface-hover/60'
                                    }`}
                                  >
                                    <input 
                                      type="file" 
                                      id={`doc-file-input-${project.id}`}
                                      className="hidden" 
                                      multiple 
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                          const choiceEl = document.querySelector(`input[name="upload-cat-${project.id}"]:checked`) as HTMLInputElement;
                                          const cat = (choiceEl?.value || 'Drawings') as 'Drawings' | 'Specs' | 'Correspondence';
                                          handleUploadProjectDocument(project, e.target.files, cat);
                                        }
                                      }}
                                    />
                                    <FileUp size={24} className="mx-auto text-muted mb-2" />
                                    <p className="text-xs font-medium text-primary">Tarik & lepas berkas ke sini, atau klik untuk memilih berkas</p>
                                    <p className="text-[10px] text-muted mt-1">Mendukung Gambar, PDF, Dokumen, Spreadsheet, dll. (Maksimal 15MB)</p>
                                  </div>
                                </div>

                                {/* Documents listing by folders */}
                                <div className="space-y-4">
                                  {['Drawings', 'Specs', 'Correspondence'].map((category) => {
                                    const catDocs = (project.documents || []).filter(d => d.category === category);
                                    return (
                                      <div key={category} className="border border-divider rounded-lg overflow-hidden bg-surface">
                                        <div className="bg-surface-hover/30 p-2.5 px-3 flex items-center justify-between border-b border-divider">
                                          <div className="flex items-center gap-2">
                                            <Folder size={16} className="text-amber-500 fill-amber-500/20" />
                                            <span className="text-xs font-bold text-primary">
                                              {category === 'Drawings' ? 'Gambar Teknik / Drawings' : category === 'Specs' ? 'Spesifikasi Teknis / Specs' : 'Korespondensi & Surat'}
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-semibold bg-surface px-2 py-0.5 rounded-full border border-divider text-secondary">
                                            {catDocs.length} Berkas
                                          </span>
                                        </div>

                                        <div className="p-2 space-y-1.5">
                                          {catDocs.length === 0 ? (
                                            <p className="text-[11px] text-muted text-center py-4">Tidak ada berkas di folder ini.</p>
                                          ) : (
                                            catDocs.map((doc) => {
                                              const isImage = doc.type?.startsWith('image/');
                                              const isPdf = doc.type === 'application/pdf';
                                              
                                              return (
                                                <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg border border-divider/50 bg-surface hover:bg-surface-hover/20 transition-all text-xs">
                                                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
                                                    {isImage ? (
                                                      <ImageIcon size={16} className="text-emerald-500 shrink-0" />
                                                    ) : isPdf ? (
                                                      <FileText size={16} className="text-red-500 shrink-0" />
                                                    ) : (
                                                      <FileSpreadsheet size={16} className="text-blue-500 shrink-0" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                      <span className="font-semibold text-primary block truncate" title={doc.name}>
                                                        {doc.name}
                                                      </span>
                                                      <span className="text-[9px] text-muted block mt-0.5">
                                                        Diunggah {format(parseISO(doc.uploadedAt), 'dd MMM yyyy HH:mm')} oleh {doc.uploadedBy}
                                                      </span>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1 shrink-0">
                                                    <a 
                                                      href={doc.url} 
                                                      download={doc.name}
                                                      className="p-1.5 hover:bg-surface-hover rounded-md text-secondary hover:text-primary transition-colors cursor-pointer"
                                                      title="Unduh Berkas"
                                                    >
                                                      <Download size={14} />
                                                    </a>
                                                    {isImage && (
                                                      <a 
                                                        href={doc.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="p-1.5 hover:bg-surface-hover rounded-md text-secondary hover:text-primary transition-colors cursor-pointer"
                                                        title="Pratinjau Berkas"
                                                      >
                                                        <Eye size={14} />
                                                      </a>
                                                    )}
                                                    <Button 
                                                      variant="ghost" 
                                                      size="sm" 
                                                      onClick={() => handleDeleteProjectDocument(project, doc.id)}
                                                      className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                      title="Hapus Berkas"
                                                    >
                                                      <Trash2 size={14} />
                                                    </Button>
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
                              </div>
                            </div>
                          )}

                          {/* Tab 4: Sumber Daya Tim */}
                          {projectTabs[project.id] === 'resources' && (
                            <ProjectResourceTab project={project} projectTasks={projectTasks} />
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
      )}

      {/* Add Project Modal */}
      <Modal isOpen={isAddProjectModalOpen} onClose={() => setAddProjectModalOpen(false)} title="Tambah Proyek Baru">
        <form onSubmit={handleAddProject} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Nama PT / Instansi</label>
            <Input required value={ptName} onChange={e => setPtName(e.target.value)} placeholder="Contoh: PT. Maju Jaya" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Tanggal Masuk</label>
            <Input type="date" required value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>

          <div className="mt-4 pt-4 border-t border-divider">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-primary">Daftar Lokasi</label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddLocation} className="h-7 text-xs gap-1 py-0"><Plus size={14} /> Lokasi</Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-divider mb-3">
              {locations.map((loc, idx) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveLocationId(loc.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeLocationId === loc.id
                      ? 'bg-[var(--color-accent-600)] text-[var(--color-accent-100)] dark:text-[var(--color-accent-900)] shadow-sm'
                      : 'bg-surface border border-divider text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {loc.name || `Lokasi ${idx + 1}`}
                  {locations.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRemoveLocation(loc.id); }}
                      className={`transition-opacity opacity-60 hover:opacity-100 ${activeLocationId === loc.id ? 'hover:text-red-200' : 'hover:text-red-500'}`}
                    >
                      <Trash2 size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {locations.map((activeLoc) => {
              if (activeLoc.id !== activeLocationId) return null;
              return (
                <div key={activeLoc.id} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Nama Lokasi</label>
                      <Input required value={activeLoc.name} onChange={e => updateLocation(activeLoc.id, 'name', e.target.value)} placeholder="Contoh: Pusat, Depot Bogor" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Alamat Lokasi</label>
                      <Input required value={activeLoc.address} onChange={e => updateLocation(activeLoc.id, 'address', e.target.value)} placeholder="Contoh: Jl. Sudirman No 1" className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="border border-divider rounded-xl p-4 space-y-4 bg-surface-hover/20 mt-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-600)] pb-2 border-b border-divider">
                      <Plus size={16} />
                      <span>Tambah Ruangan Baru</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Nama Ruangan</label>
                      <Input
                        value={newRoomName}
                        onChange={e => setNewRoomName(e.target.value)}
                        placeholder="e.g. Ruang Chiller 1, Freezer Room B"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-primary">Panjang (mm)</label>
                        <Input
                          type="number"
                          value={newRoomLength}
                          onChange={e => setNewRoomLength(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-primary">Lebar (mm)</label>
                        <Input
                          type="number"
                          value={newRoomWidth}
                          onChange={e => setNewRoomWidth(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-primary">Tinggi (mm)</label>
                        <Input
                          type="number"
                          value={newRoomHeight}
                          onChange={e => setNewRoomHeight(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Jenis Lantai</label>
                      <select
                        value={newRoomFloorType}
                        onChange={e => setNewRoomFloorType(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                      >
                        <option value="tanpa lantai">Tanpa Lantai</option>
                        <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
                        <option value="concrete">Concrete (Cor Beton)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Tebal Panel</label>
                        <select
                          value={newRoomThickness}
                          onChange={e => setNewRoomThickness(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="50mm">50 mm</option>
                          <option value="75mm">75 mm</option>
                          <option value="100mm">100 mm</option>
                          <option value="150mm">150 mm</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Jenis Panel</label>
                        <select
                          value={newRoomPanelType}
                          onChange={e => setNewRoomPanelType(e.target.value as PanelType)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="PU">PU (Polyurethane)</option>
                          <option value="PIR">PIR (Polyisocyanurate)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-divider">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Jenis Mesin</label>
                        <select
                          value={newRoomMachineType}
                          onChange={e => setNewRoomMachineType(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="">Pilih Jenis Mesin</option>
                          <option value="Split">Split</option>
                          <option value="Plug-In">Plug-In</option>
                        </select>
                      </div>

                      {newRoomMachineType === 'Plug-In' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-xs font-medium text-primary">Mounting Type</label>
                          <select
                            value={newRoomMountingType}
                            onChange={e => setNewRoomMountingType(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="Roof Mount">Roof Mount</option>
                            <option value="Wall Mount">Wall Mount</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {newRoomMachineType === 'Plug-In' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                        <Input
                          value={newRoomMachineCapacity}
                          onChange={e => setNewRoomMachineCapacity(e.target.value)}
                          placeholder="Contoh: 1.5 HP"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {newRoomMachineType === 'Split' && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                          <Input
                            value={newRoomOutdoorMachine}
                            onChange={e => setNewRoomOutdoorMachine(e.target.value)}
                            placeholder="Contoh: CDU 5HP"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Evaporator</label>
                          <Input
                            value={newRoomEvaporator}
                            onChange={e => setNewRoomEvaporator(e.target.value)}
                            placeholder="Contoh: V-Type"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 border-t border-divider pt-2.5">
                      <label className="text-xs font-semibold text-[var(--color-accent-600)]">Pintu</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Jenis Pintu</label>
                          <select
                            value={newRoomDoorType}
                            onChange={e => setNewRoomDoorType(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="">Jenis Pintu</option>
                            <option value="Swing Door">Swing Door</option>
                            <option value="Sliding Door">Sliding Door</option>
                            <option value="Clean Room Swing Door">Clean Room Swing Door</option>
                            <option value="Clean Room Sliding Door">Clean Room Sliding Door</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Lebar (mm)</label>
                          <Input
                            type="number"
                            value={newRoomDoorWidth}
                            onChange={e => setNewRoomDoorWidth(e.target.value)}
                            placeholder="Lebar"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Tinggi (mm)</label>
                          <Input
                            type="number"
                            value={newRoomDoorHeight}
                            onChange={e => setNewRoomDoorHeight(e.target.value)}
                            placeholder="Tinggi"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Qty</label>
                          <Input
                            type="number"
                            value={newRoomDoorQty}
                            onChange={e => setNewRoomDoorQty(e.target.value)}
                            placeholder="Qty"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleAddRoomToLocation(activeLoc.id)}
                      className="w-full bg-[#9fcdd8] text-gray-900 hover:bg-[#8ebcc7] font-semibold text-xs py-2 rounded-md transition-colors"
                    >
                      Tambah Ruangan
                    </Button>
                  </div>

                  {activeLoc.rooms && activeLoc.rooms.length > 0 && (
                     <CombinedRoomCanvas
                         rooms={activeLoc.rooms}
                         onRoomPositionChange={(idx, x, y) => updateRoomPosition(activeLoc.id, idx, x, y)}
                         onRoomDimensionChange={(idx, field, value) => updateRoomDetail(activeLoc.id, idx, field, value)}
                     />
                  )}

                  {activeLoc.rooms?.map((room, index) => (
                    <div key={room.id || room.type} className="border border-divider rounded-md p-3 space-y-3 mt-3 bg-surface-hover/30">
                      <div className="flex items-center justify-between border-b border-divider pb-1.5">
                        <h4 className="text-sm font-medium text-primary">{room.type}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() => {
                            setLocations(prev => prev.map(l => {
                              if (l.id === activeLoc.id) {
                                return {
                                  ...l,
                                  rooms: l.rooms?.filter(r => r.id !== room.id)
                                };
                              }
                              return l;
                            }));
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Panjang (mm)</label>
                          <Input type="number" value={room.length || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'length', e.target.value)} placeholder="0" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Lebar (mm)</label>
                          <Input type="number" value={room.width || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'width', e.target.value)} placeholder="0" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Tinggi (mm)</label>
                          <Input type="number" value={room.height || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'height', e.target.value)} placeholder="0" className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Jenis Lantai</label>
                        <select
                          value={normalizeFloorType(room.floorType)}
                          onChange={e => updateRoomDetail(activeLoc.id, index, 'floorType', e.target.value)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="tanpa lantai">Tanpa Lantai</option>
                          <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
                          <option value="concrete">Concrete (Cor Beton)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Tebal Panel</label>
                          <select
                            value={normalizeThickness(room.panelThickness)}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'panelThickness', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="50mm">50 mm</option>
                            <option value="75mm">75 mm</option>
                            <option value="100mm">100 mm</option>
                            <option value="150mm">150 mm</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Jenis Panel</label>
                          <select
                            value={normalizePanelType(room.panelType)}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'panelType', e.target.value as PanelType)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="PU">PU (Polyurethane)</option>
                            <option value="PIR">PIR (Polyisocyanurate)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Jenis Mesin</label>
                          <select
                            value={room.machineType || ''}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'machineType', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="">Pilih Jenis Mesin</option>
                            <option value="Split">Split</option>
                            <option value="Plug-In">Plug-In</option>
                          </select>
                        </div>
                        {room.machineType === 'Plug-In' && (
                          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-xs font-medium text-primary">Mounting Type</label>
                            <select
                              value={room.mountingType || 'Roof Mount'}
                              onChange={e => updateRoomDetail(activeLoc.id, index, 'mountingType', e.target.value)}
                              className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                            >
                              <option value="Roof Mount">Roof Mount</option>
                              <option value="Wall Mount">Wall Mount</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {room.machineType === 'Plug-In' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                          <Input
                            value={room.machineCapacity || ''}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'machineCapacity', e.target.value)}
                            placeholder="Contoh: 1.5 HP"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      {(!room.machineType || room.machineType === 'Split' || room.outdoorMachine || room.evaporator) && room.machineType !== 'Plug-In' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                            <Input value={room.outdoorMachine || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'outdoorMachine', e.target.value)} placeholder="Contoh: CDU 5HP" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-primary">Evaporator</label>
                            <Input value={room.evaporator || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'evaporator', e.target.value)} placeholder="Contoh: V-Type" className="h-8 text-xs" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary block">Pintu</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <select
                            value={room.doorType || ''}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'doorType', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="">Jenis Pintu</option>
                            <option value="Swing Door">Swing Door</option>
                            <option value="Sliding Door">Sliding Door</option>
                            <option value="Clean Room Swing Door">Clean Room Swing Door</option>
                            <option value="Clean Room Sliding Door">Clean Room Sliding Door</option>
                          </select>
                          <Input type="number" value={room.doorWidth || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'doorWidth', e.target.value)} placeholder="Lebar (mm)" className="h-8 text-xs" />
                          <Input type="number" value={room.doorHeight || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'doorHeight', e.target.value)} placeholder="Tinggi (mm)" className="h-8 text-xs" />
                          <Input type="number" value={room.doorQty || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'doorQty', e.target.value)} placeholder="Qty" className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Catatan</label>
                        <Textarea value={room.note || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'note', e.target.value)} placeholder="Ketik catatan di sini..." className="text-xs" rows={2} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-divider">
            <Button type="button" variant="ghost" onClick={() => setAddProjectModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Proyek</Button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal isOpen={isAddTaskModalOpen} onClose={() => setAddTaskModalOpen(false)} title="Tambah Tugas / Revisi">
        <form onSubmit={handleAddTask} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Nama / Judul Tugas</label>
            <Input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Contoh: Layout, Wiring, BQ, dll..." list="task-suggestions" />
            <datalist id="task-suggestions">
              <option value="Layout" />
              <option value="Wiring" />
              <option value="BQ" />
            </datalist>
            <p className="text-[10px] text-secondary mt-1">biasanya untuk tugas ada 3 yaitu layout, wiring, dan bq tapi bisa juga yang lainnya</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Lokasi (Opsional)</label>
            <select
              value={selectedLocationId || ''}
              onChange={e => setSelectedLocationId(e.target.value || undefined)}
              className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
            >
              <option value="">Tugas Umum / Global (Tanpa Lokasi)</option>
              {projects.find(p => p.id === selectedProjectId)?.locations?.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="additional"
              checked={isAdditional}
              onChange={e => setIsAdditional(e.target.checked)}
              className="w-4 h-4 rounded border-divider text-[var(--color-accent-600)] focus:ring-[var(--color-accent-600)]"
            />
            <label htmlFor="additional" className="text-sm text-secondary cursor-pointer">Tugas Tambahan di Proyek Ini</label>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddTaskModalOpen(false)}>Batal</Button>
            <Button type="submit">Tambahkan</Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={isStatusModalOpen} onClose={() => setStatusModalOpen(false)} title="Perbarui Status & Log">
        <form onSubmit={handleUpdateStatus} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Ubah Status</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {statuses.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewStatus(s)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border text-center transition-colors ${
                    newStatus === s
                      ? 'bg-[var(--color-accent-100)] border-[var(--color-accent-500)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-900)] dark:border-[var(--color-accent-500)] dark:text-[var(--color-accent-200)]'
                      : 'bg-surface border-divider text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-primary flex items-center justify-between">
              Catatan / Keterangan Revisi
              <span className="text-xs font-normal text-muted">(Opsional)</span>
            </label>
            <Textarea
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Jelaskan progres atau apa yang harus direvisi (opsional)..."
              rows={3}
              onPaste={handlePaste}
            />
          </div>
          <div
            className="space-y-1.5 pt-2"
            onPaste={handlePaste}
          >
            <label className="text-sm font-medium text-primary flex items-center justify-between">
              Lampiran File / Foto
              <span className="text-xs font-normal text-muted">(Opsional, Ctrl+V untuk tempel foto)</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('status-file-upload')?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-[var(--color-accent-500)] bg-[var(--color-accent-50)]/10 dark:bg-[var(--color-accent-950)]/10'
                  : 'border-divider hover:border-[var(--color-accent-400)] hover:bg-surface-hover bg-surface'
              }`}
            >
              <input
                id="status-file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileAttach(e.target.files);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Paperclip size={20} className="text-muted" />
                <p className="text-xs font-medium text-secondary">
                  Tarik & lepas file di sini, atau <span className="text-[var(--color-accent-600)] hover:underline">pilih file</span>
                </p>
                <p className="text-[10px] text-muted">
                  Mendukung foto, PDF, DOCX, XLSX, TXT, dll. (Maks 10MB)
                </p>
              </div>
            </div>

            {attachedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-[150px] overflow-y-auto">
                {attachedFiles.map((file) => {
                  const isImg = file.type.startsWith('image/');
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 rounded-md bg-surface-hover border border-divider text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isImg ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-8 w-8 rounded object-cover shrink-0 border border-divider"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-surface border border-divider flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-muted" />
                          </div>
                        )}
                        <span className="truncate font-medium text-secondary" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFiles(prev => prev.filter(f => f.id !== file.id));
                        }}
                        className="p-1 text-muted hover:text-red-500 hover:bg-surface rounded transition-colors"
                        title="Hapus lampiran"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setStatusModalOpen(false)}>Batal</Button>
            <Button type="submit">Catat Perubahan</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditProjectModalOpen} onClose={() => setEditProjectModalOpen(false)} title="Edit Proyek">
        <form onSubmit={handleEditProject} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Nama PT / Instansi</label>
            <Input required value={ptName} onChange={e => setPtName(e.target.value)} placeholder="Contoh: PT. Maju Jaya" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Tanggal Masuk</label>
            <Input type="date" required value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>

          <div className="mt-4 pt-4 border-t border-divider">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-primary">Daftar Lokasi</label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddLocation} className="h-7 text-xs gap-1 py-0"><Plus size={14} /> Lokasi</Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-divider mb-3">
              {locations.map((loc, idx) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveLocationId(loc.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2 ${
                    activeLocationId === loc.id
                      ? 'bg-[var(--color-accent-600)] text-[var(--color-accent-100)] dark:text-[var(--color-accent-900)] shadow-sm'
                      : 'bg-surface border border-divider text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {loc.name || `Lokasi ${idx + 1}`}
                  {locations.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRemoveLocation(loc.id); }}
                      className={`transition-opacity opacity-60 hover:opacity-100 ${activeLocationId === loc.id ? 'hover:text-red-200' : 'hover:text-red-500'}`}
                    >
                      <Trash2 size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {locations.map((activeLoc) => {
              if (activeLoc.id !== activeLocationId) return null;
              return (
                <div key={activeLoc.id} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Nama Lokasi</label>
                      <Input required value={activeLoc.name} onChange={e => updateLocation(activeLoc.id, 'name', e.target.value)} placeholder="Contoh: Pusat, Depot Bogor" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Alamat Lokasi</label>
                      <Input required value={activeLoc.address} onChange={e => updateLocation(activeLoc.id, 'address', e.target.value)} placeholder="Contoh: Jl. Sudirman No 1" className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="border border-divider rounded-xl p-4 space-y-4 bg-surface-hover/20 mt-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-600)] pb-2 border-b border-divider">
                      <Plus size={16} />
                      <span>Tambah Ruangan Baru</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Nama Ruangan</label>
                      <Input
                        value={newRoomName}
                        onChange={e => setNewRoomName(e.target.value)}
                        placeholder="e.g. Ruang Chiller 1, Freezer Room B"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-primary">Panjang (mm)</label>
                        <Input
                          type="number"
                          value={newRoomLength}
                          onChange={e => setNewRoomLength(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-primary">Lebar (mm)</label>
                        <Input
                          type="number"
                          value={newRoomWidth}
                          onChange={e => setNewRoomWidth(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-primary">Tinggi (mm)</label>
                        <Input
                          type="number"
                          value={newRoomHeight}
                          onChange={e => setNewRoomHeight(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-primary">Jenis Lantai</label>
                      <select
                        value={newRoomFloorType}
                        onChange={e => setNewRoomFloorType(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                      >
                        <option value="tanpa lantai">Tanpa Lantai</option>
                        <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
                        <option value="concrete">Concrete (Cor Beton)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Tebal Panel</label>
                        <select
                          value={newRoomThickness}
                          onChange={e => setNewRoomThickness(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="50mm">50 mm</option>
                          <option value="75mm">75 mm</option>
                          <option value="100mm">100 mm</option>
                          <option value="150mm">150 mm</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Jenis Panel</label>
                        <select
                          value={newRoomPanelType}
                          onChange={e => setNewRoomPanelType(e.target.value as PanelType)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="PU">PU (Polyurethane)</option>
                          <option value="PIR">PIR (Polyisocyanurate)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-divider">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Jenis Mesin</label>
                        <select
                          value={newRoomMachineType}
                          onChange={e => setNewRoomMachineType(e.target.value)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="">Pilih Jenis Mesin</option>
                          <option value="Split">Split</option>
                          <option value="Plug-In">Plug-In</option>
                        </select>
                      </div>

                      {newRoomMachineType === 'Plug-In' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-xs font-medium text-primary">Mounting Type</label>
                          <select
                            value={newRoomMountingType}
                            onChange={e => setNewRoomMountingType(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="Roof Mount">Roof Mount</option>
                            <option value="Wall Mount">Wall Mount</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {newRoomMachineType === 'Plug-In' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                        <Input
                          value={newRoomMachineCapacity}
                          onChange={e => setNewRoomMachineCapacity(e.target.value)}
                          placeholder="Contoh: 1.5 HP"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    {newRoomMachineType === 'Split' && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                          <Input
                            value={newRoomOutdoorMachine}
                            onChange={e => setNewRoomOutdoorMachine(e.target.value)}
                            placeholder="Contoh: CDU 5HP"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Evaporator</label>
                          <Input
                            value={newRoomEvaporator}
                            onChange={e => setNewRoomEvaporator(e.target.value)}
                            placeholder="Contoh: V-Type"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 border-t border-divider pt-2.5">
                      <label className="text-xs font-semibold text-[var(--color-accent-600)]">Pintu</label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Jenis Pintu</label>
                          <select
                            value={newRoomDoorType}
                            onChange={e => setNewRoomDoorType(e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="">Jenis Pintu</option>
                            <option value="Swing Door">Swing Door</option>
                            <option value="Sliding Door">Sliding Door</option>
                            <option value="Clean Room Swing Door">Clean Room Swing Door</option>
                            <option value="Clean Room Sliding Door">Clean Room Sliding Door</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Lebar (mm)</label>
                          <Input
                            type="number"
                            value={newRoomDoorWidth}
                            onChange={e => setNewRoomDoorWidth(e.target.value)}
                            placeholder="Lebar"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Tinggi (mm)</label>
                          <Input
                            type="number"
                            value={newRoomDoorHeight}
                            onChange={e => setNewRoomDoorHeight(e.target.value)}
                            placeholder="Tinggi"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-primary">Qty</label>
                          <Input
                            type="number"
                            value={newRoomDoorQty}
                            onChange={e => setNewRoomDoorQty(e.target.value)}
                            placeholder="Qty"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleAddRoomToLocation(activeLoc.id)}
                      className="w-full bg-[#9fcdd8] text-gray-900 hover:bg-[#8ebcc7] font-semibold text-xs py-2 rounded-md transition-colors"
                    >
                      Tambah Ruangan
                    </Button>
                  </div>

                  {activeLoc.rooms && activeLoc.rooms.length > 0 && (
                     <CombinedRoomCanvas
                         rooms={activeLoc.rooms}
                         onRoomPositionChange={(idx, x, y) => updateRoomPosition(activeLoc.id, idx, x, y)}
                         onRoomDimensionChange={(idx, field, value) => updateRoomDetail(activeLoc.id, idx, field, value)}
                     />
                  )}

                  {activeLoc.rooms?.map((room, index) => (
                    <div key={room.id || room.type} className="border border-divider rounded-md p-3 space-y-3 mt-3 bg-surface-hover/30">
                      <div className="flex items-center justify-between border-b border-divider pb-1.5">
                        <h4 className="text-sm font-medium text-primary">{room.type}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                          onClick={() => {
                            setLocations(prev => prev.map(l => {
                              if (l.id === activeLoc.id) {
                                return {
                                  ...l,
                                  rooms: l.rooms?.filter(r => r.id !== room.id)
                                };
                              }
                              return l;
                            }));
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Panjang (mm)</label>
                          <Input type="number" value={room.length || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'length', e.target.value)} placeholder="0" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Lebar (mm)</label>
                          <Input type="number" value={room.width || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'width', e.target.value)} placeholder="0" className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Tinggi (mm)</label>
                          <Input type="number" value={room.height || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'height', e.target.value)} placeholder="0" className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Jenis Lantai</label>
                        <select
                          value={normalizeFloorType(room.floorType)}
                          onChange={e => updateRoomDetail(activeLoc.id, index, 'floorType', e.target.value)}
                          className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                        >
                          <option value="tanpa lantai">Tanpa Lantai</option>
                          <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
                          <option value="concrete">Concrete (Cor Beton)</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Tebal Panel</label>
                          <select
                            value={normalizeThickness(room.panelThickness)}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'panelThickness', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="50mm">50 mm</option>
                            <option value="75mm">75 mm</option>
                            <option value="100mm">100 mm</option>
                            <option value="150mm">150 mm</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Jenis Panel</label>
                          <select
                            value={normalizePanelType(room.panelType)}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'panelType', e.target.value as PanelType)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="PU">PU (Polyurethane)</option>
                            <option value="PIR">PIR (Polyisocyanurate)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Jenis Mesin</label>
                          <select
                            value={room.machineType || ''}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'machineType', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="">Pilih Jenis Mesin</option>
                            <option value="Split">Split</option>
                            <option value="Plug-In">Plug-In</option>
                          </select>
                        </div>
                        {room.machineType === 'Plug-In' && (
                          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-xs font-medium text-primary">Mounting Type</label>
                            <select
                              value={room.mountingType || 'Roof Mount'}
                              onChange={e => updateRoomDetail(activeLoc.id, index, 'mountingType', e.target.value)}
                              className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                            >
                              <option value="Roof Mount">Roof Mount</option>
                              <option value="Wall Mount">Wall Mount</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {room.machineType === 'Plug-In' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                          <Input
                            value={room.machineCapacity || ''}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'machineCapacity', e.target.value)}
                            placeholder="Contoh: 1.5 HP"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}

                      {(!room.machineType || room.machineType === 'Split' || room.outdoorMachine || room.evaporator) && room.machineType !== 'Plug-In' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                            <Input value={room.outdoorMachine || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'outdoorMachine', e.target.value)} placeholder="Contoh: CDU 5HP" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-primary">Evaporator</label>
                            <Input value={room.evaporator || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'evaporator', e.target.value)} placeholder="Contoh: V-Type" className="h-8 text-xs" />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary block">Pintu</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <select
                            value={room.doorType || ''}
                            onChange={e => updateRoomDetail(activeLoc.id, index, 'doorType', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                          >
                            <option value="">Jenis Pintu</option>
                            <option value="Swing Door">Swing Door</option>
                            <option value="Sliding Door">Sliding Door</option>
                            <option value="Clean Room Swing Door">Clean Room Swing Door</option>
                            <option value="Clean Room Sliding Door">Clean Room Sliding Door</option>
                          </select>
                          <Input type="number" value={room.doorWidth || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'doorWidth', e.target.value)} placeholder="Lebar (mm)" className="h-8 text-xs" />
                          <Input type="number" value={room.doorHeight || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'doorHeight', e.target.value)} placeholder="Tinggi (mm)" className="h-8 text-xs" />
                          <Input type="number" value={room.doorQty || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'doorQty', e.target.value)} placeholder="Qty" className="h-8 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-primary">Catatan</label>
                        <Textarea value={room.note || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'note', e.target.value)} placeholder="Ketik catatan di sini..." className="text-xs" rows={2} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-divider">
            <Button type="button" variant="ghost" onClick={() => setEditProjectModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal isOpen={isEditTaskModalOpen} onClose={() => setEditTaskModalOpen(false)} title="Edit Tugas">
        <form onSubmit={handleEditTask} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Nama / Judul Tugas</label>
            <Input required value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Contoh: Layout, Wiring, BQ, dll..." list="task-suggestions" />
            <datalist id="task-suggestions">
              <option value="Layout" />
              <option value="Wiring" />
              <option value="BQ" />
            </datalist>
            <p className="text-[10px] text-secondary mt-1">biasanya untuk tugas ada 3 yaitu layout, wiring, dan bq tapi bisa juga yang lainnya</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="edit-additional"
              checked={isAdditional}
              onChange={e => setIsAdditional(e.target.checked)}
              className="w-4 h-4 rounded border-divider text-[var(--color-accent-600)] focus:ring-[var(--color-accent-600)]"
            />
            <label htmlFor="edit-additional" className="text-sm text-secondary cursor-pointer">Tugas Tambahan di Proyek Ini</label>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditTaskModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Log Modal */}
      <Modal isOpen={isEditLogModalOpen} onClose={() => setEditLogModalOpen(false)} title="Edit Keterangan Log">
        <form onSubmit={handleEditLog} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-primary">Keterangan / Catatan</label>
            <Textarea
              required
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              placeholder="Jelaskan progres..."
              rows={12}
              className="text-xs"
            />
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditLogModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan Perubahan</Button>
          </div>
        </form>
      </Modal>

      {/* Kalkulator Heat Load Modal */}
      <Modal isOpen={heatLoadModalOpen} onClose={() => setHeatLoadModalOpen(false)} title={`Kalkulator Heat Load ${heatLoadInitials?.ref ? `(${heatLoadInitials.ref})` : ''}`} maxWidth="max-w-4xl">
        <div className="w-full max-h-[85vh] -mx-4 -my-4 px-4 py-4 overflow-y-auto custom-scrollbar">
          {heatLoadModalOpen && heatLoadInitials && (
            <ColdRoomCalculator
              isModal={true}
              initialDimensions={{ l: heatLoadInitials.l, w: heatLoadInitials.w, h: heatLoadInitials.h }}
              initialProjectRef={heatLoadInitials.ref}
            />
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal isOpen={!!confirmDialog} onClose={() => setConfirmDialog(null)} title={confirmDialog?.title || "Konfirmasi"}>
        <div className="py-4">
          <p className="text-primary text-sm">{confirmDialog?.message}</p>
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setConfirmDialog(null)}>Batal</Button>
          <Button type="button" className="bg-red-500 hover:bg-red-600 focus-visible:ring-red-500 text-white" onClick={() => confirmDialog?.onConfirm()}>Hapus</Button>
        </div>
      </Modal>

      {/* Team Activity Sidebar */}
      <AnimatePresence>
        {activeActivityProjectId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveActivityProjectId(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Sidebar panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md sm:max-w-lg bg-surface border-l border-divider shadow-2xl z-50 flex flex-col h-screen"
            >
              {/* Sidebar Header */}
              {(() => {
                const actProj = projects.find(p => p.id === activeActivityProjectId);
                if (!actProj) return null;
                return (
                  <>
                    <div className="p-4 border-b border-divider bg-surface-hover/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="text-[var(--color-accent-500)]" size={18} />
                        <div>
                          <h3 className="text-sm font-bold text-primary">Aktivitas & Komentar Tim</h3>
                          <p className="text-[11px] text-secondary font-medium truncate max-w-[250px]">{actProj.ptName}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveActivityProjectId(null)}
                        className="h-8 w-8 p-0 hover:bg-surface-hover"
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    {/* Activities list container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                      {(!actProj.activities || actProj.activities.length === 0) ? (
                        <div className="text-center py-16 px-4">
                          <MessageSquare size={36} className="mx-auto text-muted opacity-40 mb-3" />
                          <p className="text-xs font-semibold text-primary">Belum ada aktivitas di proyek ini</p>
                          <p className="text-[11px] text-muted mt-1.5 max-w-xs mx-auto">
                            Tulis komentar di bawah untuk memulai percakapan atau ubah status proyek untuk melihat riwayat aktivitas.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {actProj.activities.map((act) => {
                            const isComment = act.type === 'comment';
                            const formattedTime = format(parseISO(act.timestamp), 'dd MMM yyyy HH:mm');
                            const initials = act.user ? act.user.substring(0, 2).toUpperCase() : 'TIM';

                            return (
                              <div key={act.id} className="flex gap-3">
                                {/* Avatar */}
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  isComment 
                                    ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-800)] dark:bg-[var(--color-accent-900)]/40 dark:text-[var(--color-accent-300)]' 
                                    : 'bg-surface border border-divider text-secondary'
                                }`}>
                                  {initials}
                                </div>

                                <div className="flex-1 min-w-0">
                                  {isComment ? (
                                    <div className="bg-surface-hover/30 border border-divider/50 p-3 rounded-xl">
                                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                                        <span className="text-[11px] font-bold text-primary truncate max-w-[150px]" title={act.user}>
                                          {act.user}
                                        </span>
                                        <span className="text-[9px] text-muted shrink-0">
                                          {formattedTime}
                                        </span>
                                      </div>
                                      <p className="text-xs text-primary whitespace-pre-wrap leading-relaxed">
                                        {act.content}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="pl-1.5 border-l-2 border-divider py-1">
                                      <div className="flex items-center justify-between mb-0.5 gap-2 flex-wrap">
                                        <span className="text-[10px] font-bold text-secondary flex items-center gap-1">
                                          <Info size={10} className="text-muted" />
                                          Pembaluan Sistem
                                        </span>
                                        <span className="text-[9px] text-muted shrink-0">
                                          {formattedTime}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-muted italic">
                                        {act.content} <span className="not-italic text-[9px] text-muted font-semibold">({act.user})</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sidebar Footer - Post Comment Form */}
                    <div className="p-4 border-t border-divider bg-surface">
                      <div className="flex gap-2">
                        <Textarea
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Tulis tanggapan atau komentar tim..."
                          rows={2}
                          className="text-xs resize-none flex-1 min-h-[50px]"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddProjectComment(actProj.id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={() => handleAddProjectComment(actProj.id)}
                          className="bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white h-full px-3"
                          disabled={!newCommentText.trim()}
                        >
                          Kirim
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted mt-2">
                        Tekan Enter untuk mengirim komentar secara langsung ke server.
                      </p>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProjectDescriptionEditor: React.FC<{ project: Project }> = ({ project }) => {
  const { updateProject } = useProjects();
  const [text, setText] = useState(() => {
    return localStorage.getItem(`drafter_desc_draft_${project.id}`) || project.description || '';
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'draft'>('saved');

  // Keep state in sync if project description changes externally
  useEffect(() => {
    if (project.description !== undefined && text === '' && project.description !== text) {
      setText(project.description);
    }
  }, [project.description]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (text !== (project.description || '')) {
        setSaveStatus('saving');
        try {
          await updateProject(project.id, project.ptName, project.address, project.entryDate, {
            description: text
          }, true);
          setSaveStatus('saved');
          localStorage.removeItem(`drafter_desc_draft_${project.id}`);
        } catch (err) {
          setSaveStatus('draft');
        }
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [text, project.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    localStorage.setItem(`drafter_desc_draft_${project.id}`, val);
    setSaveStatus('draft');
  };

  return (
    <div className="bg-surface border border-divider rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} className="text-[var(--color-accent-500)]" />
          Deskripsi Proyek
        </label>
        <span className="text-[10px] flex items-center gap-1 font-medium">
          {saveStatus === 'saving' && (
            <span className="text-amber-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Menyimpan...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Semua perubahan tersimpan
            </span>
          )}
          {saveStatus === 'draft' && (
            <span className="text-blue-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
              Draft disimpan di lokal (auto-save)
            </span>
          )}
        </span>
      </div>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Tulis deskripsi atau instruksi khusus untuk proyek ini di sini... (Tersimpan otomatis)"
        rows={3}
        className="w-full text-xs bg-surface-hover/50 border border-divider rounded-lg p-2.5 focus:outline-none focus:border-[var(--color-accent-500)] focus:bg-surface text-primary transition-all resize-y"
      />
    </div>
  );
};

const QuickTaskCreator: React.FC<{ project: Project }> = ({ project }) => {
  const { addTask } = useProjects();
  const [taskTitle, setTaskTitle] = useState(() => {
    return localStorage.getItem(`drafter_quick_task_draft_${project.id}`) || '';
  });
  const [selectedLocId, setSelectedLocId] = useState<string>('');
  const [isAdd, setIsAdd] = useState(false);

  const handleChangeTitle = (val: string) => {
    setTaskTitle(val);
    if (val) {
      localStorage.setItem(`drafter_quick_task_draft_${project.id}`, val);
    } else {
      localStorage.removeItem(`drafter_quick_task_draft_${project.id}`);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    
    addTask(project.id, taskTitle.trim(), isAdd, selectedLocId || undefined);
    
    // Clear draft
    setTaskTitle('');
    setIsAdd(false);
    setSelectedLocId('');
    localStorage.removeItem(`drafter_quick_task_draft_${project.id}`);
    toast.success('Tugas cepat ditambahkan!');
  };

  const hasDraft = !!taskTitle.trim();

  return (
    <form onSubmit={handleCreate} className="bg-surface border border-divider rounded-xl p-4 mb-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Plus size={14} className="text-[var(--color-accent-500)]" />
          Tambah Tugas Cepat
        </label>
        {hasDraft && (
          <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            Draft input tersimpan (auto-save)
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Ketik tugas cepat (Contoh: Layout, Wiring, BQ...) dan tekan Enter"
            value={taskTitle}
            onChange={(e) => handleChangeTitle(e.target.value)}
            className="w-full text-xs h-9 bg-surface-hover/50 border border-divider rounded-lg px-3 focus:outline-none focus:border-[var(--color-accent-500)] focus:bg-surface text-primary transition-all"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedLocId}
            onChange={(e) => setSelectedLocId(e.target.value)}
            className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
          >
            <option value="">Tugas Umum (Global)</option>
            {project.locations?.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-secondary cursor-pointer select-none shrink-0">
            <input 
              type="checkbox" 
              checked={isAdd} 
              onChange={(e) => setIsAdd(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-divider text-[var(--color-accent-600)]"
            />
            <span>Tambahan</span>
          </label>
          <Button type="submit" disabled={!taskTitle.trim()} size="sm" className="h-9 px-4 shrink-0 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white">
            Tambah
          </Button>
        </div>
      </div>
    </form>
  );
};

const ProjectResourceTab: React.FC<{ project: Project; projectTasks: Task[] }> = ({ project, projectTasks }) => {
  const { updateTask } = useProjects();
  const { usersList: TEAM_MEMBERS } = useAuth();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Drafting' | 'Review'>('Drafting');

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !selectedMemberId) {
      toast.error('Pilih tugas dan anggota tim');
      return;
    }

    const task = projectTasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    updateTask(task.id, task.title, task.isAdditional, selectedMemberId, selectedRole);
    toast.success(`Berhasil menugaskan ke ${TEAM_MEMBERS.find(m => m.id === selectedMemberId)?.name}`);
    
    // reset form
    setSelectedTaskId('');
    setSelectedMemberId('');
  };

  const handleUnassign = (taskId: string) => {
    const task = projectTasks.find(t => t.id === taskId);
    if (!task) return;
    updateTask(task.id, task.title, task.isAdditional, undefined, undefined);
    toast.success('Penugasan berhasil dihapus');
  };

  // Helper to count active tasks of a member across all projects/tasks
  const getActiveTasksCount = (memberId: string) => {
    return projectTasks.filter(t => t.assigneeId === memberId).length;
  };

  return (
    <div className="space-y-6">
      {/* 1. Assignment Form */}
      <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
        <h4 className="text-sm font-bold text-primary mb-1.5 flex items-center gap-1.5">
          <Users size={16} className="text-[var(--color-accent-500)]" />
          Tugaskan Sumber Daya Tim
        </h4>
        <p className="text-xs text-muted mb-4">Assign team members to 'Drafting' or 'Review' tasks based on their availability.</p>
        
        <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Pilih Tugas / Revisi</label>
            <select
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                // Auto-set assignment role based on typical tasks if applicable
                const task = projectTasks.find(t => t.id === e.target.value);
                if (task) {
                  if (task.title.toLowerCase().includes('bq') || task.title.toLowerCase().includes('review') || task.title.toLowerCase().includes('cek')) {
                    setSelectedRole('Review');
                  } else {
                    setSelectedRole('Drafting');
                  }
                }
              }}
              required
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
            >
              <option value="">-- Pilih Tugas --</option>
              {projectTasks.map(t => (
                <option key={t.id} value={t.id}>{t.title} {t.locationId ? `(${project.locations?.find(l => l.id === t.locationId)?.name})` : '(Umum)'}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Pilih Anggota Tim</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
            >
              <option value="">-- Pilih Anggota --</option>
              {TEAM_MEMBERS.map(m => {
                const activeTasks = getActiveTasksCount(m.id);
                return (
                  <option 
                    key={m.id} 
                    value={m.id} 
                    disabled={m.availability === 'On Leave'}
                  >
                    {m.name} ({m.role}) - {m.availability === 'On Leave' ? 'Cuti' : m.availability === 'Busy' ? 'Sibuk' : 'Tersedia'} ({activeTasks} tugas aktif)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Peran Pekerjaan</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'Drafting' | 'Review')}
              required
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
            >
              <option value="Drafting">Drafting (Penyusunan Gambar)</option>
              <option value="Review">Review (Pemeriksaan & Persetujuan)</option>
            </select>
          </div>

          <Button type="submit" disabled={!selectedTaskId || !selectedMemberId} className="h-9 w-full bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white">
            Tugaskan Anggota
          </Button>
        </form>
      </div>

      {/* 2. Grid Layout for Team and Active Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Team Availability Card */}
        <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Users size={14} className="text-blue-500" />
            Daftar Anggota & Ketersediaan
          </h4>
          <div className="space-y-3.5">
            {TEAM_MEMBERS.map(m => {
              const assignedTasks = projectTasks.filter(t => t.assigneeId === m.id);
              
              return (
                <div key={m.id} className="flex items-start justify-between border-b border-divider/40 pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)]/40 dark:text-[var(--color-accent-300)] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-[var(--color-accent-200)]/20">
                      {m.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-primary">{m.name}</h5>
                      <p className="text-[10px] text-muted">{m.email} • Keahlian: <strong className="text-secondary">{m.role === 'Both' ? 'Drafting & Review' : m.role}</strong></p>
                      {assignedTasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {assignedTasks.map(t => (
                            <span key={t.id} className="text-[9px] bg-surface-hover border border-divider text-secondary px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <span className={`w-1 h-1 rounded-full ${t.assigneeRole === 'Review' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                              {t.title} ({t.assigneeRole})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {m.availability === 'Available' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Tersedia
                      </span>
                    ) : m.availability === 'Busy' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Sibuk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Cuti
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Assignments Card */}
        <div className="bg-surface border border-divider rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Penugasan Aktif Proyek Ini
          </h4>
          {projectTasks.filter(t => t.assigneeId).length === 0 ? (
            <div className="text-center py-8 text-muted text-xs italic">
              Belum ada tugas yang didelegasikan ke anggota tim.
            </div>
          ) : (
            <div className="space-y-3">
              {projectTasks.filter(t => t.assigneeId).map(task => {
                const member = TEAM_MEMBERS.find(m => m.id === task.assigneeId);
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-divider bg-surface-hover/30">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-primary text-xs">{task.title}</span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                          task.assigneeRole === 'Review' 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                        }`}>
                          {task.assigneeRole === 'Review' ? 'Review Task' : 'Drafting Task'}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary mt-1">Ditugaskan kepada: <strong className="text-primary">{member?.name || 'Anggota Tim'}</strong></p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleUnassign(task.id)}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2"
                    >
                      Batal Penugasan
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

