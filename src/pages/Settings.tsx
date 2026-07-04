import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Palette, Globe, Ruler } from 'lucide-react';
import { cn } from '../lib/utils';
import { THEMES } from '../lib/themes';

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-surface border border-divider shadow-sm rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("px-6 py-4 border-b border-divider bg-surface-hover/30", className)}>
    {children}
  </div>
);

const CardTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h3 className={cn("font-semibold text-primary", className)}>
    {children}
  </h3>
);

const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

export const Settings = () => {
  const { currentTheme, setCurrentThemeId } = useTheme();
  const { 
    language, setLanguage, 
    lengthUnit, setLengthUnit,
    smallLengthUnit, setSmallLengthUnit,
    weightUnit, setWeightUnit,
    tempUnit, setTempUnit
  } = useSettings();

  const UnitToggle = ({ label, value, options, onChange }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-divider/50 last:border-0 gap-2">
      <span className="text-secondary text-sm shrink-0">{label}</span>
      <div className="flex flex-wrap bg-surface rounded-lg border border-divider p-1">
        {options.map((opt: any) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex-1 text-center min-w-[40px]",
              value === opt.value
                ? "bg-[var(--color-accent-600)] text-white shadow-sm"
                : "text-secondary hover:text-primary hover:bg-surface-hover"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-primary tracking-tight">Pengaturan</h2>
        <p className="text-secondary mt-1">Sesuaikan preferensi aplikasi Anda di sini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language & Units */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[var(--color-accent-600)]" />
              Preferensi Umum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">Bahasa (Language)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanguage('id')}
                  className={cn(
                    "px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-all",
                    language === 'id'
                      ? "border-[var(--color-accent-600)] bg-[var(--color-accent-100)] dark:bg-[var(--color-accent-900)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)] ring-1 ring-[var(--color-accent-600)]"
                      : "border-divider bg-surface text-secondary hover:bg-surface-hover"
                  )}
                >
                  <span className="font-semibold px-2 py-0.5 rounded text-xs bg-surface border border-divider shadow-sm">ID</span>
                  Indonesia
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-all",
                    language === 'en'
                      ? "border-[var(--color-accent-600)] bg-[var(--color-accent-100)] dark:bg-[var(--color-accent-900)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)] ring-1 ring-[var(--color-accent-600)]"
                      : "border-divider bg-surface text-secondary hover:bg-surface-hover"
                  )}
                >
                  <span className="font-semibold px-2 py-0.5 rounded text-xs bg-surface border border-divider shadow-sm">EN</span>
                  English
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-primary flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Satuan Ukuran
              </label>
              <div className="bg-surface-hover/30 border border-divider rounded-xl px-4 py-2">
                <UnitToggle 
                  label="Panjang / Dimensi (Besar)" 
                  value={lengthUnit} 
                  onChange={setLengthUnit} 
                  options={[
                    { label: 'km', value: 'km' },
                    { label: 'm', value: 'm' },
                    { label: 'cm', value: 'cm' },
                    { label: 'mm', value: 'mm' },
                    { label: 'ft', value: 'ft' },
                    { label: 'in', value: 'in' },
                  ]} 
                />
                <UnitToggle 
                  label="Tebal / Dimensi (Kecil)" 
                  value={smallLengthUnit} 
                  onChange={setSmallLengthUnit} 
                  options={[
                    { label: 'km', value: 'km' },
                    { label: 'm', value: 'm' },
                    { label: 'cm', value: 'cm' },
                    { label: 'mm', value: 'mm' },
                    { label: 'ft', value: 'ft' },
                    { label: 'in', value: 'in' },
                  ]} 
                />
                <UnitToggle 
                  label="Berat" 
                  value={weightUnit} 
                  onChange={setWeightUnit} 
                  options={[
                    { label: 'ton', value: 'ton' },
                    { label: 'kg', value: 'kg' },
                    { label: 'g', value: 'g' },
                    { label: 'lbs', value: 'lbs' },
                  ]} 
                />
                <UnitToggle 
                  label="Suhu" 
                  value={tempUnit} 
                  onChange={setTempUnit} 
                  options={[{ label: '°C', value: 'C' }, { label: '°F', value: 'F' }]} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[var(--color-accent-600)]" />
              Tampilan & Tema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 h-96 overflow-y-auto pr-2 custom-scrollbar">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCurrentThemeId(t.id)}
                  className={cn(
                    'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all',
                    currentTheme.id === t.id
                      ? 'border-[var(--color-accent-600)] ring-1 ring-[var(--color-accent-600)] bg-surface'
                      : 'border-divider bg-surface hover:bg-surface-hover text-secondary'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-4 h-4 rounded-full border border-divider shrink-0" style={{ backgroundColor: t.bg }} />
                    <span className={cn('font-medium text-sm truncate', currentTheme.id === t.id ? 'text-primary' : '')}>
                      {t.name}
                    </span>
                  </div>
                  <div className="flex gap-1 w-full mt-1">
                    <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: t.accent1 }} />
                    <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: t.accent2 }} />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
