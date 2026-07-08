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
  assigneeId?: string; // Team member ID assigned to this task
  assigneeRole?: 'Drafting' | 'Review'; // Task assignment category
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
  temperature?: string;
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

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  url: string; // base64 / data URL
  category: 'Drawings' | 'Specs' | 'Correspondence';
  uploadedAt: string; // ISO string
  uploadedBy: string; // user email
}

export interface ProjectActivity {
  id: string;
  type: 'comment' | 'update';
  user: string;
  content: string;
  timestamp: string; // ISO string
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
  documents?: ProjectDocument[];
  activities?: ProjectActivity[];
  description?: string; // Optional project description/narrative
  isArchived?: boolean; // Archiving state
  completedAt?: string; // ISO string of project completion timestamp
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'Drafting' | 'Review' | 'Both';
  availability: 'Available' | 'Busy' | 'On Leave';
  email: string;
  systemRole?: 'admin' | 'drafter' | 'reviewer' | 'guest';
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'Meeting' | 'Survey';
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  location?: string;
  notes?: string;
  isRecurring: boolean;
  recurrence?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval?: number;
    count?: number;
    until?: string; // YYYY-MM-DD
    weekDays?: number[]; // Days of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  };
  gcalEventId?: string; // Google Calendar event ID if synced
  createdAt: string;
}

