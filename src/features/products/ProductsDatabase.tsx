import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'sonner';
import { Database, Plus, Search, Trash2, Edit2, Package, Save, X, ExternalLink, DownloadCloud, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface Product {
  id: string;
  type: string;
  brand: string;
  model: string;
  specifications: string;
  pdfUrl?: string;
  machineType?: string;
  pluginType?: string;
  dimensions?: string;
  evapLength?: number;
  evapWidth?: number;
  evapHeight?: number;
  evapFanCount?: number;
  evapFanDiameter?: number;
  // Detail Mesin Split
  powerSupply?: string;
  evapTempRange?: string;
  ambientTemp?: string;
  refrigerant?: string;
  pressureController?: string;
  compressorPower?: string;
  compressorModel?: string;
  fanQty?: number;
  fanPowerSupply?: string;
  fanPowerW?: number;
  pipeSuction?: string;
  pipeLiquid?: string;
  installDimension?: string;
  capMinus40?: number;
  capMinus35?: number;
  capMinus30?: number;
  capMinus25?: number;
  capMinus20?: number;
  capMinus15?: number;
  capMinus10?: number;
  capMinus5?: number;
  cap00?: number;
  capPlus5?: number;
}

interface DisplayDetails {
  dimensions: string;
  fan: string;
  capacity: string;
  electrical: string;
  refrigerant: string;
}

export function getProductDisplayDetails(p: Product): DisplayDetails {
  let dimensions = p.dimensions || '-';
  if (p.type === 'Evaporator' && p.evapLength) {
    dimensions = `${p.evapLength} × ${p.evapWidth} × ${p.evapHeight}`;
  } else if (p.installDimension) {
    dimensions = p.installDimension;
  }

  let fan = '-';
  if (p.type === 'Evaporator') {
    if (p.evapFanCount) {
      fan = `${p.evapFanCount} × Ø${p.evapFanDiameter || 0} mm`;
    }
  } else {
    if (p.fanQty) {
      fan = `${p.fanQty} Fan` + (p.fanPowerW ? ` (${p.fanPowerW}W)` : '');
    }
  }

  let capacity = '-';
  let electrical = p.powerSupply || '-';
  let refrigerant = p.refrigerant || '-';

  if (p.specifications) {
    const parts = p.specifications.split('|').map(s => s.trim());
    
    // For Evaporators, let's pull "Chilling", "Freezing", "Defrost", etc.
    const chillingPart = parts.find(part => part.toLowerCase().includes('chilling'));
    const freezingPart = parts.find(part => part.toLowerCase().includes('freezing'));
    const defrostPart = parts.find(part => part.toLowerCase().includes('defrost'));
    const sc2Part = parts.find(part => part.toLowerCase().includes('sc2') || part.toLowerCase().includes('sc3') || part.toLowerCase().includes('cap'));
    
    if (chillingPart || freezingPart) {
      const caps: string[] = [];
      if (chillingPart) caps.push(chillingPart.replace(/Chilling\s*\(.*?\):?\s*/i, 'Chilling: '));
      if (freezingPart) caps.push(freezingPart.replace(/Freezing\s*\(.*?\):?\s*/i, 'Freezing: '));
      capacity = caps.join(' | ');
    } else if (sc2Part) {
      capacity = sc2Part;
    } else {
      capacity = parts[0] || '-';
    }

    if (defrostPart) {
      electrical = defrostPart;
    }
    
    if (refrigerant === '-') {
      const rMatch = p.specifications.match(/R404A|R134a|R22|R407C|R507/i);
      if (rMatch) {
        refrigerant = rMatch[0];
      }
    }
  }

  if (p.type === 'Mesin (Condensing Unit)') {
    const compDetails: string[] = [];
    if (p.compressorPower) compDetails.push(p.compressorPower);
    if (p.compressorModel) compDetails.push(p.compressorModel);
    capacity = compDetails.join(' - ') || capacity;
  }

  return {
    dimensions,
    fan,
    capacity,
    electrical,
    refrigerant
  };
}

export const ProductsDatabase: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  
  const [sortField, setSortField] = useState<'type' | 'brand' | 'model' | 'dimensions' | 'fan' | 'capacity' | 'electrical' | 'refrigerant' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form state
  const [formData, setFormData] = useState({
    type: 'Mesin (Condensing Unit)',
    brand: '',
    model: '',
    specifications: '',
    pdfUrl: '',
    machineType: '',
    pluginType: '',
    dimensions: '',
    evapLength: 0,
    evapWidth: 0,
    evapHeight: 0,
    evapFanCount: 1,
    evapFanDiameter: 0,
    // Detail Mesin Split
    powerSupply: '',
    evapTempRange: '',
    ambientTemp: '',
    refrigerant: '',
    pressureController: '',
    compressorPower: '',
    compressorModel: '',
    fanQty: 1,
    fanPowerSupply: '',
    fanPowerW: 0,
    pipeSuction: '',
    pipeLiquid: '',
    installDimension: '',
    capMinus40: 0,
    capMinus35: 0,
    capMinus30: 0,
    capMinus25: 0,
    capMinus20: 0,
    capMinus15: 0,
    capMinus10: 0,
    capMinus5: 0,
    cap00: 0,
    capPlus5: 0
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(d => {
        prods.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), formData);
        toast.success("Produk berhasil diperbarui!");
      } else {
        await addDoc(collection(db, 'products'), formData);
        toast.success("Produk berhasil ditambahkan!");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving product:", err);
      toast.error("Gagal menyimpan produk.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success("Produk berhasil dihapus!");
      } catch (err) {
        console.error("Error deleting product:", err);
        toast.error("Gagal menghapus produk.");
      }
    }
  };

  const openEdit = (p: Product) => {
    setFormData({
      type: p.type,
      brand: p.brand,
      model: p.model,
      specifications: p.specifications || '',
      pdfUrl: p.pdfUrl || '',
      machineType: p.machineType || '',
      pluginType: p.pluginType || '',
      dimensions: p.dimensions || '',
      evapLength: p.evapLength || 0,
      evapWidth: p.evapWidth || 0,
      evapHeight: p.evapHeight || 0,
      evapFanCount: p.evapFanCount || 1,
      evapFanDiameter: p.evapFanDiameter || 0,
      powerSupply: p.powerSupply || '',
      evapTempRange: p.evapTempRange || '',
      ambientTemp: p.ambientTemp || '',
      refrigerant: p.refrigerant || '',
      pressureController: p.pressureController || '',
      compressorPower: p.compressorPower || '',
      compressorModel: p.compressorModel || '',
      fanQty: p.fanQty || 1,
      fanPowerSupply: p.fanPowerSupply || '',
      fanPowerW: p.fanPowerW || 0,
      pipeSuction: p.pipeSuction || '',
      pipeLiquid: p.pipeLiquid || '',
      installDimension: p.installDimension || '',
      capMinus40: p.capMinus40 || 0,
      capMinus35: p.capMinus35 || 0,
      capMinus30: p.capMinus30 || 0,
      capMinus25: p.capMinus25 || 0,
      capMinus20: p.capMinus20 || 0,
      capMinus15: p.capMinus15 || 0,
      capMinus10: p.capMinus10 || 0,
      capMinus5: p.capMinus5 || 0,
      cap00: p.cap00 || 0,
      capPlus5: p.capPlus5 || 0
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const seedGlenwinEvaporators = async () => {
    const glenwinData = [
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD15-301E", specifications: "Chilling (0~8°C): 3.5KW | Freezing (-18°C): 2.3KW | Defrost: 1700W | Air Flow: 1200 m3/h | Motor: 65W x 1", evapLength: 660, evapWidth: 430, evapHeight: 480, evapFanCount: 1, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-SD30-401F", specifications: "Chilling (0~8°C): 5.6KW | Freezing (-18°C): 4KW | Defrost: 1700W | Air Flow: 3500 m3/h | Motor: 205W x 1", evapLength: 880, evapWidth: 550, evapHeight: 615, evapFanCount: 1, evapFanDiameter: 400 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-SD40-401F", specifications: "Chilling (0~8°C): 6KW | Freezing (-18°C): 5KW | Defrost: 2620W | Air Flow: 3500 m3/h | Motor: 205W x 1", evapLength: 880, evapWidth: 550, evapHeight: 615, evapFanCount: 1, evapFanDiameter: 400 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-SD60-451F", specifications: "Chilling (0~8°C): 13KW | Freezing (-18°C): 8KW | Defrost: 4000W | Air Flow: 6000 m3/h | Motor: 460W x 1", evapLength: 1120, evapWidth: 660, evapHeight: 675, evapFanCount: 1, evapFanDiameter: 450 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-SD80-501F", specifications: "Chilling (0~8°C): 16KW | Freezing (-18°C): 10KW | Defrost: 4900W | Air Flow: 8000 m3/h | Motor: 750W x 1", evapLength: 1320, evapWidth: 600, evapHeight: 750, evapFanCount: 1, evapFanDiameter: 500 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD30-302E/F", specifications: "Chilling (0~8°C): 5.6KW | Freezing (-18°C): 3.5KW | Defrost: 2460W | Air Flow: 2400 m3/h | Motor: 65/85W x 2", evapLength: 1100, evapWidth: 430, evapHeight: 480, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD40-302E/F", specifications: "Chilling (0~8°C): 6KW | Freezing (-18°C): 4.5KW | Defrost: 2940W | Air Flow: 2400 m3/h | Motor: 65/85W x 2", evapLength: 1260, evapWidth: 430, evapHeight: 480, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD50-352E/F", specifications: "Chilling (0~8°C): 9KW | Freezing (-18°C): 6KW | Defrost: 4500W | Air Flow: 4200 m3/h | Motor: 165W x 2", evapLength: 1300, evapWidth: 465, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD60-402F", specifications: "Chilling (0~8°C): 13KW | Freezing (-18°C): 8KW | Defrost: 5300W | Air Flow: 7200 m3/h | Motor: 205W x 2", evapLength: 1550, evapWidth: 480, evapHeight: 610, evapFanCount: 2, evapFanDiameter: 400 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD70-402F", specifications: "Chilling (0~8°C): 14KW | Freezing (-18°C): 8.5KW | Defrost: 6600W | Air Flow: 7200 m3/h | Motor: 205W x 2", evapLength: 1700, evapWidth: 480, evapHeight: 610, evapFanCount: 2, evapFanDiameter: 400 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD80-452F", specifications: "Chilling (0~8°C): 16KW | Freezing (-18°C): 10KW | Defrost: 6600W | Air Flow: 11400 m3/h | Motor: 370W x 2", evapLength: 1700, evapWidth: 480, evapHeight: 670, evapFanCount: 2, evapFanDiameter: 450 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD100-403F", specifications: "Chilling (0~8°C): 19KW | Freezing (-18°C): 12.5KW | Defrost: 7900W | Air Flow: 10800 m3/h | Motor: 205W x 3", evapLength: 1980, evapWidth: 480, evapHeight: 670, evapFanCount: 3, evapFanDiameter: 400 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD120-453F", specifications: "Chilling (0~8°C): 25KW | Freezing (-18°C): 15.5KW | Defrost: 9700W | Air Flow: 17100 m3/h | Motor: 370W x 3", evapLength: 2440, evapWidth: 515, evapHeight: 685, evapFanCount: 3, evapFanDiameter: 450 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD150-503F", specifications: "Chilling (0~8°C): 27KW | Freezing (-18°C): 17.5KW | Defrost: 9700W | Air Flow: 21000 m3/h | Motor: 505W x 3", evapLength: 2440, evapWidth: 545, evapHeight: 750, evapFanCount: 3, evapFanDiameter: 500 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD180-504F", specifications: "Chilling (0~8°C): 34KW | Freezing (-18°C): 22.5KW | Defrost: 11500W | Air Flow: 28000 m3/h | Motor: 505W x 4", evapLength: 2840, evapWidth: 545, evapHeight: 750, evapFanCount: 4, evapFanDiameter: 500 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD220-504F", specifications: "Chilling (0~8°C): 40KW | Freezing (-18°C): 27.5KW | Defrost: 11500W | Air Flow: 32000 m3/h | Motor: 750W x 4", evapLength: 2840, evapWidth: 545, evapHeight: 750, evapFanCount: 4, evapFanDiameter: 500 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD150-503FT", specifications: "Chilling (0~8°C): 27KW | Freezing (-18°C): 17.5KW | Defrost: 9700W | Air Flow: 18000 m3/h | Motor: 550W x 3", evapLength: 2440, evapWidth: 760, evapHeight: 750, evapFanCount: 3, evapFanDiameter: 500 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD180-504FT", specifications: "Chilling (0~8°C): 34KW | Freezing (-18°C): 22.5KW | Defrost: 11500W | Air Flow: 24000 m3/h | Motor: 550W x 4", evapLength: 2840, evapWidth: 760, evapHeight: 750, evapFanCount: 4, evapFanDiameter: 500 },
      { type: "Evaporator", brand: "Glenwin", model: "GL-DD220-504FT", specifications: "Chilling (0~8°C): 40KW | Freezing (-18°C): 27.5KW | Defrost: 11500W | Air Flow: 24000 m3/h | Motor: 550W x 4", evapLength: 2840, evapWidth: 760, evapHeight: 750, evapFanCount: 4, evapFanDiameter: 500 }
    ];

    setLoading(true);
    let count = 0;
    try {
      for (const item of glenwinData) {
        // Check if already exists
        const exist = products.find(p => p.model === item.model && p.brand === 'Glenwin');
        if (!exist) {
          await addDoc(collection(db, 'products'), item);
          count++;
        } else {
          await updateDoc(doc(db, 'products', exist.id), item);
          count++;
        }
      }
      toast.success(`Berhasil memperbarui/menambahkan ${count} evaporator Glenwin`);
    } catch (e) {
      toast.error('Gagal menambahkan data Glenwin');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const seedGlenwinCondensingUnits = async () => {
    const glenwinData = [
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN20EM",
        specifications: "2HP, Emerson ZB15KQE (R404A), Single Phase",
        dimensions: "995 x 420 x 675",
        powerSupply: "Single Phase 220V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "2HP",
        compressorModel: "ZB15KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*380",
        capMinus25: 2093,
        capMinus20: 2520,
        capMinus15: 3073,
        capMinus10: 3666,
        capMinus5: 4400,
        cap00: 5266,
        capPlus5: 6233
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN30EM",
        specifications: "3HP, Emerson ZB21KQE (R404A), Single Phase",
        dimensions: "1000 x 420 x 822",
        powerSupply: "Single Phase 220V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "3HP",
        compressorModel: "ZB21KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*380",
        capMinus25: 3140,
        capMinus20: 3780,
        capMinus15: 4610,
        capMinus10: 5500,
        capMinus5: 6600,
        cap00: 7900,
        capPlus5: 9350
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN40EM",
        specifications: "4HP, Emerson ZB29KQE (R404A), Single Phase",
        dimensions: "1000 x 420 x 822",
        powerSupply: "Single Phase 220V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "4HP",
        compressorModel: "ZB29KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*380",
        capMinus25: 4250,
        capMinus20: 5150,
        capMinus15: 6290,
        capMinus10: 7480,
        capMinus5: 8860,
        cap00: 10260,
        capPlus5: 12650
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN30FM",
        specifications: "3HP, Emerson ZB21KQE (R404A), 3-Phase",
        dimensions: "1000 x 420 x 822",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "3HP",
        compressorModel: "ZB21KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*380",
        capMinus25: 3140,
        capMinus20: 3780,
        capMinus15: 4610,
        capMinus10: 5500,
        capMinus5: 6600,
        cap00: 7900,
        capPlus5: 9350
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN40FM",
        specifications: "4HP, Emerson ZB29KQE (R404A), 3-Phase",
        dimensions: "1010 x 440 x 1220",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "4HP",
        compressorModel: "ZB29KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*400",
        capMinus25: 4250,
        capMinus20: 5150,
        capMinus15: 6290,
        capMinus10: 7480,
        capMinus5: 8860,
        cap00: 10260,
        capPlus5: 12650
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN50FM",
        specifications: "5HP, Emerson ZB38KQE (R404A), 3-Phase",
        dimensions: "1010 x 440 x 1220",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "5HP",
        compressorModel: "ZB38KQE",
        fanQty: 2,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "19.05 (3/4\")",
        pipeLiquid: "12.7 (1/2\")",
        installDimension: "φ12-585*400",
        capMinus25: 5340,
        capMinus20: 6380,
        capMinus15: 7850,
        capMinus10: 9300,
        capMinus5: 11000,
        cap00: 12800,
        capPlus5: 15800
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN60FM",
        specifications: "6HP, Emerson ZB45KQE (R404A), 3-Phase",
        dimensions: "1340 x 780 x 920",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "6HP",
        compressorModel: "ZB45KQE",
        fanQty: 2,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 250,
        pipeSuction: "19.05 (3/4\")",
        pipeLiquid: "12.7 (1/2\")",
        installDimension: "φ12-(420+420)*740",
        capMinus25: 6280,
        capMinus20: 7540,
        capMinus15: 9170,
        capMinus10: 10950,
        capMinus5: 12890,
        cap00: 15700,
        capPlus5: 18600
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN70FM",
        specifications: "7HP, Emerson ZB48KQE (R404A), 3-Phase",
        dimensions: "1340 x 780 x 920",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "7HP",
        compressorModel: "ZB48KQE",
        fanQty: 2,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 250,
        pipeSuction: "19.05 (3/4\")",
        pipeLiquid: "12.7 (1/2\")",
        installDimension: "φ12-(420+420)*740",
        capMinus25: 6910,
        capMinus20: 8290,
        capMinus15: 10090,
        capMinus10: 12040,
        capMinus5: 14180,
        cap00: 17270,
        capPlus5: 20460
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN80FM",
        specifications: "8HP, Emerson ZB58KQE (R404A), 3-Phase",
        dimensions: "1340 x 780 x 920",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "8HP",
        compressorModel: "ZB58KQE",
        fanQty: 2,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 250,
        pipeSuction: "22.2 (7/8\")",
        pipeLiquid: "15.88 (5/8\")",
        installDimension: "φ12-(420+420)*740",
        capMinus25: 7950,
        capMinus20: 9460,
        capMinus15: 10770,
        capMinus10: 13560,
        capMinus5: 15950,
        cap00: 18500,
        capPlus5: 21320
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN100FM",
        specifications: "10HP, Emerson ZB76KQE (R404A), 3-Phase",
        dimensions: "1340 x 780 x 1130",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "10HP",
        compressorModel: "ZB76KQE",
        fanQty: 2,
        fanPowerSupply: "Three Phase 380V/50HZ",
        fanPowerW: 250,
        pipeSuction: "22.2 (7/8\")",
        pipeLiquid: "15.88 (5/8\")",
        installDimension: "φ12-(420+420)*740",
        capMinus25: 11160,
        capMinus20: 13300,
        capMinus15: 16040,
        capMinus10: 19050,
        capMinus5: 22330,
        cap00: 25960,
        capPlus5: 29850
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN130FM",
        specifications: "13HP, Emerson ZB95KQE (R404A), 3-Phase",
        dimensions: "1550 x 890 x 1150",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "13HP",
        compressorModel: "ZB95KQE",
        fanQty: 2,
        fanPowerSupply: "Three Phase 380V/50HZ",
        fanPowerW: 415,
        pipeSuction: "28.5 (1 1/8\")",
        pipeLiquid: "15.88 (5/8\")",
        installDimension: "φ12-(570+570)*860",
        capMinus25: 13670,
        capMinus20: 16290,
        capMinus15: 19650,
        capMinus10: 23340,
        capMinus5: 27360,
        cap00: 31850,
        capPlus5: 36600
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN150FM",
        specifications: "15HP, Emerson ZB114KQE (R404A), 3-Phase",
        dimensions: "1550 x 900 x 1400",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-25°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "15HP",
        compressorModel: "ZB114KQE",
        fanQty: 2,
        fanPowerSupply: "Three Phase 380V/50HZ",
        fanPowerW: 415,
        pipeSuction: "34.93 (1 3/8\")",
        pipeLiquid: "15.88 (5/8\")",
        installDimension: "φ12-(570+570)*860",
        capMinus25: 16100,
        capMinus20: 19220,
        capMinus15: 23200,
        capMinus10: 27600,
        capMinus5: 32690,
        cap00: 37970,
        capPlus5: 44050
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN30FLF",
        specifications: "3HP, Emerson ZF09KQE (R404A, Low Temp)",
        dimensions: "1000 x 420 x 822",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-40°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "3HP",
        compressorModel: "ZF09KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*380",
        capMinus40: 1530,
        capMinus35: 1940,
        capMinus30: 2410,
        capMinus25: 2960,
        capMinus20: 3600,
        capMinus15: 4350,
        capMinus10: 5230,
        capMinus5: 6230,
        cap00: 7390,
        capPlus5: 8710
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN40FLF",
        specifications: "4HP, Emerson ZF13KQE (R404A, Low Temp)",
        dimensions: "1010 x 440 x 1220",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-40°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "4HP",
        compressorModel: "ZF13KQE",
        fanQty: 1,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "15.88 (5/8\")",
        pipeLiquid: "9.52 (3/8\")",
        installDimension: "φ12-585*400",
        capMinus40: 2190,
        capMinus35: 2780,
        capMinus30: 3480,
        capMinus25: 4310,
        capMinus20: 5270,
        capMinus15: 6380,
        capMinus10: 7660,
        capMinus5: 9110,
        cap00: 10760,
        capPlus5: 12610
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN50FLF",
        specifications: "5HP, Emerson ZF15KQE (R404A, Low Temp)",
        dimensions: "1340 x 780 x 920",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-40°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "5HP",
        compressorModel: "ZF15KQE",
        fanQty: 2,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "19.05 (3/4\")",
        pipeLiquid: "12.7 (1/2\")",
        installDimension: "φ12-(420+420)*740",
        capMinus40: 2660,
        capMinus35: 3420,
        capMinus30: 4290,
        capMinus25: 5300,
        capMinus20: 6470,
        capMinus15: 7840,
        capMinus10: 9430,
        capMinus5: 11260,
        cap00: 13360,
        capPlus5: 15760
      },
      {
        type: "Mesin (Condensing Unit)",
        machineType: "Split",
        brand: "Glenwin",
        model: "GL-GN60FLF",
        specifications: "6HP, Emerson ZF18KQE (R404A, Low Temp)",
        dimensions: "1340 x 780 x 1130",
        powerSupply: "Three Phase 380V/50HZ",
        evapTempRange: "-40°C ~ 5°C",
        ambientTemp: "0 ~ 40°C",
        refrigerant: "R404A",
        pressureController: "High Pressure & Low Pressure Switch",
        compressorPower: "6HP",
        compressorModel: "ZF18KQE",
        fanQty: 2,
        fanPowerSupply: "Single Phase 220V/50HZ",
        fanPowerW: 160,
        pipeSuction: "19.05 (3/4\")",
        pipeLiquid: "12.7 (1/2\")",
        installDimension: "φ12-585*400",
        capMinus40: 3290,
        capMinus35: 4170,
        capMinus30: 5170,
        capMinus25: 6340,
        capMinus20: 7700,
        capMinus15: 9300,
        capMinus10: 11170,
        capMinus5: 13360,
        cap00: 15910,
        capPlus5: 18840
      }
    ];

    setLoading(true);
    let count = 0;
    try {
      for (const item of glenwinData) {
        // Check if already exists
        const exist = products.find(p => p.model === item.model);
        if (!exist) {
          await addDoc(collection(db, 'products'), item);
          count++;
        } else {
          await updateDoc(doc(db, 'products', exist.id), item);
          count++;
        }
      }
      toast.success(`Berhasil memperbarui/menambahkan ${count} mesin Glenwin`);
    } catch (e) {
      toast.error('Gagal menambahkan data Glenwin');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const seedMullerEvaporators = async () => {
    const mullerData = [
      // Ø 300mm Medium Temp Unit Cooler
      { type: "Evaporator", brand: "Muller", model: "MMT021", specifications: "SC2 Cap (R404A): 2117W | Air Flow: 1296 m3/h | Air Throw: 6.9m | Fan: 1 x 300mm", evapLength: 750, evapWidth: 470, evapHeight: 430, evapFanCount: 1, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MMT026", specifications: "SC2 Cap (R404A): 2626W | Air Flow: 1224 m3/h | Air Throw: 6.5m | Fan: 1 x 300mm", evapLength: 750, evapWidth: 470, evapHeight: 430, evapFanCount: 1, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MMT035", specifications: "SC2 Cap (R404A): 3528W | Air Flow: 2736 m3/h | Air Throw: 10.3m | Fan: 2 x 300mm", evapLength: 1155, evapWidth: 470, evapHeight: 430, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MMT044", specifications: "SC2 Cap (R404A): 4443W | Air Flow: 2592 m3/h | Air Throw: 9.8m | Fan: 2 x 300mm", evapLength: 1155, evapWidth: 470, evapHeight: 430, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MMT049", specifications: "SC2 Cap (R404A): 4939W | Air Flow: 2448 m3/h | Air Throw: 9.3m | Fan: 2 x 300mm", evapLength: 1155, evapWidth: 470, evapHeight: 430, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MMT066", specifications: "SC2 Cap (R404A): 6599W | Air Flow: 3888 m3/h | Air Throw: 12.1m | Fan: 3 x 300mm", evapLength: 1165, evapWidth: 470, evapHeight: 430, evapFanCount: 3, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MMT105", specifications: "SC2 Cap (R404A): 10519W | Air Flow: 4896 m3/h | Air Throw: 12.9m | Fan: 4 x 300mm", evapLength: 1970, evapWidth: 470, evapHeight: 430, evapFanCount: 4, evapFanDiameter: 300 },

      // Ø 300mm Low Temp Unit Cooler
      { type: "Evaporator", brand: "Muller", model: "MLT012", specifications: "SC3 Cap (R404A): 1171W | Air Flow: 1296 m3/h | Air Throw: 6.4m | Fan: 1 x 300mm", evapLength: 750, evapWidth: 470, evapHeight: 430, evapFanCount: 1, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MLT022", specifications: "SC3 Cap (R404A): 2195W | Air Flow: 2592 m3/h | Air Throw: 9.1m | Fan: 2 x 300mm", evapLength: 1155, evapWidth: 470, evapHeight: 430, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MLT027", specifications: "SC3 Cap (R404A): 2744W | Air Flow: 2488 m3/h | Air Throw: 8.6m | Fan: 2 x 300mm", evapLength: 1155, evapWidth: 470, evapHeight: 430, evapFanCount: 2, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MLT033", specifications: "SC3 Cap (R404A): 3293W | Air Flow: 3888 m3/h | Air Throw: 11.2m | Fan: 3 x 300mm", evapLength: 1560, evapWidth: 470, evapHeight: 430, evapFanCount: 3, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MLT038", specifications: "SC3 Cap (R404A): 3796W | Air Flow: 3672 m3/h | Air Throw: 10.6m | Fan: 3 x 300mm", evapLength: 1560, evapWidth: 470, evapHeight: 430, evapFanCount: 3, evapFanDiameter: 300 },
      { type: "Evaporator", brand: "Muller", model: "MLT057", specifications: "SC3 Cap (R404A): 5671W | Air Flow: 4896 m3/h | Air Throw: 11.9m | Fan: 4 x 300mm", evapLength: 1970, evapWidth: 470, evapHeight: 430, evapFanCount: 4, evapFanDiameter: 300 },

      // Ø 350mm Medium Temp Unit Cooler
      { type: "Evaporator", brand: "Muller", model: "MMT030", specifications: "SC2 Cap (R404A): 3031W | Air Flow: 2520 m3/h | Air Throw: 8.8m | Fan: 1 x 350mm", evapLength: 850, evapWidth: 470, evapHeight: 545, evapFanCount: 1, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT039", specifications: "SC2 Cap (R404A): 3855W | Air Flow: 2448 m3/h | Air Throw: 8.3m | Fan: 1 x 350mm", evapLength: 850, evapWidth: 470, evapHeight: 545, evapFanCount: 1, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT059", specifications: "SC2 Cap (R404A): 5880W | Air Flow: 5040 m3/h | Air Throw: 12.6m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT082", specifications: "SC2 Cap (R404A): 8167W | Air Flow: 5040 m3/h | Air Throw: 12.6m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT093", specifications: "SC2 Cap (R404A): 9277W | Air Flow: 4950 m3/h | Air Throw: 11.9m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT098", specifications: "SC2 Cap (R404A): 9800W | Air Flow: 4752 m3/h | Air Throw: 11.5m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT122", specifications: "SC2 Cap (R404A): 12152W | Air Flow: 7776 m3/h | Air Throw: 15.4m | Fan: 3 x 350mm", evapLength: 2060, evapWidth: 470, evapHeight: 545, evapFanCount: 3, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT139", specifications: "SC2 Cap (R404A): 13851W | Air Flow: 7416 m3/h | Air Throw: 14.7m | Fan: 3 x 350mm", evapLength: 2060, evapWidth: 470, evapHeight: 545, evapFanCount: 3, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MMT158", specifications: "SC2 Cap (R404A): 15811W | Air Flow: 7092 m3/h | Air Throw: 14.2m | Fan: 3 x 350mm", evapLength: 2060, evapWidth: 470, evapHeight: 545, evapFanCount: 3, evapFanDiameter: 350 },

      // Ø 350mm Low Temp Unit Cooler
      { type: "Evaporator", brand: "Muller", model: "MLT016", specifications: "SC3 Cap (R404A): 1610W | Air Flow: 2520 m3/h | Air Throw: 8.1m | Fan: 1 x 350mm", evapLength: 850, evapWidth: 470, evapHeight: 545, evapFanCount: 1, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT019", specifications: "SC3 Cap (R404A): 1875W | Air Flow: 2520 m3/h | Air Throw: 8.1m | Fan: 1 x 350mm", evapLength: 850, evapWidth: 470, evapHeight: 545, evapFanCount: 1, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT041", specifications: "SC3 Cap (R404A): 4116W | Air Flow: 5040 m3/h | Air Throw: 11.6m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT045", specifications: "SC3 Cap (R404A): 4528W | Air Flow: 5040 m3/h | Air Throw: 11.6m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT049", specifications: "SC3 Cap (R404A): 4893W | Air Flow: 4950 m3/h | Air Throw: 11.0m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT051", specifications: "SC3 Cap (R404A): 5122W | Air Flow: 4950 m3/h | Air Throw: 11.0m | Fan: 2 x 350mm", evapLength: 1485, evapWidth: 470, evapHeight: 545, evapFanCount: 2, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT061", specifications: "SC3 Cap (R404A): 6083W | Air Flow: 7776 m3/h | Air Throw: 14.3m | Fan: 3 x 350mm", evapLength: 2060, evapWidth: 470, evapHeight: 545, evapFanCount: 3, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT068", specifications: "SC3 Cap (R404A): 6814W | Air Flow: 7776 m3/h | Air Throw: 14.3m | Fan: 3 x 350mm", evapLength: 2060, evapWidth: 470, evapHeight: 545, evapFanCount: 3, evapFanDiameter: 350 },
      { type: "Evaporator", brand: "Muller", model: "MLT081", specifications: "SC3 Cap (R404A): 8141W | Air Flow: 7416 m3/h | Air Throw: 13.6m | Fan: 3 x 350mm", evapLength: 2060, evapWidth: 470, evapHeight: 545, evapFanCount: 3, evapFanDiameter: 350 }
    ];

    setLoading(true);
    let count = 0;
    try {
      for (const item of mullerData) {
        const exist = products.find(p => p.model === item.model && p.brand === 'Muller');
        if (!exist) {
          await addDoc(collection(db, 'products'), item);
          count++;
        } else {
          await updateDoc(doc(db, 'products', exist.id), item);
          count++;
        }
      }
      toast.success(`Berhasil memperbarui/menambahkan ${count} evaporator Muller`);
    } catch (e) {
      toast.error('Gagal menambahkan data Muller');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'Mesin (Condensing Unit)',
      brand: '',
      model: '',
      specifications: '',
      pdfUrl: '',
      machineType: '',
      pluginType: '',
      dimensions: '',
      evapLength: 0,
      evapWidth: 0,
      evapHeight: 0,
      evapFanCount: 1,
      evapFanDiameter: 0,
      powerSupply: '',
      evapTempRange: '',
      ambientTemp: '',
      refrigerant: '',
      pressureController: '',
      compressorPower: '',
      compressorModel: '',
      fanQty: 1,
      fanPowerSupply: '',
      fanPowerW: 0,
      pipeSuction: '',
      pipeLiquid: '',
      installDimension: '',
      capMinus40: 0,
      capMinus35: 0,
      capMinus30: 0,
      capMinus25: 0,
      capMinus20: 0,
      capMinus15: 0,
      capMinus10: 0,
      capMinus5: 0,
      cap00: 0,
      capPlus5: 0
    });
    setEditingId(null);
  };

  const filteredProducts = products.filter(p => 
    p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: 'type' | 'brand' | 'model' | 'dimensions' | 'fan' | 'capacity' | 'electrical' | 'refrigerant') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortValue = (p: Product, field: string) => {
    if (field === 'dimensions') {
      if (p.type === 'Evaporator' && p.evapLength) {
        return `${p.evapLength}x${p.evapWidth}x${p.evapHeight}`;
      }
      return p.dimensions || p.installDimension || '';
    }
    if (field === 'fan') {
      if (p.type === 'Evaporator') {
        return p.evapFanCount ? `${p.evapFanCount * 1000 + (p.evapFanDiameter || 0)}` : '';
      }
      return p.fanQty ? `${p.fanQty}` : '';
    }
    if (field === 'capacity') {
      const details = getProductDisplayDetails(p);
      return details.capacity;
    }
    if (field === 'electrical') {
      const details = getProductDisplayDetails(p);
      return details.electrical;
    }
    if (field === 'refrigerant') {
      const details = getProductDisplayDetails(p);
      return details.refrigerant;
    }
    return String(p[field as keyof Product] || '').toLowerCase();
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortField) return 0;
    
    const valA = getSortValue(a, sortField);
    const valB = getSortValue(b, sortField);

    const numA = parseFloat(valA);
    const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
    if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Database className="text-[var(--color-accent-600)]" />
            Database Produk
          </h2>
          <p className="text-secondary text-sm">Kelola data sheet mesin, evaporator, pintu, dan komponen lainnya.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <Input 
              placeholder="Cari produk..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:w-64"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={seedGlenwinEvaporators} disabled={loading} title="Seed Glenwin Evaporator" className="px-3 text-xs">
              <DownloadCloud size={14} className="mr-1" />
              Glenwin Evap
            </Button>
            <Button variant="outline" onClick={seedGlenwinCondensingUnits} disabled={loading} title="Seed Glenwin Mesin Split" className="px-3 text-xs">
              <DownloadCloud size={14} className="mr-1" />
              Glenwin Mesin
            </Button>
            <Button variant="outline" onClick={seedMullerEvaporators} disabled={loading} title="Seed Muller Evaporator" className="px-3 text-xs">
              <DownloadCloud size={14} className="mr-1" />
              Muller Evap
            </Button>
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus size={16} className="mr-2" />
            Tambah Produk
          </Button>
        </div>
      </div>

      <div className="bg-surface border border-divider rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted">Memuat data...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Package size={48} className="text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-primary mb-1">Belum ada data</h3>
            <p className="text-secondary text-sm">Tambahkan produk pertama ke dalam database Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-hover border-b border-divider text-secondary">
                <tr>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1.5">
                      Tipe
                      {sortField === 'type' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('brand')}
                  >
                    <div className="flex items-center gap-1.5">
                      Merek
                      {sortField === 'brand' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('model')}
                  >
                    <div className="flex items-center gap-1.5">
                      Model
                      {sortField === 'model' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('dimensions')}
                  >
                    <div className="flex items-center gap-1.5">
                      Dimensi (mm)
                      {sortField === 'dimensions' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('fan')}
                  >
                    <div className="flex items-center gap-1.5">
                      Kipas
                      {sortField === 'fan' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('capacity')}
                  >
                    <div className="flex items-center gap-1.5">
                      Kapasitas
                      {sortField === 'capacity' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('electrical')}
                  >
                    <div className="flex items-center gap-1.5">
                      Defrost / Kelistrikan
                      {sortField === 'electrical' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 font-semibold cursor-pointer hover:bg-surface-hover/80 transition-colors select-none group"
                    onClick={() => handleSort('refrigerant')}
                  >
                    <div className="flex items-center gap-1.5">
                      Refrigerant
                      {sortField === 'refrigerant' ? (
                        sortDirection === 'asc' ? <ArrowUp size={14} className="text-[var(--color-accent-600)]" /> : <ArrowDown size={14} className="text-[var(--color-accent-600)]" />
                      ) : (
                        <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {sortedProducts.map(p => {
                  const details = getProductDisplayDetails(p);
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                            {p.type}
                          </span>
                          {p.machineType && (
                            <div className="text-xs text-muted mt-1">
                              {p.machineType} {p.pluginType ? `- ${p.pluginType}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-primary">{p.brand}</td>
                        <td className="px-6 py-4 text-secondary font-mono">{p.model}</td>
                        <td className="px-6 py-4 text-secondary text-xs">
                          {details.dimensions}
                        </td>
                        <td className="px-6 py-4 text-secondary text-xs">
                          {details.fan}
                        </td>
                        <td className="px-6 py-4 text-secondary text-xs whitespace-normal max-w-[240px]">
                          <div>{details.capacity}</div>
                          {p.pdfUrl && (
                            <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent-600)] hover:underline text-xs mt-1">
                              <ExternalLink size={12} /> Buka Referensi
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 text-secondary text-xs whitespace-normal max-w-[180px]">
                          {details.electrical}
                        </td>
                        <td className="px-6 py-4 text-secondary text-xs font-semibold">
                          <span className={details.refrigerant !== '-' ? "px-2 py-0.5 rounded bg-surface-hover border border-divider text-primary font-semibold text-[10px]" : ""}>
                            {details.refrigerant}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {p.type === 'Mesin (Condensing Unit)' && p.machineType === 'Split' && (
                            <button 
                              onClick={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--color-accent-50)] text-[var(--color-accent-700)] hover:bg-[var(--color-accent-100)] transition-colors mr-1"
                            >
                              {expandedProductId === p.id ? 'Tutup Detail' : 'Lihat Detail'}
                            </button>
                          )}
                          <button 
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-secondary hover:text-[var(--color-accent-600)] transition-colors rounded-md hover:bg-[var(--color-accent-50)]"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-secondary hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {expandedProductId === p.id && p.type === 'Mesin (Condensing Unit)' && p.machineType === 'Split' && (
                        <tr>
                          <td colSpan={9} className="px-6 py-4 bg-surface-hover/20 border-t border-divider">
                          <div className="max-w-4xl mx-auto bg-surface border border-divider rounded-xl shadow-inner p-6 animate-in slide-in-from-top-2 duration-200">
                            <h4 className="text-base font-bold text-primary mb-4 flex items-center gap-2">
                              <Package size={18} className="text-[var(--color-accent-600)]" />
                              Data Sheet Lengkap: {p.brand} {p.model}
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-primary border-b border-divider pb-1">Spesifikasi Unit</h5>
                                <table className="w-full text-xs">
                                  <tbody>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Model</td>
                                      <td className="text-primary font-bold">{p.model}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Power Supply</td>
                                      <td className="text-primary">{p.powerSupply || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Evap. Temp Range</td>
                                      <td className="text-primary">{p.evapTempRange || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Ambient Temperature</td>
                                      <td className="text-primary">{p.ambientTemp || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Refrigerant</td>
                                      <td className="text-primary">{p.refrigerant || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Pressure Controller</td>
                                      <td className="text-primary">{p.pressureController || '-'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-primary border-b border-divider pb-1">Kompresor & Fan Motor</h5>
                                <table className="w-full text-xs">
                                  <tbody>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Compressor Brand</td>
                                      <td className="text-primary font-medium">Emerson Copeland</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Compressor Model</td>
                                      <td className="text-primary font-bold">{p.compressorModel || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Compressor Power</td>
                                      <td className="text-primary">{p.compressorPower || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Fan Qty</td>
                                      <td className="text-primary">{p.fanQty || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Fan Power Supply</td>
                                      <td className="text-primary">{p.fanPowerSupply || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Fan Power (W)</td>
                                      <td className="text-primary">{p.fanPowerW ? `${p.fanPowerW}W` : '-'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-primary border-b border-divider pb-1">Koneksi & Dimensi</h5>
                                <table className="w-full text-xs">
                                  <tbody>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Suction Pipe OD</td>
                                      <td className="text-primary">{p.pipeSuction || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Liquid Pipe OD</td>
                                      <td className="text-primary">{p.pipeLiquid || '-'}</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Dimensi Eksternal (L*W*H)</td>
                                      <td className="text-primary font-bold">{p.dimensions || '-'} mm</td>
                                    </tr>
                                    <tr className="border-b border-divider py-1.5 flex justify-between">
                                      <td className="text-secondary font-medium">Dimensi Instalasi (Hole L*W)</td>
                                      <td className="text-primary">{p.installDimension || '-'} mm</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="space-y-3">
                                <h5 className="text-sm font-semibold text-primary border-b border-divider pb-1">Kapasitas Pendinginan (Cooling Capacity)</h5>
                                <div className="border border-divider rounded-lg overflow-hidden bg-surface-hover/10">
                                  <table className="w-full text-xs">
                                    <thead className="bg-surface-hover text-secondary">
                                      <tr className="border-b border-divider text-left">
                                        <th className="px-3 py-1.5 font-medium">Evap Temp (°C)</th>
                                        <th className="px-3 py-1.5 text-right font-medium">Kapasitas (Watt)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-divider">
                                      {p.capMinus40 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-40°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus40} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus35 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-35°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus35} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus30 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-30°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus30} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus25 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-25°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus25} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus20 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-20°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus20} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus15 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-15°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus15} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus10 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-10°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus10} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capMinus5 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">-5°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capMinus5} W</td>
                                        </tr>
                                      ) : null}
                                      {p.cap00 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">0°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.cap00} W</td>
                                        </tr>
                                      ) : null}
                                      {p.capPlus5 ? (
                                        <tr className="hover:bg-surface-hover/20">
                                          <td className="px-3 py-1.5 font-medium">+5°C</td>
                                          <td className="px-3 py-1.5 text-right font-semibold text-primary">{p.capPlus5} W</td>
                                        </tr>
                                      ) : null}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`bg-surface w-full ${formData.type === 'Mesin (Condensing Unit)' && formData.machineType === 'Split' ? 'max-w-2xl' : 'max-w-md'} rounded-2xl shadow-xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between p-5 border-b border-divider">
              <h3 className="text-lg font-bold text-primary">
                {editingId ? 'Edit Produk' : 'Tambah Produk'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="max-h-[75vh] overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary">Tipe Produk</label>
                  <select 
                    value={formData.type}
                    onChange={e => {
                      setFormData({
                        ...formData, 
                        type: e.target.value,
                        machineType: e.target.value === 'Mesin (Condensing Unit)' ? 'Split' : '',
                        pluginType: '',
                        brand: e.target.value === 'Mesin (Condensing Unit)' ? '' : formData.brand
                      });
                    }}
                    className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                    required
                  >
                    <option value="Mesin (Condensing Unit)">Mesin (Condensing Unit)</option>
                    <option value="Evaporator">Evaporator</option>
                    <option value="Panel Insulasi">Panel Insulasi</option>
                    <option value="Pintu Cold Room">Pintu Cold Room</option>
                    <option value="Lampu">Lampu</option>
                    <option value="Aksesoris/Lainnya">Aksesoris/Lainnya</option>
                  </select>
                </div>

                {formData.type === 'Mesin (Condensing Unit)' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Jenis Mesin</label>
                    <select 
                      value={formData.machineType}
                      onChange={e => {
                        setFormData({
                          ...formData, 
                          machineType: e.target.value,
                          pluginType: e.target.value === 'Plug-in' ? 'Roof Mount' : '',
                          brand: ''
                        });
                      }}
                      className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                    >
                      <option value="Split">Split</option>
                      <option value="Plug-in">Plug-in</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.type === 'Mesin (Condensing Unit)' && formData.machineType === 'Plug-in' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Tipe Plug-in</label>
                    <select 
                      value={formData.pluginType}
                      onChange={e => setFormData({...formData, pluginType: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                    >
                      <option value="Roof Mount">Roof Mount</option>
                      <option value="Wall Mount">Wall Mount</option>
                    </select>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary">Merek</label>
                  {formData.type === 'Mesin (Condensing Unit)' && formData.machineType === 'Split' ? (
                    <select 
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                      required
                    >
                      <option value="">-- Pilih Merek --</option>
                      <option value="Bitzer">Bitzer</option>
                      <option value="Daikin">Daikin</option>
                      <option value="Glenwin">Glenwin</option>
                    </select>
                  ) : (
                    <Input 
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      placeholder="e.g. Bitzer, Muller, dll."
                      required
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary">Model / Seri</label>
                  <Input 
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    placeholder="e.g. 4TES-9Y"
                    required
                  />
                </div>
              </div>

              {formData.type === 'Mesin (Condensing Unit)' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-primary">Dimensi (P x L x T) mm</label>
                  <Input 
                    value={formData.dimensions}
                    onChange={e => setFormData({...formData, dimensions: e.target.value})}
                    placeholder="e.g. 1200 x 800 x 1000"
                  />
                </div>
              )}

              {formData.type === 'Mesin (Condensing Unit)' && formData.machineType === 'Split' && (
                <div className="space-y-4 border-t border-divider pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-primary">Detail Spesifikasi Mesin Split</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Power Supply</label>
                      <Input 
                        value={formData.powerSupply}
                        onChange={e => setFormData({...formData, powerSupply: e.target.value})}
                        placeholder="e.g. Three Phase 380V/50HZ"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Evap. Temp Range</label>
                      <Input 
                        value={formData.evapTempRange}
                        onChange={e => setFormData({...formData, evapTempRange: e.target.value})}
                        placeholder="e.g. -25°C ~ 5°C"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Ambient Temperature</label>
                      <Input 
                        value={formData.ambientTemp}
                        onChange={e => setFormData({...formData, ambientTemp: e.target.value})}
                        placeholder="e.g. 0 ~ 40°C"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Refrigerant</label>
                      <Input 
                        value={formData.refrigerant}
                        onChange={e => setFormData({...formData, refrigerant: e.target.value})}
                        placeholder="e.g. R404A"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-secondary">Pressure Controller</label>
                      <Input 
                        value={formData.pressureController}
                        onChange={e => setFormData({...formData, pressureController: e.target.value})}
                        placeholder="e.g. High Pressure & Low Pressure Switch"
                      />
                    </div>
                  </div>

                  <h5 className="text-xs font-semibold text-primary border-b border-divider pb-1 mt-3">Kompresor Emerson</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Power (HP)</label>
                      <Input 
                        value={formData.compressorPower}
                        onChange={e => setFormData({...formData, compressorPower: e.target.value})}
                        placeholder="e.g. 3HP"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Model Kompresor</label>
                      <Input 
                        value={formData.compressorModel}
                        onChange={e => setFormData({...formData, compressorModel: e.target.value})}
                        placeholder="e.g. ZB21KQE"
                      />
                    </div>
                  </div>

                  <h5 className="text-xs font-semibold text-primary border-b border-divider pb-1 mt-3">Condenser Fan Motor</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Fan Qty</label>
                      <Input 
                        type="number"
                        value={formData.fanQty || ''}
                        onChange={e => setFormData({...formData, fanQty: Number(e.target.value)})}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-secondary">Fan Power Supply</label>
                      <Input 
                        value={formData.fanPowerSupply}
                        onChange={e => setFormData({...formData, fanPowerSupply: e.target.value})}
                        placeholder="e.g. Single Phase 220V/50HZ"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                      <label className="text-xs font-medium text-secondary">Fan Power (W)</label>
                      <Input 
                        type="number"
                        value={formData.fanPowerW || ''}
                        onChange={e => setFormData({...formData, fanPowerW: Number(e.target.value)})}
                        placeholder="e.g. 160"
                      />
                    </div>
                  </div>

                  <h5 className="text-xs font-semibold text-primary border-b border-divider pb-1 mt-3">Koneksi Pipa & Instalasi</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Suction OD</label>
                      <Input 
                        value={formData.pipeSuction}
                        onChange={e => setFormData({...formData, pipeSuction: e.target.value})}
                        placeholder='e.g. 15.88 (5/8")'
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-secondary">Liquid OD</label>
                      <Input 
                        value={formData.pipeLiquid}
                        onChange={e => setFormData({...formData, pipeLiquid: e.target.value})}
                        placeholder='e.g. 9.52 (3/8")'
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-secondary">Install Dimension (Hole L*W)</label>
                      <Input 
                        value={formData.installDimension}
                        onChange={e => setFormData({...formData, installDimension: e.target.value})}
                        placeholder="e.g. φ12 - 585 * 380 mm"
                      />
                    </div>
                  </div>

                  <h5 className="text-xs font-semibold text-primary border-b border-divider pb-1 mt-3">Cooling Capacity (Watt)</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-40°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus40 || ''}
                        onChange={e => setFormData({...formData, capMinus40: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-35°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus35 || ''}
                        onChange={e => setFormData({...formData, capMinus35: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-30°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus30 || ''}
                        onChange={e => setFormData({...formData, capMinus30: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-25°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus25 || ''}
                        onChange={e => setFormData({...formData, capMinus25: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-20°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus20 || ''}
                        onChange={e => setFormData({...formData, capMinus20: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-15°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus15 || ''}
                        onChange={e => setFormData({...formData, capMinus15: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-10°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus10 || ''}
                        onChange={e => setFormData({...formData, capMinus10: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">-5°C</label>
                      <Input 
                        type="number"
                        value={formData.capMinus5 || ''}
                        onChange={e => setFormData({...formData, capMinus5: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">0°C</label>
                      <Input 
                        type="number"
                        value={formData.cap00 || ''}
                        onChange={e => setFormData({...formData, cap00: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-secondary">+5°C</label>
                      <Input 
                        type="number"
                        value={formData.capPlus5 || ''}
                        onChange={e => setFormData({...formData, capPlus5: Number(e.target.value)})}
                        placeholder="W"
                        className="h-8 text-xs px-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.type === 'Evaporator' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Panjang (mm)</label>
                    <Input 
                      type="number"
                      value={formData.evapLength || ''}
                      onChange={e => setFormData({...formData, evapLength: Number(e.target.value)})}
                      placeholder="e.g. 1000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Lebar (mm)</label>
                    <Input 
                      type="number"
                      value={formData.evapWidth || ''}
                      onChange={e => setFormData({...formData, evapWidth: Number(e.target.value)})}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Tinggi (mm)</label>
                    <Input 
                      type="number"
                      value={formData.evapHeight || ''}
                      onChange={e => setFormData({...formData, evapHeight: Number(e.target.value)})}
                      placeholder="e.g. 450"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Jumlah Fan</label>
                    <Input 
                      type="number"
                      value={formData.evapFanCount || ''}
                      onChange={e => setFormData({...formData, evapFanCount: Number(e.target.value)})}
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-primary">Diameter Fan (mm)</label>
                    <Input 
                      type="number"
                      value={formData.evapFanDiameter || ''}
                      onChange={e => setFormData({...formData, evapFanDiameter: Number(e.target.value)})}
                      placeholder="e.g. 350"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary">Spesifikasi Tambahan (Data Sheet)</label>
                <textarea 
                  value={formData.specifications}
                  onChange={e => setFormData({...formData, specifications: e.target.value})}
                  placeholder="Kapasitas, suhu, dimensi, dll..."
                  className="flex min-h-[100px] w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-primary">Tautan Referensi (Opsional)</label>
                <Input 
                  type="url"
                  value={formData.pdfUrl}
                  onChange={e => setFormData({...formData, pdfUrl: e.target.value})}
                  placeholder="https://... (Link ke spesifikasi atau PDF)"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-divider">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  <Save size={16} className="mr-2" />
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
