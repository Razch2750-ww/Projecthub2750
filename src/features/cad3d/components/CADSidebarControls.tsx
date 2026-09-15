import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
  CADRoom,
  CADMode,
  Direction,
  PanelThickness,
  DoorType,
  EvaporatorType,
  StorageUsageType
} from '../types';
import { COMMODITY_PROFILES, calculateHeatLoad } from '../math/projection3d';
import {
  Maximize,
  Split,
  GitMerge,
  DoorOpen,
  Fan,
  Flame,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Zap,
  Sparkles,
  Layers,
  ChevronDown,
  Wind,
  ShieldCheck,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableDropdown } from '../../../components/ui/SearchableDropdown';

interface CADSidebarControlsProps {
  room: CADRoom;
  activeMode: CADMode;
  onChangeMode: (mode: CADMode) => void;
  onUpdateRoom: (updater: (prev: CADRoom) => CADRoom) => void;
  // Ambient weather
  ambientTemp: number;
  ambientRH: number;
  onChangeAmbient: (temp: number, rh: number) => void;
  // Step-by-step drawing mode
  isDrawingStep: boolean;
  onToggleDrawingStep: (enable: boolean) => void;
  drawingCurrentDir: Direction;
  onChangeDrawingDir: (dir: Direction) => void;
  drawingLength: number;
  onChangeDrawingLength: (len: number) => void;
  onAddVertex: () => void;
  onResetDrawing?: () => void;
  onCloseLoop: () => void;
  drawingVerticesCount: number;
  // Live partition draft state
  partitionDraft: {
    wall: string;
    margin: number;
    side: 'Left' | 'Right';
    thickness: PanelThickness;
  };
  onChangePartitionDraft: (draft: any) => void;
  onCreatePartition: () => void;
  // Live door draft state
  doorDraft: {
    wall: string;
    type: DoorType;
    width: number;
    height: number;
    margin: number;
    thickness: PanelThickness;
    openingSide: 'Left' | 'Right';
    openDirection?: 'Left' | 'Right' | 'Outward' | 'Inward';
    hasAirCurtain?: boolean;
    hasPlasticCurtain?: boolean;
    plasticCurtainType?: string;
    airCurtainSpeed?: 'Standard' | 'High Velocity';
  };
  onChangeDoorDraft: (draft: any) => void;
  onCreateDoor: () => void;
  // Live evap draft state
  evapDraft: {
    type: EvaporatorType;
    width: number;
    length: number;
    height: number;
    fanCount: number;
    rotation: 0 | 90 | 180 | 270;
    leftOffset?: number;
    backOffset: number;
    hangingHeight: number;
  };
  onChangeEvapDraft: (draft: any) => void;
  onCreateEvap: () => void;
  // Adjoining room creation
  onAddAdjoiningRoom?: (config: {
    name: string;
    wallAnchor: 'Left' | 'Right' | 'Top' | 'Bottom';
    length: number;
    width: number;
    height: number;
    thickness: PanelThickness;
    offset?: number;
  }) => void;
}

