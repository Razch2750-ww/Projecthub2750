import React, { createContext, useContext, useEffect, useState } from 'react';
import { THEMES, AppTheme } from '../lib/themes';

interface ThemeContextType {
  currentTheme: AppTheme;
  setCurrentThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return localStorage.getItem('drafter_theme_id') || 'sepia-paper';
  });

  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

  useEffect(() => {
    localStorage.setItem('drafter_theme_id', currentTheme.id);
    const root = document.documentElement;
    const isLight = currentTheme.category === 'light';

    const setProp = (k: string, v: string) => root.style.setProperty(k, v);

    // Core Colors
    setProp('--bg-base', currentTheme.bg);
    setProp('--bg-surface', `color-mix(in srgb, ${currentTheme.bg} 96%, ${isLight ? 'black' : 'white'})`);
    setProp('--bg-surface-hover', `color-mix(in srgb, ${currentTheme.bg} 90%, ${isLight ? 'black' : 'white'})`);
    
    setProp('--text-primary', currentTheme.text);
    setProp('--text-secondary', `color-mix(in srgb, ${currentTheme.text} 80%, transparent)`);
    setProp('--text-muted', `color-mix(in srgb, ${currentTheme.text} 60%, transparent)`);
    setProp('--border-color', `color-mix(in srgb, ${currentTheme.text} 15%, transparent)`);

    // Accent 1 (Primary Accent for Monochromatic scale)
    setProp('--accent-50', `color-mix(in srgb, ${currentTheme.accent1} 10%, ${currentTheme.bg})`);
    setProp('--accent-100', `color-mix(in srgb, ${currentTheme.accent1} 20%, ${currentTheme.bg})`);
    setProp('--accent-200', `color-mix(in srgb, ${currentTheme.accent1} 40%, ${currentTheme.bg})`);
    setProp('--accent-300', `color-mix(in srgb, ${currentTheme.accent1} 60%, ${currentTheme.bg})`);
    setProp('--accent-400', `color-mix(in srgb, ${currentTheme.accent1} 80%, ${currentTheme.bg})`);
    setProp('--accent-500', currentTheme.accent1);
    setProp('--accent-600', `color-mix(in srgb, ${currentTheme.accent1} 80%, ${isLight ? 'black' : 'white'})`);
    setProp('--accent-700', `color-mix(in srgb, ${currentTheme.accent1} 60%, ${isLight ? 'black' : 'white'})`);
    setProp('--accent-800', `color-mix(in srgb, ${currentTheme.accent1} 40%, ${isLight ? 'black' : 'white'})`);
    setProp('--accent-900', `color-mix(in srgb, ${currentTheme.accent1} 20%, ${isLight ? 'black' : 'white'})`);
    setProp('--accent-950', `color-mix(in srgb, ${currentTheme.accent1} 10%, ${isLight ? 'black' : 'white'})`);

    // Palette Colors (Categorical)
    if (currentTheme.accents) {
      currentTheme.accents.forEach((color, i) => {
        setProp(`--palette-${i + 1}`, color);
      });
    }

    // Accent 2 (Secondary Accent - optionally accessible if needed)
    setProp('--color-accent2', currentTheme.accent2);

    // Base theme class for any standard tailwind overrides that might still exist
    if (isLight) {
      root.classList.remove('dark', 'amoled');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      if (currentTheme.category === 'amoled') {
         root.classList.add('amoled');
      } else {
         root.classList.remove('amoled');
      }
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setCurrentThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
