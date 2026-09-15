import React, { useState } from 'react';
import {
  CADProject,
  CADSketch,
  CADRoom,
  CADMode,
  CADViewMode,
  Direction,
  PanelThickness,
  DoorType,
  EvaporatorType
} from './types';
import { Viewport3D } from './components/Viewport3D';
import { CADSidebarControls } from './components/CADSidebarControls';
import { Layout2DView } from './components/Layout2DView';
import { NewCADProjectModal } from './components/NewCADProjectModal';
import { ExportBOQModal } from './components/ExportBOQModal';
import { QuickDimensionModal } from './components/QuickDimensionModal';
import {
  Box,
  Layout,
  Plus,
  FileSpreadsheet,
  Download,
  Share2,
  FolderOpen,
  ChevronRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Copy,
  Trash2,
  Maximize
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_ROOM: CADRoom = {
  id: 'room-1',
  name: 'Room 1',
  length: 4.0,
  width: 4.0,
  height: 3.0,
  thickness: 100,
  material: 'PU',
  floorType: 'insulation panel',
  vertices: [],
  wallSegments: [],
  isCustomPolygon: false,
  offsetX: 0,
  offsetY: 0,
  doors: [],
  evaporators: [],
  partitions: [],
  heatLoadParams: {
    commodityId: 'meat',
    roomTemp: -18,
    entryTemp: 4,
    freezingPoint: -1.8,
    dailyLoadKg: 3000,
    pullDownHours: 20,
    safetyPercent: 20,
    usageType: 'Heavy Usage',
    ambientTemp: 35,
    ambientRH: 60
  }
};

const DEFAULT_PROJECT: CADProject = {
  id: 'proj-1',
  name: 'Project 1',
  activeSketchId: 'sketch-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sketches: [
    {
      id: 'sketch-1',
      name: 'Sketch 1',
      ambientTemp: 35,
      ambientRH: 60,
      activeRoomId: 'room-1',
      activeMode: 'dims',
      createdAt: new Date().toISOString(),
      rooms: [DEFAULT_ROOM]
    }
  ]
};

