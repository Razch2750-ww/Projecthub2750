import { Point3D, CADRoom, CADPartition, CADDoor, CADEvaporator, HeatLoadParams, HeatLoadResult, CommodityProfile } from '../types';

export const COMMODITY_PROFILES: CommodityProfile[] = [
  {
    id: 'meat',
    name: 'Meat (Daging)',
    category: 'Frozen Storage',
    icon: '🥩',
    defaultRoomTemp: -18,
    defaultEntryTemp: 4,
    freezingPoint: -1.8,
    specificHeatAbove: 3.2,
    specificHeatBelow: 1.7,
    latentHeat: 233,
    defaultPullDownHours: 20,
    densityKgPerM3: 250,
    imageBg: 'from-rose-900/60 to-red-950/80',
    description: 'Penyimpanan beku daging sapi/ayam/kambing standar -18°C.'
  },
  {
    id: 'dairy',
    name: 'Dairy (Susu & Keju)',
    category: 'Chilled Storage',
    icon: '🧀',
    defaultRoomTemp: 2,
    defaultEntryTemp: 10,
    freezingPoint: -0.5,
    specificHeatAbove: 3.8,
    specificHeatBelow: 2.0,
    latentHeat: 250,
    defaultPullDownHours: 16,
    densityKgPerM3: 200,
    imageBg: 'from-amber-900/60 to-yellow-950/80',
    description: 'Penyimpanan dingin produk susu olahan, keju, dan mentega.'
  },
  {
    id: 'seafood',
    name: 'Seafood (Ikan & Udang)',
    category: 'Frozen Storage',
    icon: '🐟',
    defaultRoomTemp: -22,
    defaultEntryTemp: 0,
    freezingPoint: -2.2,
    specificHeatAbove: 3.6,
    specificHeatBelow: 1.9,
    latentHeat: 275,
    defaultPullDownHours: 18,
    densityKgPerM3: 280,
    imageBg: 'from-cyan-900/60 to-blue-950/80',
    description: 'Penyimpanan beku ikan laut, udang, dan hasil perikanan ekspor.'
  },
  {
    id: 'produce',
    name: 'Fruit & Veg (Buah & Sayur)',
    category: 'Chilled Storage',
    icon: '🥦',
    defaultRoomTemp: 4,
    defaultEntryTemp: 25,
    freezingPoint: -1.0,
    specificHeatAbove: 3.9,
    specificHeatBelow: 1.9,
    latentHeat: 300,
    defaultPullDownHours: 16,
    densityKgPerM3: 180,
    imageBg: 'from-emerald-900/60 to-green-950/80',
    description: 'Penyimpanan segar sayuran, buah-buahan, dan hortikultura.'
  },
  {
    id: 'blast_freezer',
    name: 'Blast Freezer (Pembekuan Cepat)',
    category: 'Blast Freezer',
    icon: '❄️',
    defaultRoomTemp: -35,
    defaultEntryTemp: 15,
    freezingPoint: -2.0,
    specificHeatAbove: 3.4,
    specificHeatBelow: 1.8,
    latentHeat: 250,
    defaultPullDownHours: 6,
    densityKgPerM3: 300,
    imageBg: 'from-purple-900/60 to-indigo-950/80',
    description: 'Pembekuan cepat kapasitas tinggi pull down 4 - 8 jam.'
  }
];

export interface Camera3D {
  yaw: number; // in degrees (azimuth: 0 to 360)
  pitch: number; // in degrees (elevation angle: 10 to 85, default 30-35)
  zoom: number; // scale factor
  panX: number; // pixel offset X
  panY: number; // pixel offset Y
  target?: Point3D; // 3D center of orbit (defaults to room center)
}

/**
 * Projects a 3D point (X, Y, Z in meters) to 2D Screen Canvas (u, v in pixels)
 * using true isometric/axonometric camera orbiting around target point.
 */
