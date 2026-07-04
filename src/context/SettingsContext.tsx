import React, { createContext, useContext, useEffect, useState } from 'react';

type Language = 'id' | 'en';
type LengthUnit = 'km' | 'm' | 'cm' | 'mm' | 'ft' | 'in';
type SmallLengthUnit = 'km' | 'm' | 'cm' | 'mm' | 'ft' | 'in';
type WeightUnit = 'ton' | 'kg' | 'g' | 'lbs';
type TempUnit = 'C' | 'F';

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  
  lengthUnit: LengthUnit;
  setLengthUnit: (unit: LengthUnit) => void;
  
  smallLengthUnit: SmallLengthUnit;
  setSmallLengthUnit: (unit: SmallLengthUnit) => void;

  weightUnit: WeightUnit;
  setWeightUnit: (unit: WeightUnit) => void;

  tempUnit: TempUnit;
  setTempUnit: (unit: TempUnit) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'id';
  });
  
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>(() => {
    return (localStorage.getItem('app_length_v2') as LengthUnit) || 'mm';
  });

  const [smallLengthUnit, setSmallLengthUnit] = useState<SmallLengthUnit>(() => {
    return (localStorage.getItem('app_small_length_v2') as SmallLengthUnit) || 'mm';
  });

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(() => {
    return (localStorage.getItem('app_weight') as WeightUnit) || 'kg';
  });

  const [tempUnit, setTempUnit] = useState<TempUnit>(() => {
    return (localStorage.getItem('app_temp') as TempUnit) || 'C';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app_length_v2', lengthUnit);
  }, [lengthUnit]);

  useEffect(() => {
    localStorage.setItem('app_small_length_v2', smallLengthUnit);
  }, [smallLengthUnit]);

  useEffect(() => {
    localStorage.setItem('app_weight', weightUnit);
  }, [weightUnit]);

  useEffect(() => {
    localStorage.setItem('app_temp', tempUnit);
  }, [tempUnit]);

  return (
    <SettingsContext.Provider value={{ 
        language, setLanguage, 
        lengthUnit, setLengthUnit,
        smallLengthUnit, setSmallLengthUnit,
        weightUnit, setWeightUnit,
        tempUnit, setTempUnit
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
