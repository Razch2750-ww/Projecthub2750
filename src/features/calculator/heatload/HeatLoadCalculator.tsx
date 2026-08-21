import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ArrowLeft, ArrowRight, ClipboardList, Ruler, ThermometerSun, Apple, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';

type Step = 'general' | 'dimensions' | 'heat' | 'product' | 'calculate';

const toMeters = (val: number, unit: string) => {
  if (unit === 'km') return val * 1000;
  if (unit === 'cm') return val / 100;
  if (unit === 'mm') return val / 1000;
  if (unit === 'ft') return val * 0.3048;
  if (unit === 'in') return val * 0.0254;
  return val; // 'm'
};

const toCelsius = (val: number, unit: string) => {
  if (unit === 'F') return (val - 32) * 5/9;
  return val; // 'C'
};

const toKg = (val: number, unit: string) => {
  if (unit === 'ton') return val * 1000;
  if (unit === 'g') return val / 1000;
  if (unit === 'lbs') return val * 0.453592;
  return val; // 'kg'
};

const fromKg = (val: number, unit: string) => {
  if (unit === 'ton') return val / 1000;
  if (unit === 'g') return val * 1000;
  if (unit === 'lbs') return val / 0.453592;
  return val; // 'kg'
};

interface ColdRoomCalculatorProps {
  initialDimensions?: { l: string, w: string, h: string };
  initialProjectRef?: string;
  isModal?: boolean;
}

