import React, { useState, useEffect } from 'react';
import { useProjects, generateBQText } from '../context/ProjectContext';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { TaskStatus, Project, Task, RoomType, PanelType, ProjectLocation, RoomDetails, PROJECT_STATUSES, ProjectStatus, HistoryFile } from '../types';
import { format, parseISO } from 'date-fns';
import { Plus, Building2, MapPin, Calendar, Clock, MessageSquarePlus, Maximize2, FolderKanban, Edit2, Trash2, ChevronDown, ChevronUp, Map, ExternalLink, Box, Image as ImageIcon, Search, Calculator, Upload, RefreshCw, Copy, LayoutList, Grid, Grid3X3, X, Paperclip, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ColdRoomCalculator } from './ColdRoomCalculator';
import { CombinedRoomCanvas } from '../components/ui/CombinedRoomCanvas';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

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
  const { projects, tasks, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, updateTaskStatus, updateHistoryLog, deleteHistoryLog } = useProjects();
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

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjectIds(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };
  
  const toggleRoomView = (roomId: string) => {
    setExpandedRoomViews(prev => prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]);
  };

  const [ptName, setPtName] = useState('');
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
      addTask(selectedProjectId, taskTitle, isAdditional, selectedLocationId || undefined);
      setAddTaskModalOpen(false);
      setTaskTitle('');
      setIsAdditional(false);
      setSelectedLocationId('');
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
    setEditTaskModalOpen(true);
  };

  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskId && taskTitle) {
      updateTask(selectedTaskId, taskTitle, isAdditional);
      setEditTaskModalOpen(false);
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-primary text-sm">{task.title}</h4>
            {task.isAdditional && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800 uppercase tracking-wider">
                Tambahan
              </span>
            )}
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
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Tugas" onClick={() => openEditTask(task)}><Edit2 size={14} /></Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Hapus Tugas" onClick={() => handleDeleteTask(task.id)}><Trash2 size={14} /></Button>
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
            </div>
          </div>
        </div>
        
        {(() => {
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
    const query = searchQuery.toLowerCase();
    const tasksForProject = tasks.filter(t => t.projectId === project.id);
    const matchesName = project.ptName.toLowerCase().includes(query);
    const matchesLocations = project.locations?.some(loc => 
      loc.name.toLowerCase().includes(query) || 
      loc.address.toLowerCase().includes(query) ||
      loc.rooms?.some(r => r.type.toLowerCase().includes(query))
    ) || false;
    const matchesTask = tasksForProject.some(t => t.title.toLowerCase().includes(query) || t.status.toLowerCase().includes(query));
    return matchesName || matchesLocations || matchesTask;
  }).sort((a, b) => {
      const orderA = STATUS_ORDER[a.status || 'Tahap 1: New'] || 99;
      const orderB = STATUS_ORDER[b.status || 'Tahap 1: New'] || 99;
      return orderA - orderB;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-primary">Daftar Proyek</h2>
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
            <Button variant="outline" className="gap-2 shrink-0" onClick={() => document.getElementById('excel-upload')?.click()}>
              <Upload size={18} /> Import Excel
            </Button>
            <Button onClick={() => setAddProjectModalOpen(true)} className="gap-2 shrink-0">
              <Plus size={18} /> Proyek Baru
            </Button>
          </div>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-divider rounded-xl">
          <FolderKanban size={48} className="mx-auto text-muted mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-primary mb-2">Belum Ada Proyek</h3>
          <p className="text-muted text-sm max-w-sm mx-auto mb-6">Mulai pemantauan pekerjaan Anda dengan menambahkan proyek pertama.</p>
          <Button onClick={() => setAddProjectModalOpen(true)}>Buat Proyek</Button>
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
                         value={project.status || 'Tahap 1: New'}
                         onChange={(e) => updateProject(project.id, project.ptName, project.address, project.entryDate, { status: e.target.value as ProjectStatus }, true)}
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
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Proyek" onClick={() => openEditProject(project)}><Edit2 size={16} /></Button>
                       <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Hapus Proyek" onClick={() => handleDeleteProject(project.id)}><Trash2 size={16} /></Button>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => { setSelectedProjectId(project.id); setAddTaskModalOpen(true); }}
                         className="gap-1 text-xs h-8 ml-2"
                       >
                         <Plus size={14} /> Tugas
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
                        className="overflow-hidden"
                      >
                        <div className="text-secondary mt-3">
                          <span className="flex items-center gap-1.5 text-xs mb-3"><Calendar size={14} /> Tanggal Masuk: {format(parseISO(project.entryDate), 'dd MMM yyyy')}</span>
                          {project.locations && project.locations.length > 0 ? (
                            <div className="space-y-4">
                              {project.locations.map((loc, lIdx) => (
                                <div key={loc.id} className="border border-divider rounded-lg p-3 bg-surface-hover/30">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-divider pb-2">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-primary">{loc.name}</h4>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => { 
                                          setSelectedProjectId(project.id); 
                                          setSelectedLocationId(loc.id); 
                                          setAddTaskModalOpen(true); 
                                        }}
                                        className="gap-1 text-[10px] h-6 px-2 border-[var(--color-accent-300)] text-[var(--color-accent-600)] hover:bg-[var(--color-accent-50)] dark:border-[var(--color-accent-800)] dark:hover:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-400)]"
                                      >
                                        <Plus size={10} /> Tugas
                                      </Button>
                                    </div>
                                    <span className="flex items-center gap-1.5 text-xs text-muted">
                                      <MapPin size={12} className="shrink-0" />
                                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent-600)] underline decoration-dotted underline-offset-2 decoration-[var(--color-accent-300)] transition-colors flex items-center gap-1" title="Buka di Google Maps">
                                        {loc.address} <ExternalLink size={10} className="opacity-50" />
                                      </a>
                                    </span>
                                  </div>
                                  
                                  {loc.rooms && loc.rooms.length > 0 && (
                                    <div className="mb-4">
                                      <CombinedRoomCanvas 
                                          rooms={loc.rooms} 
                                          onRoomPositionChange={(idx, x, y) => {
                                            const newLocs = project.locations ? [...project.locations] : [];
                                            const targetLocIdx = newLocs.findIndex(l => l.id === loc.id);
                                            if (targetLocIdx !== -1) {
                                                const targetLoc = { ...newLocs[targetLocIdx] };
                                                if (targetLoc.rooms) {
                                                  const newRooms = [...targetLoc.rooms];
                                                  newRooms[idx] = { ...newRooms[idx], x, y };
                                                  targetLoc.rooms = newRooms;
                                                  newLocs[targetLocIdx] = targetLoc;
                                                  updateProject(project.id, project.ptName, project.address, project.entryDate, { locations: newLocs }, true);
                                                }
                                            }
                                          }}
                                          onRoomDimensionChange={(idx, field, value) => {
                                            const newLocs = project.locations ? [...project.locations] : [];
                                            const targetLocIdx = newLocs.findIndex(l => l.id === loc.id);
                                            if (targetLocIdx !== -1) {
                                                const targetLoc = { ...newLocs[targetLocIdx] };
                                                if (targetLoc.rooms) {
                                                  const newRooms = [...targetLoc.rooms];
                                                  newRooms[idx] = { ...newRooms[idx], [field]: value };
                                                  targetLoc.rooms = newRooms;
                                                  newLocs[targetLocIdx] = targetLoc;
                                                  updateProject(project.id, project.ptName, project.address, project.entryDate, { locations: newLocs });
                                                }
                                            }
                                          }}
                                      />
                                    </div>
                                  )}
                                  
                                  {loc.rooms && loc.rooms.length > 0 ? (
                                    <div className="space-y-3">
                                      {loc.rooms.map((room, idx) => {
                                        const roomId = `${project.id}-${loc.id}-${idx}`;
                                        const isViewExpanded = expandedRoomViews.includes(roomId);
                                        
                                        const l = parseFloat(room.length || '0');
                                        const w = parseFloat(room.width || '0');
                                        const h = parseFloat(room.height || '0');
                                        
                                        let materialResults = null;
                                        if (l > 0 && w > 0 && h > 0) {
                                          const lengthM = l / 1000;
                                          const widthM = w / 1000;
                                          const heightM = h / 1000;
                                      
                                          const floorArea = lengthM * widthM;
                                          const roofArea = lengthM * widthM;
                                          const wall1_3Area = lengthM * heightM; // Sisi 1 & 3
                                          const wall2_4Area = widthM * heightM; // Sisi 2 & 4
                                          const wallArea = (2 * wall1_3Area) + (2 * wall2_4Area);
                                      
                                          const colorbondLength = (4 * heightM) + (2 * lengthM) + (2 * widthM);
                                          const colorbondBatang = Math.ceil(colorbondLength / 3);
                                      
                                          const alumuniumLength = (4 * heightM) + (4 * lengthM) + (4 * widthM);
                                          const alumuniumBatang = Math.ceil(alumuniumLength / 6);
                                      
                                          const ironLength = (2 * lengthM) + (2 * widthM);
                                          const ironBatang = Math.ceil(ironLength / 6);
                                          
                                          materialResults = {
                                            floorArea, roofArea, wall1_3Area, wall2_4Area, wallArea, colorbondBatang, alumuniumBatang, ironBatang
                                          };
                                        }

                                        return (
                                          <div key={idx} className="bg-surface border border-divider rounded-md text-xs shadow-inner overflow-hidden">
                                            <div 
                                              className="p-3 grid grid-cols-2 gap-y-2 gap-x-4 cursor-pointer hover:bg-surface-hover/50 transition-colors"
                                              onClick={() => toggleRoomView(roomId)}
                                            >
                                              <div className="col-span-2 font-medium text-primary border-b border-divider pb-1 mb-1 flex items-center justify-between">
                                                <span>{room.type}</span>
                                                <div className="flex items-center gap-2">
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] px-2 border-[var(--color-accent-300)] text-[var(--color-accent-600)] hover:bg-[var(--color-accent-50)] dark:border-[var(--color-accent-800)] dark:hover:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-400)]"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setHeatLoadInitials({ l: room.length || '', w: room.width || '', h: room.height || '', ref: `${project.ptName} - ${loc.name} - ${room.type}` });
                                                      setHeatLoadModalOpen(true);
                                                    }}
                                                  >
                                                    <Calculator size={12} className="mr-1" /> Heat Load
                                                  </Button>
                                                  <span className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity text-[var(--color-accent-600)] bg-[var(--color-accent-100)] dark:bg-[var(--color-accent-900)] px-2 py-0.5 rounded-full">
                                                    <Box size={12} />
                                                    <span className="text-[10px] font-medium hidden sm:inline">{isViewExpanded ? "Tutup Estimasi" : "Estimasi Material"}</span>
                                                  </span>
                                                </div>
                                              </div>
                                              {(room.length || room.width || room.height) && (
                                                <div className="col-span-2"><span className="text-muted">Dimensi:</span> <span className="font-medium text-primary ml-1">{room.length || '-'} x {room.width || '-'} x {room.height || '-'} mm</span></div>
                                              )}
                                              {(room.panelType || room.panelThickness) && (
                                                <div><span className="text-muted">Panel:</span> <span className="font-medium text-primary ml-1">{room.panelType} {room.panelThickness}</span></div>
                                              )}
                                              {room.floorType && (
                                                <div>
                                                  <span className="text-muted">Lantai:</span>{' '}
                                                  <span className="font-medium text-primary ml-1">
                                                    {room.floorType === 'tanpa lantai'
                                                      ? 'Tanpa Lantai'
                                                      : room.floorType === 'insulation panel'
                                                      ? 'Panel Lantai'
                                                      : room.floorType === 'concrete'
                                                      ? 'Beton'
                                                      : room.floorType === 'INSUL'
                                                      ? 'Panel Lantai'
                                                      : room.floorType === 'CONCRETE'
                                                      ? 'Beton'
                                                      : room.floorType}
                                                  </span>
                                                </div>
                                              )}
                                              {room.outdoorMachine && (
                                                <div><span className="text-muted">Mesin Outdoor:</span> <span className="font-medium text-primary ml-1">{room.outdoorMachine}</span></div>
                                              )}
                                              {room.evaporator && (
                                                <div><span className="text-muted">Evap:</span> <span className="font-medium text-primary ml-1">{room.evaporator}</span></div>
                                              )}
                                              <div className="col-span-2 mt-1">
                                                <textarea 
                                                  value={room.note || ''} 
                                                  onChange={(e) => {
                                                    const newLocs = project.locations ? [...project.locations] : [];
                                                    const targetLocIdx = newLocs.findIndex(l => l.id === loc.id);
                                                    if (targetLocIdx !== -1) {
                                                      const targetLoc = { ...newLocs[targetLocIdx] };
                                                      if (targetLoc.rooms) {
                                                        const newRooms = [...targetLoc.rooms];
                                                        newRooms[idx] = { ...newRooms[idx], note: e.target.value };
                                                        targetLoc.rooms = newRooms;
                                                        newLocs[targetLocIdx] = targetLoc;
                                                        updateProject(project.id, project.ptName, project.address, project.entryDate, { locations: newLocs }, true);
                                                      }
                                                    }
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  placeholder="tambahkan untuk ketik note"
                                                  className="w-full bg-surface border border-divider rounded p-2 text-xs text-primary focus:outline-none focus:border-[var(--color-accent-500)] resize-none"
                                                  rows={room.note ? Math.max(1, room.note.split('\n').length) : 1}
                                                />
                                              </div>
                                            </div>

                                            <AnimatePresence>
                                              {isViewExpanded && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  className="overflow-hidden bg-surface-hover border-t border-divider"
                                                >
                                                  {materialResults ? (
                                                    <div className="p-3 bg-surface/60 border-t border-divider grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                      <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-wider font-semibold text-secondary mb-1">Estimasi Area Ruangan</div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Lantai</span>
                                                        <span className="font-semibold text-primary">{materialResults.floorArea.toFixed(2)} m²</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Atap</span>
                                                        <span className="font-semibold text-primary">{materialResults.roofArea.toFixed(2)} m²</span>
                                                      </div>
                                                      <div>
                                                        <span className="text-muted block mb-0.5">Total Dinding</span>
                                                        <span className="font-semibold text-primary">{materialResults.wallArea.toFixed(2)} m²</span>
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
                                                    </div>
                                                  ) : (
                                                    <div className="p-4 text-center text-muted">
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

                                  {/* Location Tasks */}
                                  <div className="mt-4 pt-4 border-t border-divider">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                        <LayoutList size={14} className="text-[var(--color-accent-500)]" />
                                        Tugas Lokasi ({projectTasks.filter(t => t.locationId === loc.id).length})
                                      </h5>
                                    </div>
                                    {projectTasks.filter(t => t.locationId === loc.id).length === 0 ? (
                                      <p className="text-xs text-muted italic">Belum ada tugas di lokasi ini.</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {projectTasks.filter(t => t.locationId === loc.id).map(task => renderTaskItem(task, project))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted mt-2">Tidak ada data lokasi.</p>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>

                {expandedProjectIds.includes(project.id) && (
                  <div className="p-5 flex-1 border-t border-divider">
                    <h5 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <LayoutList size={14} className="text-[var(--color-accent-500)]" />
                      Tugas Umum ({projectTasks.filter(t => !t.locationId).length})
                    </h5>
                    {projectTasks.filter(t => !t.locationId).length === 0 ? (
                      <p className="text-sm text-muted text-center py-4">Belum ada tugas umum di proyek ini.</p>
                    ) : (
                      <div className="space-y-3">
                        {projectTasks.filter(t => !t.locationId).map(task => renderTaskItem(task, project))}
                      </div>
                    )}
                  </div>
                )}
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
    </div>
  );
};

