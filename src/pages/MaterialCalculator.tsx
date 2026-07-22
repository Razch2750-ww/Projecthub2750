import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  AlertTriangle
} from 'lucide-react';

interface CalculatedRoom {
  id: string;
  name: string;
  length: number; // mm
  width: number; // mm
  height: number; // mm
  floorType: 'tanpa lantai' | 'insulation panel' | 'concrete';
  panelThickness: '50mm' | '75mm' | '100mm' | '150mm';
  panelType: 'PU' | 'PIR';
  
  // Calculated values
  floorArea: number; // m²
  wallArea: number; // m²
  colorbondEdges: number; // m
  colorbondSticks: number; // btg (3m)
  alumuniumEdges: number; // m
  alumuniumSticks: number; // btg (6m)
  ironEdges: number; // m
  ironSticks: number; // btg (6m)
  
  // Panel sheets
  wallSheets: number;
  ceilingSheets: number;
  floorSheets: number;
  totalSheets: number;

  // Panel lengths
  wallPanelLength: number;
  ceilingPanelLength: number;
  floorPanelLength: number;
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
  const [panelThickness, setPanelThickness] = useState<'50mm' | '75mm' | '100mm' | '150mm'>('100mm');
  const [panelType, setPanelType] = useState<'PU' | 'PIR'>('PU');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Copy status
  const [copied, setCopied] = useState(false);

  // State for reset confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Helper to calculate room results
  const calculateRoomResults = (
    rName: string,
    l: number,
    w: number,
    h: number,
    fType: 'tanpa lantai' | 'insulation panel' | 'concrete',
    pThick: '50mm' | '75mm' | '100mm' | '150mm',
    pType: 'PU' | 'PIR'
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

    return {
      id: editingId || Math.random().toString(36).substr(2, 9),
      name: rName || `Ruangan ${rooms.length + 1}`,
      length: l,
      width: w,
      height: h,
      floorType: fType,
      panelThickness: pThick,
      panelType: pType,
      floorArea,
      wallArea,
      colorbondEdges,
      colorbondSticks,
      alumuniumEdges,
      alumuniumSticks,
      ironEdges,
      ironSticks,
      wallSheets,
      ceilingSheets,
      floorSheets,
      totalSheets,
      wallPanelLength,
      ceilingPanelLength,
      floorPanelLength
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
      panelType
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
      text += `  Panel Sandwich: ${r.totalSheets} lembar\n`;
      text += `    - Dinding : ${r.wallSheets} lbr @ ${r.wallPanelLength} mm\n`;
      text += `    - Atap    : ${r.ceilingSheets} lbr @ ${r.ceilingPanelLength} mm\n`;
      if (r.floorSheets > 0) {
        text += `    - Lantai  : ${r.floorSheets} lbr @ ${r.floorPanelLength} mm\n`;
      }
      text += `\n`;
    });

    text += `2. TOTAL KEBUTUHAN SIKU & AKSESORIS:\n`;
    text += `- Siku Alumunium (6m) : ${totalAlumuniumSticks} batang (Total: ${totalAlumuniumEdges.toFixed(1)} m)\n`;
    text += `- Siku Colorbond (3m)  : ${totalColorbondSticks} batang (Total: ${totalColorbondEdges.toFixed(1)} m)\n`;
    text += `- Siku Besi (6m)       : ${totalIronSticks} batang (Total: ${totalIronEdges.toFixed(1)} m)\n\n`;

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
    <div className="space-y-6">
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

            <form onSubmit={handleSaveRoom} className="space-y-4">
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

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Panjang (mm)</label>
                  <Input 
                    type="number" 
                    required 
                    value={lengthStr} 
                    onChange={e => setLengthStr(e.target.value)} 
                    placeholder="0" 
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Lebar (mm)</label>
                  <Input 
                    type="number" 
                    required 
                    value={widthStr} 
                    onChange={e => setWidthStr(e.target.value)} 
                    placeholder="0" 
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Tinggi (mm)</label>
                  <Input 
                    type="number" 
                    required 
                    value={heightStr} 
                    onChange={e => setHeightStr(e.target.value)} 
                    placeholder="0" 
                    className="h-9 text-xs"
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-primary">Tebal Panel</label>
                  <select
                    value={panelThickness}
                    onChange={e => setPanelThickness(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
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
                    value={panelType}
                    onChange={e => setPanelType(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-divider bg-surface px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-all"
                  >
                    <option value="PU">PU (Polyurethane)</option>
                    <option value="PIR">PIR (Polyisocyanurate)</option>
                  </select>
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
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
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
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 bg-surface-hover/50 p-2 rounded-lg text-center border border-divider/40">
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
                <Button 
                  onClick={handleCopySummary}
                  size="sm" 
                  className="text-xs font-semibold relative overflow-hidden"
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

              {/* Body */}
              <div className="p-5 space-y-6">
                {/* 1. Siku Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">A. Kebutuhan Siku-Siku (Corner Profile)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
  );
};