export function project3DTo2D(
  point: Point3D,
  camera: Camera3D,
  canvasWidth: number,
  canvasHeight: number
): { u: number; v: number; depth: number } {
  const yawRad = ((camera.yaw ?? 30) * Math.PI) / 180;
  const pitchRad = ((camera.pitch ?? 35) * Math.PI) / 180;

  // Target center of rotation (default: 2, 2, 1.5)
  const tx = camera.target?.x ?? 2.0;
  const ty = camera.target?.y ?? 2.0;
  const tz = camera.target?.z ?? 1.5;

  // 1. Center relative to target
  const dx = point.x - tx;
  const dy = point.y - ty;
  const dz = point.z - tz;

  // 2. Yaw rotation around Z (vertical axis)
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);
  const rx = dx * cosYaw - dy * sinYaw;
  const ry = dx * sinYaw + dy * cosYaw;
  const rz = dz;

  // 3. Pitch rotation (tilt angle from horizontal)
  // Looking down at angle pitchRad:
  // Screen horizontal is rx
  // Screen vertical (upwards): rz * cos(pitch) - ry * sin(pitch)
  // Screen depth (into screen): rz * sin(pitch) + ry * cos(pitch)
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);

  const screenX = rx;
  const screenY = rz * cosPitch - ry * sinPitch;
  const depth = rz * sinPitch + ry * cosPitch;

  // Base scale (pixels per meter)
  const baseMeterScale = 40;
  const scale = (camera.zoom || 1.0) * baseMeterScale;

  const centerX = canvasWidth / 2 + (camera.panX || 0);
  const centerY = canvasHeight / 2 + (camera.panY || 0);

  // Screen coordinates (v is inverted because canvas Y increases downwards)
  const u = centerX + screenX * scale;
  const v = centerY - screenY * scale;

  return { u, v, depth };
}

/**
 * Calculates Heat Load according to refrigeration engineering standards
 */
