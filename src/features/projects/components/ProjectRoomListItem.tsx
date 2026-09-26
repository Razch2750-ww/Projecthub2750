import React from 'react';
import { Trash2, Split, Plus, DoorOpen } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SearchableCombobox } from '../../../components/ui/SearchableCombobox';
import { PanelType, RoomDetails, RoomDoorConfig } from '../../../types';

interface ProjectRoomListItemProps {
  room: RoomDetails;
  index: number;
  locationId: string;
  updateRoomDetail: (locId: string, roomIdx: number, field: string, val: any) => void;
  onDeleteRoom: (locId: string, roomId: string) => void;
  addDoorToRoom: (locId: string, roomIdx: number) => void;
  updateRoomDoor: (locId: string, roomIdx: number, doorIdx: number, field: keyof RoomDoorConfig, val: string) => void;
  removeRoomDoor: (locId: string, roomIdx: number, doorIdx: number) => void;
  addPartitionToRoom: (locId: string, roomIdx: number) => void;
  updateRoomPartition: (locId: string, roomIdx: number, pIdx: number, field: string, val: any) => void;
  removeRoomPartition: (locId: string, roomIdx: number, pIdx: number) => void;
  outdoorMachineOptions: { id: string; label: string; subLabel?: string }[];
  evaporatorOptions: { id: string; label: string; subLabel?: string }[];
}

const normalizeThickness = (thickness: string | undefined) => {
  if (!thickness) return '100mm';
  const t = thickness.toLowerCase().replace(/\s+/g, '');
  if (t === '50mm' || t === '50') return '50mm';
  if (t === '75mm' || t === '75') return '75mm';
  if (t === '100mm' || t === '100') return '100mm';
  if (t === '125mm' || t === '125') return '125mm';
  if (t === '150mm' || t === '150') return '150mm';
  return t;
};

const normalizePanelType = (type: string | undefined) => {
  if (!type) return 'PU';
  const t = type.toUpperCase();
  if (t === 'PIR') return 'PIR';
  if (t === 'EPS') return 'EPS';
  return 'PU';
};

const normalizeFloorType = (type: string | undefined) => {
  if (!type) return 'tanpa lantai';
  const t = type.toLowerCase();
  if (t === 'insul' || t === 'insulation panel') return 'insulation panel';
  if (t === 'concrete' || t === 'beton' || t === 'cor') return 'concrete';
  return 'tanpa lantai';
};

