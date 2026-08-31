import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { darkTheme, lightTheme, ThemeColors } from '@/constants/theme';
import { getCachedThemeMode, setCachedThemeMode, ThemeMode } from '@/utils/themeStorage';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    getCachedThemeMode().then((cached) => {
      if (cached) setModeState(cached);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setCachedThemeMode(next);
  };

  const colors = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
