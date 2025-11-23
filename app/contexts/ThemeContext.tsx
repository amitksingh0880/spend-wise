import { getUserPreferences, saveUserPreferences } from '@/app/services/preferencesService';
import { Theme } from '@/types';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => Promise<void>;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAppTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  const loadTheme = async () => {
    try {
      const prefs = await getUserPreferences();
      setThemeState(prefs.theme || 'dark');
    } catch (err) {
      console.error('Failed to load theme preference', err);
    }
  };

  useEffect(() => { loadTheme(); }, []);

  const setTheme = async (t: Theme) => {
    try {
      await saveUserPreferences({ theme: t });
      setThemeState(t);
    } catch (err) {
      console.error('Failed to save theme preference', err);
    }
  };

  const refreshTheme = async () => { await loadTheme(); };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