export const ProjectRoomListItem: React.FC<ProjectRoomListItemProps> = ({
  room,
  index,
  locationId,
  updateRoomDetail,
  onDeleteRoom,
  addDoorToRoom,
  updateRoomDoor,
  removeRoomDoor,
  addPartitionToRoom,
  updateRoomPartition,
  removeRoomPartition,
  outdoorMachineOptions,
  evaporatorOptions
}) => {
  // Resolve doors array: use room.doors if present, else synthesize from legacy fields
  const doors: RoomDoorConfig[] = (room.doors && room.doors.length > 0)
    ? room.doors
    : [{
        id: 'legacy-door-0',
        type: room.doorType || '',
        width: room.doorWidth || '',
        height: room.doorHeight || '',
        qty: room.doorQty || '1'
      }];

  const isMesinOnly = room.itemCategory === 'mesin';
  const isDindingOnly = room.itemCategory === 'dinding';

  return (
    <div className="bg-surface-hover/30 p-3.5 rounded-xl border border-divider space-y-3.5 transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-divider">
        <div className="flex items-center gap-2">
          <Input
            value={room.name}
            onChange={e => updateRoomDetail(locationId, index, 'name', e.target.value)}
            className="font-bold text-xs h-8 bg-surface px-2 w-48 text-primary"
            placeholder="Nama Item..."
          />
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-surface border border-divider text-muted uppercase tracking-wider">
            {room.itemCategory === 'mesin' ? '⚙️ Mesin' : room.itemCategory === 'dinding' ? '🧱 Dinding' : '🏠 Ruangan'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
          title="Hapus Item"
          onClick={() => onDeleteRoom(locationId, room.id)}
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Dimensi Dinding (jika bukan mesin saja) */}
      {!isMesinOnly && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Panjang (mm)</label>
            <Input
              type="number"
              value={room.length || ''}
              onChange={e => updateRoomDetail(locationId, index, 'length', e.target.value)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Lebar (mm)</label>
            <Input
              type="number"
              value={room.width || ''}
              onChange={e => updateRoomDetail(locationId, index, 'width', e.target.value)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Tinggi (mm)</label>
            <Input
              type="number"
              value={room.height || ''}
              onChange={e => updateRoomDetail(locationId, index, 'height', e.target.value)}
              placeholder="0"
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Jenis Lantai (hanya jika Ruangan) */}
      {!isMesinOnly && !isDindingOnly && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-primary">Jenis Lantai</label>
          <select
            value={normalizeFloorType(room.floorType)}
            onChange={e => updateRoomDetail(locationId, index, 'floorType', e.target.value)}
            className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
          >
            <option value="tanpa lantai">Tanpa Lantai</option>
            <option value="insulation panel">Insulation Panel (Panel Lantai)</option>
            <option value="concrete">Concrete (Cor Beton)</option>
          </select>
        </div>
      )}

      {/* Panel Info (jika bukan mesin saja) */}
      {!isMesinOnly && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Tebal Panel</label>
            <select
              value={normalizeThickness(room.panelThickness)}
              onChange={e => updateRoomDetail(locationId, index, 'panelThickness', e.target.value)}
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
            <label className="text-xs font-medium text-primary">Jenis Panel</label>
            <select
              value={normalizePanelType(room.panelType)}
              onChange={e => updateRoomDetail(locationId, index, 'panelType', e.target.value as PanelType)}
              className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
            >
              <option value="PU">PU (Polyurethane)</option>
              <option value="PIR">PIR (Polyisocyanurate)</option>
              <option value="EPS">EPS (Expanded Polystyrene)</option>
            </select>
          </div>
        </div>
      )}

      {/* Mesin Pendingin (jika bukan dinding saja) */}
      {!isDindingOnly && (
        <div className="space-y-2.5 pt-2 border-t border-divider">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-primary">Jenis Mesin</label>
              <select
                value={room.machineType || ''}
                onChange={e => updateRoomDetail(locationId, index, 'machineType', e.target.value)}
                className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
              >
                <option value="">Pilih Jenis Mesin</option>
                <option value="Split">Split</option>
                <option value="Plug-In">Plug-In</option>
              </select>
            </div>
            {room.machineType === 'Plug-In' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-primary">Mounting Type</label>
                <select
                  value={room.mountingType || 'Roof Mount'}
                  onChange={e => updateRoomDetail(locationId, index, 'mountingType', e.target.value)}
                  className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"
                >
                  <option value="Roof Mount">Roof Mount</option>
                  <option value="Wall Mount">Wall Mount</option>
                </select>
              </div>
            )}
          </div>

          {room.machineType === 'Plug-In' && (
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                <Input
                  value={room.machineCapacity || ''}
                  onChange={e => updateRoomDetail(locationId, index, 'machineCapacity', e.target.value)}
                  placeholder="Contoh: 1.5 HP"
                  className="h-8 text-xs"
                />
              </div>
              <div className="w-20 space-y-1.5">
                <label className="text-xs font-medium text-primary">Qty</label>
                <Input
                  value={room.machineCapacityQty || ''}
                  onChange={e => updateRoomDetail(locationId, index, 'machineCapacityQty', e.target.value)}
                  placeholder="Qty"
                  type="number"
                  min="1"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {room.machineType === 'Split' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                  <SearchableCombobox
                    value={room.outdoorMachine || ''}
                    onChange={val => updateRoomDetail(locationId, index, 'outdoorMachine', val)}
                    options={outdoorMachineOptions}
                    placeholder="Pilih / ketik Mesin Outdoor..."
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Qty</label>
                  <Input
                    value={room.outdoorMachineQty || ''}
                    onChange={e => updateRoomDetail(locationId, index, 'outdoorMachineQty', e.target.value)}
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
                    value={room.evaporator || ''}
                    onChange={val => updateRoomDetail(locationId, index, 'evaporator', val)}
                    options={evaporatorOptions}
                    placeholder="Pilih / ketik Evaporator..."
                  />
                </div>
                <div className="w-20 space-y-1.5">
                  <label className="text-xs font-medium text-primary">Qty</label>
                  <Input
                    value={room.evaporatorQty || ''}
                    onChange={e => updateRoomDetail(locationId, index, 'evaporatorQty', e.target.value)}
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

      {/* 🚪 Bagian Pintu (Bisa memiliki lebih dari 1 jenis pintu) */}
      {!isMesinOnly && (
        <div className="space-y-2 pt-2 border-t border-divider">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-accent-600)] flex items-center gap-1.5">
              <DoorOpen size={14} />
              <span>Pintu {doors.length > 1 ? `(${doors.length} Jenis Pintu)` : ''}</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] flex items-center gap-1 text-[var(--color-accent-600)] border-[var(--color-accent-500)]/40 hover:bg-[var(--color-accent-500)]/10 font-medium"
              onClick={() => addDoorToRoom(locationId, index)}
            >
              <Plus size={11} /> Tambah Jenis Pintu
            </Button>
          </div>

          <div className="space-y-2">
            {doors.map((door, dIdx) => (
              <div key={door.id || dIdx} className="p-2.5 bg-surface rounded-lg border border-divider/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary text-[11px]">
                    Pintu {doors.length > 1 ? `#${dIdx + 1}` : ''}
                  </span>
                  {doors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoomDoor(locationId, index, dIdx)}
                      className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                      title="Hapus jenis pintu ini"
                    >
                      <Trash2 size={11} />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Jenis Pintu</label>
                    <select
                      value={door.type || ''}
                      onChange={e => updateRoomDoor(locationId, index, dIdx, 'type', e.target.value)}
                      className="flex h-7 w-full rounded-md border border-divider bg-surface px-2 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent-600)]"
                    >
                      <option value="">Jenis Pintu</option>
                      <option value="Swing Door">Swing Door</option>
                      <option value="Sliding Door">Sliding Door</option>
                      <option value="Clean Room Swing Door">Clean Room Swing Door</option>
                      <option value="Clean Room Sliding Door">Clean Room Sliding Door</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Lebar (mm)</label>
                    <Input
                      type="number"
                      value={door.width || ''}
                      onChange={e => updateRoomDoor(locationId, index, dIdx, 'width', e.target.value)}
                      placeholder="Lebar"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Tinggi (mm)</label>
                    <Input
                      type="number"
                      value={door.height || ''}
                      onChange={e => updateRoomDoor(locationId, index, dIdx, 'height', e.target.value)}
                      placeholder="Tinggi"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted">Qty</label>
                    <Input
                      type="number"
                      value={door.qty || ''}
                      onChange={e => updateRoomDoor(locationId, index, dIdx, 'qty', e.target.value)}
                      placeholder="Qty"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sekatan Dinding (Partisi) */}
      {!isMesinOnly && (
        <div className="space-y-2 border-t border-divider pt-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-accent-600)] flex items-center gap-1.5">
              <Split size={14} />
              <span>Sekatan Dinding (Partisi)</span>
              {room.partitions && room.partitions.length > 0 && (
                <span className="text-[10px] bg-[var(--color-accent-600)]/15 text-[var(--color-accent-600)] px-1.5 py-0.5 rounded-full font-bold">
                  {room.partitions.length}
                </span>
              )}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] text-[var(--color-accent-600)] hover:bg-[var(--color-accent-600)]/10 px-2 py-0"
              onClick={() => addPartitionToRoom(locationId, index)}
            >
              <Plus size={12} className="mr-1" /> Tambah Sekatan
            </Button>
          </div>

          {room.partitions && room.partitions.length > 0 ? (
            <div className="space-y-2 bg-surface p-2.5 rounded-lg border border-divider">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-secondary px-1">
                <span className="col-span-4">Nama Sekat</span>
                <span className="col-span-3">Panjang (mm)</span>
                <span className="col-span-3">Tinggi (mm)</span>
                <span className="col-span-2 text-right">Aksi</span>
              </div>
              {room.partitions.map((part, pIdx) => (
                <div key={part.id || pIdx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    value={part.name}
                    onChange={e => updateRoomPartition(locationId, index, pIdx, 'name', e.target.value)}
                    className="col-span-4 h-7 text-xs"
                    placeholder="Nama..."
                  />
                  <Input
                    type="number"
                    value={part.length}
                    onChange={e => updateRoomPartition(locationId, index, pIdx, 'length', e.target.value)}
                    className="col-span-3 h-7 text-xs"
                    placeholder="Panjang"
                  />
                  <Input
                    type="number"
                    value={part.height}
                    onChange={e => updateRoomPartition(locationId, index, pIdx, 'height', e.target.value)}
                    className="col-span-3 h-7 text-xs"
                    placeholder="Tinggi"
                  />
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                      onClick={() => removeRoomPartition(locationId, index, pIdx)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted italic">Belum ada sekatan pada item ini.</p>
          )}
        </div>
      )}
    </div>
  );
};
