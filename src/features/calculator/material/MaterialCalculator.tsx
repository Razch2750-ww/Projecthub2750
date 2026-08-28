import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Room3DPreview } from '../../../components/ui/Room3DPreview';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Product } from '../../products/ProductsDatabase';
import { toast } from 'sonner';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  Layers, 
  Check, 
  Copy, 
  FileText, 
  Info,
  Package,
  Layers2,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Compass
} from 'lucide-react';

interface CalculatedRoom {
  id: string;
  name: string;
  length: number; // mm
  width: number; // mm
  height: number; // mm
  floorType: 'tanpa lantai' | 'insulation panel' | 'concrete';
  panelThickness: string;
  panelType: 'PU' | 'PIR';
  
  // Optional Evaporator
  evaporatorId?: string;
  evaporatorProduct?: Product;
  
  // Calculated values
  floorArea: number; // m²
  wallArea: number; // m²
  colorbondEdges: number; // m
  colorbondSticks: number; // btg (3m)
  alumuniumEdges: number; // m
  alumuniumSticks: number; // btg (6m)
  ironEdges: number; // m
  ironSticks: number; // btg (6m)
  
  // Lighting
  lampCasings: number; // set (T8 16W x 2 units)
  totalLumens: number;

  // Panel sheets
  wallSheets: number;
  ceilingSheets: number;
  floorSheets: number;
  totalSheets: number;

  // Panel lengths
  wallPanelLength: number;
  ceilingPanelLength: number;
  floorPanelLength: number;

  // Door configuration
  doorType: 'Hinged' | 'Sliding';
  doorWidth: number;
  doorHeight: number;
  doorWall: 'depan' | 'kiri' | 'kanan' | 'belakang';
}

