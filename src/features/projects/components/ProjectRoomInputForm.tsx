import React from 'react';
import { Plus, Trash2, Split, Layers, DoorOpen } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableCombobox } from '../../../components/ui/SearchableCombobox';
import { PanelType, RoomDoorConfig, RoomPartition } from '../../../types';

interface ProjectRoomInputFormProps {
  newRoomItemCategory: 'ruangan' | 'mesin' | 'dinding';
  setNewRoomItemCategory: (val: 'ruangan' | 'mesin' | 'dinding') => void;
  newRoomName: string;
  setNewRoomName: (val: string) => void;
  newRoomLength: string;
  setNewRoomLength: (val: string) => void;
  newRoomWidth: string;
  setNewRoomWidth: (val: string) => void;
  newRoomHeight: string;
  setNewRoomHeight: (val: string) => void;
  newRoomThickness: PanelType;
  setNewRoomThickness: (val: PanelType) => void;
  newRoomPanelType: 'PU' | 'PIR' | 'EPS';
  setNewRoomPanelType: (val: 'PU' | 'PIR' | 'EPS') => void;
  newRoomPartitions: RoomPartition[];
  setNewRoomPartitions: React.Dispatch<React.SetStateAction<RoomPartition[]>>;
  newRoomFloorType: 'tanpa lantai' | 'insulation panel' | 'concrete';
  setNewRoomFloorType: (val: 'tanpa lantai' | 'insulation panel' | 'concrete') => void;
  newRoomDoors: RoomDoorConfig[];
  onAddDoor: () => void;
  onRemoveDoor: (index: number) => void;
  onUpdateDoor: (index: number, field: keyof RoomDoorConfig, val: string) => void;
  newRoomMachineType: string;
  setNewRoomMachineType: (val: string) => void;
  newRoomMountingType: string;
  setNewRoomMountingType: (val: string) => void;
  newRoomMachineCapacity: string;
  setNewRoomMachineCapacity: (val: string) => void;
  newRoomMachineCapacityQty: string;
  setNewRoomMachineCapacityQty: (val: string) => void;
  newRoomOutdoorMachine: string;
  setNewRoomOutdoorMachine: (val: string) => void;
  newRoomOutdoorMachineQty: string;
  setNewRoomOutdoorMachineQty: (val: string) => void;
  newRoomEvaporator: string;
  setNewRoomEvaporator: (val: string) => void;
  newRoomEvaporatorQty: string;
  setNewRoomEvaporatorQty: (val: string) => void;
  outdoorMachineOptions: { id: string; label: string; subLabel?: string }[];
  evaporatorOptions: { id: string; label: string; subLabel?: string }[];
  onAddRoom: () => void;
}

