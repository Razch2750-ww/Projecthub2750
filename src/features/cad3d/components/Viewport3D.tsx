import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Camera3D, project3DTo2D } from '../math/projection3d';
import { CADRoom, CADMode, Direction, Point3D } from '../types';
import { RotateCw, RotateCcw, ZoomIn, ZoomOut, Maximize2, Compass, Move } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

interface Viewport3DProps {
  rooms: CADRoom[];
  activeRoomId: string;
  activeMode: CADMode;
  onSelectRoom: (id: string) => void;
  // Step-by-step drawing state
  isDrawingStep?: boolean;
  drawingCurrentDir?: Direction;
  drawingLength?: number;
  drawingVertices?: { x: number; y: number; name: string }[];
  // Partition preview
  partitionPreview?: {
    wall: string;
    margin: number;
    side: 'Left' | 'Right';
    thickness: number;
  } | null;
  // Door preview
  doorPreview?: {
    wall: string;
    margin: number;
    width: number;
    height: number;
    type: string;
    openingSide?: 'Left' | 'Right';
    openDirection?: 'Left' | 'Right' | 'Outward' | 'Inward';
    hasAirCurtain?: boolean;
    hasPlasticCurtain?: boolean;
    plasticCurtainType?: string;
    airCurtainSpeed?: 'Standard' | 'High Velocity';
  } | null;
  // Evaporator preview
  evapPreview?: {
    type?: string;
    width?: number;
    length?: number;
    height?: number;
    fanCount?: number;
    leftOffset?: number;
    backOffset?: number;
    hangingHeight?: number;
    rotation?: number;
  } | null;
  onDimensionClick?: (type: 'length' | 'width' | 'height' | 'thickness') => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  rooms,
  activeRoomId,
  activeMode,
  onSelectRoom,
  isDrawingStep = false,
  drawingCurrentDir = 'E',
  drawingLength = 6.0,
  drawingVertices = [],
  partitionPreview,
  doorPreview,
  evapPreview,
  onDimensionClick
}) => {
  const { currentTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera State
  const [camera, setCamera] = useState<Camera3D>({
    yaw: 35, // 35 degrees initial isometric yaw
    pitch: 32, // 32 degrees elevation pitch
    zoom: 1.0,
    panX: 0,
    panY: 10
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'orbit' | 'pan'>('orbit');
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [animTime, setAnimTime] = useState(0);

  // Compute active scene/room center so rotation strictly orbits the model center
  const targetCenter = useMemo<Point3D>(() => {
    if (!rooms || rooms.length === 0) return { x: 2.0, y: 2.0, z: 1.5 };
    const cur = rooms.find(r => r.id === activeRoomId) || rooms[0];
    const ox = cur.offsetX || 0;
    const oy = cur.offsetY || 0;
    const L = cur.length || 4.0;
    const W = cur.width || 4.0;
    const H = cur.height || 3.0;
    return {
      x: ox + L / 2,
      y: oy + W / 2,
      z: H / 2
    };
  }, [rooms, activeRoomId]);

  // Combined camera with target center
  const activeCamera = useMemo<Camera3D>(() => {
    return {
      ...camera,
      target: targetCenter
    };
  }, [camera, targetCenter]);

  // Animation loop for airflow particles and live indicators
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setAnimTime(t => (t + 0.03) % 100);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Quick preset rotations (in degrees)
  const rotateBy = (deltaYaw: number, deltaPitch: number = 0) => {
    setCamera(prev => ({
      ...prev,
      yaw: (prev.yaw + deltaYaw + 360) % 360,
      pitch: Math.max(12, Math.min(85, prev.pitch + deltaPitch))
    }));
  };

  const setViewPreset = (yaw: number, pitch: number) => {
    setCamera(prev => ({
      ...prev,
      yaw: (yaw + 360) % 360,
      pitch,
      panX: 0,
      panY: 10
    }));
  };

  const resetView = () => {
    setCamera({
      yaw: 35,
      pitch: 32,
      zoom: 1.0,
      panX: 0,
      panY: 10
    });
  };

  // Mouse handlers for 3D Orbit and Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    if (e.button === 1 || e.button === 2 || e.shiftKey || e.ctrlKey) {
      setDragMode('pan');
    } else {
      setDragMode('orbit');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (dragMode === 'orbit') {
      setCamera(prev => ({
        ...prev,
        // Smooth yaw rotation around Z axis
        yaw: (prev.yaw + dx * 0.45 + 360) % 360,
        // Smooth pitch clamped between 10° and 85° to prevent upside-down flip
        pitch: Math.max(12, Math.min(85, prev.pitch + dy * 0.35))
      }));
    } else {
      setCamera(prev => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile / tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setDragMode('orbit');
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePos.x;
    const dy = e.touches[0].clientY - lastMousePos.y;
    setLastMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });

    setCamera(prev => ({
      ...prev,
      yaw: (prev.yaw + dx * 0.5 + 360) % 360,
      pitch: Math.max(12, Math.min(85, prev.pitch + dy * 0.35))
    }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.4, Math.min(3.5, prev.zoom * zoomFactor))
    }));
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle HiDPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background with theme base color
    ctx.fillStyle = currentTheme.bg || '#0f141c';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw 3D Isometric Ground Grid
    drawGroundGrid(ctx, activeCamera, width, height, currentTheme.category === 'light');

    // 2. If drawing custom polygon step by step
    if (isDrawingStep && drawingVertices.length > 0) {
      drawStepByStepPoly(ctx, activeCamera, width, height, drawingVertices, drawingCurrentDir, drawingLength, animTime);
    }

    // 3. Render all standard rooms in sketch
    rooms.forEach(room => {
      drawRoom3D(
        ctx,
        activeCamera,
        width,
        height,
        room,
        room.id === activeRoomId,
        activeMode,
        partitionPreview,
        doorPreview,
        evapPreview,
        animTime
      );
    });

  }, [rooms, activeRoomId, activeMode, activeCamera, isDrawingStep, drawingCurrentDir, drawingLength, drawingVertices, partitionPreview, doorPreview, evapPreview, animTime, currentTheme]);

  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[520px] bg-surface overflow-hidden select-none flex flex-col items-center justify-center cursor-grab active:cursor-grabbing rounded-2xl border border-divider shadow-xs"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Center Orbit Compass & View Controls Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface-elevated/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-divider shadow-xl z-20">
        {/* Preset Orbit Angle Buttons */}
        <button
          onClick={(e) => { e.stopPropagation(); setViewPreset(35, 32); }}
          title="Isometrik Depan-Kanan (35°)"
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            Math.abs(camera.yaw - 35) < 15 && camera.pitch < 60
              ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          ISO 1
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setViewPreset(125, 32); }}
          title="Isometrik Belakang-Kanan (125°)"
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            Math.abs(camera.yaw - 125) < 15 && camera.pitch < 60
              ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          ISO 2
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setViewPreset(215, 32); }}
          title="Isometrik Belakang-Kiri (215°)"
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            Math.abs(camera.yaw - 215) < 15 && camera.pitch < 60
              ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          ISO 3
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setViewPreset(305, 32); }}
          title="Isometrik Depan-Kiri (305°)"
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            Math.abs(camera.yaw - 305) < 15 && camera.pitch < 60
              ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          ISO 4
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setViewPreset(0, 85); }}
          title="Top View (Tampak Atas / Denah 2D)"
          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
            camera.pitch >= 75
              ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-hover'
          }`}
        >
          Top
        </button>

        <div className="h-4 w-px bg-divider mx-1" />

        {/* Step-by-step Rotate Buttons */}
        <button
          onClick={(e) => { e.stopPropagation(); rotateBy(-45); }}
          title="Putar Kiri 45°"
          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
        >
          <RotateCcw size={15} />
        </button>

        <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold px-1.5 min-w-[50px] justify-center">
          <Compass size={13} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" />
          <span>{Math.round(camera.yaw)}°</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); rotateBy(45); }}
          title="Putar Kanan 45°"
          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
        >
          <RotateCw size={15} />
        </button>

        <div className="h-4 w-px bg-divider mx-1" />

        {/* Zoom & Reset Controls */}
        <button
          onClick={(e) => { e.stopPropagation(); setCamera(prev => ({ ...prev, zoom: Math.min(3.5, prev.zoom * 1.15) })); }}
          title="Perbesar (Zoom In)"
          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setCamera(prev => ({ ...prev, zoom: Math.max(0.4, prev.zoom * 0.85) })); }}
          title="Perkecil (Zoom Out)"
          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); resetView(); }}
          title="Reset Sudut Pandang"
          className="p-1.5 text-secondary hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Top Left Room Switcher & Heat Load Badge */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
        {rooms.map(r => (
          <button
            key={r.id}
            onClick={(e) => { e.stopPropagation(); onSelectRoom(r.id); }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left border transition-all shadow-lg ${
              r.id === activeRoomId
                ? 'bg-surface-elevated border-[var(--color-accent-500)] text-primary ring-1 ring-[var(--color-accent-500)]/40 shadow-xs'
                : 'bg-surface-elevated/90 border-divider text-secondary hover:text-primary hover:border-divider-hover'
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${r.id === activeRoomId ? 'bg-[var(--color-accent-500)] animate-pulse' : 'bg-muted'}`} />
            <div>
              <div className="text-xs font-bold leading-none">{r.name}</div>
              <div className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono mt-0.5">
                {r.heatLoadParams.roomTemp > 0 ? `+${r.heatLoadParams.roomTemp}°C` : `${r.heatLoadParams.roomTemp}°C`} • {r.heatLoadResult?.totalHeatLoadKW || (r.length * r.width * 0.35).toFixed(2)} kW
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Interactive Dimension Badges (Tap-to-edit overlays) */}
      {activeRoom && !isDrawingStep && (
        <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 bg-surface-elevated/90 backdrop-blur-md p-2 rounded-xl border border-divider text-xs text-secondary z-10 shadow-lg">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted px-1">Dimensi:</span>
          <button
            onClick={() => onDimensionClick?.('length')}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-divider text-primary font-mono font-medium transition-all"
          >
            P: {Math.round(activeRoom.length * 1000)} mm
          </button>
          <button
            onClick={() => onDimensionClick?.('width')}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-divider text-primary font-mono font-medium transition-all"
          >
            L: {Math.round(activeRoom.width * 1000)} mm
          </button>
          <button
            onClick={() => onDimensionClick?.('height')}
            className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-divider text-primary font-mono font-medium transition-all"
          >
            T: {Math.round(activeRoom.height * 1000)} mm
          </button>
          <button
            onClick={() => onDimensionClick?.('thickness')}
            className="px-2.5 py-1 rounded-lg bg-[var(--color-accent-500)]/15 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border border-[var(--color-accent-500)]/30 font-mono font-medium"
          >
            Tebal: {activeRoom.thickness} mm
          </button>
        </div>
      )}

      {/* Bottom Right Helper note */}
      <div className="absolute bottom-4 right-4 text-[11px] text-muted font-mono bg-surface/85 backdrop-blur-xs px-2.5 py-1 rounded-md border border-divider pointer-events-none shadow-xs">
        Drag: Orbit • Shift+Drag: Pan • Scroll: Zoom
      </div>
    </div>
  );
};