export const MaterialCalculator: React.FC = () => {
  // State for multiple rooms
  const [rooms, setRooms] = useState<CalculatedRoom[]>([]);

  // Form states
  const [name, setName] = useState('');
  const [lengthStr, setLengthStr] = useState('');
  const [widthStr, setWidthStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [floorType, setFloorType] = useState<'tanpa lantai' | 'insulation panel' | 'concrete'>('tanpa lantai');
  const [panelThickness, setPanelThickness] = useState<string>('100mm');
  const [panelType, setPanelType] = useState<'PU' | 'PIR'>('PU');
  const [selectedEvapId, setSelectedEvapId] = useState<string>('');

  // Door form states
  const [doorType, setDoorType] = useState<'Hinged' | 'Sliding'>('Hinged');
  const [doorWidthStr, setDoorWidthStr] = useState('900');
  const [doorHeightStr, setDoorHeightStr] = useState('1900');
  const [doorWall, setDoorWall] = useState<'depan' | 'kiri' | 'kanan' | 'belakang'>('depan');

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(d => {
        prods.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(prods);
    }, (error) => {
      console.error("Error fetching products:", error);
    });
    return () => unsub();
  }, []);

  // Filter only evaporators
  const evaporators = products.filter(p => p.type === 'Evaporator');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Copy status
  const [copied, setCopied] = useState(false);

  // State for reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Expanded previews state for individual rooms in the list
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});

  // Helper to calculate room results
  const calculateRoomResults = (
    rName: string,
    l: number,
    w: number,
    h: number,
    fType: 'tanpa lantai' | 'insulation panel' | 'concrete',
    pThick: string,
    pType: 'PU' | 'PIR',
    evapId?: string,
    dType: 'Hinged' | 'Sliding' = 'Hinged',
    dWidth: number = 900,
    dHeight: number = 1900,
    dWall: 'depan' | 'kiri' | 'kanan' | 'belakang' = 'depan'
  ): CalculatedRoom => {
    // Convert dimensions from mm to meters
    const p = l / 1000;
    const L = w / 1000;
    const T = h / 1000;
    
    // Extract thickness in meters
    const thicknessVal = parseInt(pThick);
    const tebal = thicknessVal / 1000;

    const floorArea = p * L;
    const wallArea = (2 * p * T) + (2 * L * T);

    // Rumus Siku sesuai instruksi user:
    // A = Jenis lantai, B = Tebal panel, C = Panjang, D = Lebar, E = Tinggi
    const A = fType === 'concrete' ? 'CONCRETE' : (fType === 'insulation panel' ? 'INSUL' : 'TANPA LANTAI');
    const B = tebal;
    const C = p;
    const D = L;
    const E = T;

    // Siku CB / Colorbond: ((C * 2) + (D * 2) + (E * 4)) ÷ 3
    const colorbondEdges = (C * 2) + (D * 2) + (E * 4);
    const colorbondSticks = Math.ceil(colorbondEdges / 3);

    // Siku Besi: ((C * 2) + (D * 2)) ÷ 6
    const ironEdges = (C * 2) + (D * 2);
    const ironSticks = Math.ceil(ironEdges / 6);

    // Siku Aluminium:
    // (((C - (B * IF(A="CONCRETE";2;4))) * IF(A="CONCRETE";2;4)) + ((D - (B * IF(A="CONCRETE";2;4))) * IF(A="CONCRETE";2;4)) + ((E - (B * IFS(A="INSUL";2;A="CONCRETE";3;A="TANPA LANTAI";1))) * 4)) ÷ 6
    const ifA = A === 'CONCRETE' ? 2 : 4;
    
    let ifsA = 1;
    if (A === 'INSUL') {
      ifsA = 2;
    } else if (A === 'CONCRETE') {
      ifsA = 3;
    } else if (A === 'TANPA LANTAI') {
      ifsA = 1;
    }

    const term1 = (C - (B * ifA)) * ifA;
    const term2 = (D - (B * ifA)) * ifA;
    const term3 = (E - (B * ifsA)) * 4;

    const alumuniumEdges = Math.max(0, term1 + term2 + term3);
    const alumuniumSticks = Math.ceil(alumuniumEdges / 6);

    // Sandwich panel sheets calculation
    const panelWidth = pType === 'PU' ? 1.2 : 1.16; // in meters
    const wallSheets = Math.ceil((2 * (p + L)) / panelWidth);
    const ceilingSheets = Math.ceil(L / panelWidth);
    const innerL = Math.max(0, L - 2 * tebal);
    const floorSheets = fType === 'insulation panel' ? Math.ceil(innerL / panelWidth) : 0;
    const totalSheets = wallSheets + ceilingSheets + floorSheets;

    const wallPanelLength = h; // in mm
    const ceilingPanelLength = l; // in mm
    const floorPanelLength = fType === 'insulation panel' ? Math.max(0, l - 2 * thicknessVal) : 0; // in mm

    // Lamp calculation (T8 16W x 2 units per casing). Rule of thumb: 1 casing per ~6 sqm
    const lampCasings = Math.max(1, Math.ceil(floorArea / 6));
    const totalLumens = lampCasings * 3200; // 1600lm per lamp * 2 lamps

    const evapProduct = evapId ? evaporators.find(e => e.id === evapId) : undefined;

    return {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: rName || `Ruangan ${rooms.length + 1}`,
      length: l,
      width: w,
      height: h,
      floorType: fType,
      panelThickness: pThick,
      panelType: pType,
      evaporatorId: evapId,
      evaporatorProduct: evapProduct,
      floorArea,
      wallArea,
      colorbondEdges,
      colorbondSticks,
      alumuniumEdges,
      alumuniumSticks,
      ironEdges,
      ironSticks,
      lampCasings,
      totalLumens,
      wallSheets,
      ceilingSheets,
      floorSheets,
      totalSheets,
      wallPanelLength,
      ceilingPanelLength,
      floorPanelLength,
      doorType: dType,
      doorWidth: dWidth,
      doorHeight: dHeight,
      doorWall: dWall
    };
  };

  // Add or Update room
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(lengthStr);
    const w = parseFloat(widthStr);
    const h = parseFloat(heightStr);

    if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
      toast.error('Mohon masukkan dimensi ruangan yang valid (lebih dari 0).');
      return;
    }

    const calculated = calculateRoomResults(
      name,
      l,
      w,
      h,
      floorType,
      panelThickness,
      panelType,
      selectedEvapId,
      doorType,
      parseFloat(doorWidthStr) || 900,
      parseFloat(doorHeightStr) || 1900,
      doorWall
    );

    if (editingId) {
      setRooms(prev => prev.map(r => r.id === editingId ? calculated : r));
      setEditingId(null);
      toast.success('Spesifikasi ruangan berhasil diperbarui');
    } else {
      setRooms(prev => [...prev, calculated]);
      toast.success('Ruangan baru berhasil ditambahkan');
    }

    // Reset form fields
    setName('');
    setLengthStr('');
    setWidthStr('');
    setHeightStr('');
    setFloorType('tanpa lantai');
    setPanelThickness('100mm');
    setPanelType('PU');
    setSelectedEvapId('');
    setDoorType('Hinged');
    setDoorWidthStr('900');
    setDoorHeightStr('1900');
    setDoorWall('depan');
  };

  // Load room into form for editing
  const handleEditRoom = (room: CalculatedRoom) => {
    setEditingId(room.id);
    setName(room.name);
    setLengthStr(room.length.toString());
    setWidthStr(room.width.toString());
    setHeightStr(room.height.toString());
    setFloorType(room.floorType);
    setPanelThickness(room.panelThickness);
    setPanelType(room.panelType);
    setSelectedEvapId(room.evaporatorId || '');
    setDoorType(room.doorType || 'Hinged');
    setDoorWidthStr((room.doorWidth || 900).toString());
    setDoorHeightStr((room.doorHeight || 1900).toString());
    setDoorWall(room.doorWall || 'depan');
    toast.info(`Mengedit "${room.name}"`);
  };

  // Delete room
  const handleDeleteRoom = (id: string) => {
    setRooms(prev => prev.filter(r => r.id !== id));
    toast.success('Ruangan berhasil dihapus');
    if (editingId === id) {
      setEditingId(null);
      setName('');
      setLengthStr('');
      setWidthStr('');
      setHeightStr('');
    }
  };

  // Reset all
  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  // Aggregate results across all rooms
  const totalFloorArea = rooms.reduce((sum, r) => sum + r.floorArea, 0);
  const totalWallArea = rooms.reduce((sum, r) => sum + r.wallArea, 0);
  const totalColorbondSticks = rooms.reduce((sum, r) => sum + r.colorbondSticks, 0);
  const totalAlumuniumSticks = rooms.reduce((sum, r) => sum + r.alumuniumSticks, 0);
  const totalIronSticks = rooms.reduce((sum, r) => sum + r.ironSticks, 0);
  const totalAlumuniumEdges = rooms.reduce((sum, r) => sum + r.alumuniumEdges, 0);
  const totalColorbondEdges = rooms.reduce((sum, r) => sum + r.colorbondEdges, 0);
  const totalIronEdges = rooms.reduce((sum, r) => sum + r.ironEdges, 0);
  const totalLampCasings = rooms.reduce((sum, r) => sum + (r.lampCasings || 0), 0);
  const totalLumens = rooms.reduce((sum, r) => sum + (r.totalLumens || 0), 0);

  // Group panel sheets by thickness & type
  const panelSummary: { [key: string]: {
    sheets: number;
    wall: { total: number; lengths: { [length: number]: number } };
    ceiling: { total: number; lengths: { [length: number]: number } };
    floor: { total: number; lengths: { [length: number]: number } };
  } } = {};

  rooms.forEach(r => {
    const key = `${r.panelThickness} ${r.panelType}`;
    if (!panelSummary[key]) {
      panelSummary[key] = {
        sheets: 0,
        wall: { total: 0, lengths: {} },
        ceiling: { total: 0, lengths: {} },
        floor: { total: 0, lengths: {} }
      };
    }
    panelSummary[key].sheets += r.totalSheets;
    
    // Wall
    panelSummary[key].wall.total += r.wallSheets;
    if (r.wallSheets > 0) {
      panelSummary[key].wall.lengths[r.wallPanelLength] = (panelSummary[key].wall.lengths[r.wallPanelLength] || 0) + r.wallSheets;
    }
    
    // Ceiling
    panelSummary[key].ceiling.total += r.ceilingSheets;
    if (r.ceilingSheets > 0) {
      panelSummary[key].ceiling.lengths[r.ceilingPanelLength] = (panelSummary[key].ceiling.lengths[r.ceilingPanelLength] || 0) + r.ceilingSheets;
    }
    
    // Floor
    panelSummary[key].floor.total += r.floorSheets;
    if (r.floorSheets > 0) {
      panelSummary[key].floor.lengths[r.floorPanelLength] = (panelSummary[key].floor.lengths[r.floorPanelLength] || 0) + r.floorSheets;
    }
  });

  // Salin ringkasan ke Clipboard
  const handleCopySummary = () => {
    if (rooms.length === 0) return;

    let text = `=== REKAPITULASI MATERIAL COLD ROOM ===\n`;
    text += `Dibuat pada: ${new Date().toLocaleDateString('id-ID')} - PT Rokindo Jaya Mandiri\n`;
    text += `Total Ruangan: ${rooms.length} ruangan\n\n`;

    text += `1. RINGKASAN TIAP RUANGAN:\n`;
    rooms.forEach((r, idx) => {
      text += `- ${r.name} (${r.length}x${r.width}x${r.height} mm)\n`;
      text += `  Lantai: ${r.floorType === 'tanpa lantai' ? 'Tanpa Lantai' : r.floorType === 'insulation panel' ? 'Panel Insulasi' : 'Concrete'}\n`;
      text += `  Tebal Panel: ${r.panelThickness} ${r.panelType}\n`;
      text += `  Siku Alumunium (6m): ${r.alumuniumSticks} btg (${r.alumuniumEdges.toFixed(1)} m)\n`;
      text += `  Siku Colorbond (3m): ${r.colorbondSticks} btg (${r.colorbondEdges.toFixed(1)} m)\n`;
      text += `  Siku Besi (6m): ${r.ironSticks} btg (${r.ironEdges.toFixed(1)} m)\n`;
      text += `  Lampu T8 16W (2 unit/casing): ${r.lampCasings} set (${r.totalLumens} Lumens)\n`;
      if (r.evaporatorProduct) {
        text += `  Evaporator: ${r.evaporatorProduct.brand} ${r.evaporatorProduct.model} (${r.evaporatorProduct.evapFanCount} Fan)\n`;
      }
      text += `  Panel Sandwich: ${r.totalSheets} lembar\n`;
      text += `    - Dinding : ${r.wallSheets} lbr @ ${r.wallPanelLength} mm\n`;
      text += `    - Atap    : ${r.ceilingSheets} lbr @ ${r.ceilingPanelLength} mm\n`;
      if (r.floorSheets > 0) {
        text += `    - Lantai  : ${r.floorSheets} lbr @ ${r.floorPanelLength} mm\n`;
      }
      text += `\n`;
    });

    const evapCounts: Record<string, number> = {};
    rooms.forEach(r => {
      if (r.evaporatorProduct) {
        const key = `${r.evaporatorProduct.brand} ${r.evaporatorProduct.model}`;
        evapCounts[key] = (evapCounts[key] || 0) + 1;
      }
    });

    text += `2. TOTAL KEBUTUHAN MATERIAL & AKSESORIS:\n`;
    text += `- Siku Alumunium (6m) : ${totalAlumuniumSticks} batang (Total: ${totalAlumuniumEdges.toFixed(1)} m)\n`;
    text += `- Siku Colorbond (3m)  : ${totalColorbondSticks} batang (Total: ${totalColorbondEdges.toFixed(1)} m)\n`;
    text += `- Siku Besi (6m)       : ${totalIronSticks} batang (Total: ${totalIronEdges.toFixed(1)} m)\n`;
    text += `- Lampu T8 16W (2 unit/casing) : ${totalLampCasings} set (${totalLumens} Lumens)\n`;
    Object.entries(evapCounts).forEach(([name, count]) => {
      text += `- Evaporator ${name} : ${count} unit\n`;
    });
    text += `\n`;

    text += `3. TOTAL AREA RUANGAN:\n`;
    text += `- Luas Lantai : ${totalFloorArea.toFixed(2)} m²\n`;
    text += `- Luas Dinding : ${totalWallArea.toFixed(2)} m²\n\n`;

    text += `4. REKAPITULASI PANEL SANDWICH (Lebar Efektif: PU 1200mm, PIR 1160mm):\n`;
    Object.entries(panelSummary).forEach(([spec, data]) => {
      text += `- Panel ${spec} : ${data.sheets} lembar\n`;
      
      const wallBreakdown = Object.entries(data.wall.lengths).map(([len, qty]) => `${qty} lbr @ ${len} mm`).join(', ');
      const ceilingBreakdown = Object.entries(data.ceiling.lengths).map(([len, qty]) => `${qty} lbr @ ${len} mm`).join(', ');
      const floorBreakdown = Object.entries(data.floor.lengths).map(([len, qty]) => `${qty} lbr @ ${len} mm`).join(', ');

      text += `  - Dinding : ${data.wall.total} lbr${wallBreakdown ? ` (${wallBreakdown})` : ''}\n`;
      text += `  - Atap    : ${data.ceiling.total} lbr${ceilingBreakdown ? ` (${ceilingBreakdown})` : ''}\n`;
      text += `  - Lantai  : ${data.floor.total} lbr${floorBreakdown ? ` (${floorBreakdown})` : ''}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className="space-y-6 print:hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Calculator className="text-[var(--color-accent-600)]" />
            Kalkulator Material Cold Room
          </h2>
          <p className="text-xs text-secondary mt-1">
            Hitung estimasi kebutuhan material siku dan lembaran panel sandwich untuk satu atau beberapa ruangan sekaligus secara akurat.
          </p>
        </div>
        {rooms.length > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="self-start text-red-500 border-red-200 hover:bg-red-50/50"
            onClick={handleResetAll}
          >
            <RotateCcw size={14} className="mr-1.5" />
            Reset Semua Ruangan
          </Button>
        )}
      </div>

      {/* 3D CAD Preview Card (Full Width) */}
      <div className="p-4 border border-divider shadow-sm rounded-xl bg-surface overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-divider">
          <div className="flex items-center gap-2">
            <Compass className="text-[var(--color-accent-600)]" size={18} />
            <span className="text-sm font-semibold text-primary">Preview CAD 3D Real-time</span>
          </div>
          <div className="text-[10px] text-muted flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold px-2 py-0.5 rounded-full">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Interaktif (Seret untuk Memutar)
          </div>
        </div>
        <Room3DPreview 
          name={name || 'Preview'} 
          length={parseFloat(lengthStr) || 1000} 
          width={parseFloat(widthStr) || 1000} 
          height={parseFloat(heightStr) || 1000} 
          lampCasings={Math.max(1, Math.ceil(((parseFloat(lengthStr) || 1000) / 1000 * (parseFloat(widthStr) || 1000) / 1000) / 6))}
          evapLength={selectedEvapId ? evaporators.find(e => e.id === selectedEvapId)?.evapLength : undefined}
          evapWidth={selectedEvapId ? evaporators.find(e => e.id === selectedEvapId)?.evapWidth : undefined}
          evapHeight={selectedEvapId ? evaporators.find(e => e.id === selectedEvapId)?.evapHeight : undefined}
          evapFanCount={selectedEvapId ? evaporators.find(e => e.id === selectedEvapId)?.evapFanCount : undefined}
          evapFanDiameter={selectedEvapId ? evaporators.find(e => e.id === selectedEvapId)?.evapFanDiameter : undefined}
          panelType={panelType}
          panelThickness={panelThickness}
          floorType={floorType}
          doorType={doorType}
          doorWidth={parseFloat(doorWidthStr) || 900}
          doorHeight={parseFloat(doorHeightStr) || 1900}
          doorWall={doorWall}
          size="lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Form & Room List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Form Card */}
          <div className="p-5 border border-divider shadow-sm rounded-xl bg-surface">
            <div className="flex items-center gap-2 mb-4 border-b border-divider pb-3">
              <Plus className="text-[var(--color-accent-500)]" size={18} />
              <h3 className="text-sm font-semibold text-primary">
                {editingId ? 'Edit Spesifikasi Ruangan' : 'Tambah Ruangan Baru'}
              </h3>
              {editingId && (
                <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold px-2 py-0.5 rounded">
                  Mode Edit
                </span>
              )}
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Nama Ruangan</label>
                <Input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. Ruang Chiller 1, Freezer Room B" 
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-5 border-y border-divider py-4">
                {/* L Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover/80 border border-divider flex items-center justify-center font-bold text-primary text-xs shadow-sm">
                        L
                      </div>
                      <Input 
                        type="number"
                        required
                        value={lengthStr}
                        onChange={e => setLengthStr(e.target.value)}
                        className="w-24 h-8 text-xs text-right"
                        placeholder="0"
                      />
                      <span className="text-xs font-medium text-secondary">mm</span>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-[var(--color-accent-50)] text-[var(--color-accent-700)] px-2 py-1 rounded-md">
                      {((parseFloat(lengthStr) || 0) / 1000).toFixed(1)} m
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="30000"
                    step="100"
                    value={parseFloat(lengthStr) || 1000}
                    onChange={e => setLengthStr(e.target.value)}
                    className="w-full h-1.5 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-600)] hover:accent-[var(--color-accent-500)]"
                  />
                </div>

                {/* W Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover/80 border border-divider flex items-center justify-center font-bold text-primary text-xs shadow-sm">
                        W
                      </div>
                      <Input 
                        type="number"
                        required
                        value={widthStr}
                        onChange={e => setWidthStr(e.target.value)}
                        className="w-24 h-8 text-xs text-right"
                        placeholder="0"
                      />
                      <span className="text-xs font-medium text-secondary">mm</span>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-[var(--color-accent-50)] text-[var(--color-accent-700)] px-2 py-1 rounded-md">
                      {((parseFloat(widthStr) || 0) / 1000).toFixed(1)} m
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="30000"
                    step="100"
                    value={parseFloat(widthStr) || 1000}
                    onChange={e => setWidthStr(e.target.value)}
                    className="w-full h-1.5 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-600)] hover:accent-[var(--color-accent-500)]"
                  />
                </div>

                {/* H Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-hover/80 border border-divider flex items-center justify-center font-bold text-primary text-xs shadow-sm">
                        H
                      </div>
                      <Input 
                        type="number"
                        required
                        value={heightStr}
                        onChange={e => setHeightStr(e.target.value)}
                        className="w-24 h-8 text-xs text-right"
                        placeholder="0"
                      />
                      <span className="text-xs font-medium text-secondary">mm</span>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-[var(--color-accent-50)] text-[var(--color-accent-700)] px-2 py-1 rounded-md">
                      {((parseFloat(heightStr) || 0) / 1000).toFixed(1)} m
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="10000"
                    step="100"
                    value={parseFloat(heightStr) || 1000}
                    onChange={e => setHeightStr(e.target.value)}
                    className="w-full h-1.5 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-600)] hover:accent-[var(--color-accent-500)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Jenis Lantai</label>
                <select
                  value={floorType}
                  onChange={e => setFloorType(e.target.value as any)}
                  className="flex h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
                >
                  <option value="tanpa lantai">Tanpa Lantai</option>
                  <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
                  <option value="concrete">Concrete (Cor Beton)</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Tebal Panel</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['50mm', '75mm', '100mm', '125mm', '150mm', '200mm'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPanelThickness(t as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all flex-1 ${
                          panelThickness === t 
                          ? 'bg-[var(--color-accent-600)] text-white border-[var(--color-accent-600)] shadow-sm' 
                          : 'bg-surface border-divider text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        {t.replace('mm', '')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Jenis Panel</label>
                  <select
                    value={panelType}
                    onChange={e => setPanelType(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
                  >
                    <option value="PU">PU (Polyurethane)</option>
                    <option value="PIR">PIR (Polyisocyanurate)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Evaporator (Opsional)</label>
                  <select
                    value={selectedEvapId}
                    onChange={e => setSelectedEvapId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
                  >
                    <option value="">-- Pilih Evaporator --</option>
                    {evaporators.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.brand} {e.model} ({e.evapLength || 0}x{e.evapWidth || 0}x{e.evapHeight || 0}mm, {e.evapFanCount || 1} Fan)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Advanced Door Selection (SupaCAD Style) */}
                <div className="border-t border-divider pt-4 mt-4 space-y-4">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-[var(--color-accent-500)] rounded-full"></span>
                    Konfigurasi Pintu (CAD)
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Tipe Pintu</label>
                      <select
                        value={doorType}
                        onChange={e => setDoorType(e.target.value as any)}
                        className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
                      >
                        <option value="Hinged">Hinged (Ayun)</option>
                        <option value="Sliding">Sliding (Geser)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Posisi Dinding</label>
                      <select
                        value={doorWall}
                        onChange={e => setDoorWall(e.target.value as any)}
                        className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
                      >
                        <option value="depan">Depan (Front)</option>
                        <option value="belakang">Belakang (Back)</option>
                        <option value="kiri">Kiri (Left)</option>
                        <option value="kanan">Kanan (Right)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Lebar Pintu</label>
                        <span className="text-[10px] font-mono font-bold text-[var(--color-accent-600)]">{doorWidthStr} mm</span>
                      </div>
                      <input
                        type="range"
                        min="900"
                        max="2400"
                        step="100"
                        value={doorWidthStr}
                        onChange={e => setDoorWidthStr(e.target.value)}
                        className="w-full h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-600)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Tinggi Pintu</label>
                        <span className="text-[10px] font-mono font-bold text-[var(--color-accent-600)]">{doorHeightStr} mm</span>
                      </div>
                      <input
                        type="range"
                        min="1800"
                        max="2600"
                        step="100"
                        value={doorHeightStr}
                        onChange={e => setDoorHeightStr(e.target.value)}
                        className="w-full h-1 bg-surface-hover rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-600)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                {editingId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      setEditingId(null);
                      setName('');
                      setLengthStr('');
                      setWidthStr('');
                      setHeightStr('');
                      setFloorType('tanpa lantai');
                      setPanelThickness('100mm');
                      setPanelType('PU');
                      setSelectedEvapId('');
                    }}
                  >
                    Batal
                  </Button>
                )}
                <Button type="submit" className="flex-1 h-9 text-xs bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)]">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Ruangan'}
                </Button>
              </div>
            </form>
          </div>

          {/* Room List Card */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase font-semibold text-secondary tracking-wider">Daftar Ruangan ({rooms.length})</h3>
            {rooms.length === 0 ? (
              <div className="p-8 border border-dashed border-divider rounded-xl text-center bg-surface-hover/30">
                <Layers className="mx-auto text-muted opacity-30 mb-2" size={28} />
                <p className="text-xs text-muted">Belum ada ruangan yang ditambahkan. Isi spesifikasi di atas untuk menghitung.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {rooms.map(room => (
                  <div 
                    key={room.id}
                    className={`p-4 border rounded-xl shadow-xs transition-all bg-surface flex flex-col justify-between gap-3 ${
                      editingId === room.id ? 'border-amber-500 bg-amber-500/5' : 'border-divider hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-primary text-sm leading-snug">{room.name}</h4>
                        <p className="text-[10px] text-muted font-mono mt-0.5">
                          {room.length} x {room.width} x {room.height} mm
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEditRoom(room);
                          }}
                          className="p-1.5 text-muted hover:text-[var(--color-accent-600)] transition-colors hover:bg-surface-hover rounded"
                          title="Edit Ruangan"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteRoom(room.id);
                          }}
                          className="p-1.5 text-muted hover:text-red-500 transition-colors hover:bg-surface-hover rounded"
                          title="Hapus Ruangan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] bg-surface-hover text-secondary border border-divider font-medium px-2 py-0.5 rounded-full capitalize">
                        {room.floorType === 'tanpa lantai' ? 'Tanpa Lantai' : room.floorType === 'insulation panel' ? 'Panel Lantai' : 'Beton'}
                      </span>
                      <span className="text-[9px] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] font-medium px-2 py-0.5 rounded-full">
                        {room.panelThickness} • {room.panelType}
                      </span>
                      {room.evaporatorProduct && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium px-2 py-0.5 rounded-full">
                          Evap: {room.evaporatorProduct.brand} {room.evaporatorProduct.model}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 bg-surface-hover/50 p-2 rounded-lg text-center border border-divider/40">
                      <div>
                        <span className="text-[8px] text-muted uppercase block">Alumunium</span>
                        <span className="text-xs font-semibold text-primary block mt-0.5">{room.alumuniumSticks} btg</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-muted uppercase block">Colorbond</span>
                        <span className="text-xs font-semibold text-primary block mt-0.5">{room.colorbondSticks} btg</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-muted uppercase block">Besi</span>
                        <span className="text-xs font-semibold text-primary block mt-0.5">{room.ironSticks} btg</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-muted uppercase block">Lampu ({(room.totalLumens/1000).toFixed(1)}k lm)</span>
                        <span className="text-xs font-semibold text-primary block mt-0.5">{room.lampCasings} set</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-muted uppercase block">Panel</span>
                        <span className="text-xs font-semibold text-[var(--color-accent-600)] block mt-0.5">{room.totalSheets} lbr</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-secondary flex flex-wrap gap-x-2.5 gap-y-1 justify-center bg-surface-hover/30 p-1.5 rounded-lg border border-divider/40 font-medium">
                      <span>Dinding: {room.wallSheets} lbr ({room.wallPanelLength} mm)</span>
                      <span>•</span>
                      <span>Atap: {room.ceilingSheets} lbr ({room.ceilingPanelLength} mm)</span>
                      {room.floorSheets > 0 && (
                        <>
                          <span>•</span>
                          <span>Lantai: {room.floorSheets} lbr ({room.floorPanelLength} mm)</span>
                        </>
                      )}
                    </div>

                    {/* Expand/Collapse 3D CAD Preview button */}
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPreviews(prev => ({
                          ...prev,
                          [room.id]: !prev[room.id]
                        }));
                      }}
                      className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 border border-divider hover:border-gray-300 bg-surface hover:bg-surface-hover text-[10px] font-bold text-secondary rounded-lg transition-all"
                    >
                      {expandedPreviews[room.id] ? (
                        <>
                          <ChevronUp size={12} className="text-muted" />
                          Tutup Preview CAD 3D
                        </>
                      ) : (
                        <>
                          <ChevronDown size={12} className="text-muted" />
                          Lihat Preview CAD 3D
                        </>
                      )}
                    </button>

                    {expandedPreviews[room.id] && (
                      <div className="mt-1 w-full overflow-hidden rounded-lg border border-divider shadow-xs">
                        <Room3DPreview
                          name={room.name}
                          length={room.length}
                          width={room.width}
                          height={room.height}
                          lampCasings={room.lampCasings}
                          evapLength={room.evaporatorProduct?.evapLength}
                          evapWidth={room.evaporatorProduct?.evapWidth}
                          evapHeight={room.evaporatorProduct?.evapHeight}
                          evapFanCount={room.evaporatorProduct?.evapFanCount}
                          evapFanDiameter={room.evaporatorProduct?.evapFanDiameter}
                          panelType={room.panelType}
                          panelThickness={room.panelThickness}
                          floorType={room.floorType}
                          doorType={room.doorType}
                          doorWidth={room.doorWidth}
                          doorHeight={room.doorHeight}
                          doorWall={room.doorWall}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REKAPITULASI TOTAL MATERIAL */}
        <div className="lg:col-span-7">
          {rooms.length > 0 ? (
            <div className="border border-divider shadow-md rounded-xl bg-surface overflow-hidden sticky top-4">
              {/* Header */}
              <div className="p-5 border-b border-divider bg-surface-hover/30 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <FileText size={18} className="text-[var(--color-accent-600)]" />
                    Rekapitulasi Total Kebutuhan
                  </h3>
                  <p className="text-[10px] text-secondary mt-0.5">Total akumulasi dari {rooms.length} spesifikasi ruangan</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    onClick={() => window.print()}
                    size="sm"
                    variant="outline"
                    className="text-xs font-semibold text-[var(--color-accent-700)] border-[var(--color-accent-200)] hover:bg-[var(--color-accent-50)]/50 h-8"
                  >
                    <FileText size={13} className="mr-1.5" />
                    Cetak CAD / PDF
                  </Button>
                  <Button 
                    onClick={handleCopySummary}
                    size="sm" 
                    className="text-xs font-semibold relative overflow-hidden h-8"
                    variant={copied ? 'secondary' : 'primary'}
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="mr-1" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="mr-1" />
                        Salin Ringkasan
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-6">
                {/* 1. Siku Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">A. Kebutuhan Siku-Siku & Aksesoris</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Alumunium */}
                    <div className="p-4 border border-divider rounded-xl hover:border-gray-400/50 transition-all bg-surface-hover/30">
                      <div className="text-[10px] font-semibold text-secondary uppercase">Siku Alumunium (6m)</div>
                      <p className="text-[10px] text-muted mt-0.5">Sudut Bagian Dalam</p>
                      <div className="text-2xl font-bold text-[var(--color-accent-600)] mt-2">
                        {totalAlumuniumSticks} <span className="text-xs font-medium text-secondary">batang</span>
                      </div>
                      <div className="text-[10px] text-muted mt-1 font-mono">
                        ({totalAlumuniumEdges.toFixed(1)} m total)
                      </div>
                    </div>

                    {/* Colorbond */}
                    <div className="p-4 border border-divider rounded-xl hover:border-gray-400/50 transition-all bg-surface-hover/30">
                      <div className="text-[10px] font-semibold text-secondary uppercase">Siku Colorbond (3m)</div>
                      <p className="text-[10px] text-muted mt-0.5">Sudut Luar (Tanpa Bawah)</p>
                      <div className="text-2xl font-bold text-[var(--color-accent-600)] mt-2">
                        {totalColorbondSticks} <span className="text-xs font-medium text-secondary">batang</span>
                      </div>
                      <div className="text-[10px] text-muted mt-1 font-mono">
                        ({totalColorbondEdges.toFixed(1)} m total)
                      </div>
                    </div>

                    {/* Besi */}
                    <div className="p-4 border border-divider rounded-xl hover:border-gray-400/50 transition-all bg-surface-hover/30">
                      <div className="text-[10px] font-semibold text-secondary uppercase">Siku Besi (6m)</div>
                      <p className="text-[10px] text-muted mt-0.5">Sudut Luar Bagian Bawah</p>
                      <div className="text-2xl font-bold text-[var(--color-accent-600)] mt-2">
                        {totalIronSticks} <span className="text-xs font-medium text-secondary">batang</span>
                      </div>
                      <div className="text-[10px] text-muted mt-1 font-mono">
                        ({totalIronEdges.toFixed(1)} m total)
                      </div>
                    </div>

                    {/* Lampu */}
                    <div className="p-4 border border-divider rounded-xl hover:border-gray-400/50 transition-all bg-surface-hover/30">
                      <div className="text-[10px] font-semibold text-secondary uppercase">Lampu T8 16W</div>
                      <p className="text-[10px] text-muted mt-0.5">2 unit per casing</p>
                      <div className="text-2xl font-bold text-[var(--color-accent-600)] mt-2">
                        {totalLampCasings} <span className="text-xs font-medium text-secondary">set (casing)</span>
                      </div>
                      <div className="text-[10px] text-muted mt-1 font-mono">
                        (Total: {totalLumens.toLocaleString()} Lumens)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Room Areas */}
                <div className="space-y-3 border-t border-divider pt-5">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">B. Luas Permukaan Estimasi</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-surface-hover/40 rounded-lg border border-divider/50">
                      <span className="text-[10px] font-medium text-secondary block">Total Luas Lantai</span>
                      <span className="text-lg font-bold text-primary mt-0.5 block">{totalFloorArea.toFixed(2)} m²</span>
                    </div>
                    <div className="p-3 bg-surface-hover/40 rounded-lg border border-divider/50">
                      <span className="text-[10px] font-medium text-secondary block">Total Luas Dinding</span>
                      <span className="text-lg font-bold text-primary mt-0.5 block">{totalWallArea.toFixed(2)} m²</span>
                    </div>
                  </div>
                </div>

                 {/* 3. Sandwich Panels */}
                <div className="space-y-3 border-t border-divider pt-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <Package size={14} className="text-[var(--color-accent-500)]" />
                      C. Total Kebutuhan Panel Sandwich
                    </h4>
                    <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium px-2 py-0.5 rounded">
                      Lebar Efektif: PU 1200 mm, PIR 1160 mm
                    </span>
                  </div>
 
                   <div className="space-y-3">
                    {Object.entries(panelSummary).map(([spec, data]) => (
                      <div key={spec} className="p-4 border border-divider rounded-xl bg-surface-hover/30 hover:border-gray-400/50 transition-all">
                        <div className="flex justify-between items-center mb-2.5">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Layers2 size={13} className="text-secondary" />
                            Panel {spec}
                          </span>
                          <span className="text-base font-extrabold text-[var(--color-accent-600)]">
                            {data.sheets} <span className="text-xs font-normal text-secondary">lembar</span>
                          </span>
                        </div>
 
                        {/* Breakdown bar */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] border-t border-divider/50 pt-2 bg-surface-hover/50 rounded p-1.5">
                          <div className="border-r border-divider/40">
                            <span className="text-muted block text-[9px] uppercase font-semibold">Dinding</span>
                            <span className="font-semibold text-primary block mt-0.5">{data.wall.total} lbr</span>
                            <div className="mt-1 space-y-0.5">
                              {Object.entries(data.wall.lengths).map(([len, qty]) => (
                                <span key={len} className="block text-[8px] text-muted font-mono leading-none">
                                  {qty} lbr @ {len} mm
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="border-r border-divider/40">
                            <span className="text-muted block text-[9px] uppercase font-semibold">Atap</span>
                            <span className="font-semibold text-primary block mt-0.5">{data.ceiling.total} lbr</span>
                            <div className="mt-1 space-y-0.5">
                              {Object.entries(data.ceiling.lengths).map(([len, qty]) => (
                                <span key={len} className="block text-[8px] text-muted font-mono leading-none">
                                  {qty} lbr @ {len} mm
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted block text-[9px] uppercase font-semibold">Lantai</span>
                            <span className="font-semibold text-primary block mt-0.5">
                              {data.floor.total > 0 ? `${data.floor.total} lbr` : '-'}
                            </span>
                            {data.floor.total > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {Object.entries(data.floor.lengths).map(([len, qty]) => (
                                  <span key={len} className="block text-[8px] text-muted font-mono leading-none">
                                    {qty} lbr @ {len} mm
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
 
                 {/* Info Disclaimer */}
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-start gap-2 text-[10px] text-secondary">
                  <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    Estimasi jumlah panel menggunakan pembagian lebar efektif modular sebesar 1200 mm untuk panel PU dan 1160 mm untuk panel PIR. Siku alumunium bagian dalam dihitung berdasarkan dinamika tebal panel dan jenis lantai yang mempengaruhi tinggi serta panjang siku dalam yang dibutuhkan di setiap sambungan panel.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-surface border border-dashed border-divider rounded-xl">
               <Calculator size={48} className="text-muted opacity-30 mb-4" />
               <h4 className="text-sm font-semibold text-primary mb-1">Menunggu Input Ruangan</h4>
               <p className="text-xs text-secondary text-center max-w-sm leading-relaxed">
                 Silakan masukkan dimensi ruangan serta tentukan tipe lantai, tebal panel, dan jenis panel di form sebelah kiri, lalu klik <strong>"Tambah Ruangan"</strong> untuk melihat akumulasi total material.
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface border border-divider rounded-2xl shadow-2xl p-6 overflow-hidden transform scale-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-primary">Reset Semua Ruangan?</h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Tindakan ini akan menghapus seluruh daftar ruangan yang telah ditambahkan ke kalkulator secara permanen. Apakah Anda yakin ingin melanjutkan?
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6 border-t border-divider pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowResetConfirm(false)}
              >
                Batal
              </Button>
              <Button 
                variant="primary" 
                size="sm"
                className="bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 text-white"
                onClick={() => {
                  setRooms([]);
                  setEditingId(null);
                  setShowResetConfirm(false);
                  toast.success('Semua ruangan berhasil direset');
                }}
              >
                Ya, Reset Semua
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* PROFESSIONAL CAD / PROPOSAL PRINT VIEW (SUPACAD STYLE) */}
      <div className="hidden min-h-dvh bg-white p-12 font-sans text-zinc-900 print:block">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">PT ROKINDO JAYA MANDIRI</h1>
            <p className="text-xs font-mono text-zinc-500 uppercase mt-1">Sistem Integrasi Refrigerasi & Cold Room Specialist</p>
            <p className="text-[10px] text-zinc-500 mt-1">Kawasan Industri, Jakarta, Indonesia • Telp: (021) 888-8888 • www.rokindo.co.id</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-zinc-900 text-white text-[10px] font-black uppercase px-2.5 py-1 tracking-wider mb-2">PROPOSAL DESAIN TEKNIS</span>
            <p className="text-xs font-mono text-zinc-700 font-semibold">No: PR/ROK/{new Date().getFullYear()}/{Math.floor(1000 + Math.random() * 9000)}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Tanggal: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Client & Project Info */}
        <div className="grid grid-cols-2 gap-8 border border-zinc-300 p-4 rounded-lg bg-zinc-50/50 mb-8">
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Informasi Klien</h3>
            <table className="w-full text-[11px]">
              <tbody>
                <tr>
                  <td className="w-24 text-zinc-500 font-medium pb-1.5">Nama Perusahaan</td>
                  <td className="font-semibold text-zinc-800 pb-1.5">: Klien SupaCAD Builder</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 font-medium pb-1.5">Kontak Person</td>
                  <td className="font-medium text-zinc-700 pb-1.5">: Bapak / Ibu Customer</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 font-medium">Alamat Proyek</td>
                  <td className="font-medium text-zinc-700">: Sesuai Lokasi Pemasangan</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Detail Desain</h3>
            <table className="w-full text-[11px]">
              <tbody>
                <tr>
                  <td className="w-24 text-zinc-500 font-medium pb-1.5">Sistem Software</td>
                  <td className="font-semibold text-zinc-800 pb-1.5">: SupaCAD ColdRoom Engine v2.0</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 font-medium pb-1.5">Total Ruangan</td>
                  <td className="font-semibold text-zinc-800 pb-1.5">: {rooms.length} Ruangan</td>
                </tr>
                <tr>
                  <td className="text-zinc-500 font-medium">Metode Konstruksi</td>
                  <td className="font-medium text-zinc-700">: Sandwich Panel Modular (Cam-lock/Slip-joint)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Engineering Statement */}
        <div className="mb-8 p-4 border-l-4 border-zinc-800 bg-zinc-100/50 rounded-r-md">
          <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-1">Pernyataan Rekayasa Teknis</h4>
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            Estimasi ini dibuat menggunakan standardisasi rekayasa material cold storage yang memperhitungkan sambungan presisi panel sandwich PU/PIR dengan lebar efektif modular. Semua detail material siku (aluminium, colorbond, besi) dihitung dengan rumus akurasi tinggi yang disesuaikan dengan tipe insulasi lantai untuk menjamin integritas thermal optimal.
          </p>
        </div>

        {/* Dynamic Rooms Printout */}
        <div className="space-y-12">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-300 pb-2 mb-6">A. DETAIL SPESIFIKASI RUANGAN & LAYOUT CAD</h2>
          
          {rooms.map((room, idx) => (
            <div key={room.id} className="page-break-inside-avoid border border-zinc-200 rounded-lg p-6 space-y-6 mb-8">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">{idx + 1}</span>
                  <h3 className="text-sm font-bold text-zinc-900 uppercase">{room.name}</h3>
                </div>
                <span className="text-xs font-mono font-semibold text-zinc-500">REF: ROOM-0{idx + 1}</span>
              </div>

              {/* Specs & Layout Row */}
              <div className="grid grid-cols-12 gap-8">
                {/* Visual Blueprint Rendering */}
                <div className="col-span-6 border border-zinc-300 rounded bg-zinc-50 p-3 flex flex-col justify-center items-center">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">2D PLAN / BLUEPRINT LAYOUT</span>
                  
                  {/* Miniature SVG Preview container with customized light colors for clear paper print */}
                  <div className="w-full aspect-[4/3] max-w-[320px] bg-white border border-zinc-200 shadow-xs flex items-center justify-center overflow-hidden rounded relative">
                    <Room3DPreview
                      name={room.name}
                      length={room.length}
                      width={room.width}
                      height={room.height}
                      lampCasings={room.lampCasings}
                      evapLength={room.evaporatorProduct?.evapLength}
                      evapWidth={room.evaporatorProduct?.evapWidth}
                      evapHeight={room.evaporatorProduct?.evapHeight}
                      evapFanCount={room.evaporatorProduct?.evapFanCount}
                      evapFanDiameter={room.evaporatorProduct?.evapFanDiameter}
                      panelType={room.panelType}
                      panelThickness={room.panelThickness}
                      floorType={room.floorType}
                      doorType={room.doorType}
                      doorWidth={room.doorWidth}
                      doorHeight={room.doorHeight}
                      doorWall={room.doorWall}
                      forceTopDown={true}
                    />
                  </div>
                </div>

                {/* Specs Data */}
                <div className="col-span-6 space-y-4">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Konfigurasi & Dimensi Ruang</h4>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="border-b border-zinc-100 pb-1.5">
                      <span className="text-zinc-500 block text-[10px]">Dimensi Luar (PxLxT)</span>
                      <span className="font-mono font-bold text-zinc-800">{room.length} x {room.width} x {room.height} mm</span>
                    </div>
                    <div className="border-b border-zinc-100 pb-1.5">
                      <span className="text-zinc-500 block text-[10px]">Tebal & Jenis Panel</span>
                      <span className="font-bold text-zinc-800">{room.panelThickness} • {room.panelType}</span>
                    </div>
                    <div className="border-b border-zinc-100 pb-1.5">
                      <span className="text-zinc-500 block text-[10px]">Pilihan Alas Lantai</span>
                      <span className="font-bold text-zinc-800 capitalize">{room.floorType === 'tanpa lantai' ? 'Tanpa Lantai' : room.floorType === 'insulation panel' ? 'Panel Lantai' : 'Beton'}</span>
                    </div>
                    <div className="border-b border-zinc-100 pb-1.5">
                      <span className="text-zinc-500 block text-[10px]">Peralatan Evaporator</span>
                      <span className="font-bold text-zinc-800">
                        {room.evaporatorProduct ? `${room.evaporatorProduct.brand} ${room.evaporatorProduct.model}` : 'Tanpa Evap'}
                      </span>
                    </div>
                    <div className="border-b border-zinc-100 pb-1.5 col-span-2">
                      <span className="text-zinc-500 block text-[10px]">Sistem Pintu CAD</span>
                      <span className="font-medium text-zinc-800">
                        Pintu {room.doorType} ({room.doorWidth}x{room.doorHeight} mm), Terpasang di Dinding {room.doorWall.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pt-2">Breakdown Material</h4>
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-300 text-zinc-500">
                        <th className="py-1 font-semibold">Deskripsi Material</th>
                        <th className="py-1 text-right font-semibold">Spesifikasi Ukuran</th>
                        <th className="py-1 text-right font-semibold">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700">
                      <tr>
                        <td className="py-1 font-medium">Panel Sandwich Dinding</td>
                        <td className="py-1 text-right font-mono text-[10px]">{room.wallPanelLength} mm</td>
                        <td className="py-1 text-right font-semibold text-zinc-900">{room.wallSheets} lbr</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium">Panel Sandwich Atap</td>
                        <td className="py-1 text-right font-mono text-[10px]">{room.ceilingPanelLength} mm</td>
                        <td className="py-1 text-right font-semibold text-zinc-900">{room.ceilingSheets} lbr</td>
                      </tr>
                      {room.floorSheets > 0 && (
                        <tr>
                          <td className="py-1 font-medium">Panel Sandwich Lantai</td>
                          <td className="py-1 text-right font-mono text-[10px]">{room.floorPanelLength} mm</td>
                          <td className="py-1 text-right font-semibold text-zinc-900">{room.floorSheets} lbr</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-1 font-medium">Siku Aluminium (6m)</td>
                        <td className="py-1 text-right text-[10px]">Sudut Dalam</td>
                        <td className="py-1 text-right font-semibold text-zinc-900">{room.alumuniumSticks} btg</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium">Siku Colorbond (3m)</td>
                        <td className="py-1 text-right text-[10px]">Sudut Luar</td>
                        <td className="py-1 text-right font-semibold text-zinc-900">{room.colorbondSticks} btg</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium">Siku Besi Siku (6m)</td>
                        <td className="py-1 text-right text-[10px]">Lantai Beton/Bawah</td>
                        <td className="py-1 text-right font-semibold text-zinc-900">{room.ironSticks} btg</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-medium">Fixture Lampu LED T8</td>
                        <td className="py-1 text-right text-[10px]">Casing Ganda Waterproof</td>
                        <td className="py-1 text-right font-semibold text-zinc-900">{room.lampCasings} set</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Consolidated summary section */}
        <div className="mt-12 page-break-before-always border border-zinc-300 p-6 rounded-lg">
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest border-b border-zinc-300 pb-2 mb-6">B. REKAPITULASI TOTAL INTEGRAL PROYEK</h2>
          
          <p className="text-[11px] text-zinc-600 mb-6">
            Berikut adalah ringkasan total kebutuhan seluruh komponen material sandwich panel dan siku konstruksi yang wajib disediakan untuk instalasi:
          </p>

          <table className="w-full text-left text-[11px] border border-zinc-300 rounded overflow-hidden">
            <thead>
              <tr className="bg-zinc-100 text-zinc-800 border-b border-zinc-300">
                <th className="p-2.5 font-bold">Kategori Material</th>
                <th className="p-2.5 font-bold">Rincian Spesifikasi Teknis</th>
                <th className="p-2.5 text-right font-bold">Total Akumulasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {/* Sandwich Panels group */}
              {Object.entries(panelSummary).map(([spec, data]) => (
                <tr key={spec}>
                  <td className="p-2.5 font-bold text-zinc-900">Panel Sandwich {spec}</td>
                  <td className="p-2.5 text-[10px]">
                    <div className="flex flex-wrap gap-x-3">
                      <span>Dinding: {data.wall.total} lbr</span>
                      <span>Atap: {data.ceiling.total} lbr</span>
                      {data.floor.total > 0 && <span>Lantai: {data.floor.total} lbr</span>}
                    </div>
                  </td>
                  <td className="p-2.5 text-right font-bold text-zinc-950 text-xs">{data.sheets} Lembar</td>
                </tr>
              ))}
              {/* Angles */}
              <tr>
                <td className="p-2.5 font-bold text-zinc-900">Siku Aluminium (Sudut Dalam)</td>
                <td className="p-2.5 text-[10px]">Panjang standar 6 meter per batang ({totalAlumuniumEdges.toFixed(1)} m total)</td>
                <td className="p-2.5 text-right font-bold text-zinc-950 text-xs">{totalAlumuniumSticks} Batang</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-zinc-900">Siku Colorbond (Sudut Luar)</td>
                <td className="p-2.5 text-[10px]">Panjang standar 3 meter per batang ({totalColorbondEdges.toFixed(1)} m total)</td>
                <td className="p-2.5 text-right font-bold text-zinc-950 text-xs">{totalColorbondSticks} Batang</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-zinc-900">Besi Siku (Lantai/Konstruksi)</td>
                <td className="p-2.5 text-[10px]">Panjang standar 6 meter per batang ({totalIronEdges.toFixed(1)} m total)</td>
                <td className="p-2.5 text-right font-bold text-zinc-950 text-xs">{totalIronSticks} Batang</td>
              </tr>
              {/* Lighting */}
              <tr>
                <td className="p-2.5 font-bold text-zinc-900">Penerangan LED T8 16W</td>
                <td className="p-2.5 text-[10px]">Casing ganda waterproof dengan lampu T8 (Total {totalLumens.toLocaleString()} Lumens)</td>
                <td className="p-2.5 text-right font-bold text-zinc-950 text-xs">{totalLampCasings} Set</td>
              </tr>
              {/* Evaporator summary */}
              {rooms.some(r => r.evaporatorProduct) && (
                <tr>
                  <td className="p-2.5 font-bold text-zinc-900">Evaporator Unit</td>
                  <td className="p-2.5 text-[10px] space-y-0.5">
                    {rooms.filter(r => r.evaporatorProduct).map((r, i) => (
                      <div key={i}>
                        - {r.name}: {r.evaporatorProduct?.brand} {r.evaporatorProduct?.model} ({r.evaporatorProduct?.evapFanCount} Fan)
                      </div>
                    ))}
                  </td>
                  <td className="p-2.5 text-right font-bold text-zinc-950 text-xs">
                    {rooms.filter(r => r.evaporatorProduct).length} Unit
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Professional Terms and Sign-off */}
        <div className="mt-12 border-t border-zinc-200 pt-8 page-break-inside-avoid">
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-3">
              <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest">Ketentuan & Garansi Teknis</h4>
              <ul className="list-disc list-inside text-[9px] text-zinc-500 space-y-1.5 leading-relaxed">
                <li>Ukuran panel dipotong sesuai spesifikasi modular (L/W/H).</li>
                <li>Penyambungan panel wajib menggunakan sealant silikon anti-bakteri standar food-grade.</li>
                <li>Garansi sandwich panel (PU/PIR) mencakup kepadatan foam thermal selama 12 bulan.</li>
                <li>Instalasi struktur sudut wajib ditutup siku aluminium dengan sekrup keling (blind rivet) rapat.</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-[10px] pt-4">
              <div className="flex flex-col justify-between h-28 border border-dashed border-zinc-300 p-2 rounded">
                <span className="text-zinc-400 uppercase font-bold tracking-wider text-[8px]">Disiapkan Oleh (Estimator)</span>
                <div className="font-bold text-zinc-800 border-t border-zinc-200 pt-1.5">PT Rokindo Jaya Mandiri</div>
              </div>
              <div className="flex flex-col justify-between h-28 border border-dashed border-zinc-300 p-2 rounded">
                <span className="text-zinc-400 uppercase font-bold tracking-wider text-[8px]">Disetujui Oleh (Customer)</span>
                <div className="font-bold text-zinc-800 border-t border-zinc-200 pt-1.5">Tanda Tangan & Cap</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