export const ProjectRoomInputForm: React.FC<ProjectRoomInputFormProps> = ({
  newRoomItemCategory,
  setNewRoomItemCategory,
  newRoomName,
  setNewRoomName,
  newRoomLength,
  setNewRoomLength,
  newRoomWidth,
  setNewRoomWidth,
  newRoomHeight,
  setNewRoomHeight,
  newRoomThickness,
  setNewRoomThickness,
  newRoomPanelType,
  setNewRoomPanelType,
  newRoomPartitions,
  setNewRoomPartitions,
  newRoomFloorType,
  setNewRoomFloorType,
  newRoomDoors,
  onAddDoor,
  onRemoveDoor,
  onUpdateDoor,
  newRoomMachineType,
  setNewRoomMachineType,
  newRoomMountingType,
  setNewRoomMountingType,
  newRoomMachineCapacity,
  setNewRoomMachineCapacity,
  newRoomMachineCapacityQty,
  setNewRoomMachineCapacityQty,
  newRoomOutdoorMachine,
  setNewRoomOutdoorMachine,
  newRoomOutdoorMachineQty,
  setNewRoomOutdoorMachineQty,
  newRoomEvaporator,
  setNewRoomEvaporator,
  newRoomEvaporatorQty,
  setNewRoomEvaporatorQty,
  outdoorMachineOptions,
  evaporatorOptions,
  onAddRoom
}) => {
  // Calculations for live panel summary
  const L = (parseFloat(newRoomLength || '0') || 0) / 1000;
  const W = (parseFloat(newRoomWidth || '0') || 0) / 1000;
  const H = (parseFloat(newRoomHeight || '0') || 0) / 1000;
  const mainWallArea = (2 * L * H) + (2 * W * H);
  let partitionArea = 0;
  if (newRoomPartitions && Array.isArray(newRoomPartitions)) {
    newRoomPartitions.forEach(p => {
      const pL = (parseFloat(String(p.length || '0')) || 0) / 1000;
      const pH = (parseFloat(String(p.height || '0')) || 0) / 1000 || H;
      const pQty = parseInt(String(p.qty || '1'), 10) || 1;
      partitionArea += (pL * pH) * pQty;
    });
  }
  const totalWallArea = mainWallArea + partitionArea;
  const areaLantaiAtap = (L > 0 && W > 0) ? (L * W) : 0;
  const isTanpaLantai = newRoomFloorType === 'tanpa lantai' || !newRoomFloorType;

  return (
    <div className="border border-divider rounded-xl p-4 space-y-4 bg-surface-hover/20 mt-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-600)] pb-2 border-b border-divider">
        <Plus size={16} />
        <span>Tambah Item Proyek (Ruangan / Mesin / Dinding & Sekat)</span>
      </div>

      <div className="space-y-1.5 pb-2 border-b border-divider">
        <label className="text-xs font-semibold text-primary">Kategori Item / Pekerjaan</label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setNewRoomItemCategory('ruangan')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all ${
              newRoomItemCategory === 'ruangan'
                ? 'bg-[var(--color-accent-600)] text-white border-[var(--color-accent-600)] shadow-xs'
                : 'bg-surface text-secondary border-divider hover:border-divider-hover'
            }`}
          >
            🏠 Ruangan
          </button>
          <button
            type="button"
            onClick={() => setNewRoomItemCategory('mesin')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all ${
              newRoomItemCategory === 'mesin'
                ? 'bg-[var(--color-accent-600)] text-white border-[var(--color-accent-600)] shadow-xs'
                : 'bg-surface text-secondary border-divider hover:border-divider-hover'
            }`}
          >
            ⚙️ Mesin Saja
          </button>
          <button
            type="button"
            onClick={() => setNewRoomItemCategory('dinding')}
            className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all ${
              newRoomItemCategory === 'dinding'
                ? 'bg-[var(--color-accent-600)] text-white border-[var(--color-accent-600)] shadow-xs'
                : 'bg-surface text-secondary border-divider hover:border-divider-hover'
            }`}
          >
            🧱 Dinding & Sekat
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-primary">
          {newRoomItemCategory === 'ruangan' && 'Nama Ruangan'}
          {newRoomItemCategory === 'mesin' && 'Nama / Keterangan Mesin'}
          {newRoomItemCategory === 'dinding' && 'Nama / Keterangan Dinding & Sekat'}
        </label>
        <Input
          value={newRoomName}
          onChange={e => setNewRoomName(e.target.value)}
          placeholder={
            newRoomItemCategory === 'ruangan' ? 'e.g. Ruang Chiller 1, Freezer Room B' :
            newRoomItemCategory === 'mesin' ? 'e.g. Condensing Unit Bitzer 5HP / Evaporator' :
            'e.g. Dinding Ruang Produksi & Sekat Partisi PU 10cm'
          }
          className="h-8 text-xs"
        />
      </div>

      {/* 🧱 BAGIAN DINDING & SEKAT */}
      <div className="space-y-3 bg-surface p-3.5 rounded-xl border border-divider">
        <div className="flex items-center justify-between pb-1.5 border-b border-divider">
          <label className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Layers size={14} className="text-[var(--color-accent-600)]" />
            <span>Bagian Dinding & Sekat</span>
          </label>
          <span className="text-[10px] text-muted font-mono">Dinding Utama & Partisi</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-primary">Panjang Dinding (mm)</label>
            <Input
              type="number"
              value={newRoomLength}
              onChange={e => setNewRoomLength(e.target.value)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-primary">Lebar Dinding (mm)</label>
            <Input
              type="number"
              value={newRoomWidth}
              onChange={e => setNewRoomWidth(e.target.value)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-primary">Tinggi Dinding (mm)</label>
            <Input
              type="number"
              value={newRoomHeight}
              onChange={e => setNewRoomHeight(e.target.value)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-primary">Ketebalan Panel</label>
            <select
              value={newRoomThickness}
              onChange={e => setNewRoomThickness(e.target.value as PanelType)}
              className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
            >
              <option value="50mm">50 mm</option>
              <option value="75mm">75 mm</option>
              <option value="100mm">100 mm</option>
              <option value="125mm">125 mm</option>
              <option value="150mm">150 mm</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-primary">Bahan Panel</label>
            <select
              value={newRoomPanelType}
              onChange={e => setNewRoomPanelType(e.target.value as 'PU' | 'PIR' | 'EPS')}
              className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
            >
              <option value="PU">PU (Polyurethane)</option>
              <option value="PIR">PIR (Polyisocyanurate)</option>
              <option value="EPS">EPS (Expanded Polystyrene)</option>
            </select>
          </div>
        </div>

        {/* Sekatan Partisi Dinding */}
        <div className="space-y-2 border-t border-divider pt-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-accent-600)] flex items-center gap-1.5">
              <Split size={14} />
              <span>Sekatan Dinding (Partisi)</span>
              {newRoomPartitions.length > 0 && (
                <span className="text-[10px] bg-[var(--color-accent-600)]/15 text-[var(--color-accent-600)] px-1.5 py-0.5 rounded-full font-bold">
                  {newRoomPartitions.length}
                </span>
              )}
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newPart: RoomPartition = {
                  id: crypto.randomUUID(),
                  name: `Sekat ${newRoomPartitions.length + 1}`,
                  length: newRoomWidth || '0',
                  height: newRoomHeight || '0',
                  qty: '1'
                };
                setNewRoomPartitions(prev => [...prev, newPart]);
              }}
              className="h-6 px-2 text-[11px] flex items-center gap-1 text-[var(--color-accent-600)] border-[var(--color-accent-500)]/40 hover:bg-[var(--color-accent-500)]/10 font-medium"
            >
              <Plus size={11} />
              Tambah Sekatan
            </Button>
          </div>

          {newRoomPartitions.length > 0 ? (
            <div className="space-y-2">
              {newRoomPartitions.map((part, pIdx) => (
                <div key={part.id} className="p-2.5 bg-surface-hover/40 rounded-lg border border-divider/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary text-[11px]">{part.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                      onClick={() => setNewRoomPartitions(prev => prev.filter((_, i) => i !== pIdx))}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted">Panjang (mm)</label>
                      <Input
                        type="number"
                        value={part.length}
                        onChange={e => {
                          const val = e.target.value;
                          setNewRoomPartitions(prev => prev.map((p, i) => i === pIdx ? { ...p, length: val } : p));
                        }}
                        placeholder="Panjang"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted">Tinggi (mm)</label>
                      <Input
                        type="number"
                        value={part.height}
                        onChange={e => {
                          const val = e.target.value;
                          setNewRoomPartitions(prev => prev.map((p, i) => i === pIdx ? { ...p, height: val } : p));
                        }}
                        placeholder="Tinggi"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted">Qty (Sisi)</label>
                      <Input
                        type="number"
                        value={part.qty}
                        onChange={e => {
                          const val = e.target.value;
                          setNewRoomPartitions(prev => prev.map((p, i) => i === pIdx ? { ...p, qty: val } : p));
                        }}
                        placeholder="Qty"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted italic bg-surface-hover/30 p-2 rounded border border-divider/40">
              Belum ada sekatan dinding pada bagian ini. Klik Tambah Sekatan untuk menambah partisi sekat panel.
            </p>
          )}

          {/* Live Ringkasan Panel */}
          <div className="mt-3 p-3 bg-surface-hover/70 rounded-lg border border-[var(--color-accent-500)]/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Layers size={14} className="text-[var(--color-accent-600)]" />
                Kebutuhan Panel (Dinding, Lantai, & Atap)
              </span>
              <span className="font-extrabold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] text-sm font-mono">
                {(totalWallArea + areaLantaiAtap + (isTanpaLantai ? 0 : areaLantaiAtap)).toFixed(2)} m²
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-divider/40 text-center font-mono text-[11px]">
              <div className="bg-surface/60 p-1.5 rounded">
                <span className="text-muted block text-[10px] font-sans">Dinding</span>
                <strong className="text-primary">{totalWallArea.toFixed(2)} m²</strong>
              </div>
              <div className="bg-surface/60 p-1.5 rounded">
                <span className="text-muted block text-[10px] font-sans">Lantai</span>
                <strong className="text-primary">{isTanpaLantai ? 'Tanpa Lantai' : `${areaLantaiAtap.toFixed(2)} m²`}</strong>
              </div>
              <div className="bg-surface/60 p-1.5 rounded">
                <span className="text-muted block text-[10px] font-sans">Atap</span>
                <strong className="text-primary">{areaLantaiAtap.toFixed(2)} m²</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📐 BAGIAN LANTAI (Hanya jika Kategori Ruangan) */}
      {newRoomItemCategory === 'ruangan' && (
        <div className="space-y-1.5 bg-surface p-3 rounded-xl border border-divider">
          <label className="text-xs font-semibold text-primary">Jenis Lantai</label>
          <select
            value={newRoomFloorType}
            onChange={e => setNewRoomFloorType(e.target.value as any)}
            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
          >
            <option value="tanpa lantai">Tanpa Lantai</option>
            <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
            <option value="concrete">Concrete (Cor Beton)</option>
          </select>
        </div>
      )}

      {/* 🚪 BAGIAN PINTU (Bisa memiliki lebih dari 1 jenis pintu sesuai instruksi screenshot) */}
      {newRoomItemCategory !== 'mesin' && (
        <div className="space-y-2.5 bg-surface p-3 rounded-xl border border-divider">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-accent-600)] flex items-center gap-1.5">
              <DoorOpen size={14} />
              <span>Pintu {newRoomDoors.length > 1 ? `(${newRoomDoors.length} Jenis Pintu)` : ''}</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddDoor}
              className="h-6 px-2 text-[11px] flex items-center gap-1 text-[var(--color-accent-600)] border-[var(--color-accent-500)]/40 hover:bg-[var(--color-accent-500)]/10 font-medium"
            >
              <Plus size={11} />
              Tambah Jenis Pintu
            </Button>
          </div>

          <div className="space-y-2.5">
            {newRoomDoors.map((door, dIdx) => (
              <div key={door.id || dIdx} className="p-2.5 bg-surface-hover/30 rounded-lg border border-divider/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary text-[11px]">
                    Pintu {newRoomDoors.length > 1 ? `#${dIdx + 1}` : ''}
                  </span>
                  {newRoomDoors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveDoor(dIdx)}
                      className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                      title="Hapus jenis pintu ini"
                    >
                      <Trash2 size={11} />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-primary">Jenis Pintu</label>
                    <select
                      value={door.type || ''}
                      onChange={e => onUpdateDoor(dIdx, 'type', e.target.value)}
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
                      value={door.width || ''}
                      onChange={e => onUpdateDoor(dIdx, 'width', e.target.value)}
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
                      value={door.height || ''}
                      onChange={e => onUpdateDoor(dIdx, 'height', e.target.value)}
                      placeholder="Tinggi"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-primary">Qty</label>
                    <Input
                      type="number"
                      value={door.qty || ''}
                      onChange={e => onUpdateDoor(dIdx, 'qty', e.target.value)}
                      placeholder="Qty"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ⚙️ BAGIAN MESIN PENDINGIN (Ketik manual & Searchable Combobox) */}
      {newRoomItemCategory !== 'dinding' && (
        <div className="space-y-3 bg-surface p-3 rounded-xl border border-divider">
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                <Input
                  value={newRoomMachineCapacity}
                  onChange={e => setNewRoomMachineCapacity(e.target.value)}
                  placeholder="Contoh: 1.5 HP"
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-20 space-y-1.5">
                <label className="text-xs font-medium text-primary">Qty</label>
                <Input
                  value={newRoomMachineCapacityQty}
                  onChange={e => setNewRoomMachineCapacityQty(e.target.value)}
                  placeholder="Qty"
                  type="number"
                  min="1"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {newRoomMachineType === 'Split' && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1.5 flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                  <SearchableCombobox
                    value={newRoomOutdoorMachine}
                    onChange={setNewRoomOutdoorMachine}
                    options={outdoorMachineOptions}
                    placeholder="Pilih / ketik Mesin Outdoor..."
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Qty</label>
                  <Input
                    value={newRoomOutdoorMachineQty}
                    onChange={e => setNewRoomOutdoorMachineQty(e.target.value)}
                    placeholder="Qty"
                    type="number"
                    min="1"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5 flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Evaporator</label>
                  <SearchableCombobox
                    value={newRoomEvaporator}
                    onChange={setNewRoomEvaporator}
                    options={evaporatorOptions}
                    placeholder="Pilih / ketik Evaporator..."
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Qty</label>
                  <Input
                    value={newRoomEvaporatorQty}
                    onChange={e => setNewRoomEvaporatorQty(e.target.value)}
                    placeholder="Qty"
                    type="number"
                    min="1"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tombol Tambah Ruangan (sesuai warna dan gaya di screenshot) */}
      <Button
        type="button"
        onClick={onAddRoom}
        className="w-full bg-[#9fcdd8] text-gray-900 hover:bg-[#8ebcc7] font-semibold text-xs py-2 rounded-md transition-colors"
      >
        Tambah Ruangan
      </Button>
    </div>
  );
};