// ==========================================
// 3D RENDERING HELPER FUNCTIONS
// ==========================================

function drawGroundGrid(ctx: CanvasRenderingContext2D, camera: Camera3D, width: number, height: number, isLight = false) {
  ctx.save();
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;

  const gridSize = 12;
  const step = 1.0; // 1 meter per grid cell

  // Center around target
  const tx = Math.round(camera.target?.x || 2);
  const ty = Math.round(camera.target?.y || 2);

  for (let x = tx - gridSize; x <= tx + gridSize; x += step) {
    const p1 = project3DTo2D({ x, y: ty - gridSize, z: 0 }, camera, width, height);
    const p2 = project3DTo2D({ x, y: ty + gridSize, z: 0 }, camera, width, height);
    ctx.beginPath();
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();
  }

  for (let y = ty - gridSize; y <= ty + gridSize; y += step) {
    const p1 = project3DTo2D({ x: tx - gridSize, y, z: 0 }, camera, width, height);
    const p2 = project3DTo2D({ x: tx + gridSize, y, z: 0 }, camera, width, height);
    ctx.beginPath();
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();
  }

  // Ground Axis & Compass Directions (X = East, Y = North)
  const o = project3DTo2D({ x: 0, y: 0, z: 0 }, camera, width, height);
  const northPt = project3DTo2D({ x: 0, y: 3.5, z: 0 }, camera, width, height);
  const eastPt = project3DTo2D({ x: 3.5, y: 0, z: 0 }, camera, width, height);

  // North Axis (Green)
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(o.u, o.v);
  ctx.lineTo(northPt.u, northPt.v);
  ctx.stroke();

  // North Label
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('N (North)', northPt.u + 4, northPt.v);

  // East Axis (Red)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(o.u, o.v);
  ctx.lineTo(eastPt.u, eastPt.v);
  ctx.stroke();

  // East Label
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('E (East)', eastPt.u + 4, eastPt.v);

  ctx.restore();
}

function drawCustomPolygonRoom3D(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  room: CADRoom,
  isActive: boolean
) {
  const H = room.height || 3.0;
  const ox = room.offsetX || 0;
  const oy = room.offsetY || 0;
  
  const bottomPoints = room.vertices.map(v => project3DTo2D({ x: ox + v.x, y: oy + v.y, z: 0 }, camera, width, height));
  const topPoints = room.vertices.map(v => project3DTo2D({ x: ox + v.x, y: oy + v.y, z: H }, camera, width, height));

  ctx.save();

  // Draw Floor
  ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.06)' : 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  bottomPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.u, p.v);
    else ctx.lineTo(p.u, p.v);
  });
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = isActive ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw Walls (translucent)
  ctx.fillStyle = isActive ? 'rgba(30, 41, 59, 0.45)' : 'rgba(30, 41, 59, 0.25)';
  for (let i = 0; i < room.vertices.length; i++) {
    const nextI = (i + 1) % room.vertices.length;
    const p1 = bottomPoints[i];
    const p2 = bottomPoints[nextI];
    const p1H = topPoints[i];
    const p2H = topPoints[nextI];
    
    ctx.beginPath();
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.lineTo(p2H.u, p2H.v);
    ctx.lineTo(p1H.u, p1H.v);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = isActive ? 'rgba(226, 232, 240, 0.7)' : 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  // Draw Roof
  ctx.beginPath();
  topPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.u, p.v);
    else ctx.lineTo(p.u, p.v);
  });
  ctx.closePath();
  ctx.fillStyle = isActive ? 'rgba(14, 165, 233, 0.35)' : 'rgba(148, 163, 184, 0.25)';
  ctx.fill();
  
  ctx.strokeStyle = isActive ? 'rgba(6, 182, 212, 0.9)' : 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Label
  if (bottomPoints.length > 0) {
    ctx.fillStyle = isActive ? '#22d3ee' : '#94a3b8';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(room.name, bottomPoints[0].u + 20, bottomPoints[0].v - 20);
  }

  ctx.restore();
}

function drawRoom3D(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  room: CADRoom,
  isActive: boolean,
  activeMode: CADMode,
  partitionPreview: any,
  doorPreview: any,
  evapPreview: any,
  animTime: number
) {
  if (room.isCustomPolygon && room.vertices && room.vertices.length >= 3) {
    drawCustomPolygonRoom3D(ctx, camera, width, height, room, isActive);
    // Draw doors, evaps etc if needed
    room.doors.forEach(door => {
      // Custom polygons don't fully support parametric doors properly yet without complex math,
      // but we can just draw them at their raw relative positions if needed.
    });
    return;
  }

  const ox = room.offsetX || 0;
  const oy = room.offsetY || 0;
  const L = room.length || 4.0;
  const W = room.width || 4.0;
  const H = room.height || 3.0;
  const T = (room.thickness || 100) / 1000; // convert mm to meters

  // 8 Vertices of the 3D Box in Room Local Space (Inner Walls)
  const p000 = project3DTo2D({ x: ox, y: oy, z: 0 }, camera, width, height);
  const pL00 = project3DTo2D({ x: ox + L, y: oy, z: 0 }, camera, width, height);
  const pLW0 = project3DTo2D({ x: ox + L, y: oy + W, z: 0 }, camera, width, height);
  const p0W0 = project3DTo2D({ x: ox, y: oy + W, z: 0 }, camera, width, height);

  const p00H = project3DTo2D({ x: ox, y: oy, z: H }, camera, width, height);
  const pL0H = project3DTo2D({ x: ox + L, y: oy, z: H }, camera, width, height);
  const pLWH = project3DTo2D({ x: ox + L, y: oy + W, z: H }, camera, width, height);
  const p0WH = project3DTo2D({ x: ox, y: oy + W, z: H }, camera, width, height);

  // 8 Vertices of the Outer Box based on Thickness
  const o000 = project3DTo2D({ x: ox - T, y: oy - T, z: 0 }, camera, width, height);
  const oL00 = project3DTo2D({ x: ox + L + T, y: oy - T, z: 0 }, camera, width, height);
  const oLW0 = project3DTo2D({ x: ox + L + T, y: oy + W + T, z: 0 }, camera, width, height);
  const o0W0 = project3DTo2D({ x: ox - T, y: oy + W + T, z: 0 }, camera, width, height);

  const o00H = project3DTo2D({ x: ox - T, y: oy - T, z: H }, camera, width, height);
  const oL0H = project3DTo2D({ x: ox + L + T, y: oy - T, z: H }, camera, width, height);
  const oLWH = project3DTo2D({ x: ox + L + T, y: oy + W + T, z: H }, camera, width, height);
  const o0WH = project3DTo2D({ x: ox - T, y: oy + W + T, z: H }, camera, width, height);

  ctx.save();

  // 1. Draw Floor Slab (Outer)
  ctx.fillStyle = isActive ? 'rgba(6, 182, 212, 0.06)' : 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.moveTo(o000.u, o000.v);
  ctx.lineTo(oL00.u, oL00.v);
  ctx.lineTo(oLW0.u, oLW0.v);
  ctx.lineTo(o0W0.u, o0W0.v);
  ctx.closePath();
  ctx.fill();

  // Floor Perimeter highlight
  ctx.strokeStyle = isActive ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner Floor Lines (to show thickness on the floor)
  ctx.beginPath();
  ctx.moveTo(p000.u, p000.v);
  ctx.lineTo(pL00.u, pL00.v);
  ctx.lineTo(pLW0.u, pLW0.v);
  ctx.lineTo(p0W0.u, p0W0.v);
  ctx.closePath();
  ctx.strokeStyle = isActive ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.1)';
  ctx.stroke();

  // 2. Draw 3D Insulated Wall Panels
  
  // Translucent wall fills (outer box faces)
  ctx.fillStyle = isActive ? 'rgba(30, 41, 59, 0.45)' : 'rgba(30, 41, 59, 0.25)';
  
  // Back outer face
  ctx.beginPath(); ctx.moveTo(oLW0.u, oLW0.v); ctx.lineTo(o0W0.u, o0W0.v); ctx.lineTo(o0WH.u, o0WH.v); ctx.lineTo(oLWH.u, oLWH.v); ctx.closePath(); ctx.fill();
  // Left outer face
  ctx.beginPath(); ctx.moveTo(o000.u, o000.v); ctx.lineTo(o0W0.u, o0W0.v); ctx.lineTo(o0WH.u, o0WH.v); ctx.lineTo(o00H.u, o00H.v); ctx.closePath(); ctx.fill();
  // Front outer face
  ctx.beginPath(); ctx.moveTo(o000.u, o000.v); ctx.lineTo(oL00.u, oL00.v); ctx.lineTo(oL0H.u, oL0H.v); ctx.lineTo(o00H.u, o00H.v); ctx.closePath(); ctx.fill();
  // Right outer face
  ctx.beginPath(); ctx.moveTo(oL00.u, oL00.v); ctx.lineTo(oLW0.u, oLW0.v); ctx.lineTo(oLWH.u, oLWH.v); ctx.lineTo(oL0H.u, oL0H.v); ctx.closePath(); ctx.fill();

  ctx.strokeStyle = isActive ? 'rgba(226, 232, 240, 0.7)' : 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1.8;

  const edges = [
    // Inner
    [p000, p00H], [pL00, pL0H], [pLW0, pLWH], [p0W0, p0WH],
    [p00H, pL0H], [pL0H, pLWH], [pLWH, p0WH], [p0WH, p00H],
    // Outer
    [o000, o00H], [oL00, oL0H], [oLW0, oLWH], [o0W0, o0WH],
    [o00H, oL0H], [oL0H, oLWH], [oLWH, o0WH], [o0WH, o00H],
  ];

  edges.forEach(([p1, p2]) => {
    ctx.beginPath();
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();
  });

  // Top Wall Profile Fill (to show solid thickness)
  ctx.fillStyle = isActive ? 'rgba(14, 165, 233, 0.35)' : 'rgba(148, 163, 184, 0.25)';
  
  // Front Wall Top
  ctx.beginPath();
  ctx.moveTo(o00H.u, o00H.v);
  ctx.lineTo(oL0H.u, oL0H.v);
  ctx.lineTo(pL0H.u, pL0H.v);
  ctx.lineTo(p00H.u, p00H.v);
  ctx.closePath();
  ctx.fill();

  // Right Wall Top
  ctx.beginPath();
  ctx.moveTo(oL0H.u, oL0H.v);
  ctx.lineTo(oLWH.u, oLWH.v);
  ctx.lineTo(pLWH.u, pLWH.v);
  ctx.lineTo(pL0H.u, pL0H.v);
  ctx.closePath();
  ctx.fill();

  // Back Wall Top
  ctx.beginPath();
  ctx.moveTo(oLWH.u, oLWH.v);
  ctx.lineTo(o0WH.u, o0WH.v);
  ctx.lineTo(p0WH.u, p0WH.v);
  ctx.lineTo(pLWH.u, pLWH.v);
  ctx.closePath();
  ctx.fill();

  // Left Wall Top
  ctx.beginPath();
  ctx.moveTo(o0WH.u, o0WH.v);
  ctx.lineTo(o00H.u, o00H.v);
  ctx.lineTo(p00H.u, p00H.v);
  ctx.lineTo(p0WH.u, p0WH.v);
  ctx.closePath();
  ctx.fill();

  // Corner Connectors at Top (diagonal lines showing bevel/joint)
  ctx.strokeStyle = isActive ? 'rgba(226, 232, 240, 0.4)' : 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  const joints = [[o00H, p00H], [oL0H, pL0H], [oLWH, pLWH], [o0WH, p0WH]];
  joints.forEach(([p1, p2]) => {
    ctx.beginPath();
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.stroke();
  });

  // 3. Draw Partitions (Sekatan)
  if (room.partitions && room.partitions.length > 0) {
    room.partitions.forEach(part => {
      drawPartitionWall(ctx, camera, width, height, ox, oy, L, W, H, part);
    });
  }

  // Draw Live Partition Preview if in partition mode
  if (isActive && activeMode === 'part' && partitionPreview) {
    drawPartitionWall(ctx, camera, width, height, ox, oy, L, W, H, {
      id: 'preview',
      name: 'Preview Sekat',
      parentRoomId: room.id,
      wallAnchor: partitionPreview.wall,
      margin: partitionPreview.margin,
      side: partitionPreview.side,
      length: W,
      height: H,
      thickness: partitionPreview.thickness,
      qty: 1
    }, true);
  }

  // 4. Draw Doors (Pintu)
  if (room.doors && room.doors.length > 0) {
    room.doors.forEach(door => {
      drawDoor3D(ctx, camera, width, height, ox, oy, L, W, H, door, animTime);
    });
  }

  // Draw Live Door Preview if in door mode
  if (isActive && activeMode === 'door' && doorPreview) {
    drawDoor3D(ctx, camera, width, height, ox, oy, L, W, H, {
      id: 'door_preview',
      name: 'Preview Pintu',
      wallId: '1',
      wallName: doorPreview.wall,
      type: doorPreview.type as any,
      width: doorPreview.width,
      height: doorPreview.height,
      margin: doorPreview.margin,
      thickness: 100,
      openingSide: doorPreview.openingSide || 'Right',
      openDirection: doorPreview.openDirection || 'Outward',
      hasAirCurtain: doorPreview.hasAirCurtain,
      hasPlasticCurtain: doorPreview.hasPlasticCurtain,
      plasticCurtainType: doorPreview.plasticCurtainType,
      airCurtainSpeed: doorPreview.airCurtainSpeed
    }, animTime, true);
  }

  // 5. Draw Evaporator Units & Cooling Airflow
  if (room.evaporators && room.evaporators.length > 0) {
    room.evaporators.forEach(evap => {
      drawEvaporator3D(ctx, camera, width, height, ox, oy, L, W, H, evap, animTime);
    });
  }

  // Draw Live Evaporator Preview if in evap mode
  if (isActive && activeMode === 'evap' && evapPreview) {
    const eW = evapPreview.width || 1.4;
    const eL = evapPreview.length || 0.6;
    const eH = evapPreview.height || 0.5;
    const leftX = evapPreview.leftOffset !== undefined ? evapPreview.leftOffset : Math.max(0.2, +(L / 2 - eW / 2).toFixed(2));
    const posY = Math.max(0.1, +(W - (evapPreview.backOffset || 0.5) - eL).toFixed(2));

    drawEvaporator3D(ctx, camera, width, height, ox, oy, L, W, H, {
      id: 'evap_preview',
      name: 'Preview Evap',
      type: evapPreview.type || 'Standard',
      width: eW,
      length: eL,
      height: eH,
      fanCount: evapPreview.fanCount,
      posX: Math.max(0.1, Math.min(L - eW - 0.1, leftX)),
      posY: Math.max(0.1, Math.min(W - eL - 0.1, posY)),
      posZ: evapPreview.hangingHeight || H - eH - 0.15,
      rotation: evapPreview.rotation || 0
    }, animTime, true);
  }

  // 6. Draw Dimension Guides & Labels on Room
  drawRoomDimensions(ctx, camera, width, height, ox, oy, L, W, H, room.name);

  ctx.restore();
}