export const CADSidebarControls: React.FC<CADSidebarControlsProps> = ({
  room,
  activeMode,
  onChangeMode,
  onUpdateRoom,
  ambientTemp,
  ambientRH,
  onChangeAmbient,
  isDrawingStep,
  onToggleDrawingStep,
  drawingCurrentDir,
  onChangeDrawingDir,
  drawingLength,
  onChangeDrawingLength,
  onAddVertex,
  onResetDrawing,
  onCloseLoop,
  drawingVerticesCount,
  partitionDraft,
  onChangePartitionDraft,
  onCreatePartition,
  doorDraft,
  onChangeDoorDraft,
  onCreateDoor,
  evapDraft,
  onChangeEvapDraft,
  onCreateEvap,
  onAddAdjoiningRoom
}) => {
  const heatResult = React.useMemo(() => {
    return calculateHeatLoad(room, room.heatLoadParams);
  }, [room]);

  // Join draft state
  const [adjoinWall, setAdjoinWall] = useState<'Left' | 'Right' | 'Top' | 'Bottom'>('Right');
  const [adjoinName, setAdjoinName] = useState('Anteroom');
  const [adjoinLength, setAdjoinLength] = useState(3.0);
  const [adjoinWidth, setAdjoinWidth] = useState(room.width);
  const [adjoinHeight, setAdjoinHeight] = useState(room.height);
  const [adjoinThickness, setAdjoinThickness] = useState<PanelThickness>(room.thickness);
  const [adjoinOffset, setAdjoinOffset] = useState(0.0);

  // Firestore Product Database for CAD integration
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [selectedEvapProdId, setSelectedEvapProdId] = useState('');
  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      const items: any[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      setDbProducts(items);
    }).catch(err => console.error("Error loading products for CAD:", err));
  }, []);

  const handleCreateAdjoining = () => {
    if (!onAddAdjoiningRoom) {
      toast.info('Menambahkan ruangan adjoining...');
      return;
    }
    onAddAdjoiningRoom({
      name: adjoinName || 'Adjoining Room',
      wallAnchor: adjoinWall,
      length: adjoinLength,
      width: adjoinWidth,
      height: adjoinHeight,
      thickness: adjoinThickness,
      offset: adjoinOffset
    });
  };

  return (
    <div className="w-full lg:w-[410px] flex flex-col bg-surface-elevated border border-divider rounded-2xl overflow-hidden shadow-2xl shrink-0">
      {/* Top Ambient Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-divider text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-medium">Ambient:</span>
            <input
              type="number"
              value={ambientTemp}
              onChange={e => onChangeAmbient(Number(e.target.value) || 30, ambientRH)}
              className="w-12 h-6 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center rounded border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
            />
            <span className="text-secondary">°C</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-medium">RH:</span>
            <input
              type="number"
              value={ambientRH}
              onChange={e => onChangeAmbient(ambientTemp, Number(e.target.value) || 60)}
              className="w-12 h-6 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center rounded border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
            />
            <span className="text-secondary">%</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase font-bold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] bg-[var(--color-accent-500)]/10 px-2 py-0.5 rounded border border-[var(--color-accent-500)]/30">
            {room.name}
          </span>
        </div>
      </div>

      {/* Main Mode Tabs Switcher (SupaCAD Style) */}
      <div className="grid grid-cols-6 gap-1 p-2 bg-surface-hover border-b border-divider">
        <button
          onClick={() => onChangeMode('dims')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeMode === 'dims'
              ? 'bg-[var(--color-accent-600)] text-white border border-[var(--color-accent-600)] shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <Maximize size={15} className="mb-1" />
          <span>Dims</span>
        </button>

        <button
          onClick={() => onChangeMode('part')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeMode === 'part'
              ? 'bg-[var(--color-accent-600)] text-white border border-[var(--color-accent-600)] shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <Split size={15} className="mb-1" />
          <span>Part</span>
        </button>

        <button
          onClick={() => onChangeMode('join')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeMode === 'join'
              ? 'bg-[var(--color-accent-600)] text-white border border-[var(--color-accent-600)] shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <GitMerge size={15} className="mb-1" />
          <span>Join</span>
        </button>

        <button
          onClick={() => onChangeMode('door')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeMode === 'door'
              ? 'bg-[var(--color-accent-600)] text-white border border-[var(--color-accent-600)] shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <DoorOpen size={15} className="mb-1" />
          <span>Door</span>
        </button>

        <button
          onClick={() => onChangeMode('evap')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeMode === 'evap'
              ? 'bg-[var(--color-accent-600)] text-white border border-[var(--color-accent-600)] shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <Fan size={15} className="mb-1" />
          <span>Evap</span>
        </button>

        <button
          onClick={() => onChangeMode('heatload')}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-semibold transition-all ${
            activeMode === 'heatload'
              ? 'bg-amber-600 text-white border border-amber-600 shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface'
          }`}
        >
          <Flame size={15} className="mb-1" />
          <span>Heat</span>
        </button>
      </div>

      {/* Tab Panels Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-[calc(100vh-280px)] space-y-4">
        {/* ========================================================== */}
        {/* 1. DIMENSIONS TAB */}
        {/* ========================================================== */}
        {activeMode === 'dims' && (
          <div className="space-y-4">
            {/* Draw Mode Switcher */}
            <div className="flex items-center gap-2 p-1 bg-surface-hover rounded-xl border border-divider">
              <button
                onClick={() => onToggleDrawingStep(false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  !isDrawingStep
                    ? 'bg-[var(--color-accent-600)] text-white shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Template Kotak (Parametrik)
              </button>
              <button
                onClick={() => onToggleDrawingStep(true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isDrawingStep
                    ? 'bg-[var(--color-accent-500)]/20 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border border-[var(--color-accent-500)]/40 shadow-xs'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Custom Draw (N,E,S,W)
              </button>
            </div>

            {!isDrawingStep ? (
              <>
                {/* Length (L) */}
                <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-divider">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-medium">Panjang (L)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateRoom(prev => ({ ...prev, length: Math.max(1, +(prev.length - 0.5).toFixed(2)) }))}
                        className="px-1.5 py-0.5 bg-surface-hover hover:bg-surface text-primary rounded border border-divider text-[10px] font-bold"
                        title="Kurang 500 mm"
                      >
                        -500
                      </button>
                      <input
                        type="number"
                        step="100"
                        min="1000"
                        max="30000"
                        value={Math.round(room.length * 1000)}
                        onChange={e => onUpdateRoom(prev => ({ ...prev, length: Math.max(0.5, (Number(e.target.value) || 1000) / 1000) }))}
                        className="w-16 h-6 bg-surface-elevated text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider"
                      />
                      <button
                        onClick={() => onUpdateRoom(prev => ({ ...prev, length: +(prev.length + 0.5).toFixed(2) }))}
                        className="px-1.5 py-0.5 bg-surface-hover hover:bg-surface text-primary rounded border border-divider text-[10px] font-bold"
                        title="Tambah 500 mm"
                      >
                        +500
                      </button>
                      <span className="text-[10px] text-muted ml-1">mm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="24000"
                    step="500"
                    value={Math.round(room.length * 1000)}
                    onChange={e => onUpdateRoom(prev => ({ ...prev, length: Number(e.target.value) / 1000 }))}
                    className="w-full accent-[var(--color-accent-600)] cursor-pointer"
                  />
                </div>

                {/* Width (W) */}
                <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-divider">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-medium">Lebar (W)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateRoom(prev => ({ ...prev, width: Math.max(1, +(prev.width - 0.5).toFixed(2)) }))}
                        className="px-1.5 py-0.5 bg-surface-hover hover:bg-surface text-primary rounded border border-divider text-[10px] font-bold"
                        title="Kurang 500 mm"
                      >
                        -500
                      </button>
                      <input
                        type="number"
                        step="100"
                        min="1000"
                        max="30000"
                        value={Math.round(room.width * 1000)}
                        onChange={e => onUpdateRoom(prev => ({ ...prev, width: Math.max(0.5, (Number(e.target.value) || 1000) / 1000) }))}
                        className="w-16 h-6 bg-surface-elevated text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider"
                      />
                      <button
                        onClick={() => onUpdateRoom(prev => ({ ...prev, width: +(prev.width + 0.5).toFixed(2) }))}
                        className="px-1.5 py-0.5 bg-surface-hover hover:bg-surface text-primary rounded border border-divider text-[10px] font-bold"
                        title="Tambah 500 mm"
                      >
                        +500
                      </button>
                      <span className="text-[10px] text-muted ml-1">mm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="24000"
                    step="500"
                    value={Math.round(room.width * 1000)}
                    onChange={e => onUpdateRoom(prev => ({ ...prev, width: Number(e.target.value) / 1000 }))}
                    className="w-full accent-[var(--color-accent-600)] cursor-pointer"
                  />
                </div>

                {/* Height (H) */}
                <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-divider">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-medium">Tinggi (H)</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateRoom(prev => ({ ...prev, height: Math.max(1.5, +(prev.height - 0.2).toFixed(2)) }))}
                        className="px-1.5 py-0.5 bg-surface-hover hover:bg-surface text-primary rounded border border-divider text-[10px] font-bold"
                        title="Kurang 200 mm"
                      >
                        -200
                      </button>
                      <input
                        type="number"
                        step="100"
                        min="1500"
                        max="12000"
                        value={Math.round(room.height * 1000)}
                        onChange={e => onUpdateRoom(prev => ({ ...prev, height: Math.max(1.0, (Number(e.target.value) || 1500) / 1000) }))}
                        className="w-16 h-6 bg-surface-elevated text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider"
                      />
                      <button
                        onClick={() => onUpdateRoom(prev => ({ ...prev, height: +(prev.height + 0.2).toFixed(2) }))}
                        className="px-1.5 py-0.5 bg-surface-hover hover:bg-surface text-primary rounded border border-divider text-[10px] font-bold"
                        title="Tambah 200 mm"
                      >
                        +200
                      </button>
                      <span className="text-[10px] text-muted ml-1">mm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="10000"
                    step="200"
                    value={Math.round(room.height * 1000)}
                    onChange={e => onUpdateRoom(prev => ({ ...prev, height: Number(e.target.value) / 1000 }))}
                    className="w-full accent-[var(--color-accent-600)] cursor-pointer"
                  />
                </div>

                {/* Thickness Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-wider">
                    Ketebalan Panel (mm)
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {([50, 75, 100, 125, 150, 200] as PanelThickness[]).map(th => (
                      <button
                        key={th}
                        onClick={() => onUpdateRoom(prev => ({ ...prev, thickness: th }))}
                        className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                          room.thickness === th
                            ? 'bg-[var(--color-accent-600)] text-white border-[var(--color-accent-600)] shadow-xs scale-105'
                            : 'bg-surface text-secondary border-divider hover:border-divider-hover'
                        }`}
                      >
                        {th}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floor Type & Material */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-secondary">Material Panel</label>
                    <select
                      value={room.material}
                      onChange={e => onUpdateRoom(prev => ({ ...prev, material: e.target.value as any }))}
                      className="w-full h-8 bg-surface text-primary text-xs px-2 rounded-lg border border-divider focus:border-[var(--color-accent-500)]"
                    >
                      <option value="PU">Polyurethane (PU)</option>
                      <option value="PIR">Polyisocyanurate (PIR)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-secondary">Tipe Lantai</label>
                    <select
                      value={room.floorType}
                      onChange={e => onUpdateRoom(prev => ({ ...prev, floorType: e.target.value as any }))}
                      className="w-full h-8 bg-surface text-primary text-xs px-2 rounded-lg border border-divider focus:border-[var(--color-accent-500)]"
                    >
                      <option value="tanpa lantai">Tanpa Lantai</option>
                      <option value="insulation panel">Panel PU / PIR</option>
                      <option value="concrete">Cor Beton</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              /* Custom Step-by-Step Polygon Draw Panel */
              <div className="space-y-4 bg-surface p-4 rounded-xl border border-divider">
                <div className="flex items-center justify-between border-b border-divider pb-2">
                  <span className="text-xs font-bold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">Custom Draw Polygon</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-400">
                      Titik: {drawingVerticesCount}
                    </span>
                    {onResetDrawing && (
                      <button
                        onClick={onResetDrawing}
                        title="Reset Titik Gambar"
                        className="p-1 text-gray-400 hover:text-white rounded hover:bg-surface-hover"
                      >
                        <RotateCcw size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Compass Direction Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-300">Pilih Arah Dinding:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['N', 'E', 'S', 'W'] as Direction[]).map(d => (
                      <button
                        key={d}
                        onClick={() => onChangeDrawingDir(d)}
                        className={`py-2 text-xs font-bold font-mono rounded-lg border flex flex-col items-center gap-1 transition-all ${
                          drawingCurrentDir === d
                            ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] shadow-lg'
                            : 'bg-surface-elevated text-gray-300 border-divider hover:border-white/30'
                        }`}
                      >
                        {d === 'N' && <ArrowUp size={14} />}
                        {d === 'E' && <ArrowRight size={14} />}
                        {d === 'S' && <ArrowDown size={14} />}
                        {d === 'W' && <ArrowLeft size={14} />}
                        <span>{d === 'N' ? 'North' : d === 'E' ? 'East' : d === 'S' ? 'South' : 'West'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Segment Length */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Panjang Segmen:</span>
                    <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono font-bold">{Math.round(drawingLength * 1000)} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onChangeDrawingLength(Math.max(0.5, +(drawingLength - 0.5).toFixed(2)))}
                      className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-hover text-white rounded border border-divider text-xs font-bold font-mono"
                      title="Kurang 500 mm"
                    >
                      -500
                    </button>
                    <input
                      type="range"
                      min="500"
                      max="20000"
                      step="500"
                      value={Math.round(drawingLength * 1000)}
                      onChange={e => onChangeDrawingLength(Number(e.target.value) / 1000)}
                      className="flex-1 accent-[var(--color-accent-600)] cursor-pointer"
                    />
                    <button
                      onClick={() => onChangeDrawingLength(+(drawingLength + 0.5).toFixed(2))}
                      className="px-2.5 py-1 bg-surface-elevated hover:bg-surface-hover text-white rounded border border-divider text-xs font-bold font-mono"
                      title="Tambah 500 mm"
                    >
                      +500
                    </button>
                  </div>
                </div>

                {/* Add Vertex & Close Loop Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={onAddVertex}
                    className="py-2.5 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-600)] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                  >
                    <Plus size={15} /> Tambah Vertex (+)
                  </button>

                  <button
                    onClick={onCloseLoop}
                    disabled={drawingVerticesCount < 3}
                    className="py-2.5 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                  >
                    <CheckCircle2 size={15} /> Tutup Loop
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* 2. PARTITIONS TAB */}
        {/* ========================================================== */}
        {activeMode === 'part' && (() => {
          const isPartAlongLength = partitionDraft.wall === 'Bottom' || partitionDraft.wall === 'Top';
          const wallLen = isPartAlongLength ? room.length : room.width;
          const maxMargin = Math.max(0.4, +(wallLen - 0.2).toFixed(2));
          const currentLeft = Math.min(maxMargin, Math.max(0.2, partitionDraft.margin));
          const currentRight = Math.max(0.2, +(wallLen - currentLeft).toFixed(2));
          const leftPct = Math.round((currentLeft / wallLen) * 100);
          const rightPct = 100 - leftPct;

          const setLeftMeters = (m: number) => {
            const clamped = Math.min(maxMargin, Math.max(0.2, +m.toFixed(2)));
            onChangePartitionDraft({ ...partitionDraft, margin: clamped });
          };

          const setRightMeters = (m: number) => {
            const leftVal = Math.min(maxMargin, Math.max(0.2, +(wallLen - m).toFixed(2)));
            onChangePartitionDraft({ ...partitionDraft, margin: leftVal });
          };

          return (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-200">Pilih Dinding Acuan:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Bottom', label: `Bottom (${Math.round(room.length * 1000)} mm)` },
                    { key: 'Right', label: `Right (${Math.round(room.width * 1000)} mm)` },
                    { key: 'Top', label: `Top (${Math.round(room.length * 1000)} mm)` },
                    { key: 'Left', label: `Left (${Math.round(room.width * 1000)} mm)` }
                  ].map(w => (
                    <button
                      key={w.key}
                      onClick={() => {
                        const nextLen = (w.key === 'Bottom' || w.key === 'Top') ? room.length : room.width;
                        const clampedMargin = Math.min(nextLen - 0.2, Math.max(0.2, partitionDraft.margin));
                        onChangePartitionDraft({ ...partitionDraft, wall: w.key, margin: clampedMargin });
                      }}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                        partitionDraft.wall === w.key
                          ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-[var(--color-accent-500)] shadow'
                          : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Jarak Kiri Berapa mm & Kanan Berapa mm */}
              <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Split size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Posisi Jarak Sekat (Total {Math.round(wallLen * 1000)} mm):
                  </span>
                </div>

                {/* Dual Inputs: Kiri (mm) vs Kanan (mm) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* KIRI (LEFT) */}
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold flex items-center gap-1">
                        <ArrowLeft size={12} /> Dari Kiri:
                      </span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentLeft * 1000)} mm</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLeftMeters(currentLeft - 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 500 mm"
                      >
                        -500
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftMeters(currentLeft - 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 100 mm"
                      >
                        -100
                      </button>
                      <input
                        type="number"
                        step="50"
                        min="200"
                        max={Math.round(maxMargin * 1000)}
                        value={Math.round(currentLeft * 1000)}
                        onChange={e => setLeftMeters((Number(e.target.value) || 200) / 1000)}
                        className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setLeftMeters(currentLeft + 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 100 mm"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftMeters(currentLeft + 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 500 mm"
                      >
                        +500
                      </button>
                    </div>
                  </div>

                  {/* KANAN (RIGHT) */}
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold flex items-center gap-1">
                        Dari Kanan: <ArrowRight size={12} />
                      </span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentRight * 1000)} mm</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setRightMeters(currentRight - 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 500 mm dari kanan"
                      >
                        -500
                      </button>
                      <button
                        type="button"
                        onClick={() => setRightMeters(currentRight - 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 100 mm dari kanan"
                      >
                        -100
                      </button>
                      <input
                        type="number"
                        step="50"
                        min="200"
                        max={Math.round(maxMargin * 1000)}
                        value={Math.round(currentRight * 1000)}
                        onChange={e => setRightMeters((Number(e.target.value) || 200) / 1000)}
                        className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setRightMeters(currentRight + 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 100 mm dari kanan"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        onClick={() => setRightMeters(currentRight + 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 500 mm dari kanan"
                      >
                        +500
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="space-y-1">
                  <div className="w-full h-6 bg-[#090d14] rounded-lg overflow-hidden flex border border-divider text-[10px] font-bold font-mono">
                    <div
                      style={{ width: `${leftPct}%` }}
                      className="bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-r-2 border-[var(--color-accent-500)] flex items-center justify-center px-1 truncate transition-all"
                    >
                      ⬅ Kiri {Math.round(currentLeft * 1000)} mm ({leftPct}%)
                    </div>
                    <div
                      style={{ width: `${rightPct}%` }}
                      className="bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] flex items-center justify-center px-1 truncate transition-all"
                    >
                      ➡ Kanan {Math.round(currentRight * 1000)} mm ({rightPct}%)
                    </div>
                  </div>

                  <input
                    type="range"
                    min="200"
                    max={Math.round(maxMargin * 1000)}
                    step="50"
                    value={Math.round(currentLeft * 1000)}
                    onChange={e => setLeftMeters(Number(e.target.value) / 1000)}
                    className="w-full accent-[var(--color-accent-600)] cursor-pointer"
                  />
                </div>

                {/* Preset Chips: Kiri & Kanan */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-semibold text-gray-400">Pilihan Cepat Posisi:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'Kiri 1000 mm', action: () => setLeftMeters(1.0) },
                      { label: 'Kiri 1500 mm', action: () => setLeftMeters(1.5) },
                      { label: 'Kiri 2000 mm', action: () => setLeftMeters(2.0) },
                      { label: `Tengah (50% = ${Math.round((wallLen / 2) * 1000)} mm)`, action: () => setLeftMeters(wallLen / 2) },
                      { label: 'Kanan 2000 mm', action: () => setRightMeters(2.0) },
                      { label: 'Kanan 1500 mm', action: () => setRightMeters(1.5) },
                      { label: 'Kanan 1000 mm', action: () => setRightMeters(1.0) },
                      { label: '1/4', action: () => setLeftMeters(wallLen * 0.25) },
                      { label: '3/4', action: () => setLeftMeters(wallLen * 0.75) }
                    ].map(pst => (
                      <button
                        key={pst.label}
                        type="button"
                        onClick={pst.action}
                        className="px-2 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface hover:text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-gray-300 rounded border border-divider hover:border-divider transition-colors"
                      >
                        {pst.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Thickness selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Tebal Sekat (mm):</label>
                <div className="grid grid-cols-6 gap-1">
                  {([50, 75, 100, 125, 150, 200] as PanelThickness[]).map(th => (
                    <button
                      key={th}
                      onClick={() => onChangePartitionDraft({ ...partitionDraft, thickness: th })}
                      className={`py-1.5 text-xs font-mono font-bold rounded border transition-all ${
                        partitionDraft.thickness === th
                          ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] shadow'
                          : 'bg-surface text-gray-400 border-divider hover:border-white/20'
                      }`}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              {/* Create Partition Action Button */}
              <button
                onClick={onCreatePartition}
                className="w-full py-3 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-gray-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Plus size={16} /> Buat Sekatan ({Math.round(currentLeft * 1000)} mm / {Math.round(currentRight * 1000)} mm)
              </button>

              {/* Existing Partitions List */}
              {room.partitions && room.partitions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-divider">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Daftar Sekatan ({room.partitions.length})
                  </span>
                  <div className="space-y-1.5">
                    {room.partitions.map((p, idx) => {
                      const pWallLen = (p.wallAnchor === 'Bottom' || p.wallAnchor === 'Top') ? room.length : room.width;
                      const pRight = Math.max(0, +(pWallLen - p.margin).toFixed(2));
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-divider text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{p.name || `Sekat ${idx + 1}`}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Dinding {p.wallAnchor} • Kiri: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{Math.round(p.margin * 1000)} mm</strong> | Kanan: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{Math.round(pRight * 1000)} mm</strong> • Tebal: {p.thickness} mm
                            </div>
                          </div>
                          <button
                            onClick={() => onUpdateRoom(prev => ({
                              ...prev,
                              partitions: (prev.partitions || []).filter(item => item.id !== p.id)
                            }))}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors"
                            title="Hapus Sekatan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================== */}
        {/* 3. JOIN / ADJOINING ROOM TAB */}
        {/* ========================================================== */}
        {activeMode === 'join' && (() => {
          const isHorizontalWall = adjoinWall === 'Top' || adjoinWall === 'Bottom';
          const parentLen = isHorizontalWall ? room.length : room.width;
          const adjoinMatchingLen = isHorizontalWall ? adjoinLength : adjoinWidth;
          const maxShift = Math.max(0, +(parentLen - adjoinMatchingLen).toFixed(2));
          const currentLeftShift = Math.max(0, Math.min(parentLen, adjoinOffset));
          const currentRightShift = Math.max(0, +(parentLen - adjoinMatchingLen - currentLeftShift).toFixed(2));

          return (
            <div className="space-y-4">
              <div className="p-3 bg-surface border border-divider rounded-xl text-xs text-primary">
                Sambungkan ruangan baru (seperti Ante Room, Chiller 2, atau Blast Room) yang menempel langsung ke dinding ruangan ini.
              </div>

              {/* Adjoining Wall Anchor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Pilih Dinding Tempat Menempel:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Right', label: `Kanan (Right: ${Math.round(room.width * 1000)} mm)` },
                    { key: 'Left', label: `Kiri (Left: ${Math.round(room.width * 1000)} mm)` },
                    { key: 'Top', label: `Atas (Top: ${Math.round(room.length * 1000)} mm)` },
                    { key: 'Bottom', label: `Bawah (Bottom: ${Math.round(room.length * 1000)} mm)` }
                  ].map(w => (
                    <button
                      key={w.key}
                      onClick={() => setAdjoinWall(w.key as any)}
                      className={`py-2 px-3 text-xs rounded-lg border text-left font-medium transition-all ${
                        adjoinWall === w.key
                          ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-[var(--color-accent-500)] shadow-md'
                          : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adjoining Room Config */}
              <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-300 font-medium">Nama Ruangan Adjoining:</label>
                  </div>
                  <input
                    type="text"
                    value={adjoinName}
                    onChange={e => setAdjoinName(e.target.value)}
                    placeholder="e.g. Anteroom, Chiller 2, Loading Dock"
                    className="w-full h-8 bg-surface-hover text-white px-3 rounded-lg border border-divider focus:border-[var(--color-accent-500)]"
                  />
                  {/* Quick Name Chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {['Anteroom', 'Chiller 2', 'Freezer 2', 'Loading Dock', 'Blast Room'].map(nm => (
                      <button
                        key={nm}
                        onClick={() => setAdjoinName(nm)}
                        className="px-2 py-0.5 bg-surface-hover hover:bg-surface-hover text-gray-300 text-[10px] rounded border border-divider transition-colors"
                      >
                        {nm}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">Panjang (P) (mm):</label>
                    <input
                      type="number"
                      step="500"
                      min="1000"
                      value={Math.round(adjoinLength * 1000)}
                      onChange={e => setAdjoinLength((Number(e.target.value) || 2000) / 1000)}
                      className="w-full h-7 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-xs px-2 rounded border border-divider"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Lebar (L) (mm):</label>
                    <input
                      type="number"
                      step="500"
                      min="1000"
                      value={Math.round(adjoinWidth * 1000)}
                      onChange={e => setAdjoinWidth((Number(e.target.value) || 2000) / 1000)}
                      className="w-full h-7 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-xs px-2 rounded border border-divider"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Tinggi (T) (mm):</label>
                    <input
                      type="number"
                      step="100"
                      min="1500"
                      value={Math.round(adjoinHeight * 1000)}
                      onChange={e => setAdjoinHeight((Number(e.target.value) || 2500) / 1000)}
                      className="w-full h-7 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-xs px-2 rounded border border-divider"
                    />
                  </div>
                </div>

                {/* Offset / Geser Posisi Sambungan (Kiri vs Kanan) */}
                <div className="pt-2 border-t border-divider space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-gray-300">
                      {isHorizontalWall ? 'Posisi Geser (Kiri / Kanan):' : 'Posisi Geser (Belakang / Depan):'}
                    </span>
                    <span className="font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">{Math.round(adjoinOffset * 1000)} mm</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-hover p-2 rounded border border-divider space-y-1">
                      <span className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-semibold">
                        {isHorizontalWall ? '⬅ Dari Kiri (mm):' : '⬆ Dari Belakang (mm):'}
                      </span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        max={Math.round(parentLen * 1000)}
                        value={Math.round(currentLeftShift * 1000)}
                        onChange={e => setAdjoinOffset(Math.max(0, (Number(e.target.value) || 0) / 1000))}
                        className="w-full h-6 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-xs text-center rounded border border-divider"
                      />
                    </div>
                    <div className="bg-surface-hover p-2 rounded border border-divider space-y-1">
                      <span className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-semibold">
                        {isHorizontalWall ? 'Dari Kanan (mm): ➡' : 'Dari Depan (mm): ⬇'}
                      </span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        max={Math.round(parentLen * 1000)}
                        value={Math.round(currentRightShift * 1000)}
                        onChange={e => {
                          const rVal = (Number(e.target.value) || 0) / 1000;
                          setAdjoinOffset(Math.max(0, +(parentLen - adjoinMatchingLen - rVal).toFixed(2)));
                        }}
                        className="w-full h-6 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-xs text-center rounded border border-divider"
                      />
                    </div>
                  </div>

                  {/* Quick Presets for Adjoining Alignment */}
                  <div className="flex gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setAdjoinOffset(0)}
                      className="flex-1 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface-hover text-gray-300 rounded border border-divider"
                    >
                      {isHorizontalWall ? 'Rata Kiri (0 mm)' : 'Rata Belakang (0 mm)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjoinOffset(Math.max(0, +((parentLen - adjoinMatchingLen) / 2).toFixed(2)))}
                      className="flex-1 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] rounded border border-divider font-bold"
                    >
                      Tengah (Center)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjoinOffset(Math.max(0, +(parentLen - adjoinMatchingLen).toFixed(2)))}
                      className="flex-1 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface-hover text-gray-300 rounded border border-divider"
                    >
                      {isHorizontalWall ? 'Rata Kanan' : 'Rata Depan'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateAdjoining}
                className="w-full py-3 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-gray-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <GitMerge size={16} /> Buat & Sambungkan Ruangan
              </button>
            </div>
          );
        })()}

        {/* ========================================================== */}
        {/* 4. DOOR TAB */}
        {/* ========================================================== */}
        {activeMode === 'door' && (() => {
          const isDoorAlongLength = doorDraft.wall === 'Front' || doorDraft.wall === 'Back' || doorDraft.wall === 'Bottom' || doorDraft.wall === 'Top';
          const wallLen = isDoorAlongLength ? room.length : room.width;
          const doorW = doorDraft.width;
          const maxDoorMargin = Math.max(0.2, +(wallLen - doorW - 0.2).toFixed(2));
          const currentDoorLeft = Math.min(maxDoorMargin, Math.max(0.2, doorDraft.margin));
          const currentDoorRight = Math.max(0.2, +(wallLen - doorW - currentDoorLeft).toFixed(2));
          const leftPct = Math.round((currentDoorLeft / wallLen) * 100);
          const doorPct = Math.round((doorW / wallLen) * 100);
          const rightPct = Math.max(0, 100 - leftPct - doorPct);

          const isSliding = doorDraft.type.includes('Sliding');
          const isSectional = doorDraft.type === 'Sectional Door';
          const isSwing = !isSliding && !isSectional;

          const setDoorLeftMeters = (m: number) => {
            const clamped = Math.min(maxDoorMargin, Math.max(0.2, +m.toFixed(2)));
            onChangeDoorDraft({ ...doorDraft, margin: clamped });
          };

          const setDoorRightMeters = (m: number) => {
            const leftVal = Math.min(maxDoorMargin, Math.max(0.2, +(wallLen - doorW - m).toFixed(2)));
            onChangeDoorDraft({ ...doorDraft, margin: leftVal });
          };

          return (
            <div className="space-y-4">
              {/* Wall Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Pilih Dinding Pintu:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: 'Front', label: `Front (${Math.round(room.length * 1000)} mm)` },
                    { key: 'Back', label: `Back (${Math.round(room.length * 1000)} mm)` },
                    { key: 'Left', label: `Left (${Math.round(room.width * 1000)} mm)` },
                    { key: 'Right', label: `Right (${Math.round(room.width * 1000)} mm)` }
                  ].map(w => (
                    <button
                      key={w.key}
                      onClick={() => onChangeDoorDraft({ ...doorDraft, wall: w.key })}
                      className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                        doorDraft.wall === w.key
                          ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] font-bold shadow'
                          : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                      }`}
                    >
                      {w.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Door Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Jenis Pintu Cold Room:</span>
                  {isSectional && (
                    <span className="text-[10px] font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-normal">Overhead Loading Dock</span>
                  )}
                </label>
                <select
                  value={doorDraft.type}
                  onChange={e => {
                    const newType = e.target.value as DoorType;
                    let defaultW = doorDraft.width;
                    let defaultH = doorDraft.height;
                    if (newType === 'Sectional Door' && doorDraft.width < 2.0) {
                      defaultW = 2.4;
                      defaultH = 3.0;
                    }
                    onChangeDoorDraft({ ...doorDraft, type: newType, width: defaultW, height: defaultH });
                  }}
                  className="w-full h-9 bg-surface text-white text-xs px-2.5 rounded-lg border border-divider focus:border-[var(--color-accent-500)] font-medium"
                >
                  <option value="Swing Door">🚪 Swing Door Standard (Cold Storage)</option>
                  <option value="Sliding Door">🚪 Sliding Door Heavy Duty (Industri)</option>
                  <option value="Clean Room Swing Door">🏥 Clean Room Swing Door (+ Window)</option>
                  <option value="Clean Room Sliding Door">🏥 Clean Room Auto Sliding (+ Sensor)</option>
                  <option value="Sectional Door">🏭 Sectional Overhead Door (Dock & Forklift)</option>
                </select>
              </div>

              {/* Arah Bukaan Pintu (Open Direction Settings) */}
              <div className="bg-[#121824] p-3 rounded-xl border border-divider space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] flex items-center gap-1.5">
                    <DoorOpen size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Arah Bukaan Pintu:
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {isSectional
                      ? 'Lift Upward'
                      : isSliding
                      ? `Slide ${doorDraft.openingSide}`
                      : `${doorDraft.openingSide} Hinge / ${doorDraft.openDirection || 'Outward'}`}
                  </span>
                </div>

                {isSectional ? (
                  <div className="p-2 bg-surface rounded-lg border border-divider flex items-center gap-2 text-xs text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
                    <ArrowUp size={16} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] shrink-0" />
                    <div>
                      <div className="font-bold">Overhead Roll-Up / Vertical Lift</div>
                      <div className="text-[10px] text-gray-400">Panel pintu terangkat ke rel plafon secara vertikal.</div>
                    </div>
                  </div>
                ) : isSliding ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400">Arah Geser Pintu (Sliding):</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeDoorDraft({ ...doorDraft, openingSide: 'Right' })}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                          doorDraft.openingSide === 'Right'
                            ? 'bg-[var(--color-accent-600)] text-gray-950 border-amber-400 font-bold shadow'
                            : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                        }`}
                      >
                        <span>Geser Kanan</span>
                        <ArrowRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeDoorDraft({ ...doorDraft, openingSide: 'Left' })}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                          doorDraft.openingSide === 'Left'
                            ? 'bg-[var(--color-accent-600)] text-gray-950 border-amber-400 font-bold shadow'
                            : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                        }`}
                      >
                        <ArrowLeft size={14} />
                        <span>Geser Kiri</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Swing: Engsel Kiri / Kanan */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-400">Posisi Engsel & Daun Pintu:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onChangeDoorDraft({ ...doorDraft, openingSide: 'Left' })}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                            doorDraft.openingSide === 'Left'
                              ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] font-bold'
                              : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                          }`}
                        >
                          <ArrowLeft size={13} /> Engsel Kiri (Buka Kiri)
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeDoorDraft({ ...doorDraft, openingSide: 'Right' })}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                            doorDraft.openingSide === 'Right'
                              ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] font-bold'
                              : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                          }`}
                        >
                          Engsel Kanan (Buka Kanan) <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Swing: Buka Keluar / Buka Kedalam */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-400">Arah Ayunan (Swing):</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onChangeDoorDraft({ ...doorDraft, openDirection: 'Outward' })}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                            (doorDraft.openDirection || 'Outward') === 'Outward'
                              ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] font-bold'
                              : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                          }`}
                        >
                          Buka Keluar (Outward)
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeDoorDraft({ ...doorDraft, openDirection: 'Inward' })}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1 ${
                            doorDraft.openDirection === 'Inward'
                              ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] font-bold'
                              : 'bg-surface text-gray-300 border-divider hover:border-white/20'
                          }`}
                        >
                          Buka Kedalam (Inward)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preset & Custom Sizes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Ukuran Dimensi Pintu:</span>
                  <span className="font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">{Math.round(doorDraft.width * 1000)} × {Math.round(doorDraft.height * 1000)} mm</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(isSectional
                    ? [
                        { w: 2.4, h: 3.0, label: '2400 × 3000 mm' },
                        { w: 3.0, h: 3.5, label: '3000 × 3500 mm' },
                        { w: 4.0, h: 4.0, label: '4000 × 4000 mm' }
                      ]
                    : isSliding
                    ? [
                        { w: 1.5, h: 2.1, label: '1500 × 2100 mm' },
                        { w: 2.0, h: 2.4, label: '2000 × 2400 mm' },
                        { w: 2.4, h: 3.0, label: '2400 × 3000 mm' }
                      ]
                    : [
                        { w: 1.0, h: 2.0, label: '1000 × 2000 mm' },
                        { w: 1.2, h: 2.1, label: '1200 × 2100 mm' },
                        { w: 1.5, h: 2.4, label: '1500 × 2400 mm' }
                      ]
                  ).map(sz => (
                    <button
                      key={sz.label}
                      onClick={() => onChangeDoorDraft({ ...doorDraft, width: sz.w, height: sz.h })}
                      className={`py-1.5 text-xs font-mono rounded border transition-all ${
                        doorDraft.width === sz.w && doorDraft.height === sz.h
                          ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-[var(--color-accent-500)]'
                          : 'bg-surface text-gray-400 border-divider'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>

                {/* Custom Width and Height Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-surface p-2 rounded-lg border border-divider space-y-1">
                    <span className="text-[10px] text-gray-400">Lebar Pintu (mm):</span>
                    <input
                      type="number"
                      step="50"
                      min="800"
                      max={Math.round((wallLen - 0.4) * 1000)}
                      value={Math.round(doorDraft.width * 1000)}
                      onChange={e => onChangeDoorDraft({ ...doorDraft, width: (Number(e.target.value) || 1200) / 1000 })}
                      className="w-full h-7 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
                    />
                  </div>
                  <div className="bg-surface p-2 rounded-lg border border-divider space-y-1">
                    <span className="text-[10px] text-gray-400">Tinggi Pintu (mm):</span>
                    <input
                      type="number"
                      step="50"
                      min="1500"
                      max={Math.round((room.height - 0.1) * 1000)}
                      value={Math.round(doorDraft.height * 1000)}
                      onChange={e => onChangeDoorDraft({ ...doorDraft, height: (Number(e.target.value) || 2100) / 1000 })}
                      className="w-full h-7 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Thickness Selector */}
                <div className="bg-surface p-2.5 rounded-lg border border-divider space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Ketebalan Daun Pintu:</span>
                    <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono font-bold">{doorDraft.thickness || 100} mm</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[75, 100, 120, 150, 200].map(th => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => onChangeDoorDraft({ ...doorDraft, thickness: th })}
                        className={`py-1 text-[11px] font-mono rounded border transition-all ${
                          (doorDraft.thickness || 100) === th
                            ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-[var(--color-accent-500)]'
                            : 'bg-surface-hover text-gray-300 border-divider'
                        }`}
                      >
                        {th}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ========================================================== */}
              {/* TOGGLES: AIR CURTAIN & PLASTIC CURTAIN */}
              {/* ========================================================== */}
              <div className="space-y-2.5 bg-[#121824] p-3 rounded-xl border border-divider">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Aksesori Proteksi Suhu (Tirai):
                </span>

                {/* 1. AIR CURTAIN TOGGLE */}
                <div className="p-2.5 bg-surface rounded-lg border border-divider space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!doorDraft.hasAirCurtain}
                        onChange={e => onChangeDoorDraft({ ...doorDraft, hasAirCurtain: e.target.checked })}
                        className="w-4 h-4 rounded accent-[var(--color-accent-600)] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Wind size={14} className={doorDraft.hasAirCurtain ? 'text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]' : 'text-gray-400'} />
                        Air Curtain (Tirai Udara Blower)
                      </span>
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      doorDraft.hasAirCurtain ? 'bg-[var(--color-accent-600)]/20 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border border-divider' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {doorDraft.hasAirCurtain ? 'AKTIF' : 'OFF'}
                    </span>
                  </div>

                  {doorDraft.hasAirCurtain && (
                    <div className="space-y-1.5 pt-1 border-t border-divider">
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Kecepatan Hembusan:</span>
                        <select
                          value={doorDraft.airCurtainSpeed || 'Standard'}
                          onChange={e => onChangeDoorDraft({ ...doorDraft, airCurtainSpeed: e.target.value as any })}
                          className="h-6 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-[11px] px-2 rounded border border-divider"
                        >
                          <option value="Standard">Standard Velocity (11 m/s)</option>
                          <option value="High Velocity">High Velocity Industrial (18 m/s)</option>
                        </select>
                      </div>
                      <div className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]/80 bg-surface px-2 py-1 rounded border border-divider">
                        💨 Hembusan udara laminar vertikal berkecepatan tinggi menahan udara panas luar saat pintu terbuka.
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. PLASTIC CURTAIN (PVC STRIP) TOGGLE */}
                <div className="p-2.5 bg-surface rounded-lg border border-divider space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!doorDraft.hasPlasticCurtain}
                        onChange={e => onChangeDoorDraft({ ...doorDraft, hasPlasticCurtain: e.target.checked })}
                        className="w-4 h-4 rounded accent-[var(--color-accent-600)] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers size={14} className={doorDraft.hasPlasticCurtain ? 'text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]' : 'text-gray-400'} />
                        Plastic Curtain (Tirai PVC Strip)
                      </span>
                    </label>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      doorDraft.hasPlasticCurtain ? 'bg-[var(--color-accent-500)]/20 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border border-divider' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {doorDraft.hasPlasticCurtain ? 'AKTIF' : 'OFF'}
                    </span>
                  </div>

                  {doorDraft.hasPlasticCurtain && (
                    <div className="space-y-1.5 pt-1 border-t border-divider">
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Jenis PVC Strip:</span>
                        <select
                          value={doorDraft.plasticCurtainType || 'Clear Standard'}
                          onChange={e => onChangeDoorDraft({ ...doorDraft, plasticCurtainType: e.target.value })}
                          className="h-6 bg-surface-hover text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-[11px] px-2 rounded border border-divider"
                        >
                          <option value="Clear Standard">Clear Standard (Transparan Bening)</option>
                          <option value="Polar Low-Temp (Amber)">Polar Low-Temp Amber (Anti-Beku)</option>
                          <option value="Ribbed Heavy-Duty">Ribbed Heavy-Duty (Bergaris Tahan Gores)</option>
                        </select>
                      </div>
                      <div className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]/80 bg-surface px-2 py-1 rounded border border-divider">
                        🪟 Lembaran PVC gantung bertumpang-tindih (50% overlap) membatasi kehilangan suhu ruang dingin.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pilihan Jarak Pintu Kiri & Kanan (mm) */}
              <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <DoorOpen size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Posisi Pintu Pada Dinding ({Math.round(wallLen * 1000)} mm):
                  </span>
                </div>

                {/* Dual Inputs: Dari Kiri (m) vs Dari Kanan (m) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* DARI KIRI */}
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold flex items-center gap-1">
                        <ArrowLeft size={12} /> Dari Sisi Kiri:
                      </span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentDoorLeft * 1000)} mm</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDoorLeftMeters(currentDoorLeft - 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 500 mm"
                      >
                        -500
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoorLeftMeters(currentDoorLeft - 0.2)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 200 mm"
                      >
                        -200
                      </button>
                      <input
                        type="number"
                        step="50"
                        min="200"
                        max={Math.round(maxDoorMargin * 1000)}
                        value={Math.round(currentDoorLeft * 1000)}
                        onChange={e => setDoorLeftMeters((Number(e.target.value) || 200) / 1000)}
                        className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setDoorLeftMeters(currentDoorLeft + 0.2)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 200 mm"
                      >
                        +200
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoorLeftMeters(currentDoorLeft + 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 500 mm"
                      >
                        +500
                      </button>
                    </div>
                  </div>

                  {/* DARI KANAN */}
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold flex items-center gap-1">
                        Dari Sisi Kanan: <ArrowRight size={12} />
                      </span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentDoorRight * 1000)} mm</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDoorRightMeters(currentDoorRight - 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 500 mm dari kanan"
                      >
                        -500
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoorRightMeters(currentDoorRight - 0.2)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Kurang 200 mm dari kanan"
                      >
                        -200
                      </button>
                      <input
                        type="number"
                        step="50"
                        min="200"
                        max={Math.round(maxDoorMargin * 1000)}
                        value={Math.round(currentDoorRight * 1000)}
                        onChange={e => setDoorRightMeters((Number(e.target.value) || 200) / 1000)}
                        className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setDoorRightMeters(currentDoorRight + 0.2)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 200 mm dari kanan"
                      >
                        +200
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoorRightMeters(currentDoorRight + 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                        title="Tambah 500 mm dari kanan"
                      >
                        +500
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visual Ratio Bar with Door Block */}
                <div className="space-y-1">
                  <div className="w-full h-6 bg-[#090d14] rounded-lg overflow-hidden flex border border-divider text-[10px] font-bold font-mono">
                    <div
                      style={{ width: `${leftPct}%` }}
                      className="bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-r border-[var(--color-accent-500)]/50 flex items-center justify-center px-1 truncate"
                    >
                      ⬅ {Math.round(currentDoorLeft * 1000)} mm
                    </div>
                    <div
                      style={{ width: `${doorPct}%` }}
                      className="bg-[var(--color-accent-600)] text-gray-950 flex items-center justify-center px-1 font-bold truncate shadow"
                    >
                      🚪 {Math.round(doorW * 1000)} mm
                    </div>
                    <div
                      style={{ width: `${rightPct}%` }}
                      className="bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-l border-amber-400/50 flex items-center justify-center px-1 truncate"
                    >
                      ➡ {Math.round(currentDoorRight * 1000)} mm
                    </div>
                  </div>

                  <input
                    type="range"
                    min="200"
                    max={Math.round(maxDoorMargin * 1000)}
                    step="50"
                    value={Math.round(currentDoorLeft * 1000)}
                    onChange={e => setDoorLeftMeters(Number(e.target.value) / 1000)}
                    className="w-full accent-[var(--color-accent-600)] cursor-pointer"
                  />
                </div>

                {/* Preset Chips: Door Position */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-semibold text-gray-400">Pilihan Cepat Posisi Pintu:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'Mepet Kiri (200 mm)', action: () => setDoorLeftMeters(0.2) },
                      { label: 'Kiri 500 mm', action: () => setDoorLeftMeters(0.5) },
                      { label: 'Kiri 1000 mm', action: () => setDoorLeftMeters(1.0) },
                      { label: `Tengah (${Math.round(((wallLen - doorW) / 2) * 1000)} mm)`, action: () => setDoorLeftMeters((wallLen - doorW) / 2) },
                      { label: 'Kanan 1000 mm', action: () => setDoorRightMeters(1.0) },
                      { label: 'Kanan 500 mm', action: () => setDoorRightMeters(0.5) },
                      { label: 'Mepet Kanan (200 mm)', action: () => setDoorRightMeters(0.2) }
                    ].map(pst => (
                      <button
                        key={pst.label}
                        type="button"
                        onClick={pst.action}
                        className="px-2 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface hover:text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-gray-300 rounded border border-divider hover:border-divider transition-colors"
                      >
                        {pst.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Install Door Button */}
              <button
                onClick={onCreateDoor}
                className="w-full py-3 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-gray-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Plus size={16} /> Pasang {doorDraft.type} (Kiri: {Math.round(currentDoorLeft * 1000)} mm / Kanan: {Math.round(currentDoorRight * 1000)} mm)
              </button>

              {/* Doors List */}
              {room.doors && room.doors.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-divider">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Daftar Pintu Terpasang ({room.doors.length})
                  </span>
                  <div className="space-y-1.5">
                    {room.doors.map(d => {
                      const dWallLen = (d.wallName === 'Front' || d.wallName === 'Back' || d.wallName === 'Top' || d.wallName === 'Bottom') ? room.length : room.width;
                      const dRight = Math.max(0, +(dWallLen - d.width - d.margin).toFixed(2));
                      return (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-divider text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{d.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] rounded border border-divider">
                                {d.type}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {Math.round(d.width * 1000)}×{Math.round(d.height * 1000)} mm (Tebal: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{d.thickness || 100} mm</strong>) • Wall {d.wallName || 'Front'}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Kiri: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{Math.round(d.margin * 1000)} mm</strong> | Kanan: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{Math.round(dRight * 1000)} mm</strong>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-mono">
                              <span className="px-1 py-0.5 bg-gray-800 text-gray-300 rounded">
                                🔄 Bukaan: {d.openDirection || d.openingSide || 'Outward'}
                              </span>
                              {d.hasAirCurtain && (
                                <span className="px-1 py-0.5 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] rounded border border-divider flex items-center gap-0.5">
                                  <Wind size={10} /> Air Curtain
                                </span>
                              )}
                              {d.hasPlasticCurtain && (
                                <span className="px-1 py-0.5 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] rounded border border-divider flex items-center gap-0.5">
                                  <Layers size={10} /> PVC Strip
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => onUpdateRoom(prev => ({
                              ...prev,
                              doors: (prev.doors || []).filter(item => item.id !== d.id)
                            }))}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors"
                            title="Hapus Pintu"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================== */}
        {/* 5. EVAPORATOR TAB */}
        {/* ========================================================== */}
        {activeMode === 'evap' && (() => {
          const eW = 1.4; // standard evaporator width
          const eL = 0.6; // depth
          const maxLeftOffset = Math.max(0.2, +(room.length - eW - 0.2).toFixed(2));
          const currentEvapLeft = evapDraft.leftOffset !== undefined
            ? Math.min(maxLeftOffset, Math.max(0.2, evapDraft.leftOffset))
            : Math.max(0.2, +((room.length - eW) / 2).toFixed(2));
          const currentEvapRight = Math.max(0.2, +(room.length - eW - currentEvapLeft).toFixed(2));

          const maxBackOffset = Math.max(0.2, +(room.width - eL - 0.2).toFixed(2));
          const currentEvapBack = Math.min(maxBackOffset, Math.max(0.2, evapDraft.backOffset));
          const currentEvapFront = Math.max(0.2, +(room.width - eL - currentEvapBack).toFixed(2));

          const setEvapLeftMeters = (m: number) => {
            const clamped = Math.min(maxLeftOffset, Math.max(0.2, +m.toFixed(2)));
            onChangeEvapDraft({ ...evapDraft, leftOffset: clamped });
          };

          const setEvapRightMeters = (m: number) => {
            const leftVal = Math.min(maxLeftOffset, Math.max(0.2, +(room.length - eW - m).toFixed(2)));
            onChangeEvapDraft({ ...evapDraft, leftOffset: leftVal });
          };

          const setEvapBackMeters = (m: number) => {
            const clamped = Math.min(maxBackOffset, Math.max(0.2, +m.toFixed(2)));
            onChangeEvapDraft({ ...evapDraft, backOffset: clamped });
          };

          const setEvapFrontMeters = (m: number) => {
            const backVal = Math.min(maxBackOffset, Math.max(0.2, +(room.width - eL - m).toFixed(2)));
            onChangeEvapDraft({ ...evapDraft, backOffset: backVal });
          };

          return (
            <div className="space-y-4">
              {/* Pilihan dari Database Produk (Searchable & Optional) */}
              <div className="space-y-1.5 bg-surface p-3.5 rounded-xl border border-divider">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Package size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Pilih Evaporator dari Database (Searchable):
                </label>
                <SearchableDropdown
                  options={dbProducts.filter(p => !p.type || p.type === 'Evaporator').map(p => ({
                    id: p.id,
                    label: `${p.brand} ${p.model}`,
                    subLabel: p.specifications || p.dimensions
                  }))}
                  value={selectedEvapProdId}
                  onChange={id => {
                    setSelectedEvapProdId(id);
                    if (id) {
                      const found = dbProducts.find(p => p.id === id);
                      if (found) {
                        toast.success(`Evaporator ${found.brand} ${found.model} dipilih! Ukuran & Fan diperbarui.`);
                        let lenMm = found.evapLength || found.length || found.width || 1400;
                        let widMm = found.evapWidth || found.depth || found.length || 470;
                        let hgtMm = found.evapHeight || found.height || 430;

                        let w = lenMm > 10 ? lenMm / 1000 : lenMm;
                        let l = widMm > 10 ? widMm / 1000 : widMm;
                        let h = hgtMm > 10 ? hgtMm / 1000 : hgtMm;

                        let fCount = found.evapFanCount || found.fanCount || found.fans || (found.model?.includes('4') ? 4 : found.model?.includes('3') ? 3 : found.model?.includes('2') ? 2 : 2);
                        let fDiam = found.evapFanDiameter || found.fanDiameter || 300;
                        
                        onChangeEvapDraft({
                          ...evapDraft,
                          brand: found.brand,
                          model: found.model,
                          width: Number(w.toFixed(3)),
                          length: Number(l.toFixed(3)),
                          height: Number(h.toFixed(3)),
                          fanCount: Number(fCount),
                          fanDiameter: Number(fDiam)
                        });
                      }
                    } else {
                      toast.info('Evaporator diatur ke Custom.');
                      onChangeEvapDraft({
                        ...evapDraft,
                        brand: '',
                        model: '',
                        width: 1.4,
                        length: 0.6,
                        height: 0.5,
                        fanCount: 2,
                        fanDiameter: 300
                      });
                    }
                  }}
                  placeholder="Cari atau pilih evaporator (opsional)..."
                  emptyLabel="-- Tanpa Produk / Custom --"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Tipe Evaporator:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Standard', 'Dual Discharge', 'Slim'] as EvaporatorType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => onChangeEvapDraft({ ...evapDraft, type: t })}
                      className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                        evapDraft.type === t
                          ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)] font-bold shadow'
                          : 'bg-surface text-gray-300 border-divider'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensi & Jumlah Kipas Evaporator 3D */}
              <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Maximize size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Dimensi & Jumlah Kipas 3D:
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Panjang (Width): {Math.round(evapDraft.width * 1000)} mm</label>
                    <input
                      type="range"
                      min="0.6"
                      max="3.5"
                      step="0.05"
                      value={evapDraft.width}
                      onChange={e => onChangeEvapDraft({ ...evapDraft, width: Number(e.target.value) })}
                      className="w-full accent-[var(--color-accent-500)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Kedalaman (Depth): {Math.round(evapDraft.length * 1000)} mm</label>
                    <input
                      type="range"
                      min="0.3"
                      max="1.5"
                      step="0.05"
                      value={evapDraft.length}
                      onChange={e => onChangeEvapDraft({ ...evapDraft, length: Number(e.target.value) })}
                      className="w-full accent-[var(--color-accent-500)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Tinggi (Height): {Math.round(evapDraft.height * 1000)} mm</label>
                    <input
                      type="range"
                      min="0.3"
                      max="1.2"
                      step="0.05"
                      value={evapDraft.height}
                      onChange={e => onChangeEvapDraft({ ...evapDraft, height: Number(e.target.value) })}
                      className="w-full accent-[var(--color-accent-500)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400">Jumlah Fan (Kipas): {evapDraft.fanCount} Fan</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map(fc => (
                        <button
                          key={fc}
                          type="button"
                          onClick={() => onChangeEvapDraft({ ...evapDraft, fanCount: fc })}
                          className={`py-1 text-xs font-bold rounded border transition-all ${
                            evapDraft.fanCount === fc
                              ? 'bg-[var(--color-accent-600)] text-gray-950 border-[var(--color-accent-500)]'
                              : 'bg-surface-hover text-gray-300 border-divider'
                          }`}
                        >
                          {fc}F
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Rotasi Hembusan (deg):</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([0, 90, 180, 270] as const).map(rot => (
                    <button
                      key={rot}
                      onClick={() => onChangeEvapDraft({ ...evapDraft, rotation: rot })}
                      className={`py-1.5 text-xs font-mono font-bold rounded border transition-all ${
                        evapDraft.rotation === rot
                          ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-[var(--color-accent-500)] shadow'
                          : 'bg-surface text-gray-400 border-divider'
                      }`}
                    >
                      {rot}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Posisi Horizontal: Kiri Berapa mm vs Kanan Berapa mm */}
              <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Fan size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Posisi Horizontal Unit (Panjang {Math.round(room.length * 1000)} mm):
                  </span>
                </div>

                {/* Dual Inputs: Jarak Dinding Kiri (mm) vs Jarak Dinding Kanan (mm) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* DARI DINDING KIRI */}
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold flex items-center gap-1">
                        <ArrowLeft size={12} /> Dinding Kiri:
                      </span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentEvapLeft * 1000)} mm</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEvapLeftMeters(currentEvapLeft - 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        -500
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvapLeftMeters(currentEvapLeft - 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        -100
                      </button>
                      <input
                        type="number"
                        step="50"
                        min="200"
                        max={Math.round(maxLeftOffset * 1000)}
                        value={Math.round(currentEvapLeft * 1000)}
                        onChange={e => setEvapLeftMeters((Number(e.target.value) || 200) / 1000)}
                        className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEvapLeftMeters(currentEvapLeft + 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvapLeftMeters(currentEvapLeft + 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        +500
                      </button>
                    </div>
                  </div>

                  {/* DARI DINDING KANAN */}
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold flex items-center gap-1">
                        Dinding Kanan: <ArrowRight size={12} />
                      </span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentEvapRight * 1000)} mm</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEvapRightMeters(currentEvapRight - 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        -500
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvapRightMeters(currentEvapRight - 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        -100
                      </button>
                      <input
                        type="number"
                        step="50"
                        min="200"
                        max={Math.round(maxLeftOffset * 1000)}
                        value={Math.round(currentEvapRight * 1000)}
                        onChange={e => setEvapRightMeters((Number(e.target.value) || 200) / 1000)}
                        className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setEvapRightMeters(currentEvapRight + 0.1)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        +100
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvapRightMeters(currentEvapRight + 0.5)}
                        className="px-1.5 py-1 bg-surface hover:bg-surface-hover text-gray-300 rounded border border-divider text-[10px] font-bold"
                      >
                        +500
                      </button>
                    </div>
                  </div>
                </div>

                {/* Presets Horizontal */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: 'Kiri 300 mm', action: () => setEvapLeftMeters(0.3) },
                    { label: 'Kiri 800 mm', action: () => setEvapLeftMeters(0.8) },
                    { label: `Tengah (${Math.round(((room.length - eW) / 2) * 1000)} mm)`, action: () => setEvapLeftMeters((room.length - eW) / 2) },
                    { label: 'Kanan 800 mm', action: () => setEvapRightMeters(0.8) },
                    { label: 'Kanan 300 mm', action: () => setEvapRightMeters(0.3) }
                  ].map(pst => (
                    <button
                      key={pst.label}
                      type="button"
                      onClick={pst.action}
                      className="px-2 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface hover:text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-gray-300 rounded border border-divider"
                    >
                      {pst.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilihan Posisi Kedalaman: Belakang Berapa mm vs Depan Berapa mm */}
              <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ArrowUp size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Posisi Kedalaman (Lebar {Math.round(room.width * 1000)} mm):
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">⬆ Dinding Belakang:</span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentEvapBack * 1000)} mm</span>
                    </div>
                    <input
                      type="number"
                      step="50"
                      min="200"
                      max={Math.round(maxBackOffset * 1000)}
                      value={Math.round(currentEvapBack * 1000)}
                      onChange={e => setEvapBackMeters((Number(e.target.value) || 200) / 1000)}
                      className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:outline-none"
                    />
                  </div>

                  <div className="bg-surface-hover p-2.5 rounded-lg border border-divider space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">Dinding Depan: ⬇</span>
                      <span className="text-white font-mono font-extrabold text-xs">{Math.round(currentEvapFront * 1000)} mm</span>
                    </div>
                    <input
                      type="number"
                      step="50"
                      min="200"
                      max={Math.round(maxBackOffset * 1000)}
                      value={Math.round(currentEvapFront * 1000)}
                      onChange={e => setEvapFrontMeters((Number(e.target.value) || 200) / 1000)}
                      className="w-full h-7 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider focus:outline-none"
                    />
                  </div>
                </div>

                {/* Presets Depth */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: 'Mepet Belakang (300 mm)', action: () => setEvapBackMeters(0.3) },
                    { label: 'Belakang 500 mm', action: () => setEvapBackMeters(0.5) },
                    { label: 'Belakang 1000 mm', action: () => setEvapBackMeters(1.0) },
                    { label: `Tengah (${Math.round(((room.width - eL) / 2) * 1000)} mm)`, action: () => setEvapBackMeters((room.width - eL) / 2) }
                  ].map(pst => (
                    <button
                      key={pst.label}
                      type="button"
                      onClick={pst.action}
                      className="px-2 py-1 text-[10px] font-mono bg-surface-hover hover:bg-surface hover:text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-gray-300 rounded border border-divider"
                    >
                      {pst.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={onCreateEvap}
                className="w-full py-3 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-gray-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Plus size={16} /> Pasang Evaporator (Kiri: {Math.round(currentEvapLeft * 1000)} mm / Kanan: {Math.round(currentEvapRight * 1000)} mm)
              </button>

              {/* Active Evaps */}
              {room.evaporators && room.evaporators.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-divider">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Unit Evaporator ({room.evaporators.length})
                  </span>
                  <div className="space-y-1.5">
                    {room.evaporators.map(ev => {
                      const evLeft = ev.distanceFromLeft !== undefined ? ev.distanceFromLeft : (ev.posX || 0);
                      const evRight = ev.distanceFromRight !== undefined ? ev.distanceFromRight : Math.max(0, +(room.length - (ev.width || 1.4) - evLeft).toFixed(2));
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-2.5 bg-surface rounded-lg border border-divider text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{ev.name}</div>
                            <div className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono">
                              {ev.type} Unit • Hembusan {ev.rotation}° • Kiri: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{Math.round(Number(evLeft) * 1000)} mm</strong> | Kanan: <strong className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{Math.round(Number(evRight) * 1000)} mm</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => onUpdateRoom(prev => ({
                              ...prev,
                              evaporators: (prev.evaporators || []).filter(item => item.id !== ev.id)
                            }))}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-md transition-colors"
                            title="Hapus Evaporator"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================== */}
        {/* 6. HEAT LOAD TAB */}
        {/* ========================================================== */}
        {activeMode === 'heatload' && (
          <div className="space-y-4">
            {/* Commodity Selector Carousel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Pilih Profil Produk / Komoditas:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COMMODITY_PROFILES.map(p => {
                  const isSel = room.heatLoadParams.commodityId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onUpdateRoom(prev => ({
                          ...prev,
                          heatLoadParams: {
                            ...prev.heatLoadParams,
                            commodityId: p.id,
                            roomTemp: p.defaultRoomTemp,
                            entryTemp: p.defaultEntryTemp,
                            freezingPoint: p.freezingPoint,
                            pullDownHours: p.defaultPullDownHours
                          }
                        }));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        isSel
                          ? 'bg-surface border-[var(--color-accent-500)] shadow-lg text-white'
                          : 'bg-surface border-divider text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate text-white">{p.name}</div>
                        <div className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]/90 font-mono">
                          Target: {p.defaultRoomTemp > 0 ? `+${p.defaultRoomTemp}` : p.defaultRoomTemp}°C
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Room Temperature */}
            <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-divider">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">Target Temperatur (°C):</span>
                <input
                  type="number"
                  value={room.heatLoadParams.roomTemp}
                  onChange={e => {
                    const val = Number(e.target.value);
                    onUpdateRoom(prev => ({
                      ...prev,
                      heatLoadParams: { ...prev.heatLoadParams, roomTemp: val }
                    }));
                  }}
                  className="w-16 h-6 bg-surface-elevated text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center font-bold text-xs rounded border border-divider"
                />
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[
                  { label: 'Chiller (+2°)', temp: 2 },
                  { label: 'Cold (+0°)', temp: 0 },
                  { label: 'Freezer (-18°)', temp: -18 },
                  { label: 'Blast (-35°)', temp: -35 }
                ].map(pre => (
                  <button
                    key={pre.label}
                    onClick={() => {
                      onUpdateRoom(prev => ({
                        ...prev,
                        heatLoadParams: { ...prev.heatLoadParams, roomTemp: pre.temp }
                      }));
                    }}
                    className={`py-1 text-[10px] font-mono rounded border ${
                      room.heatLoadParams.roomTemp === pre.temp
                        ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-amber-400'
                        : 'bg-surface-hover text-gray-400 border-divider'
                    }`}
                  >
                    {pre.temp > 0 ? `+${pre.temp}` : pre.temp}°C
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Throughput (kg/day) */}
            <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-divider">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">Daily Load (kg/hari):</span>
                <button
                  onClick={() => {
                    const autoKg = Math.round(room.length * room.width * room.height * 180);
                    onUpdateRoom(prev => ({
                      ...prev,
                      heatLoadParams: { ...prev.heatLoadParams, dailyLoadKg: autoKg }
                    }));
                    toast.success(`Beban harian dihitung otomatis: ${autoKg.toLocaleString()} kg/hari`);
                  }}
                  className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] hover:underline font-bold"
                >
                  Auto Calculate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={room.heatLoadParams.dailyLoadKg}
                  onChange={e => {
                    const val = Number(e.target.value) || 0;
                    onUpdateRoom(prev => ({
                      ...prev,
                      heatLoadParams: { ...prev.heatLoadParams, dailyLoadKg: val }
                    }));
                  }}
                  className="w-full h-8 bg-surface-elevated text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono px-3 text-xs rounded-lg border border-divider"
                />
                <span className="text-xs text-gray-400">kg</span>
              </div>
            </div>

            {/* Usage Intensity Pills */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Intensitas Penggunaan:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Light', 'Medium Usage', 'Heavy Usage'] as StorageUsageType[]).map(u => (
                  <button
                    key={u}
                    onClick={() => {
                      onUpdateRoom(prev => ({
                        ...prev,
                        heatLoadParams: { ...prev.heatLoadParams, usageType: u }
                      }));
                    }}
                    className={`py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${
                      room.heatLoadParams.usageType === u
                        ? 'bg-[var(--color-accent-600)] text-gray-950 font-bold border-amber-400'
                        : 'bg-surface text-gray-400 border-divider'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Pull Down Hours & Safety */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 bg-surface p-2.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-300">Pull Down:</span>
                  <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono font-bold">
                    {room.heatLoadParams.pullDownHours} jam
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={room.heatLoadParams.pullDownHours}
                  onChange={e => {
                    const val = Number(e.target.value);
                    onUpdateRoom(prev => ({
                      ...prev,
                      heatLoadParams: { ...prev.heatLoadParams, pullDownHours: val }
                    }));
                  }}
                  className="w-full accent-[var(--color-accent-600)]"
                />
              </div>

              <div className="space-y-1 bg-surface p-2.5 rounded-xl border border-divider">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-300">Safety:</span>
                  <span className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono font-bold">
                    {room.heatLoadParams.safetyPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="5"
                  value={room.heatLoadParams.safetyPercent}
                  onChange={e => {
                    const val = Number(e.target.value);
                    onUpdateRoom(prev => ({
                      ...prev,
                      heatLoadParams: { ...prev.heatLoadParams, safetyPercent: val }
                    }));
                  }}
                  className="w-full accent-[var(--color-accent-600)]"
                />
              </div>
            </div>

            {/* Live Calculation KPI Banner */}
            <div className="p-4 bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-2xl border border-divider shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} /> Total Heat Load
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                  {heatResult.totalHeatLoadBTU.toLocaleString()} BTU/hr
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-extrabold text-white font-mono">
                  {heatResult.totalHeatLoadKW}
                </div>
                <div className="text-sm font-bold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">kW</div>
                <div className="text-xs text-gray-400 ml-auto font-mono">
                  Dibutuhkan: <strong className="text-white">{heatResult.requiredHP} HP</strong>
                </div>
              </div>

              {/* Machinery Recommendation */}
              <div className="pt-2 border-t border-divider text-xs space-y-1">
                <div className="text-[11px] font-semibold text-gray-300">Rekomendasi Mesin:</div>
                <div className="text-[11px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono">
                  • Condensing Unit: {heatResult.recommendedMachinery.condenserModel}
                </div>
                <div className="text-[11px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono">
                  • Evaporator: {heatResult.recommendedMachinery.evaporatorModel}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
