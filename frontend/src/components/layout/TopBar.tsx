import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, Shield, Sun, Wifi, Activity, Palette, Check } from 'lucide-react';
import { useTheme, ThemeType } from '../../context/ThemeContext';

interface TopBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  showBadges?: boolean;
  isWsConnected?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSearch,
  placeholder = 'Search cases, targets, artifacts...',
  showBadges = false,
  isWsConnected = true,
}) => {
  const { theme, setTheme, themesList, meta } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-md px-6 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Search Input with Ctrl K */}
      <div className="flex-1 max-w-md relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="w-full pl-10 pr-16 py-2 bg-slate-900/80 border border-slate-800/90 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono shadow-inner"
          />
          <div className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-mono text-slate-400 select-none">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right controls: Badges, Theme, Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {showBadges && (
          <div className="hidden md:flex items-center gap-2">
            {/* Graph Engine Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Graph Engine</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-[10px] font-bold text-emerald-200">
                Active
              </span>
            </div>

            {/* Live WS Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isWsConnected ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>Live WS</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-900/60 text-[10px] font-bold text-cyan-200">
                {isWsConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        )}

        {/* Theme Picker Dropdown */}
        <div className="relative" ref={themeMenuRef}>
          <button
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Switch UI Theme"
          >
            <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px_rgba(var(--theme-glow),0.6)]" style={{ backgroundColor: meta.primary }} />
            <Palette className="w-4 h-4 text-slate-400" />
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b111e] border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
              <div className="text-[10px] text-slate-500 uppercase px-2.5 py-1 tracking-wider border-b border-slate-800/80 mb-1">
                WOOHP UI THEME
              </div>
              {themesList.map((t) => {
                const isCurrent = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id as ThemeType);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-slate-800/90 text-white font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.primary }}
                      />
                      <span>{t.label}</span>
                    </div>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-[1.5px] shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-indigo-900/80 via-slate-900 to-cyan-950/80 flex items-center justify-center text-cyan-300 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
          </div>
        </div>
      </div>
    </header>
  );
};
