export type CADMode = 'dims' | 'part' | 'join' | 'door' | 'evap' | 'heatload';

export type CADViewMode = 'workspace' | 'layout';

export type StartWithType = 'template' | 'empty';

export type Direction = 'N' | 'E' | 'S' | 'W';

export type PanelThickness = 50 | 75 | 100 | 125 | 150 | 200;

export type PanelMaterial = 'PU' | 'PIR';

export type FloorType = 'tanpa lantai' | 'insulation panel' | 'concrete';

export type DoorType = 'Swing Door' | 'Sliding Door' | 'Clean Room Swing Door' | 'Clean Room Sliding Door' | 'Sectional Door';

export type DoorOpeningDirection = 'Left' | 'Right' | 'Outward' | 'Inward';

export type PVCStripType = 'Clear Standard' | 'Polar Low-Temp (Amber)' | 'Ribbed Heavy-Duty';

export type EvaporatorType = 'Standard' | 'Dual Discharge' | 'Slim';

export type StorageUsageType = 'Light' | 'Medium Usage' | 'Heavy Usage' | 'Long Storage';

export interface Point3D {
  x: number; // in meters (X: East / West)
  y: number; // in meters (Y: North / South)
  z: number; // in meters (Z: Height)
}

export interface CADVertex {
  id: string;
  name: string;
  x: number; // meters
  y: number; // meters
}

export interface CADWallSegment {
  id: string;
  name: string;
  startVertexId: string;
  endVertexId: string;
  length: number; // meters
  direction: Direction;
  isAdjoining?: boolean;
}

export interface CADDoor {
  id: string;
  name: string;
  wallId: string;
  wallName?: string; // 'Bottom' | 'Right' | 'Top' | 'Left'
  type: DoorType;
  width: number; // meters (e.g. 1.2, 1.5, 2.0, 2.5, 3.0)
  height: number; // meters (e.g. 2.1, 2.4, 3.0, 3.5)
  margin: number; // distance from wall start in meters
  thickness: PanelThickness;
  openingSide: 'Left' | 'Right';
  openDirection?: DoorOpeningDirection;
  hasAirCurtain?: boolean;
  hasPlasticCurtain?: boolean;
  plasticCurtainType?: PVCStripType;
  airCurtainSpeed?: 'Standard' | 'High Velocity';
  remark?: string;
}

export interface CADEvaporator {
  id: string;
  name: string;
  type: EvaporatorType;
  brand?: string;
  model?: string;
  width: number; // meters (Panjang casing)
  length: number; // meters (Kedalaman casing)
  height: number; // meters (Tinggi casing)
  fanCount?: number; // Jumlah fan (1, 2, 3, 4)
  fanDiameter?: number; // Diameter fan dalam mm (e.g. 300, 350)
  // Placement offsets in meters
  posX: number; // X position inside room
  posY: number; // Y position inside room
  posZ: number; // Hanging height from floor
  distanceFromRight?: number;
  distanceFromLeft?: number;
  distanceFromBack?: number;
  distanceFromFront?: number;
  rotation: 0 | 90 | 180 | 270;
  capacityKW?: number;
}

export interface CADPartition {
  id: string;
  name: string;
  parentRoomId: string;
  wallAnchor: 'Bottom' | 'Right' | 'Top' | 'Left' | string;
  margin: number; // meters from wall start
  side: 'Left' | 'Right';
  length: number; // meters
  height: number; // meters
  thickness: PanelThickness;
  qty: number;
}

export interface CommodityProfile {
  id: string;
  name: string;
  category: 'Chilled Storage' | 'Frozen Storage' | 'Blast Freezer' | 'Blast Chiller' | 'Custom';
  icon: string;
  defaultRoomTemp: number; // °C
  defaultEntryTemp: number; // °C
  freezingPoint: number; // °C
  specificHeatAbove: number; // kJ/kg·K
  specificHeatBelow: number; // kJ/kg·K
  latentHeat: number; // kJ/kg
  defaultPullDownHours: number; // hours
  densityKgPerM3: number;
  imageBg: string;
  description: string;
}

export interface HeatLoadParams {
  commodityId: string;
  roomTemp: number; // °C
  entryTemp: number; // °C
  freezingPoint: number; // °C
  dailyLoadKg: number; // kg/day
  pullDownHours: number; // hours
  safetyPercent: number; // e.g. 20%
  usageType: StorageUsageType;
  ambientTemp: number; // °C
  ambientRH: number; // %
}

export interface HeatLoadResult {
  transmissionLoadKW: number;
  productSensibleLoadKW: number;
  productLatentLoadKW: number;
  productSubcoolLoadKW: number;
  totalProductLoadKW: number;
  internalLoadKW: number;
  infiltrationLoadKW: number;
  subtotalKW: number;
  safetyMarginKW: number;
  totalHeatLoadKW: number;
  totalHeatLoadBTU: number;
  requiredHP: number;
  recommendedMachinery: {
    condenserModel: string;
    condenserBrand: string;
    evaporatorModel: string;
    evaporatorBrand: string;
    capacityKW: number;
  };
}

export interface CADRoom {
  id: string;
  name: string;
  // Dimensions for rectangular mode
  length: number; // meters (along X)
  width: number; // meters (along Y)
  height: number; // meters (along Z)
  thickness: PanelThickness;
  material: PanelMaterial;
  floorType: FloorType;
  
  // Custom polygon vertices (for empty/draw mode or L-shaped)
  vertices: CADVertex[];
  wallSegments: CADWallSegment[];
  isCustomPolygon: boolean;
  
  // Relative placement offset if multi-room/adjoining
  offsetX: number; // meters
  offsetY: number; // meters
  
  // Sub-components
  doors: CADDoor[];
  evaporators: CADEvaporator[];
  partitions: CADPartition[];
  
  // Heat load settings
  heatLoadParams: HeatLoadParams;
  heatLoadResult?: HeatLoadResult;
}

export interface CADSketch {
  id: string;
  name: string;
  ambientTemp: number; // °C
  ambientRH: number; // %
  rooms: CADRoom[];
  activeRoomId: string;
  activeMode: CADMode;
  createdAt: string;
}

export interface CADProject {
  id: string;
  name: string;
  sketches: CADSketch[];
  activeSketchId: string;
  createdAt: string;
  updatedAt: string;
}
