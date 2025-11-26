import { getUserPreferences, saveUserPreferences } from '@/app/services/preferencesService';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'dark';
  if (!ctx) {
    // Provide a safe fallback to avoid exceptions during route tree build before ThemeProvider is mounted
    return {
      theme: colorScheme as Theme,
      setTheme: async (t: Theme) => {},
      refreshTheme: async () => {},
    } as { theme: Theme; setTheme: any; refreshTheme: any };
  }
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