export function calculateHeatLoad(
  room: CADRoom,
  params: HeatLoadParams
): HeatLoadResult {
  const {
    roomTemp,
    entryTemp,
    freezingPoint,
    dailyLoadKg,
    pullDownHours,
    safetyPercent,
    usageType,
    ambientTemp
  } = params;

  // Find commodity profile
  const profile = COMMODITY_PROFILES.find(p => p.id === params.commodityId) || COMMODITY_PROFILES[0];

  // 1. Calculate Room Dimensions & Envelope Area
  const L = room.length || 4.0;
  const W = room.width || 4.0;
  const H = room.height || 3.0;
  const floorArea = L * W;
  const wallArea = 2 * (L + W) * H;
  const roofArea = floorArea;
  const totalEnvelopeArea = wallArea + roofArea + (room.floorType !== 'tanpa lantai' ? floorArea : 0);
  const volumeM3 = L * W * H;

  // 2. Transmission Heat Load (Q_transmission)
  // U-Value based on panel thickness (W/m²·K)
  const thicknessMM = room.thickness || 100;
  const kThermal = room.material === 'PIR' ? 0.021 : 0.024; // W/m·K
  const uValue = kThermal / (thicknessMM / 1000); // W/m²·K

  const deltaT = Math.max(0, ambientTemp - roomTemp);
  const transmissionWatts = totalEnvelopeArea * uValue * deltaT;
  const transmissionLoadKW = transmissionWatts / 1000;

  // 3. Product Heat Load (Q_product)
  // Sensible heat above freezing: Q1 = m * c_above * (T_entry - T_freeze)
  // Latent heat of freezing: Q2 = m * h_latent (only if freezing occurs)
  // Sensible heat below freezing: Q3 = m * c_below * (T_freeze - T_room)
  const m = dailyLoadKg;
  let totalProductJoules = 0;

  if (roomTemp < freezingPoint && entryTemp > freezingPoint) {
    const q1 = m * profile.specificHeatAbove * (entryTemp - freezingPoint) * 1000;
    const q2 = m * profile.latentHeat * 1000;
    const q3 = m * profile.specificHeatBelow * (freezingPoint - roomTemp) * 1000;
    totalProductJoules = q1 + q2 + q3;
  } else if (roomTemp >= freezingPoint) {
    const q1 = m * profile.specificHeatAbove * Math.max(0, entryTemp - roomTemp) * 1000;
    totalProductJoules = q1;
  } else {
    const q3 = m * profile.specificHeatBelow * Math.max(0, entryTemp - roomTemp) * 1000;
    totalProductJoules = q3;
  }

  const pullDownSeconds = Math.max(1, pullDownHours) * 3600;
  const productWatts = totalProductJoules / pullDownSeconds;
  const totalProductLoadKW = productWatts / 1000;

  const productSensibleLoadKW = totalProductLoadKW * 0.45;
  const productLatentLoadKW = totalProductLoadKW * 0.45;
  const productSubcoolLoadKW = totalProductLoadKW * 0.10;

  // 4. Infiltration & Internal Load (Air changes, lighting, fan motors, people)
  const usageMultiplier = usageType === 'Heavy Usage' ? 1.4 : usageType === 'Medium Usage' ? 1.15 : usageType === 'Long Storage' ? 0.85 : 1.0;
  const airChangesPerDay = Math.max(5, 50 / Math.pow(volumeM3, 0.35)) * usageMultiplier;
  const infiltrationWatts = (volumeM3 * airChangesPerDay * deltaT * 2.5) / 24;
  const infiltrationLoadKW = infiltrationWatts / 1000;

  // Internal lighting (8 W/m²) + fan motors (approx 15% of transmission)
  const internalWatts = floorArea * 8 + transmissionWatts * 0.18;
  const internalLoadKW = internalWatts / 1000;

  // 5. Total and Sizing
  const subtotalKW = transmissionLoadKW + totalProductLoadKW + infiltrationLoadKW + internalLoadKW;
  const safetyFactor = 1 + (safetyPercent / 100);
  const totalHeatLoadKW = subtotalKW * safetyFactor;
  const totalHeatLoadBTU = totalHeatLoadKW * 3412.142;

  // Compressor HP estimation (assuming typical COP 1.8 - 2.5 based on room temp)
  const cop = roomTemp <= -18 ? 1.45 : roomTemp <= 0 ? 1.95 : 2.5;
  const electricalPowerKW = totalHeatLoadKW / cop;
  const requiredHP = Number((electricalPowerKW / 0.7457).toFixed(2));

  // Recommendation matching
  let condenserModel = `Bitzer Semi-Hermetic ${Math.ceil(requiredHP)} HP`;
  let condenserBrand = 'Bitzer / Copeland';
  let evaporatorModel = `Guntner / Muller High-Airflow ${totalHeatLoadKW.toFixed(1)} kW`;
  let evaporatorBrand = 'Guntner / Muller';

  if (requiredHP <= 2) {
    condenserModel = `Copeland Scroll ZB15 (${requiredHP} HP)`;
    evaporatorModel = `Eden DSR-020 (${totalHeatLoadKW.toFixed(1)} kW)`;
  } else if (requiredHP <= 5) {
    condenserModel = `Bitzer 2EES-3Y (${requiredHP} HP)`;
    evaporatorModel = `Guntner S-GHN 035 (${totalHeatLoadKW.toFixed(1)} kW)`;
  } else if (requiredHP <= 10) {
    condenserModel = `Bitzer 4CES-6Y (${requiredHP} HP)`;
    evaporatorModel = `Kueba Dual-Discharge (${totalHeatLoadKW.toFixed(1)} kW)`;
  } else {
    condenserModel = `Bitzer 6GE-34Y (${requiredHP} HP Heavy)`;
    evaporatorModel = `Guntner S-GDF Industrial (${totalHeatLoadKW.toFixed(1)} kW)`;
  }

  return {
    transmissionLoadKW: Number(transmissionLoadKW.toFixed(2)),
    productSensibleLoadKW: Number(productSensibleLoadKW.toFixed(2)),
    productLatentLoadKW: Number(productLatentLoadKW.toFixed(2)),
    productSubcoolLoadKW: Number(productSubcoolLoadKW.toFixed(2)),
    totalProductLoadKW: Number(totalProductLoadKW.toFixed(2)),
    internalLoadKW: Number(internalLoadKW.toFixed(2)),
    infiltrationLoadKW: Number(infiltrationLoadKW.toFixed(2)),
    subtotalKW: Number(subtotalKW.toFixed(2)),
    safetyMarginKW: Number((totalHeatLoadKW - subtotalKW).toFixed(2)),
    totalHeatLoadKW: Number(totalHeatLoadKW.toFixed(2)),
    totalHeatLoadBTU: Math.round(totalHeatLoadBTU),
    requiredHP,
    recommendedMachinery: {
      condenserModel,
      condenserBrand,
      evaporatorModel,
      evaporatorBrand,
      capacityKW: Number(totalHeatLoadKW.toFixed(2))
    }
  };
}