export const ColdRoomCalculator: React.FC<ColdRoomCalculatorProps> = ({ initialDimensions, initialProjectRef, isModal }) => {
  const { lengthUnit, smallLengthUnit, tempUnit, weightUnit } = useSettings();
  const [activeStep, setActiveStep] = useState<Step>('general');

  // General State
  const [projectRef, setProjectRef] = useState(initialProjectRef || '');
  const [roomTemp, setRoomTemp] = useState('');
  const [outsideTemp, setOutsideTemp] = useState('');
  const [ventilationFactor, setVentilationFactor] = useState('Normal');
  const [runningTime, setRunningTime] = useState('');
  const [loadingPerc, setLoadingPerc] = useState('');

  // Dimensions State
  const [length, setLength] = useState(initialDimensions?.l || '');
  const [width, setWidth] = useState(initialDimensions?.w || '');
  const [height, setHeight] = useState(initialDimensions?.h || '');
  const [insulation, setInsulation] = useState('Polyurethane');
  const [thickness, setThickness] = useState('');
  const [floorInsulation, setFloorInsulation] = useState('No');

  // Heat State
  const [fansWatt, setFansWatt] = useState('');
  const [fansTime, setFansTime] = useState('');
  const [illumination, setIllumination] = useState('');
  const [illumTime, setIllumTime] = useState('');
  const [persons, setPersons] = useState('');
  const [personsTime, setPersonsTime] = useState('');
  const [otherWatt, setOtherWatt] = useState('');
  const [otherTime, setOtherTime] = useState('');

  // Product State
  const [productType, setProductType] = useState('Vegetables');
  const [storageQty, setStorageQty] = useState('');
  const [stockShift, setStockShift] = useState('');
  const [isStockShiftEdited, setIsStockShiftEdited] = useState(false);
  const [enteringTemp, setEnteringTemp] = useState('');
  const [coolDownTime, setCoolDownTime] = useState('');

  React.useEffect(() => {
    if (!isStockShiftEdited) {
      const rT = toCelsius(parseFloat(roomTemp) || 0, tempUnit);
      const l = toMeters(parseFloat(length) || 0, lengthUnit);
      const w = toMeters(parseFloat(width) || 0, lengthUnit);
      const h = toMeters(parseFloat(height) || 0, lengthUnit);

      const vol = l * w * h;
      if (vol > 0) {
        const isFreezer = rT < 0;
        // The formula yields Kg
        const calculatedKg = isFreezer ? (vol / 4) * 100 : (vol / 6) * 100;
        const finalValue = fromKg(calculatedKg, weightUnit);
        
        // Round to 2 decimal places to avoid messy numbers
        setStockShift(Math.round(finalValue * 100) / 100 + '');
      } else {
        setStockShift('');
      }
    }
  }, [length, width, height, roomTemp, lengthUnit, tempUnit, weightUnit, isStockShiftEdited]);

  const nextStep = () => {
    const steps: Step[] = ['general', 'dimensions', 'heat', 'product', 'calculate'];
    const idx = steps.indexOf(activeStep);
    if (idx < steps.length - 1) setActiveStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = ['general', 'dimensions', 'heat', 'product', 'calculate'];
    const idx = steps.indexOf(activeStep);
    if (idx > 0) setActiveStep(steps[idx - 1]);
  };

  const calculateResults = useMemo(() => {
    // Parse values
    const rT = toCelsius(parseFloat(roomTemp) || 0, tempUnit);
    const oT = toCelsius(parseFloat(outsideTemp) || 25, tempUnit);
    const l = toMeters(parseFloat(length) || 0, lengthUnit);
    const w = toMeters(parseFloat(width) || 0, lengthUnit);
    const h = toMeters(parseFloat(height) || 0, lengthUnit);
    
    // thickness is divided by 1000 below to get meters, so we must provide it in mm
    // toMeters gives us meters, so we multiply by 1000 to get the mm equivalent for the formula
    const thickMeters = toMeters(parseFloat(thickness) || 0, smallLengthUnit);
    const thick = thickMeters > 0 ? thickMeters * 1000 : 100; // mm

    const vol = l * w * h;
    const areaWalls = 2 * (l * h + w * h);
    const areaCeil = l * w;
    const areaFloor = l * w;

    // Thermal conductivity (W/mK)
    const k = insulation === 'Polyurethane' ? 0.024 : 0.035; // default PU: 0.024, PS: 0.035
    const uValueWall = k / (thick / 1000);
    const uValueFloor = floorInsulation.includes('Yes') ? uValueWall : 2.0;

    const deltaT = oT - rT;

    // 1. Transmission Losses (Watts)
    const transWalls = areaWalls * uValueWall * deltaT;
    const transCeil = areaCeil * uValueWall * deltaT;
    const transFloor = areaFloor * uValueFloor * deltaT;
    const transmissionLosses = transWalls + transCeil + transFloor;

    // 2. Ventilation Losses (Approx Watts based on volume and deltaT)
    const ventFactor = ventilationFactor === 'High' ? 1.5 : (ventilationFactor === 'Low' ? 0.5 : 1.0);
    const ventilationLosses = vol * ventFactor * deltaT * 0.5;

    // 3. Internal Heat Sources (Watts equivalent over 24h)
    const pFans = (parseFloat(fansWatt) || 0) * ((parseFloat(fansTime) || 0) / 24);
    const pIllum = (parseFloat(illumination) || 0) * areaFloor * ((parseFloat(illumTime) || 0) / 24);
    const pPerson = (parseFloat(persons) || 0) * 250 * ((parseFloat(personsTime) || 0) / 24); // approx 250W/person
    const pOther = (parseFloat(otherWatt) || 0) * ((parseFloat(otherTime) || 0) / 24);
    
    const internalHeatSources = pFans + pIllum + pPerson + pOther;

    // 4. Product Cooling Down (Watts)
    const sShift = toKg(parseFloat(stockShift) || 0, weightUnit);
    const eTemp = toCelsius(parseFloat(enteringTemp) || rT, tempUnit);
    const cTime = parseFloat(coolDownTime) || 24;
    const specificHeat = productType === 'Meat' ? 3.2 : 3.8; // kJ/kgK approx
    const productCooling = (sShift * specificHeat * 1000 * Math.max(0, eTemp - rT)) / (cTime * 3600);

    // 5. Respiration (Watts)
    const sQty = toKg(parseFloat(storageQty) || 0, weightUnit);
    const respiration = productType === 'Vegetables' ? sQty * 0.025 : 0; // approx 0.025 W/kg

    const subtotalWatts = transmissionLosses + ventilationLosses + internalHeatSources + productCooling + respiration;

    // Running Time adjustment
    const runTime = parseFloat(runningTime) || 20; // Hrs
    const requiredCapacityWatts = subtotalWatts * (24 / runTime);

    // For specific capacity display, return the volume in specific metric as well
    // specificCapacity = Vol in m^3 => W/m^3
    return {
      transmissionLosses,
      ventilationLosses,
      internalHeatSources,
      productCooling,
      respiration,
      subtotalWatts,
      requiredCapacityKW: requiredCapacityWatts / 1000,
      specificCapacity: vol > 0 ? requiredCapacityWatts / vol : 0
    };

  }, [
    roomTemp, outsideTemp, length, width, height, thickness, insulation, floorInsulation,
    ventilationFactor, fansWatt, fansTime, illumination, illumTime, persons, personsTime,
    otherWatt, otherTime, stockShift, enteringTemp, coolDownTime, productType, storageQty, runningTime,
    lengthUnit, smallLengthUnit, tempUnit, weightUnit
  ]);

  const stepClass = (step: Step) => cn(
    "flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-colors flex-1",
    activeStep === step ? "text-[var(--color-accent-600)]" : "text-secondary hover:bg-surface-hover hover:text-primary"
  );

  return (
    <div className={cn("space-y-6 max-w-4xl mx-auto", isModal ? "" : "pb-20")}>
      {!isModal && (
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-primary tracking-tight">Kalkulator Heat Load</h2>
        </div>
      )}

      <div className={cn("bg-surface border border-divider shadow-sm rounded-xl overflow-hidden min-h-[500px] flex flex-col", isModal ? "border-0 shadow-none" : "")}>
        {/* Top Header */}
        <div className="p-4 bg-surface-hover border-b border-divider flex items-center justify-between">
            <h3 className="font-semibold text-primary">Cold Room Calculator</h3>
            <span className="text-xs uppercase tracking-widest font-mono text-muted">{activeStep}</span>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 relative overflow-auto">
          <AnimatePresence mode="wait">
            {activeStep === 'general' && (
              <motion.div key="general" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Project ref.</label>
                    <Input value={projectRef} onChange={e => setProjectRef(e.target.value)} placeholder="Coldroom 1" />
                  </div>
                  <div className="space-y-1.5 hidden md:block"></div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Room temperature (°{tempUnit})</label>
                    <Input type="number" value={roomTemp} onChange={e => setRoomTemp(e.target.value)} placeholder="-18.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Outside temperature (°{tempUnit})</label>
                    <Input type="number" value={outsideTemp} onChange={e => setOutsideTemp(e.target.value)} placeholder="35.00" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Ventilation loss factor</label>
                    <select value={ventilationFactor} onChange={e => setVentilationFactor(e.target.value)} className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]">
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Running time installation (Hrs)</label>
                    <Input type="number" value={runningTime} onChange={e => setRunningTime(e.target.value)} placeholder="20" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Loading perc. room (%)</label>
                    <Input type="number" value={loadingPerc} onChange={e => setLoadingPerc(e.target.value)} placeholder="80" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'dimensions' && (
              <motion.div key="dimensions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Length ({lengthUnit})</label>
                    <Input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Width ({lengthUnit})</label>
                    <Input type="number" value={width} onChange={e => setWidth(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Height ({lengthUnit})</label>
                    <Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5 hidden md:block"></div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Insulation material</label>
                    <select value={insulation} onChange={e => setInsulation(e.target.value)} className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]">
                      <option value="Polyurethane">Polyurethane (PU/PIR)</option>
                      <option value="Polystyrene">Polystyrene (EPS)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Thickness ({smallLengthUnit})</label>
                    <Input type="number" value={thickness} onChange={e => setThickness(e.target.value)} placeholder="0" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Floor insulation</label>
                    <select value={floorInsulation} onChange={e => setFloorInsulation(e.target.value)} className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]">
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Yes + Concrete">Yes + Concrete</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'heat' && (
              <motion.div key="heat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Cooler fans (Watt)</label>
                      <Input type="number" value={fansWatt} onChange={e => setFansWatt(e.target.value)} placeholder="250.00" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Working time (Hrs/day)</label>
                      <Input type="number" value={fansTime} onChange={e => setFansTime(e.target.value)} placeholder="20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Illumination (Watt/m²)</label>
                      <Input type="number" value={illumination} onChange={e => setIllumination(e.target.value)} placeholder="15.00" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Working time (Hrs/day)</label>
                      <Input type="number" value={illumTime} onChange={e => setIllumTime(e.target.value)} placeholder="8" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Persons</label>
                      <Input type="number" value={persons} onChange={e => setPersons(e.target.value)} placeholder="2" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Working time (Hrs/day)</label>
                      <Input type="number" value={personsTime} onChange={e => setPersonsTime(e.target.value)} placeholder="8" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Other heat sources (Watt)</label>
                      <Input type="number" value={otherWatt} onChange={e => setOtherWatt(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-primary">Working time (Hrs/day)</label>
                      <Input type="number" value={otherTime} onChange={e => setOtherTime(e.target.value)} placeholder="0" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'product' && (
              <motion.div key="product" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Products</label>
                    <select value={productType} onChange={e => setProductType(e.target.value)} className="flex h-10 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)]">
                      <option value="Vegetables">Vegetables</option>
                      <option value="Meat">Meat / Poultry</option>
                      <option value="Fish">Fish / Seafood</option>
                      <option value="Dairy">Dairy</option>
                      <option value="Frozen">Frozen Goods</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 hidden md:block"></div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Storage quantity ({weightUnit})</label>
                    <Input type="number" value={storageQty} onChange={e => setStorageQty(e.target.value)} placeholder="15000" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Stock shift ({weightUnit})</label>
                    <Input type="number" value={stockShift} onChange={e => { setStockShift(e.target.value); setIsStockShiftEdited(true); }} placeholder="1500" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Entering temperature (°{tempUnit})</label>
                    <Input type="number" value={enteringTemp} onChange={e => setEnteringTemp(e.target.value)} placeholder="25.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-primary">Cool down/congel. time (Hrs)</label>
                    <Input type="number" value={coolDownTime} onChange={e => setCoolDownTime(e.target.value)} placeholder="24" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 'calculate' && (
              <motion.div key="calculate" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
                <div className="bg-surface-hover border border-divider rounded-xl p-5 space-y-3 shadow-inner">
                  <div className="flex justify-between items-center py-1 border-b border-divider/50">
                    <span className="text-secondary text-sm">Transmission losses</span>
                    <span className="font-medium text-primary">{calculateResults.transmissionLosses.toFixed(0)} Watt</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-divider/50">
                    <span className="text-secondary text-sm">Ventilation losses</span>
                    <span className="font-medium text-primary">{calculateResults.ventilationLosses.toFixed(0)} Watt</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-divider/50">
                    <span className="text-secondary text-sm">Other heat sources</span>
                    <span className="font-medium text-primary">{calculateResults.internalHeatSources.toFixed(0)} Watt</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-divider/50">
                    <span className="text-secondary text-sm">Cooling down/congel.</span>
                    <span className="font-medium text-primary">{calculateResults.productCooling.toFixed(0)} Watt</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-divider/50">
                    <span className="text-secondary text-sm">Respiration</span>
                    <span className="font-medium text-primary">{calculateResults.respiration.toFixed(0)} Watt</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b-2 border-divider">
                    <span className="font-bold text-primary">Subtotal</span>
                    <span className="font-bold text-primary">{calculateResults.subtotalWatts.toFixed(0)} Watt</span>
                  </div>

                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-secondary">Required capacity total</span>
                      <span className="text-3xl font-bold tracking-tight text-[var(--color-accent-600)] leading-none">{calculateResults.requiredCapacityKW.toFixed(2)} <span className="text-xl font-medium">kW</span></span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-secondary">Specific capacity</span>
                      <span className="text-xl font-semibold text-primary leading-none">{calculateResults.specificCapacity.toFixed(1)} <span className="text-sm text-muted">w/m³</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <Button variant="outline" onClick={() => setActiveStep('general')}>Reset</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Arrows for specific steps */}
        <div className="px-6 py-4 flex justify-between items-center bg-surface-hover/30 border-t border-divider">
          <Button variant="outline" size="sm" onClick={prevStep} disabled={activeStep === 'general'} className="w-12 h-10 p-0 rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <Button variant="primary" size="sm" onClick={nextStep} disabled={activeStep === 'calculate'} className="w-12 h-10 p-0 rounded-full bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)]">
            <ArrowRight size={20} />
          </Button>
        </div>

        {/* Bottom Tab Bar (App-like behavior) */}
        <div className="flex items-center justify-between border-t border-divider bg-surface px-2 py-3 mt-auto">
          <div className={stepClass('general')} onClick={() => setActiveStep('general')}>
            <ClipboardList size={22} className="mx-auto" />
            <span className="text-[10px] sm:text-xs font-semibold text-center mt-1">General</span>
          </div>
          <div className={stepClass('dimensions')} onClick={() => setActiveStep('dimensions')}>
            <Ruler size={22} className="mx-auto" />
            <span className="text-[10px] sm:text-xs font-semibold text-center mt-1">Dimensions</span>
          </div>
          <div className={stepClass('heat')} onClick={() => setActiveStep('heat')}>
            <ThermometerSun size={22} className="mx-auto" />
            <span className="text-[10px] sm:text-xs font-semibold text-center mt-1">Heat</span>
          </div>
          <div className={stepClass('product')} onClick={() => setActiveStep('product')}>
            <Apple size={22} className="mx-auto" />
            <span className="text-[10px] sm:text-xs font-semibold text-center mt-1">Product</span>
          </div>
          <div className={stepClass('calculate')} onClick={() => setActiveStep('calculate')}>
            <Calculator size={22} className="mx-auto" />
            <span className="text-[10px] sm:text-xs font-semibold text-center mt-1">Calculate</span>
          </div>
        </div>
      </div>
    </div>
  );
};