function drawPartitionWall(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  ox: number,
  oy: number,
  L: number,
  W: number,
  H: number,
  part: any,
  isPreview: boolean = false
) {
  ctx.save();
  const anchor = (part.wallAnchor || 'Bottom').toLowerCase();
  const isParallelToX = anchor === 'left' || anchor === 'right';

  let pBottom1: { u: number; v: number };
  let pBottom2: { u: number; v: number };
  let pTop1: { u: number; v: number };
  let pTop2: { u: number; v: number };

  if (isParallelToX) {
    // Partition runs parallel to X-axis (across length L) at Y = oy + margin
    const rawMargin = typeof part.margin === 'number' ? part.margin : W / 2;
    const margin = Math.min(W - 0.2, Math.max(0.2, rawMargin));

    pBottom1 = project3DTo2D({ x: ox, y: oy + margin, z: 0 }, camera, width, height);
    pBottom2 = project3DTo2D({ x: ox + L, y: oy + margin, z: 0 }, camera, width, height);
    pTop1 = project3DTo2D({ x: ox, y: oy + margin, z: H }, camera, width, height);
    pTop2 = project3DTo2D({ x: ox + L, y: oy + margin, z: H }, camera, width, height);
  } else {
    // Partition runs parallel to Y-axis (across width W) at X = ox + margin
    const rawMargin = typeof part.margin === 'number' ? part.margin : L / 2;
    const margin = Math.min(L - 0.2, Math.max(0.2, rawMargin));

    pBottom1 = project3DTo2D({ x: ox + margin, y: oy, z: 0 }, camera, width, height);
    pBottom2 = project3DTo2D({ x: ox + margin, y: oy + W, z: 0 }, camera, width, height);
    pTop1 = project3DTo2D({ x: ox + margin, y: oy, z: H }, camera, width, height);
    pTop2 = project3DTo2D({ x: ox + margin, y: oy + W, z: H }, camera, width, height);
  }

  // Fill partition face with cyan/purple gradient
  ctx.fillStyle = isPreview ? 'rgba(56, 189, 248, 0.35)' : 'rgba(6, 182, 212, 0.25)';
  ctx.beginPath();
  ctx.moveTo(pBottom1.u, pBottom1.v);
  ctx.lineTo(pBottom2.u, pBottom2.v);
  ctx.lineTo(pTop2.u, pTop2.v);
  ctx.lineTo(pTop1.u, pTop1.v);
  ctx.closePath();
  ctx.fill();

  // Partition border
  ctx.strokeStyle = isPreview ? '#38bdf8' : '#06b6d4';
  ctx.lineWidth = isPreview ? 2.5 : 2;
  if (isPreview) ctx.setLineDash([6, 4]);
  ctx.stroke();

  // Partition label badge
  const midU = (pBottom1.u + pTop2.u) / 2;
  const midV = (pBottom1.v + pTop2.v) / 2;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(midU - 40, midV - 10, 80, 20, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(part.name || 'Sekat', midU, midV);

  ctx.restore();
}

function drawDoor3D(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  ox: number,
  oy: number,
  L: number,
  W: number,
  H: number,
  door: any,
  animTime: number = 0,
  isPreview: boolean = false
) {
  ctx.save();
  const dW = Math.max(0.6, Number(door.width) || 1.2);
  const dH = Math.max(1.5, Number(door.height) || 2.1);
  const margin = Math.max(0.1, Number(door.margin) || 1.0);
  const wall = (door.wallName || door.wallId || 'Front').toLowerCase();
  const rawType = (door.type || 'Swing Door').toString();
  
  // Categorize door types:
  const isSectional = rawType === 'Sectional Door';
  const isSlidingType = rawType.includes('Sliding');
  const isCleanRoom = rawType.includes('Clean Room');
  const isSwing = !isSlidingType && !isSectional;

  // Opening settings:
  const openingSide = door.openingSide || 'Right';
  const openDirection = door.openDirection || 'Outward';
  const hasAirCurtain = !!door.hasAirCurtain;
  const hasPlasticCurtain = !!door.hasPlasticCurtain;
  const plasticType = door.plasticCurtainType || 'Clear Standard';

  // Wall frame coordinate math:
  let p1: { u: number; v: number },
    p2: { u: number; v: number },
    p3: { u: number; v: number },
    p4: { u: number; v: number };
  
  let wallNormal = { x: 0, y: -1 }; // outward normal
  let wallTangent = { x: 1, y: 0 }; // along the wall
  let startPt = { x: ox, y: oy };

  if (wall.includes('left')) {
    // Left Wall (x = ox, y from oy to oy + W)
    const dY1 = oy + margin;
    const dY2 = oy + margin + dW;
    p1 = project3DTo2D({ x: ox, y: dY1, z: 0 }, camera, width, height);
    p2 = project3DTo2D({ x: ox, y: dY2, z: 0 }, camera, width, height);
    p3 = project3DTo2D({ x: ox, y: dY2, z: dH }, camera, width, height);
    p4 = project3DTo2D({ x: ox, y: dY1, z: dH }, camera, width, height);
    wallNormal = { x: -1, y: 0 };
    wallTangent = { x: 0, y: 1 };
    startPt = { x: ox, y: dY1 };
  } else if (wall.includes('right')) {
    // Right Wall (x = ox + L, y from oy to oy + W)
    const dY1 = oy + margin;
    const dY2 = oy + margin + dW;
    p1 = project3DTo2D({ x: ox + L, y: dY1, z: 0 }, camera, width, height);
    p2 = project3DTo2D({ x: ox + L, y: dY2, z: 0 }, camera, width, height);
    p3 = project3DTo2D({ x: ox + L, y: dY2, z: dH }, camera, width, height);
    p4 = project3DTo2D({ x: ox + L, y: dY1, z: dH }, camera, width, height);
    wallNormal = { x: 1, y: 0 };
    wallTangent = { x: 0, y: 1 };
    startPt = { x: ox + L, y: dY1 };
  } else if (wall.includes('back') || wall.includes('top')) {
    // Back Wall (y = oy + W, x from ox to ox + L)
    const dX1 = ox + margin;
    const dX2 = ox + margin + dW;
    p1 = project3DTo2D({ x: dX1, y: oy + W, z: 0 }, camera, width, height);
    p2 = project3DTo2D({ x: dX2, y: oy + W, z: 0 }, camera, width, height);
    p3 = project3DTo2D({ x: dX2, y: oy + W, z: dH }, camera, width, height);
    p4 = project3DTo2D({ x: dX1, y: oy + W, z: dH }, camera, width, height);
    wallNormal = { x: 0, y: 1 };
    wallTangent = { x: 1, y: 0 };
    startPt = { x: dX1, y: oy + W };
  } else {
    // Front Wall (y = oy, x from ox to ox + L)
    const dX1 = ox + margin;
    const dX2 = ox + margin + dW;
    p1 = project3DTo2D({ x: dX1, y: oy, z: 0 }, camera, width, height);
    p2 = project3DTo2D({ x: dX2, y: oy, z: 0 }, camera, width, height);
    p3 = project3DTo2D({ x: dX2, y: oy, z: dH }, camera, width, height);
    p4 = project3DTo2D({ x: dX1, y: oy, z: dH }, camera, width, height);
    wallNormal = { x: 0, y: -1 };
    wallTangent = { x: 1, y: 0 };
    startPt = { x: dX1, y: oy };
  }

  // 1. Draw Door Frame Opening Cutout in Wall
  ctx.fillStyle = isPreview ? 'rgba(8, 47, 73, 0.9)' : '#090d16';
  ctx.beginPath();
  ctx.moveTo(p1.u, p1.v);
  ctx.lineTo(p2.u, p2.v);
  ctx.lineTo(p3.u, p3.v);
  ctx.lineTo(p4.u, p4.v);
  ctx.closePath();
  ctx.fill();

  // Frame Border & Perimeter Rubber Gasket
  ctx.strokeStyle = isCleanRoom ? '#38bdf8' : (isSectional ? '#f59e0b' : (isSlidingType ? '#fb923c' : '#0284c7'));
  ctx.lineWidth = isPreview ? 2.5 : 2;
  if (isPreview) ctx.setLineDash([5, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Door Threshold Plate on Floor
  const pThresh1 = project3DTo2D({
    x: startPt.x + wallNormal.x * 0.14,
    y: startPt.y + wallNormal.y * 0.14,
    z: 0
  }, camera, width, height);
  const pThresh2 = project3DTo2D({
    x: startPt.x + wallTangent.x * dW + wallNormal.x * 0.14,
    y: startPt.y + wallTangent.y * dW + wallNormal.y * 0.14,
    z: 0
  }, camera, width, height);

  ctx.fillStyle = isSectional ? '#1e293b' : '#334155';
  ctx.beginPath();
  ctx.moveTo(p1.u, p1.v);
  ctx.lineTo(p2.u, p2.v);
  ctx.lineTo(pThresh2.u, pThresh2.v);
  ctx.lineTo(pThresh1.u, pThresh1.v);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // If Sectional Door: Add yellow-black safety floor hazard markings
  if (isSectional) {
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(pThresh1.u, pThresh1.v);
    ctx.lineTo(pThresh2.u, pThresh2.v);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // =========================================================================
  // 2. RENDER DISTINCT 3D TYPE-SPECIFIC DOOR MODELS:
  // =========================================================================

  if (isSectional) {
    // =========================================================================
    // TYPE 1: SECTIONAL OVERHEAD DOOR (Loading Dock & Heavy Forklift Access)
    // =========================================================================
    const panelCount = 5;
    const panelHeight = dH / panelCount;

    // A. Vertical Guide Tracks along Left and Right Jambs
    const pTrackLeftBot = project3DTo2D({ x: startPt.x - wallTangent.x * 0.04, y: startPt.y - wallTangent.y * 0.04, z: 0 }, camera, width, height);
    const pTrackLeftTop = project3DTo2D({ x: startPt.x - wallTangent.x * 0.04, y: startPt.y - wallTangent.y * 0.04, z: dH + 0.1 }, camera, width, height);
    const pTrackRightBot = project3DTo2D({ x: startPt.x + wallTangent.x * (dW + 0.04), y: startPt.y + wallTangent.y * (dW + 0.04), z: 0 }, camera, width, height);
    const pTrackRightTop = project3DTo2D({ x: startPt.x + wallTangent.x * (dW + 0.04), y: startPt.y + wallTangent.y * (dW + 0.04), z: dH + 0.1 }, camera, width, height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(pTrackLeftBot.u, pTrackLeftBot.v);
    ctx.lineTo(pTrackLeftTop.u, pTrackLeftTop.v);
    ctx.moveTo(pTrackRightBot.u, pTrackRightBot.v);
    ctx.lineTo(pTrackRightTop.u, pTrackRightTop.v);
    ctx.stroke();

    // B. Overhead Horizontal Ceiling Tracks (extending inward into room)
    const inNormal = { x: -wallNormal.x, y: -wallNormal.y };
    const trackDepth = dH * 0.85;
    const pOverheadLeftEnd = project3DTo2D({
      x: startPt.x - wallTangent.x * 0.04 + inNormal.x * trackDepth,
      y: startPt.y - wallTangent.y * 0.04 + inNormal.y * trackDepth,
      z: dH + 0.1
    }, camera, width, height);
    const pOverheadRightEnd = project3DTo2D({
      x: startPt.x + wallTangent.x * (dW + 0.04) + inNormal.x * trackDepth,
      y: startPt.y + wallTangent.y * (dW + 0.04) + inNormal.y * trackDepth,
      z: dH + 0.1
    }, camera, width, height);

    ctx.strokeStyle = 'rgba(203, 213, 225, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pTrackLeftTop.u, pTrackLeftTop.v);
    ctx.lineTo(pOverheadLeftEnd.u, pOverheadLeftEnd.v);
    ctx.moveTo(pTrackRightTop.u, pTrackRightTop.v);
    ctx.lineTo(pOverheadRightEnd.u, pOverheadRightEnd.v);
    ctx.stroke();
    ctx.setLineDash([]);

    // C. Top Torsion Spring Counterbalance Assembly above Door Frame
    const springZ = dH + 0.16;
    const pShaftLeft = project3DTo2D({ x: startPt.x - wallTangent.x * 0.08, y: startPt.y - wallTangent.y * 0.08, z: springZ }, camera, width, height);
    const pShaftRight = project3DTo2D({ x: startPt.x + wallTangent.x * (dW + 0.08), y: startPt.y + wallTangent.y * (dW + 0.08), z: springZ }, camera, width, height);
    const pShaftMid = project3DTo2D({ x: startPt.x + wallTangent.x * (dW * 0.5), y: startPt.y + wallTangent.y * (dW * 0.5), z: springZ }, camera, width, height);

    // Steel Shaft
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pShaftLeft.u, pShaftLeft.v);
    ctx.lineTo(pShaftRight.u, pShaftRight.v);
    ctx.stroke();

    // Twin Torsion Coiled Springs (Galvanized / Black Powder coated)
    const pSpring1L = project3DTo2D({ x: startPt.x + wallTangent.x * (dW * 0.22), y: startPt.y + wallTangent.y * (dW * 0.22), z: springZ }, camera, width, height);
    const pSpring1R = project3DTo2D({ x: startPt.x + wallTangent.x * (dW * 0.42), y: startPt.y + wallTangent.y * (dW * 0.42), z: springZ }, camera, width, height);
    const pSpring2L = project3DTo2D({ x: startPt.x + wallTangent.x * (dW * 0.58), y: startPt.y + wallTangent.y * (dW * 0.58), z: springZ }, camera, width, height);
    const pSpring2R = project3DTo2D({ x: startPt.x + wallTangent.x * (dW * 0.78), y: startPt.y + wallTangent.y * (dW * 0.78), z: springZ }, camera, width, height);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(pSpring1L.u, pSpring1L.v);
    ctx.lineTo(pSpring1R.u, pSpring1R.v);
    ctx.moveTo(pSpring2L.u, pSpring2L.v);
    ctx.lineTo(pSpring2R.u, pSpring2R.v);
    ctx.stroke();

    // Center Anchor Bearing Bracket
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(pShaftMid.u, pShaftMid.v, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Cable Drums on Ends
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(pShaftLeft.u, pShaftLeft.v, 4.5, 0, Math.PI * 2);
    ctx.arc(pShaftRight.u, pShaftRight.v, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // D. Stacked Sectional Panels with Embossed Grooves
    const outOffset = 0.03;
    for (let i = 0; i < panelCount; i++) {
      const zBot = i * panelHeight;
      const zTop = (i + 1) * panelHeight;

      const pp1 = project3DTo2D({ x: startPt.x + wallNormal.x * outOffset, y: startPt.y + wallNormal.y * outOffset, z: zBot }, camera, width, height);
      const pp2 = project3DTo2D({ x: startPt.x + wallTangent.x * dW + wallNormal.x * outOffset, y: startPt.y + wallTangent.y * dW + wallNormal.y * outOffset, z: zBot }, camera, width, height);
      const pp3 = project3DTo2D({ x: startPt.x + wallTangent.x * dW + wallNormal.x * outOffset, y: startPt.y + wallTangent.y * dW + wallNormal.y * outOffset, z: zTop }, camera, width, height);
      const pp4 = project3DTo2D({ x: startPt.x + wallNormal.x * outOffset, y: startPt.y + wallNormal.y * outOffset, z: zTop }, camera, width, height);

      // Alternating subtle panel shading for depth
      ctx.fillStyle = isPreview
        ? 'rgba(245, 158, 11, 0.45)'
        : (i % 2 === 0 ? 'rgba(241, 245, 249, 0.96)' : 'rgba(226, 232, 240, 0.96)');
      
      ctx.beginPath();
      ctx.moveTo(pp1.u, pp1.v);
      ctx.lineTo(pp2.u, pp2.v);
      ctx.lineTo(pp3.u, pp3.v);
      ctx.lineTo(pp4.u, pp4.v);
      ctx.closePath();
      ctx.fill();

      // Panel perimeter border & joint bevel
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Horizontal Panel Groove Lines
      const zMid = (zBot + zTop) / 2;
      const pGroove1 = project3DTo2D({ x: startPt.x + wallNormal.x * outOffset, y: startPt.y + wallNormal.y * outOffset, z: zMid }, camera, width, height);
      const pGroove2 = project3DTo2D({ x: startPt.x + wallTangent.x * dW + wallNormal.x * outOffset, y: startPt.y + wallTangent.y * dW + wallNormal.y * outOffset, z: zMid }, camera, width, height);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pGroove1.u, pGroove1.v);
      ctx.lineTo(pGroove2.u, pGroove2.v);
      ctx.stroke();

      // Panel-to-Panel Center Hinges
      for (const frac of [0.25, 0.5, 0.75]) {
        const pHinge = project3DTo2D({
          x: startPt.x + wallTangent.x * (dW * frac) + wallNormal.x * outOffset,
          y: startPt.y + wallTangent.y * (dW * frac) + wallNormal.y * outOffset,
          z: zTop
        }, camera, width, height);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(pHinge.u - 2, pHinge.v - 3, 4, 6);
      }

      // E. Inspection Vision Windows on Panel 2 (3rd from bottom)
      if (i === 2) {
        for (const wFrac of [0.3, 0.7]) {
          const wCenterX = startPt.x + wallTangent.x * (dW * wFrac) + wallNormal.x * outOffset;
          const wCenterY = startPt.y + wallTangent.y * (dW * wFrac) + wallNormal.y * outOffset;
          const wHalfW = dW * 0.12;
          const pw1 = project3DTo2D({ x: wCenterX - wallTangent.x * wHalfW, y: wCenterY - wallTangent.y * wHalfW, z: zBot + panelHeight * 0.25 }, camera, width, height);
          const pw2 = project3DTo2D({ x: wCenterX + wallTangent.x * wHalfW, y: wCenterY + wallTangent.y * wHalfW, z: zBot + panelHeight * 0.25 }, camera, width, height);
          const pw3 = project3DTo2D({ x: wCenterX + wallTangent.x * wHalfW, y: wCenterY + wallTangent.y * wHalfW, z: zTop - panelHeight * 0.25 }, camera, width, height);
          const pw4 = project3DTo2D({ x: wCenterX - wallTangent.x * wHalfW, y: wCenterY - wallTangent.y * wHalfW, z: zTop - panelHeight * 0.25 }, camera, width, height);

          ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
          ctx.beginPath();
          ctx.moveTo(pw1.u, pw1.v);
          ctx.lineTo(pw2.u, pw2.v);
          ctx.lineTo(pw3.u, pw3.v);
          ctx.lineTo(pw4.u, pw4.v);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Bottom Heavy EPDM Rubber Sealing Tube & Lift Handle
    const pHandle = project3DTo2D({
      x: startPt.x + wallTangent.x * (dW * 0.5) + wallNormal.x * (outOffset + 0.03),
      y: startPt.y + wallTangent.y * (dW * 0.5) + wallNormal.y * (outOffset + 0.03),
      z: 0.15
    }, camera, width, height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(pHandle.u - 8, pHandle.v - 3, 16, 6);
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(pHandle.u - 8, pHandle.v - 3, 16, 6);

  } else if (isSwing) {
    // =========================================================================
    // TYPE 2: SWING DOORS (Standard Cold Room Swing vs Clean Room Swing Door)
    // =========================================================================
    // Direction calculation:
    // Outward vs Inward swing normal multiplier
    const normMultiplier = openDirection === 'Inward' ? -1 : 1;
    const swingAngle = isCleanRoom ? 0.78 : 0.88; // ~45-50 degrees
    const isLeftHinge = openingSide === 'Left';

    let pivotPt = isLeftHinge ? { ...startPt } : { x: startPt.x + wallTangent.x * dW, y: startPt.y + wallTangent.y * dW };
    let outerX: number, outerY: number;

    if (isLeftHinge) {
      // Swings outward/inward from Left pivot
      outerX = pivotPt.x + (wallTangent.x * Math.cos(swingAngle) + wallNormal.x * normMultiplier * Math.sin(swingAngle)) * dW;
      outerY = pivotPt.y + (wallTangent.y * Math.cos(swingAngle) + wallNormal.y * normMultiplier * Math.sin(swingAngle)) * dW;
    } else {
      // Swings outward/inward from Right pivot
      outerX = pivotPt.x - (wallTangent.x * Math.cos(swingAngle) - wallNormal.x * normMultiplier * Math.sin(swingAngle)) * dW;
      outerY = pivotPt.y - (wallTangent.y * Math.cos(swingAngle) - wallNormal.y * normMultiplier * Math.sin(swingAngle)) * dW;
    }

    const pPivotBot = project3DTo2D({ x: pivotPt.x, y: pivotPt.y, z: 0 }, camera, width, height);
    const pPivotTop = project3DTo2D({ x: pivotPt.x, y: pivotPt.y, z: dH }, camera, width, height);
    const pOuterBot = project3DTo2D({ x: outerX, y: outerY, z: 0 }, camera, width, height);
    const pOuterTop = project3DTo2D({ x: outerX, y: outerY, z: dH }, camera, width, height);

    // Swung Door Leaf Surface
    ctx.fillStyle = isPreview
      ? 'rgba(56, 189, 248, 0.45)'
      : (isCleanRoom ? 'rgba(241, 245, 249, 0.95)' : 'rgba(203, 213, 225, 0.92)');
    ctx.beginPath();
    ctx.moveTo(pPivotBot.u, pPivotBot.v);
    ctx.lineTo(pOuterBot.u, pOuterBot.v);
    ctx.lineTo(pOuterTop.u, pOuterTop.v);
    ctx.lineTo(pPivotTop.u, pPivotTop.v);
    ctx.closePath();
    ctx.fill();

    // Leaf Aluminum / Stainless Edge Profile
    ctx.strokeStyle = isCleanRoom ? '#0284c7' : '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Swing Radius Floor Guide Arc
    const unswungEdge = isLeftHinge ? p2 : p1;
    ctx.strokeStyle = isCleanRoom ? 'rgba(56, 189, 248, 0.6)' : 'rgba(14, 165, 233, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(unswungEdge.u, unswungEdge.v);
    ctx.quadraticCurveTo(
      (unswungEdge.u + pOuterBot.u) / 2 + (wallNormal.x * normMultiplier * 14),
      (unswungEdge.v + pOuterBot.v) / 2 + (wallNormal.y * normMultiplier * 14),
      pOuterBot.u,
      pOuterBot.v
    );
    ctx.stroke();
    ctx.setLineDash([]);

    if (isCleanRoom) {
      // Inspection Window (Kaca Intip) in Clean Room Swing Door
      const winBottomZ = dH * 0.48;
      const winTopZ = dH * 0.78;
      const midFrac1 = isLeftHinge ? 0.35 : 0.65;
      const midFrac2 = isLeftHinge ? 0.75 : 0.25;

      const wPt1 = {
        x: pivotPt.x + (isLeftHinge ? 1 : -1) * (wallTangent.x * Math.cos(swingAngle) + wallNormal.x * normMultiplier * Math.sin(swingAngle)) * (dW * (isLeftHinge ? 0.35 : 0.25)),
        y: pivotPt.y + (isLeftHinge ? 1 : -1) * (wallTangent.y * Math.cos(swingAngle) + wallNormal.y * normMultiplier * Math.sin(swingAngle)) * (dW * (isLeftHinge ? 0.35 : 0.25))
      };
      const wPt2 = {
        x: pivotPt.x + (isLeftHinge ? 1 : -1) * (wallTangent.x * Math.cos(swingAngle) + wallNormal.x * normMultiplier * Math.sin(swingAngle)) * (dW * (isLeftHinge ? 0.75 : 0.65)),
        y: pivotPt.y + (isLeftHinge ? 1 : -1) * (wallTangent.y * Math.cos(swingAngle) + wallNormal.y * normMultiplier * Math.sin(swingAngle)) * (dW * (isLeftHinge ? 0.75 : 0.65))
      };

      const pw1 = project3DTo2D({ x: wPt1.x, y: wPt1.y, z: winBottomZ }, camera, width, height);
      const pw2 = project3DTo2D({ x: wPt2.x, y: wPt2.y, z: winBottomZ }, camera, width, height);
      const pw3 = project3DTo2D({ x: wPt2.x, y: wPt2.y, z: winTopZ }, camera, width, height);
      const pw4 = project3DTo2D({ x: wPt1.x, y: wPt1.y, z: winTopZ }, camera, width, height);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pw1.u, pw1.v);
      ctx.lineTo(pw2.u, pw2.v);
      ctx.lineTo(pw3.u, pw3.v);
      ctx.lineTo(pw4.u, pw4.v);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Flush Stainless Cleanroom D-Handle near outer edge
      const handlePt = {
        x: pivotPt.x + (isLeftHinge ? 1 : -1) * (wallTangent.x * Math.cos(swingAngle) + wallNormal.x * normMultiplier * Math.sin(swingAngle)) * (dW * 0.88),
        y: pivotPt.y + (isLeftHinge ? 1 : -1) * (wallTangent.y * Math.cos(swingAngle) + wallNormal.y * normMultiplier * Math.sin(swingAngle)) * (dW * 0.88)
      };
      const ph1 = project3DTo2D({ x: handlePt.x, y: handlePt.y, z: dH * 0.42 }, camera, width, height);
      const ph2 = project3DTo2D({ x: handlePt.x, y: handlePt.y, z: dH * 0.58 }, camera, width, height);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ph1.u, ph1.v);
      ctx.lineTo(ph2.u, ph2.v);
      ctx.stroke();

      // Flush Concealed Hinges at Pivot
      for (const hZ of [dH * 0.2, dH * 0.8]) {
        const ph = project3DTo2D({ x: pivotPt.x, y: pivotPt.y, z: hZ }, camera, width, height);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(ph.u, ph.v, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Heavy Cold Room Chrome Latches & External Hinges
      for (const hZ of [dH * 0.18, dH * 0.5, dH * 0.82]) {
        const phMount = project3DTo2D({
          x: pivotPt.x - (isLeftHinge ? 1 : -1) * wallTangent.x * 0.08,
          y: pivotPt.y - (isLeftHinge ? 1 : -1) * wallTangent.y * 0.08,
          z: hZ
        }, camera, width, height);
        const phBlade = project3DTo2D({
          x: pivotPt.x + (isLeftHinge ? 1 : -1) * (wallTangent.x * Math.cos(swingAngle) + wallNormal.x * normMultiplier * Math.sin(swingAngle)) * 0.18,
          y: pivotPt.y + (isLeftHinge ? 1 : -1) * (wallTangent.y * Math.cos(swingAngle) + wallNormal.y * normMultiplier * Math.sin(swingAngle)) * 0.18,
          z: hZ
        }, camera, width, height);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(phMount.u, phMount.v);
        ctx.lineTo(phBlade.u, phBlade.v);
        ctx.stroke();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc((phMount.u + phBlade.u) / 2, (phMount.v + phBlade.v) / 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Heavy Safety Latch with Lever Handle
      const latchPt = {
        x: pivotPt.x + (isLeftHinge ? 1 : -1) * (wallTangent.x * Math.cos(swingAngle) + wallNormal.x * normMultiplier * Math.sin(swingAngle)) * (dW * 0.92),
        y: pivotPt.y + (isLeftHinge ? 1 : -1) * (wallTangent.y * Math.cos(swingAngle) + wallNormal.y * normMultiplier * Math.sin(swingAngle)) * (dW * 0.92)
      };
      const plTop = project3DTo2D({ x: latchPt.x, y: latchPt.y, z: dH * 0.52 }, camera, width, height);
      const plBot = project3DTo2D({ x: latchPt.x, y: latchPt.y, z: dH * 0.42 }, camera, width, height);
      const plHandle = project3DTo2D({
        x: latchPt.x + wallNormal.x * normMultiplier * 0.08,
        y: latchPt.y + wallNormal.y * normMultiplier * 0.08,
        z: dH * 0.47
      }, camera, width, height);

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(plTop.u, plTop.v);
      ctx.lineTo(plHandle.u, plHandle.v);
      ctx.lineTo(plBot.u, plBot.v);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

  } else {
    // =========================================================================
    // TYPE 3: SLIDING DOORS (Heavy Duty Industrial Sliding vs Clean Room Auto Sliding)
    // =========================================================================
    const isSlideLeft = openingSide === 'Left';
    const slideDirMultiplier = isSlideLeft ? -1 : 1;
    const slideOffset = dW * 0.42 * slideDirMultiplier; // Slid open partially
    const leafThickOut = 0.04;

    const leafStartX = startPt.x + wallTangent.x * slideOffset + wallNormal.x * leafThickOut;
    const leafStartY = startPt.y + wallTangent.y * slideOffset + wallNormal.y * leafThickOut;
    const leafEndX = leafStartX + wallTangent.x * dW;
    const leafEndY = leafStartY + wallTangent.y * dW;

    const pLeaf1 = project3DTo2D({ x: leafStartX, y: leafStartY, z: 0 }, camera, width, height);
    const pLeaf2 = project3DTo2D({ x: leafEndX, y: leafEndY, z: 0 }, camera, width, height);
    const pLeaf3 = project3DTo2D({ x: leafEndX, y: leafEndY, z: dH }, camera, width, height);
    const pLeaf4 = project3DTo2D({ x: leafStartX, y: leafStartY, z: dH }, camera, width, height);

    if (isCleanRoom) {
      // Top Automatic Motor Operator Box
      const headerZ1 = dH;
      const headerZ2 = dH + 0.22;
      const headerStartX = startPt.x + wallTangent.x * (isSlideLeft ? -dW * 1.1 : -0.1) + wallNormal.x * 0.05;
      const headerStartY = startPt.y + wallTangent.y * (isSlideLeft ? -dW * 1.1 : -0.1) + wallNormal.y * 0.05;
      const headerEndX = startPt.x + wallTangent.x * (isSlideLeft ? dW * 1.1 : dW * 2.1) + wallNormal.x * 0.05;
      const headerEndY = startPt.y + wallTangent.y * (isSlideLeft ? dW * 1.1 : dW * 2.1) + wallNormal.y * 0.05;

      const ph1 = project3DTo2D({ x: headerStartX, y: headerStartY, z: headerZ1 }, camera, width, height);
      const ph2 = project3DTo2D({ x: headerEndX, y: headerEndY, z: headerZ1 }, camera, width, height);
      const ph3 = project3DTo2D({ x: headerEndX, y: headerEndY, z: headerZ2 }, camera, width, height);
      const ph4 = project3DTo2D({ x: headerStartX, y: headerStartY, z: headerZ2 }, camera, width, height);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(ph1.u, ph1.v);
      ctx.lineTo(ph2.u, ph2.v);
      ctx.lineTo(ph3.u, ph3.v);
      ctx.lineTo(ph4.u, ph4.v);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Motion Sensor Radar Eye & Green Status LED
      const sensorX = (headerStartX + headerEndX) / 2;
      const sensorY = (headerStartY + headerEndY) / 2;
      const pSensor = project3DTo2D({ x: sensorX, y: sensorY, z: headerZ1 + 0.11 }, camera, width, height);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(pSensor.u, pSensor.v, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Slid Door Leaf
      ctx.fillStyle = isPreview ? 'rgba(56, 189, 248, 0.5)' : 'rgba(241, 245, 249, 0.95)';
      ctx.beginPath();
      ctx.moveTo(pLeaf1.u, pLeaf1.v);
      ctx.lineTo(pLeaf2.u, pLeaf2.v);
      ctx.lineTo(pLeaf3.u, pLeaf3.v);
      ctx.lineTo(pLeaf4.u, pLeaf4.v);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vision Glass Window
      const winX1 = leafStartX + wallTangent.x * (dW * 0.35);
      const winY1 = leafStartY + wallTangent.y * (dW * 0.35);
      const winX2 = leafStartX + wallTangent.x * (dW * 0.75);
      const winY2 = leafStartY + wallTangent.y * (dW * 0.75);
      const pw1 = project3DTo2D({ x: winX1, y: winY1, z: dH * 0.48 }, camera, width, height);
      const pw2 = project3DTo2D({ x: winX2, y: winY2, z: dH * 0.48 }, camera, width, height);
      const pw3 = project3DTo2D({ x: winX2, y: winY2, z: dH * 0.78 }, camera, width, height);
      const pw4 = project3DTo2D({ x: winX1, y: winY1, z: dH * 0.78 }, camera, width, height);

      ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.beginPath();
      ctx.moveTo(pw1.u, pw1.v);
      ctx.lineTo(pw2.u, pw2.v);
      ctx.lineTo(pw3.u, pw3.v);
      ctx.lineTo(pw4.u, pw4.v);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Heavy Overhead Tubular Rail & Trolley Hangers
      const railZ = dH + 0.15;
      const railStartX = startPt.x + wallTangent.x * (isSlideLeft ? -dW * 1.1 : -0.2) + wallNormal.x * 0.08;
      const railStartY = startPt.y + wallTangent.y * (isSlideLeft ? -dW * 1.1 : -0.2) + wallNormal.y * 0.08;
      const railEndX = startPt.x + wallTangent.x * (isSlideLeft ? dW * 1.2 : dW * 2.1) + wallNormal.x * 0.08;
      const railEndY = startPt.y + wallTangent.y * (isSlideLeft ? dW * 1.2 : dW * 2.1) + wallNormal.y * 0.08;

      const pRail1 = project3DTo2D({ x: railStartX, y: railStartY, z: railZ }, camera, width, height);
      const pRail2 = project3DTo2D({ x: railEndX, y: railEndY, z: railZ }, camera, width, height);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(pRail1.u, pRail1.v);
      ctx.lineTo(pRail2.u, pRail2.v);
      ctx.stroke();

      // Rail End Stop Bumpers
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(pRail1.u, pRail1.v, 4.5, 0, Math.PI * 2);
      ctx.arc(pRail2.u, pRail2.v, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 2 Heavy-Duty Hanger Trolley Brackets
      for (const tFrac of [0.22, 0.78]) {
        const tX = leafStartX + wallTangent.x * (dW * tFrac);
        const tY = leafStartY + wallTangent.y * (dW * tFrac);
        const pWheel = project3DTo2D({ x: tX, y: tY, z: railZ }, camera, width, height);
        const pBracket = project3DTo2D({ x: tX, y: tY, z: dH }, camera, width, height);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pWheel.u, pWheel.v);
        ctx.lineTo(pBracket.u, pBracket.v);
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(pWheel.u - 4, pWheel.v, 3.5, 0, Math.PI * 2);
        ctx.arc(pWheel.u + 4, pWheel.v, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Thick Insulated Sliding Leaf
      ctx.fillStyle = isPreview ? 'rgba(245, 158, 11, 0.45)' : 'rgba(203, 213, 225, 0.95)';
      ctx.beginPath();
      ctx.moveTo(pLeaf1.u, pLeaf1.v);
      ctx.lineTo(pLeaf2.u, pLeaf2.v);
      ctx.lineTo(pLeaf3.u, pLeaf3.v);
      ctx.lineTo(pLeaf4.u, pLeaf4.v);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Handle on Face
      const handleSideFrac = isSlideLeft ? 0.85 : 0.15;
      const hX = leafStartX + wallTangent.x * (dW * handleSideFrac);
      const hY = leafStartY + wallTangent.y * (dW * handleSideFrac);
      const ph1 = project3DTo2D({ x: hX, y: hY, z: dH * 0.58 }, camera, width, height);
      const ph2 = project3DTo2D({ x: hX, y: hY, z: dH * 0.38 }, camera, width, height);
      const phGrip = project3DTo2D({ x: hX + wallNormal.x * 0.06, y: hY + wallNormal.y * 0.06, z: dH * 0.38 }, camera, width, height);

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(ph1.u, ph1.v);
      ctx.lineTo(ph2.u, ph2.v);
      ctx.lineTo(phGrip.u, phGrip.v);
      ctx.stroke();
    }
  }

  // =========================================================================
  // 3. PLASTIC CURTAIN (PVC STRIP) ACCESSORY RENDERING
  // =========================================================================
  if (hasPlasticCurtain) {
    const isAmber = plasticType.includes('Amber');
    const isRibbed = plasticType.includes('Ribbed');
    const stripCount = Math.max(6, Math.round(dW * 5)); // 5 strips per meter width
    const stripWidthM = dW / (stripCount * 0.7); // 30-50% overlap

    // Top Stainless Steel Hook-On Mounting Header Track Bar
    const trackBarPt1 = project3DTo2D({ x: startPt.x - wallTangent.x * 0.02, y: startPt.y - wallTangent.y * 0.02, z: dH - 0.02 }, camera, width, height);
    const trackBarPt2 = project3DTo2D({ x: startPt.x + wallTangent.x * (dW + 0.02), y: startPt.y + wallTangent.y * (dW + 0.02), z: dH - 0.02 }, camera, width, height);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(trackBarPt1.u, trackBarPt1.v);
    ctx.lineTo(trackBarPt2.u, trackBarPt2.v);
    ctx.stroke();

    // Overlapping Hanging PVC Strips
    for (let i = 0; i < stripCount; i++) {
      const sFrac = i / stripCount;
      const sX = startPt.x + wallTangent.x * (dW * sFrac);
      const sY = startPt.y + wallTangent.y * (dW * sFrac);
      const sEndX = sX + wallTangent.x * stripWidthM;
      const sEndY = sY + wallTangent.y * stripWidthM;

      // Slight natural stagger at bottom for realism
      const botZ = 0.04 + ((i % 3) * 0.01);

      const ps1 = project3DTo2D({ x: sX, y: sY, z: botZ }, camera, width, height);
      const ps2 = project3DTo2D({ x: sEndX, y: sEndY, z: botZ }, camera, width, height);
      const ps3 = project3DTo2D({ x: sEndX, y: sEndY, z: dH - 0.02 }, camera, width, height);
      const ps4 = project3DTo2D({ x: sX, y: sY, z: dH - 0.02 }, camera, width, height);

      // Translucent Strip Body
      ctx.fillStyle = isAmber
        ? 'rgba(245, 158, 11, 0.45)'
        : 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.moveTo(ps1.u, ps1.v);
      ctx.lineTo(ps2.u, ps2.v);
      ctx.lineTo(ps3.u, ps3.v);
      ctx.lineTo(ps4.u, ps4.v);
      ctx.closePath();
      ctx.fill();

      // Specular High-Gloss Strip Edge Highlight
      ctx.strokeStyle = isAmber ? 'rgba(251, 191, 36, 0.8)' : 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // If Ribbed: draw vertical rib lines
      if (isRibbed) {
        const pRib1 = project3DTo2D({ x: (sX + sEndX) / 2, y: (sY + sEndY) / 2, z: botZ }, camera, width, height);
        const pRib2 = project3DTo2D({ x: (sX + sEndX) / 2, y: (sY + sEndY) / 2, z: dH - 0.02 }, camera, width, height);
        ctx.strokeStyle = isAmber ? 'rgba(217, 119, 6, 0.5)' : 'rgba(14, 165, 233, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pRib1.u, pRib1.v);
        ctx.lineTo(pRib2.u, pRib2.v);
        ctx.stroke();
      }
    }
  }

  // =========================================================================
  // 4. AIR CURTAIN (TIRAI UDARA BLOWER) ACCESSORY RENDERING
  // =========================================================================
  if (hasAirCurtain) {
    const blowerZ1 = dH + 0.04;
    const blowerZ2 = dH + 0.26;
    const blowerMargin = 0.05;
    const blowerStartX = startPt.x - wallTangent.x * blowerMargin + wallNormal.x * 0.08;
    const blowerStartY = startPt.y - wallTangent.y * blowerMargin + wallNormal.y * 0.08;
    const blowerEndX = startPt.x + wallTangent.x * (dW + blowerMargin) + wallNormal.x * 0.08;
    const blowerEndY = startPt.y + wallTangent.y * (dW + blowerMargin) + wallNormal.y * 0.08;

    const pb1 = project3DTo2D({ x: blowerStartX, y: blowerStartY, z: blowerZ1 }, camera, width, height);
    const pb2 = project3DTo2D({ x: blowerEndX, y: blowerEndY, z: blowerZ1 }, camera, width, height);
    const pb3 = project3DTo2D({ x: blowerEndX, y: blowerEndY, z: blowerZ2 }, camera, width, height);
    const pb4 = project3DTo2D({ x: blowerStartX, y: blowerStartY, z: blowerZ2 }, camera, width, height);

    // Blower Casing Body
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(pb1.u, pb1.v);
    ctx.lineTo(pb2.u, pb2.v);
    ctx.lineTo(pb3.u, pb3.v);
    ctx.lineTo(pb4.u, pb4.v);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Intake Louver Grille Lines across face
    for (let g = 0.3; g <= 0.75; g += 0.2) {
      const gZ = blowerZ1 + (blowerZ2 - blowerZ1) * g;
      const pg1 = project3DTo2D({ x: blowerStartX + wallTangent.x * 0.05, y: blowerStartY + wallTangent.y * 0.05, z: gZ }, camera, width, height);
      const pg2 = project3DTo2D({ x: blowerEndX - wallTangent.x * 0.05, y: blowerEndY - wallTangent.y * 0.05, z: gZ }, camera, width, height);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pg1.u, pg1.v);
      ctx.lineTo(pg2.u, pg2.v);
      ctx.stroke();
    }

    // Power Indicator Glowing LED (Cyan/Green)
    const pLed = project3DTo2D({
      x: blowerEndX - wallTangent.x * 0.04,
      y: blowerEndY - wallTangent.y * 0.04,
      z: blowerZ1 + 0.11
    }, camera, width, height);
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(pLed.u, pLed.v, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Animated Downward Laminar Airflow Streams
    const streamCount = 8;
    const speedMult = door.airCurtainSpeed === 'High Velocity' ? 1.8 : 1.2;
    const dashOffset = -(animTime * 70 * speedMult);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = dashOffset;

    for (let s = 0; s < streamCount; s++) {
      const frac = (s + 0.5) / streamCount;
      const sX = startPt.x + wallTangent.x * (dW * frac) + wallNormal.x * 0.06;
      const sY = startPt.y + wallTangent.y * (dW * frac) + wallNormal.y * 0.06;

      const pTop = project3DTo2D({ x: sX, y: sY, z: blowerZ1 }, camera, width, height);
      const pFloor = project3DTo2D({ x: sX, y: sY, z: 0.05 }, camera, width, height);

      ctx.beginPath();
      ctx.moveTo(pTop.u, pTop.v);
      ctx.lineTo(pFloor.u, pFloor.v);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // =========================================================================
  // 5. TYPE & DIMENSION LABEL BADGES ABOVE DOOR
  // =========================================================================
  const midTopU = (p3.u + p4.u) / 2;
  const midTopV = (p3.v + p4.v) / 2;
  
  const badgeColor = isCleanRoom
    ? '#06b6d4'
    : isSectional
    ? '#f59e0b'
    : isSlidingType
    ? '#fb923c'
    : '#38bdf8';

  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(midTopU - 65, midTopV - (hasAirCurtain ? 34 : 22), 130, 18, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const shortType = isSectional
    ? 'SECTIONAL DOCK'
    : isCleanRoom
    ? (isSlidingType ? 'CR SLIDING' : 'CR SWING')
    : (isSlidingType ? 'SLIDING HD' : 'SWING STD');

  ctx.fillText(
    `${shortType} ${Math.round(dW * 1000)}x${Math.round(dH * 1000)} mm`,
    midTopU,
    midTopV - (hasAirCurtain ? 25 : 13)
  );

  ctx.restore();
}

function drawEvaporator3D(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  ox: number,
  oy: number,
  L: number,
  W: number,
  H: number,
  evap: any,
  animTime: number,
  isPreview: boolean = false
) {
  ctx.save();
  const eW = Math.max(0.6, Number(evap.width) || 1.4); // length across room (X)
  const eL = Math.max(0.3, Number(evap.length) || 0.6); // depth across room (Y)
  const eH = Math.max(0.25, Number(evap.height) || 0.5); // height (Z)
  const evapType = (evap.type || 'Standard').toString();
  const isDualDischarge = evapType.toLowerCase().includes('dual');

  // Fan count: explicit or calculated from width eW
  const fanCount = evap.fanCount || (eW <= 1.1 ? 1 : eW <= 1.7 ? 2 : eW <= 2.4 ? 3 : 4);

  const posX = ox + (evap.posX !== undefined ? evap.posX : Math.max(0.1, L / 2 - eW / 2));
  const posY = oy + (evap.posY !== undefined ? evap.posY : Math.max(0.1, W - eL - 0.3));
  const posZ = evap.posZ !== undefined ? evap.posZ : Math.max(0.3, H - eH - 0.15); // hanging below ceiling

  // Evaporator Casing 8 Corners
  const p1 = project3DTo2D({ x: posX, y: posY, z: posZ }, camera, width, height);
  const p2 = project3DTo2D({ x: posX + eW, y: posY, z: posZ }, camera, width, height);
  const p3 = project3DTo2D({ x: posX + eW, y: posY + eL, z: posZ }, camera, width, height);
  const p4 = project3DTo2D({ x: posX, y: posY + eL, z: posZ }, camera, width, height);

  const p5 = project3DTo2D({ x: posX, y: posY, z: posZ + eH }, camera, width, height);
  const p6 = project3DTo2D({ x: posX + eW, y: posY, z: posZ + eH }, camera, width, height);
  const p7 = project3DTo2D({ x: posX + eW, y: posY + eL, z: posZ + eH }, camera, width, height);
  const p8 = project3DTo2D({ x: posX, y: posY + eL, z: posZ + eH }, camera, width, height);

  // 1. Draw 4 Ceiling Suspension Threaded Rods (M10/M12 Allthread) up to Ceiling z = H
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  const hangPoints = [
    { x: posX + 0.05, y: posY + 0.05 },
    { x: posX + eW - 0.05, y: posY + 0.05 },
    { x: posX + eW - 0.05, y: posY + eL - 0.05 },
    { x: posX + 0.05, y: posY + eL - 0.05 }
  ];

  hangPoints.forEach(hp => {
    const pBot = project3DTo2D({ x: hp.x, y: hp.y, z: posZ + eH }, camera, width, height);
    const pTop = project3DTo2D({ x: hp.x, y: hp.y, z: H }, camera, width, height);
    ctx.beginPath();
    ctx.moveTo(pBot.u, pBot.v);
    ctx.lineTo(pTop.u, pTop.v);
    ctx.stroke();
  });

  // 2. Draw Evaporator Casing Solids
  // Bottom Face (Drain Pan)
  ctx.fillStyle = isPreview ? 'rgba(8, 47, 73, 0.8)' : '#1e293b';
  ctx.beginPath();
  ctx.moveTo(p1.u, p1.v);
  ctx.lineTo(p2.u, p2.v);
  ctx.lineTo(p3.u, p3.v);
  ctx.lineTo(p4.u, p4.v);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isPreview ? '#38bdf8' : '#475569';
  ctx.stroke();

  // Side Face Left
  ctx.fillStyle = '#263347';
  ctx.beginPath();
  ctx.moveTo(p1.u, p1.v);
  ctx.lineTo(p4.u, p4.v);
  ctx.lineTo(p8.u, p8.v);
  ctx.lineTo(p5.u, p5.v);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side Face Right
  ctx.fillStyle = '#263347';
  ctx.beginPath();
  ctx.moveTo(p2.u, p2.v);
  ctx.lineTo(p3.u, p3.v);
  ctx.lineTo(p7.u, p7.v);
  ctx.lineTo(p6.u, p6.v);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front Face (Fan Discharge Face)
  ctx.fillStyle = isPreview ? 'rgba(14, 165, 233, 0.4)' : '#334155';
  ctx.beginPath();
  ctx.moveTo(p1.u, p1.v);
  ctx.lineTo(p2.u, p2.v);
  ctx.lineTo(p6.u, p6.v);
  ctx.lineTo(p5.u, p5.v);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = isPreview ? '#38bdf8' : (isDualDischarge ? '#a855f7' : '#06b6d4');
  ctx.lineWidth = isPreview ? 2.5 : 1.8;
  if (isPreview) ctx.setLineDash([5, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Draw Dynamic Fan Shrouds, Motor Hubs, Blades & Cold Airflow
  const fanDiamMm = evap.fanDiameter || 300;
  const fanRadius = Math.min(20, Math.max(6, ((fanDiamMm / 1000) / Math.max(0.3, eH)) * 11 * (eH / 0.5) * Math.min(1, 2.5 / fanCount)));
  
  for (let f = 0; f < fanCount; f++) {
    const fanFrac = (f + 0.5) / fanCount;
    const fanCenter3D = {
      x: posX + eW * fanFrac,
      y: posY,
      z: posZ + eH * 0.5
    };
    const fCenter = project3DTo2D(fanCenter3D, camera, width, height);

    // Fan Circular Shroud
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.arc(fCenter.u, fCenter.v, fanRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Central Motor Hub
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(fCenter.u, fCenter.v, fanRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 4 Animated Spinning Fan Blades
    const spinAngle = animTime * 10 + f * 1.5;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    for (let b = 0; b < 4; b++) {
      const bAngle = spinAngle + (b * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(fCenter.u, fCenter.v);
      ctx.lineTo(
        fCenter.u + Math.cos(bAngle) * (fanRadius * 0.85),
        fCenter.v + Math.sin(bAngle) * (fanRadius * 0.85)
      );
      ctx.stroke();
    }

    // Animated Cold Airflow Ribbon Stream emanating forward into room
    ctx.strokeStyle = isDualDischarge
      ? 'rgba(168, 85, 247, 0.75)'
      : 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -animTime * 18;

    const streamTarget = project3DTo2D(
      {
        x: posX + eW * fanFrac,
        y: posY - Math.min(2.8, W * 0.6),
        z: Math.max(0.2, posZ - 0.8)
      },
      camera,
      width,
      height
    );

    ctx.beginPath();
    ctx.moveTo(fCenter.u, fCenter.v);
    ctx.quadraticCurveTo(
      fCenter.u + (f % 2 === 0 ? -12 : 12),
      fCenter.v + 25,
      streamTarget.u,
      streamTarget.v
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // If Dual Discharge, also draw rear airflow stream!
    if (isDualDischarge) {
      const rearCenter3D = {
        x: posX + eW * fanFrac,
        y: posY + eL,
        z: posZ + eH * 0.5
      };
      const rCenter = project3DTo2D(rearCenter3D, camera, width, height);
      const rearTarget = project3DTo2D(
        {
          x: posX + eW * fanFrac,
          y: posY + eL + 2.0,
          z: Math.max(0.2, posZ - 0.8)
        },
        camera,
        width,
        height
      );
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -animTime * 18;
      ctx.beginPath();
      ctx.moveTo(rCenter.u, rCenter.v);
      ctx.lineTo(rearTarget.u, rearTarget.v);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Evaporator Info Badge
  const midTopU = (p5.u + p6.u) / 2;
  const midTopV = (p5.v + p6.v) / 2;
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(midTopU - 50, midTopV - 18, 100, 16, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 8.5px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${evap.name || 'EVAP'} (${Math.round(eW * 1000)}x${Math.round(eL * 1000)} mm • ${fanCount}F)`,
    midTopU,
    midTopV - 10
  );

  ctx.restore();
}

function drawRoomDimensions(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  ox: number,
  oy: number,
  L: number,
  W: number,
  H: number,
  roomName: string
) {
  ctx.save();

  // Dimension lines with offsets
  const pFrontLeft = project3DTo2D({ x: ox, y: oy - 0.4, z: 0 }, camera, width, height);
  const pFrontRight = project3DTo2D({ x: ox + L, y: oy - 0.4, z: 0 }, camera, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pFrontLeft.u, pFrontLeft.v);
  ctx.lineTo(pFrontRight.u, pFrontRight.v);
  ctx.stroke();

  // Label L
  const midL = { u: (pFrontLeft.u + pFrontRight.u) / 2, v: (pFrontLeft.v + pFrontRight.v) / 2 };
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(midL.u - 34, midL.v + 4, 68, 18, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(L * 1000)} mm`, midL.u, midL.v + 13);

  // Side W dimension
  const pSideBottom = project3DTo2D({ x: ox + L + 0.4, y: oy, z: 0 }, camera, width, height);
  const pSideTop = project3DTo2D({ x: ox + L + 0.4, y: oy + W, z: 0 }, camera, width, height);

  ctx.beginPath();
  ctx.moveTo(pSideBottom.u, pSideBottom.v);
  ctx.lineTo(pSideTop.u, pSideTop.v);
  ctx.stroke();

  const midW = { u: (pSideBottom.u + pSideTop.u) / 2, v: (pSideBottom.v + pSideTop.v) / 2 };
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.beginPath();
  ctx.roundRect(midW.u + 4, midW.v - 9, 68, 18, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(W * 1000)} mm`, midW.u + 38, midW.v);

  // Center Room Name floating badge
  const centerP = project3DTo2D({ x: ox + L / 2, y: oy + W / 2, z: H / 2 }, camera, width, height);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(centerP.u - 45, centerP.v - 12, 90, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(roomName, centerP.u, centerP.v + 4);

  ctx.restore();
}

function drawStepByStepPoly(
  ctx: CanvasRenderingContext2D,
  camera: Camera3D,
  width: number,
  height: number,
  vertices: { x: number; y: number; name: string }[],
  currentDir: Direction,
  currentLength: number,
  animTime: number
) {
  ctx.save();
  const H = 3.0; // default height for drawing extrusion

  // 1. Draw already established vertices & segments
  for (let i = 0; i < vertices.length - 1; i++) {
    const v1 = vertices[i];
    const v2 = vertices[i + 1];

    const p1 = project3DTo2D({ x: v1.x, y: v1.y, z: 0 }, camera, width, height);
    const p2 = project3DTo2D({ x: v2.x, y: v2.y, z: 0 }, camera, width, height);
    const p1H = project3DTo2D({ x: v1.x, y: v1.y, z: H }, camera, width, height);
    const p2H = project3DTo2D({ x: v2.x, y: v2.y, z: H }, camera, width, height);

    // Wall face
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.beginPath();
    ctx.moveTo(p1.u, p1.v);
    ctx.lineTo(p2.u, p2.v);
    ctx.lineTo(p2H.u, p2H.v);
    ctx.lineTo(p1H.u, p1H.v);
    ctx.closePath();
    ctx.fill();

    // Solid border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Vertex Badge
    drawVertexBadge(ctx, p1.u, p1.v, v1.name);
  }

  // Draw latest vertex badge
  const lastV = vertices[vertices.length - 1];
  const lastP = project3DTo2D({ x: lastV.x, y: lastV.y, z: 0 }, camera, width, height);
  drawVertexBadge(ctx, lastP.u, lastP.v, lastV.name);

  // 2. Draw Active Extrusion Ray in Current Direction
  let nextX = lastV.x;
  let nextY = lastV.y;

  if (currentDir === 'E') nextX += currentLength;
  if (currentDir === 'W') nextX -= currentLength;
  if (currentDir === 'N') nextY -= currentLength; // Fix N/S mapping
  if (currentDir === 'S') nextY += currentLength; // Fix N/S mapping

  const pNext = project3DTo2D({ x: nextX, y: nextY, z: 0 }, camera, width, height);
  const pNextH = project3DTo2D({ x: nextX, y: nextY, z: H }, camera, width, height);
  const pLastH = project3DTo2D({ x: lastV.x, y: lastV.y, z: H }, camera, width, height);

  // Gradient rainbow/active face (as seen in video)
  const grad = ctx.createLinearGradient(lastP.u, lastP.v, pNext.u, pNext.v);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.5)'); // Red/orange
  grad.addColorStop(0.5, 'rgba(234, 179, 8, 0.5)'); // Yellow
  grad.addColorStop(1, 'rgba(34, 197, 94, 0.5)'); // Green

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(lastP.u, lastP.v);
  ctx.lineTo(pNext.u, pNext.v);
  ctx.lineTo(pNextH.u, pNextH.v);
  ctx.lineTo(pLastH.u, pLastH.v);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 3]);
  ctx.stroke();

  // Next target vertex marker (+)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(pNext.u, pNext.v, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawVertexBadge(ctx: CanvasRenderingContext2D, u: number, v: number, label: string) {
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(u, v, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, u, v);
  ctx.restore();
}
