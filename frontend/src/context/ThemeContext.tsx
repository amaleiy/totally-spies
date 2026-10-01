import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'cyan' | 'rose' | 'emerald' | 'amber';

export interface ThemeMeta {
  id: ThemeType;
  label: string;
  sublabel: string;
  primary: string;
  secondary: string;
  glowRgb: string;
  borderClass: string;
  badgeClass: string;
}

export const THEMES: Record<ThemeType, ThemeMeta> = {
  cyan: {
    id: 'cyan',
    label: 'WOOHP Cyan',
    sublabel: 'Tactical Command & Operations',
    primary: '#06b6d4',
    secondary: '#14b8a6',
    glowRgb: '6, 182, 212',
    borderClass: 'border-cyan-500/50',
    badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
  },
  rose: {
    id: 'rose',
    label: 'Clover Rose',
    sublabel: 'Neon Pink Identity Reconnaissance',
    primary: '#f43f5e',
    secondary: '#ec4899',
    glowRgb: '244, 63, 94',
    borderClass: 'border-rose-500/50',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
  },
  emerald: {
    id: 'emerald',
    label: 'Sam Emerald',
    sublabel: 'Cyber Intelligence & Cryptography',
    primary: '#10b981',
    secondary: '#059669',
    glowRgb: '16, 185, 129',
    borderClass: 'border-emerald-500/50',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
  },
  amber: {
    id: 'amber',
    label: 'Alex Amber',
    sublabel: 'Tactical Pursuit & Infrastructure',
    primary: '#f59e0b',
    secondary: '#d97706',
    glowRgb: '245, 158, 11',
    borderClass: 'border-amber-500/50',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
  },
};

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  meta: ThemeMeta;
  themesList: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'cyan',
  setTheme: () => {},
  meta: THEMES.cyan,
  themesList: Object.values(THEMES),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('totally_spies_theme');
    if (saved && (saved in THEMES)) {
      return saved as ThemeType;
    }
    return 'cyan';
  });

  const applyTheme = (targetTheme: ThemeType) => {
    const meta = THEMES[targetTheme] || THEMES.cyan;
    document.documentElement.setAttribute('data-theme', targetTheme);
    document.documentElement.style.setProperty('--theme-primary', meta.primary);
    document.documentElement.style.setProperty('--theme-secondary', meta.secondary);
    document.documentElement.style.setProperty('--theme-glow', meta.glowRgb);
    localStorage.setItem('totally_spies_theme', targetTheme);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    // Asynchronously sync with backend settings if available
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interface: { theme: newTheme } }),
    }).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        meta: THEMES[theme] || THEMES.cyan,
        themesList: Object.values(THEMES),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