export const CADStudio: React.FC = () => {
  const [project, setProject] = useState<CADProject>(DEFAULT_PROJECT);
  const [viewMode, setViewMode] = useState<CADViewMode>('workspace');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isExportBOQModalOpen, setIsExportBOQModalOpen] = useState(false);
  const [isQuickDimensionModalOpen, setIsQuickDimensionModalOpen] = useState(false);
  const [quickDimensionField, setQuickDimensionField] = useState<'length' | 'width' | 'height' | 'thickness'>('length');

  React.useEffect(() => {
    const imported = localStorage.getItem('cad3d_import_room');
    if (imported) {
      try {
        const data = JSON.parse(imported);
        if (data && data.room) {
          const r = data.room;
          const rL = parseFloat(r.length || '4');
          const rW = parseFloat(r.width || '4');
          const rH = parseFloat(r.height || '3');
          const lengthM = rL > 10 ? rL / 1000 : rL;
          const widthM = rW > 10 ? rW / 1000 : rW;
          const heightM = rH > 10 ? rH / 1000 : rH;
          const thick = parseInt(r.panelThickness) || 100;

          const parsedRoom: CADRoom = {
            id: r.id || crypto.randomUUID(),
            name: r.type || 'Ruangan Proyek',
            length: lengthM,
            width: widthM,
            height: heightM,
            thickness: thick as PanelThickness,
            material: r.panelType || 'PU',
            floorType: r.floorType || 'insulation panel',
            vertices: [],
            wallSegments: [],
            isCustomPolygon: false,
            offsetX: 0,
            offsetY: 0,
            doors: r.doorType ? [{
              id: crypto.randomUUID(),
              name: 'Pintu Utama',
              wallId: 'front',
              wallName: 'Front',
              type: r.doorType,
              width: (parseFloat(r.doorWidth) || 900) > 10 ? (parseFloat(r.doorWidth) || 900) / 1000 : 1.2,
              height: (parseFloat(r.doorHeight) || 1900) > 10 ? (parseFloat(r.doorHeight) || 1900) / 1000 : 2.1,
              margin: 1.0,
              thickness: 100,
              openingSide: 'Right',
              openDirection: 'Outward'
            }] : [],
            evaporators: r.evaporator ? [{
              id: crypto.randomUUID(),
              name: r.evaporator,
              type: 'Standard',
              brand: '',
              model: r.evaporator,
              width: 1.4,
              length: 0.6,
              height: 0.5,
              fanCount: 2,
              fanDiameter: 300,
              posX: Math.max(0.2, lengthM / 2 - 0.7),
              posY: 0.5,
              posZ: heightM - 0.6,
              rotation: 0
            }] : [],
            partitions: [],
            heatLoadParams: DEFAULT_ROOM.heatLoadParams
          };

          setProject({
            id: crypto.randomUUID(),
            name: data.projectName ? `Proyek: ${data.projectName}` : 'Proyek 3D CAD',
            activeSketchId: 'sketch-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sketches: [
              {
                id: 'sketch-1',
                name: data.locationName ? `Lokasi: ${data.locationName}` : 'Layout Ruangan',
                ambientTemp: 35,
                ambientRH: 60,
                activeRoomId: parsedRoom.id,
                activeMode: 'dims',
                createdAt: new Date().toISOString(),
                rooms: [parsedRoom]
              }
            ]
          });
          toast.success(`Berhasil memuat ruangan "${r.type}" dari proyek ${data.projectName || ''}`);
          localStorage.removeItem('cad3d_import_room');
        }
      } catch (err) {
        console.error('Failed to parse imported room', err);
      }
    }
  }, []);

  // Active Sketch
  const activeSketch = project.sketches.find(s => s.id === project.activeSketchId) || project.sketches[0];
  const activeRoom = activeSketch.rooms.find(r => r.id === activeSketch.activeRoomId) || activeSketch.rooms[0];

  // Live Step-by-step drawing state
  const [isDrawingStep, setIsDrawingStep] = useState(false);
  const [drawingCurrentDir, setDrawingCurrentDir] = useState<Direction>('E');
  const [drawingLength, setDrawingLength] = useState(6.0);
  const [drawingVertices, setDrawingVertices] = useState<{ x: number; y: number; name: string }[]>([
    { x: 0, y: 0, name: 'V1a' }
  ]);

  const handleToggleDrawingStep = (enable: boolean) => {
    setIsDrawingStep(enable);
    if (enable) {
      setDrawingVertices([{ x: activeRoom.offsetX || 0, y: activeRoom.offsetY || 0, name: 'V1a' }]);
    }
  };

  // Live Partition Draft
  const [partitionDraft, setPartitionDraft] = useState({
    wall: 'Bottom',
    margin: 2.0,
    side: 'Left' as const,
    thickness: 100 as PanelThickness
  });

  // Live Door Draft
  const [doorDraft, setDoorDraft] = useState({
    wall: 'Front',
    type: 'Swing Door' as DoorType,
    width: 1.2,
    height: 2.1,
    margin: 1.0,
    thickness: 100 as PanelThickness,
    openingSide: 'Right' as 'Left' | 'Right',
    openDirection: 'Outward' as 'Left' | 'Right' | 'Outward' | 'Inward',
    hasAirCurtain: false,
    hasPlasticCurtain: false,
    plasticCurtainType: 'Clear Standard' as 'Clear Standard' | 'Polar Low-Temp (Amber)' | 'Ribbed Heavy-Duty',
    airCurtainSpeed: 'Standard' as 'Standard' | 'High Velocity'
  });

  // Live Evap Draft
  const [evapDraft, setEvapDraft] = useState({
    type: 'Standard' as EvaporatorType,
    brand: '',
    model: '',
    width: 1.4,
    length: 0.6,
    height: 0.5,
    fanCount: 2,
    fanDiameter: 300,
    rotation: 0 as const,
    leftOffset: 1.3,
    backOffset: 0.5,
    hangingHeight: 2.5
  });

  // Room update handler
  const handleUpdateRoom = (updater: (prev: CADRoom) => CADRoom) => {
    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk => {
        if (sk.id !== prev.activeSketchId) return sk;
        const updatedRooms = sk.rooms.map(r => (r.id === activeRoom.id ? updater(r) : r));
        return { ...sk, rooms: updatedRooms };
      });
      return { ...prev, sketches: updatedSketches };
    });
  };

  // Change Mode handler
  const handleChangeMode = (mode: CADMode) => {
    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk =>
        sk.id === prev.activeSketchId ? { ...sk, activeMode: mode } : sk
      );
      return { ...prev, sketches: updatedSketches };
    });
  };

  // Select Room handler
  const handleSelectRoom = (roomId: string) => {
    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk =>
        sk.id === prev.activeSketchId ? { ...sk, activeRoomId: roomId } : sk
      );
      return { ...prev, sketches: updatedSketches };
    });
  };

  // Add a new Room to sketch
  const handleAddNewRoom = () => {
    const nextIndex = activeSketch.rooms.length + 1;
    const newRoomId = `room-${crypto.randomUUID().slice(0, 5)}`;
    
    let newOffsetX = 0;
    let newOffsetY = 0;

    if (activeSketch.rooms.length > 0) {
      const lastRoom = activeSketch.rooms[activeSketch.rooms.length - 1];
      newOffsetX = (lastRoom.offsetX || 0) + (lastRoom.length || 4.0);
      newOffsetY = lastRoom.offsetY || 0;
    }

    const newRoom: CADRoom = {
      ...DEFAULT_ROOM,
      id: newRoomId,
      name: `Room ${nextIndex}`,
      length: 4.0,
      width: 4.0,
      height: 3.0,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      doors: [],
      evaporators: []
    };

    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk => {
        if (sk.id !== prev.activeSketchId) return sk;
        return {
          ...sk,
          activeRoomId: newRoomId,
          rooms: [...sk.rooms, newRoom]
        };
      });
      return { ...prev, sketches: updatedSketches };
    });

    setIsDrawingStep(false);
    toast.success(`Ruangan baru "${newRoom.name}" berhasil ditambahkan!`);
  };

  // Duplicate current active room
  const handleDuplicateRoom = () => {
    const newRoomId = `room-${crypto.randomUUID().slice(0, 5)}`;
    const duplicatedRoom: CADRoom = {
      ...activeRoom,
      id: newRoomId,
      name: `${activeRoom.name} (Copy)`,
      offsetX: (activeRoom.offsetX || 0) + activeRoom.length + 0.5,
      offsetY: activeRoom.offsetY || 0,
      doors: activeRoom.doors.map(d => ({ ...d, id: crypto.randomUUID() })),
      evaporators: activeRoom.evaporators.map(e => ({ ...e, id: crypto.randomUUID() })),
      partitions: activeRoom.partitions.map(p => ({ ...p, id: crypto.randomUUID() }))
    };

    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk => {
        if (sk.id !== prev.activeSketchId) return sk;
        return {
          ...sk,
          activeRoomId: newRoomId,
          rooms: [...sk.rooms, duplicatedRoom]
        };
      });
      return { ...prev, sketches: updatedSketches };
    });

    toast.success(`Ruangan "${activeRoom.name}" berhasil diduplikasi!`);
  };

  // Delete active room
  const handleDeleteRoom = () => {
    if (activeSketch.rooms.length <= 1) {
      toast.error('Tidak dapat menghapus ruangan terakhir dalam sketch!');
      return;
    }

    const remainingRooms = activeSketch.rooms.filter(r => r.id !== activeRoom.id);
    const nextActiveRoom = remainingRooms[0];

    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk => {
        if (sk.id !== prev.activeSketchId) return sk;
        return {
          ...sk,
          activeRoomId: nextActiveRoom.id,
          rooms: remainingRooms
        };
      });
      return { ...prev, sketches: updatedSketches };
    });

    toast.success(`Ruangan "${activeRoom.name}" telah dihapus.`);
  };

  // Add Adjoining Room connected to parent wall
  const handleAddAdjoiningRoom = (config: {
    name: string;
    wallAnchor: 'Left' | 'Right' | 'Top' | 'Bottom';
    length: number;
    width: number;
    height: number;
    thickness: PanelThickness;
    offset?: number;
  }) => {
    const newRoomId = `room-${crypto.randomUUID().slice(0, 5)}`;
    let offX = activeRoom.offsetX || 0;
    let offY = activeRoom.offsetY || 0;
    const shift = config.offset || 0;

    if (config.wallAnchor === 'Right') {
      offX += activeRoom.length;
      offY += shift;
    } else if (config.wallAnchor === 'Left') {
      offX -= config.length;
      offY += shift;
    } else if (config.wallAnchor === 'Top') {
      offY += activeRoom.width;
      offX += shift;
    } else if (config.wallAnchor === 'Bottom') {
      offY -= config.width;
      offX += shift;
    }

    const adjoiningRoom: CADRoom = {
      ...DEFAULT_ROOM,
      id: newRoomId,
      name: config.name,
      length: config.length,
      width: config.width,
      height: config.height,
      thickness: config.thickness,
      offsetX: offX,
      offsetY: offY,
      doors: []
    };

    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk => {
        if (sk.id !== prev.activeSketchId) return sk;
        return {
          ...sk,
          activeRoomId: newRoomId,
          rooms: [...sk.rooms, adjoiningRoom]
        };
      });
      return { ...prev, sketches: updatedSketches };
    });

    toast.success(`Ruangan adjoining "${config.name}" berhasil disambungkan pada dinding ${config.wallAnchor}!`);
  };

  // Change Ambient weather
  const handleChangeAmbient = (temp: number, rh: number) => {
    setProject(prev => {
      const updatedSketches = prev.sketches.map(sk =>
        sk.id === prev.activeSketchId ? { ...sk, ambientTemp: temp, ambientRH: rh } : sk
      );
      return { ...prev, sketches: updatedSketches };
    });
  };

  // Add Vertex step-by-step
  const handleAddVertex = () => {
    const lastV = drawingVertices[drawingVertices.length - 1];
    let nextX = lastV.x;
    let nextY = lastV.y;

    if (drawingCurrentDir === 'E') nextX += drawingLength;
    if (drawingCurrentDir === 'W') nextX -= drawingLength;
    if (drawingCurrentDir === 'N') nextY -= drawingLength; // Fix N/S mapping
    if (drawingCurrentDir === 'S') nextY += drawingLength; // Fix N/S mapping

    const nextName = `V${drawingVertices.length + 1}a`;
    setDrawingVertices(prev => [...prev, { x: nextX, y: nextY, name: nextName }]);
    toast.success(`Titik ${nextName} (${Math.round(drawingLength * 1000)} mm ke arah ${drawingCurrentDir}) berhasil ditempatkan!`);
  };

  // Reset Drawing Vertices
  const handleResetDrawing = () => {
    setDrawingVertices([{ x: activeRoom.offsetX || 0, y: activeRoom.offsetY || 0, name: 'V1a' }]);
    toast.info(`Titik gambar di-reset ke titik awal ruangan (${activeRoom.offsetX || 0}, ${activeRoom.offsetY || 0}).`);
  };

  // Close Loop to finish custom polygon room
  const onCloseLoop = () => {
    if (drawingVertices.length < 3) {
      toast.error('Dibutuhkan minimal 3 titik vertex untuk menutup poligon!');
      return;
    }

    // Calculate bounding box length and width
    const xs = drawingVertices.map(v => v.x);
    const ys = drawingVertices.map(v => v.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const calculatedLength = Math.max(1.0, +(maxX - minX).toFixed(1));
    const calculatedWidth = Math.max(1.0, +(maxY - minY).toFixed(1));

    handleUpdateRoom(prev => ({
      ...prev,
      isCustomPolygon: true,
      length: calculatedLength,
      width: calculatedWidth,
      // Adjust room's offset to match the bounding box minimum point,
      // since the vertices are now relative to the bounding box's minimum point (0, 0 local).
      offsetX: minX,
      offsetY: minY,
      // Normalize vertices to start from (0,0) relative to their own bounding box for proper 3D rendering later
      vertices: drawingVertices.map((v, i) => ({
        id: `v-${i}`,
        name: v.name,
        x: +(v.x - minX).toFixed(2),
        y: +(v.y - minY).toFixed(2)
      }))
    }));

    setIsDrawingStep(false);
    toast.success(`Ruangan custom polygon berhasil diselesaikan (${Math.round(calculatedLength * 1000)} mm × ${Math.round(calculatedWidth * 1000)} mm)!`);
  };

  // Create Partition
  const handleCreatePartition = () => {
    const newPart = {
      id: crypto.randomUUID(),
      name: `Sekat ${activeRoom.partitions.length + 1}`,
      parentRoomId: activeRoom.id,
      wallAnchor: partitionDraft.wall,
      margin: partitionDraft.margin,
      side: partitionDraft.side,
      length: partitionDraft.wall === 'Left' || partitionDraft.wall === 'Right' ? activeRoom.length : activeRoom.width,
      height: activeRoom.height,
      thickness: partitionDraft.thickness,
      qty: 1
    };

    handleUpdateRoom(prev => ({
      ...prev,
      partitions: [...prev.partitions, newPart]
    }));

    toast.success(`Sekatan ${newPart.name} berhasil dibuat!`);
  };

  // Create Door
  const handleCreateDoor = () => {
    const newDoor = {
      id: crypto.randomUUID(),
      name: `Door ${activeRoom.doors.length + 1}`,
      wallId: doorDraft.wall.toLowerCase(),
      wallName: doorDraft.wall,
      type: doorDraft.type,
      width: doorDraft.width,
      height: doorDraft.height,
      margin: doorDraft.margin,
      thickness: doorDraft.thickness,
      openingSide: doorDraft.openingSide,
      openDirection: doorDraft.openDirection,
      hasAirCurtain: doorDraft.hasAirCurtain,
      hasPlasticCurtain: doorDraft.hasPlasticCurtain,
      plasticCurtainType: doorDraft.plasticCurtainType,
      airCurtainSpeed: doorDraft.airCurtainSpeed
    };

    handleUpdateRoom(prev => ({
      ...prev,
      doors: [...prev.doors, newDoor]
    }));

    toast.success(`Pintu ${newDoor.name} (${newDoor.type}) berhasil dipasang!`);
  };

  // Create Evaporator
  const handleCreateEvap = () => {
    const eW = evapDraft.width;
    const eL = evapDraft.length;
    const eH = evapDraft.height;
    const leftX = evapDraft.leftOffset !== undefined ? evapDraft.leftOffset : Math.max(0.2, +(activeRoom.length / 2 - eW / 2).toFixed(2));
    const posY = Math.max(0.1, +(activeRoom.width - evapDraft.backOffset - eL).toFixed(2));

    const newEvap = {
      id: crypto.randomUUID(),
      name: evapDraft.model ? `${evapDraft.brand || ''} ${evapDraft.model}` : `Evap ${activeRoom.evaporators.length + 1}`,
      type: evapDraft.type,
      brand: evapDraft.brand,
      model: evapDraft.model,
      width: eW,
      length: eL,
      height: eH,
      fanCount: evapDraft.fanCount,
      fanDiameter: evapDraft.fanDiameter,
      posX: Math.max(0.1, Math.min(activeRoom.length - eW - 0.1, leftX)),
      posY: Math.max(0.1, Math.min(activeRoom.width - eL - 0.1, posY)),
      posZ: evapDraft.hangingHeight,
      distanceFromLeft: leftX,
      distanceFromRight: +(activeRoom.length - leftX - eW).toFixed(2),
      distanceFromBack: evapDraft.backOffset,
      distanceFromFront: +(activeRoom.width - posY - eL).toFixed(2),
      rotation: evapDraft.rotation
    };

    handleUpdateRoom(prev => ({
      ...prev,
      evaporators: [...prev.evaporators, newEvap]
    }));

    toast.success(`Unit ${newEvap.name} (${newEvap.type}) berhasil dipasang!`);
  };

  // Create New Project callback
  const handleCreateNewProject = (config: any) => {
    const newRoom: CADRoom = {
      ...DEFAULT_ROOM,
      id: 'room-1',
      name: 'Room 1',
      length: config.startWith === 'empty' ? 6.0 : 4.0,
      width: config.startWith === 'empty' ? 6.0 : 4.0,
      height: 3.0,
      heatLoadParams: {
        ...DEFAULT_ROOM.heatLoadParams,
        ambientTemp: config.ambientTemp,
        ambientRH: config.ambientRH
      }
    };

    const newProj: CADProject = {
      id: crypto.randomUUID(),
      name: config.projectName,
      activeSketchId: 'sketch-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sketches: [
        {
          id: 'sketch-1',
          name: config.sketchName,
          ambientTemp: config.ambientTemp,
          ambientRH: config.ambientRH,
          activeRoomId: 'room-1',
          activeMode: 'dims',
          createdAt: new Date().toISOString(),
          rooms: [newRoom]
        }
      ]
    };

    setProject(newProj);
    if (config.startWith === 'empty') {
      setIsDrawingStep(true);
      setDrawingVertices([{ x: 0, y: 0, name: 'V1a' }]);
    }
    toast.success(`Proyek CAD "${config.projectName}" berhasil dibuat!`);
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] flex flex-col gap-4 text-primary animate-in fade-in duration-300">
      {/* Top CAD Studio Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-surface border border-divider rounded-2xl shadow-xs">
        {/* Breadcrumb / Project Selector & Room Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-divider rounded-xl text-xs">
            <Box size={16} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" />
            <span className="font-bold text-primary">{project.name}</span>
            <ChevronRight size={14} className="text-muted" />
            <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono font-medium">{activeSketch.name}</span>
          </div>

          {/* New Project Button */}
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-hover border border-divider text-xs font-semibold rounded-xl text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} /> New Project
          </button>

          {/* Room Selector & Management Pills */}
          <div className="flex items-center gap-1 bg-surface-hover/80 p-1 border border-divider rounded-xl">
            {activeSketch.rooms.map(r => (
              <button
                key={r.id}
                onClick={() => handleSelectRoom(r.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  r.id === activeRoom.id
                    ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                {r.name}
              </button>
            ))}

            <button
              onClick={handleAddNewRoom}
              title="Tambah Ruangan Baru"
              className="px-2 py-1 bg-surface-elevated hover:bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border border-divider text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus size={13} /> Ruang
            </button>

            <button
              onClick={handleDuplicateRoom}
              title="Duplikat Ruangan Ini"
              className="p-1 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
            >
              <Copy size={13} />
            </button>

            {activeSketch.rooms.length > 1 && (
              <button
                onClick={handleDeleteRoom}
                title="Hapus Ruangan Ini"
                className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Workspace vs Layout Switcher & Action Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-surface-hover/80 border border-divider rounded-xl">
            <button
              onClick={() => setViewMode('workspace')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'workspace'
                  ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover'
              }`}
            >
              <Box size={14} /> Workspace (3D)
            </button>
            <button
              onClick={() => setViewMode('layout')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'layout'
                  ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
                  : 'text-secondary hover:text-primary hover:bg-surface-hover'
              }`}
            >
              <Layout size={14} /> Layout (2D CAD)
            </button>
          </div>

          <button
            onClick={() => setIsExportBOQModalOpen(true)}
            className="px-3.5 py-2 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> Ekspor ke BQ & Spek
          </button>
        </div>
      </header>

      {/* Main Studio View Area */}
      {viewMode === 'workspace' ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-4">
          {/* 3D Isometric Viewport */}
          <div className="flex-1 flex flex-col min-h-[540px]">
            <Viewport3D
              rooms={activeSketch.rooms}
              activeRoomId={activeSketch.activeRoomId}
              activeMode={activeSketch.activeMode}
              onSelectRoom={handleSelectRoom}
              isDrawingStep={isDrawingStep}
              drawingCurrentDir={drawingCurrentDir}
              drawingLength={drawingLength}
              drawingVertices={drawingVertices}
              partitionPreview={
                activeSketch.activeMode === 'part'
                  ? {
                      wall: partitionDraft.wall,
                      margin: partitionDraft.margin,
                      side: partitionDraft.side,
                      thickness: partitionDraft.thickness
                    }
                  : null
              }
              doorPreview={
                activeSketch.activeMode === 'door'
                  ? {
                      wall: doorDraft.wall,
                      margin: doorDraft.margin,
                      width: doorDraft.width,
                      height: doorDraft.height,
                      type: doorDraft.type,
                      openingSide: doorDraft.openingSide,
                      openDirection: doorDraft.openDirection,
                      hasAirCurtain: doorDraft.hasAirCurtain,
                      hasPlasticCurtain: doorDraft.hasPlasticCurtain,
                      plasticCurtainType: doorDraft.plasticCurtainType,
                      airCurtainSpeed: doorDraft.airCurtainSpeed
                    }
                  : null
              }
              evapPreview={
                activeSketch.activeMode === 'evap'
                  ? {
                      type: evapDraft.type,
                      width: evapDraft.width,
                      length: evapDraft.length,
                      height: evapDraft.height,
                      fanCount: evapDraft.fanCount,
                      leftOffset: evapDraft.leftOffset,
                      backOffset: evapDraft.backOffset,
                      hangingHeight: evapDraft.hangingHeight,
                      rotation: evapDraft.rotation
                    }
                  : null
              }
              onDimensionClick={field => {
                setQuickDimensionField(field);
                setIsQuickDimensionModalOpen(true);
              }}
            />
          </div>

          {/* Sidebar Controls */}
          <CADSidebarControls
            room={activeRoom}
            activeMode={activeSketch.activeMode}
            onChangeMode={handleChangeMode}
            onUpdateRoom={handleUpdateRoom}
            ambientTemp={activeSketch.ambientTemp}
            ambientRH={activeSketch.ambientRH}
            onChangeAmbient={handleChangeAmbient}
            isDrawingStep={isDrawingStep}
            onToggleDrawingStep={handleToggleDrawingStep}
            drawingCurrentDir={drawingCurrentDir}
            onChangeDrawingDir={setDrawingCurrentDir}
            drawingLength={drawingLength}
            onChangeDrawingLength={setDrawingLength}
            onAddVertex={handleAddVertex}
            onResetDrawing={handleResetDrawing}
            onCloseLoop={onCloseLoop}
            drawingVerticesCount={drawingVertices.length}
            partitionDraft={partitionDraft}
            onChangePartitionDraft={setPartitionDraft}
            onCreatePartition={handleCreatePartition}
            doorDraft={doorDraft}
            onChangeDoorDraft={setDoorDraft}
            onCreateDoor={handleCreateDoor}
            evapDraft={evapDraft}
            onChangeEvapDraft={setEvapDraft}
            onCreateEvap={handleCreateEvap}
            onAddAdjoiningRoom={handleAddAdjoiningRoom}
          />
        </div>
      ) : (
        /* 2D Architectural CAD Blueprint View */
        <Layout2DView
          rooms={activeSketch.rooms}
          projectName={project.name}
          sketchName={activeSketch.name}
        />
      )}

      {/* New Project Modal */}
      <NewCADProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreate={handleCreateNewProject}
      />

      {/* Export BOQ Modal */}
      <ExportBOQModal
        isOpen={isExportBOQModalOpen}
        onClose={() => setIsExportBOQModalOpen(false)}
        project={project}
        rooms={activeSketch.rooms}
        sketchName={activeSketch.name}
      />

      {/* Quick Dimension Edit Modal */}
      <QuickDimensionModal
        isOpen={isQuickDimensionModalOpen}
        onClose={() => setIsQuickDimensionModalOpen(false)}
        room={activeRoom}
        initialFocusField={quickDimensionField}
        onSave={dim => {
          handleUpdateRoom(prev => ({
            ...prev,
            length: dim.length,
            width: dim.width,
            height: dim.height,
            thickness: dim.thickness
          }));
          toast.success(`Dimensi ruangan diperbarui: ${Math.round(dim.length * 1000)} mm × ${Math.round(dim.width * 1000)} mm × ${Math.round(dim.height * 1000)} mm (${dim.thickness} mm)`);
        }}
      />
    </div>
  );
};
