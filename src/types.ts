export type TaskStatus = 'Baru' | 'Bekerja' | 'Butuh Revisi' | 'Revisi Selesai' | 'Lanjut Next Step' | 'Selesai' | 'Approved' | 'Signed';

export interface HistoryFile {
  id: string;
  name: string;
  type: string;
  url: string; // data URL/base64
}

export interface HistoryEntry {
  id: string;
  status: TaskStatus;
  note: string;
  timestamp: string; // ISO string
  files?: HistoryFile[];
}

export interface Task {
  id: string;
  projectId: string;
  locationId?: string;
  title: string;
  status: TaskStatus;
  history: HistoryEntry[];
  isAdditional: boolean;
  createdAt: string;
}

export type RoomType = string;
export type PanelType = 'PU' | 'PIR' | '';

export interface RoomDetails {
  id: string;
  type: RoomType;
  panelThickness?: string;
  panelType?: PanelType;
  floorType?: string;
  outdoorMachine?: string;
  evaporator?: string;
  machineType?: string;
  mountingType?: string;
  machineCapacity?: string;
  doorType?: string;
  doorWidth?: string;
  doorHeight?: string;
  doorQty?: string;
  length?: string;
  width?: string;
  height?: string;
  note?: string;
  x?: number;
  y?: number;
}

export type ProjectStatus = 'Tahap 1: New' | 'Tahap 2: Design and Revision' | 'Tahap 3: Design Approved' | 'Tahap 4: Pre Construction' | 'Tahap 5: Under Construction' | 'Tahap 6: Completed' | 'Paused' | 'Cancelled';
export const PROJECT_STATUSES: ProjectStatus[] = ['Tahap 1: New', 'Tahap 2: Design and Revision', 'Tahap 3: Design Approved', 'Tahap 4: Pre Construction', 'Tahap 5: Under Construction', 'Tahap 6: Completed', 'Paused', 'Cancelled'];

export interface ProjectLocation {
  id: string;
  name: string;
  address: string;
  rooms?: RoomDetails[];
}

export interface Project {
  id: string;
  ptName: string;
  status?: ProjectStatus;
  address: string; // Keep for backwards compatibility
  entryDate: string; // ISO string like YYYY-MM-DD
  rooms?: RoomDetails[]; // Keep for backwards compatibility
  locations?: ProjectLocation[];
  roomTypes?: RoomType[];
  panelThickness?: string;
  panelType?: PanelType;
  floorType?: string;
  outdoorMachine?: string;
  evaporator?: string;
  createdAt: string;
}

