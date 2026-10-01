import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Crosshair,
  Sparkles,
  Database,
  Globe,
  Network,
  Radar,
  FileText,
  Settings,
  Shield,
  Activity
} from 'lucide-react';

interface SidebarProps {
  onOpenNewCase?: () => void;
  onOpenGraph?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewCase, onOpenGraph }) => {
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
      color: 'text-cyan-400',
      activeColor: 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    },
    {
      label: 'Cases',
      icon: FolderKanban,
      path: '/cases',
      sublabel: 'Operations Center',
      color: 'text-amber-400',
    },

    {
      label: 'Targets',
      icon: Crosshair,
      path: '/targets',
      sublabel: 'Reconnaissance Pool',
      color: 'text-cyan-400',
    },

    {
      label: 'Clover',
      sublabel: 'Identity Recon',
      icon: Sparkles,
      path: '/clover',
      color: 'text-rose-400',
    },
    {
      label: 'Breaches',
      sublabel: 'Data Exposure',
      icon: Database,
      path: '/breaches',
      color: 'text-purple-400',
    },
    {
      label: 'Exposure',
      sublabel: 'Host & Asset Intel',
      icon: Globe,
      path: '/exposure',
      color: 'text-blue-400',
    },
    {
      label: 'Graph',
      sublabel: 'Investigation View',
      icon: Network,
      path: '/graph',
      color: 'text-emerald-400',
      onClick: onOpenGraph,
    },
    {
      label: 'Scans',
      sublabel: 'Scan Management',
      icon: Radar,
      path: '/scans',
      color: 'text-pink-400',
    },
    {
      label: 'Reports',
      icon: FileText,
      path: '/reports',
      color: 'text-rose-400',
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      color: 'text-slate-400',
    },
  ];

  return (
    <aside className="w-64 bg-[#080c14] border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0 relative overflow-hidden">
      {/* Background Cyber Glow & Watermark Silhouette */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/10 via-transparent to-slate-950/40 pointer-events-none" />
      <div 
        className="absolute bottom-20 -left-6 w-56 h-72 opacity-[0.06] pointer-events-none bg-contain bg-no-repeat bg-center"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(6,182,212,0.8) 0%, transparent 70%)`
        }}
      />

      {/* Top Header / Branding */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)] shrink-0">
          <span className="text-slate-950 font-black text-lg tracking-tighter">TS</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-wider text-slate-100 uppercase truncate">
              Totally Spies
            </span>
          </div>
          <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
            OSINT Suite v1.0
          </div>
          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-tight truncate">
            WOOHP Tactical Intelligence
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative z-10 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCasesList = location.pathname === '/cases';
          const isGraphRoute = location.pathname.startsWith('/cases/') && location.pathname !== '/cases';
          const isTargetsRoute = location.pathname === '/targets';
          let isActive = false;
          if (item.label === 'Cases') {
            isActive = isCasesList;
          } else if (item.label === 'Targets') {
            isActive = isTargetsRoute;
          } else if (item.label === 'Graph') {
            isActive = location.pathname === '/graph' || (location.pathname.startsWith('/cases/') && location.pathname !== '/cases');
          } else if (item.label === 'Clover') {
            isActive = location.pathname.startsWith('/clover');
          } else if (item.label === 'Breaches') {
            isActive = location.pathname.startsWith('/breaches');
          } else if (item.label === 'Exposure') {
            isActive = location.pathname.startsWith('/exposure');
          } else if (item.label === 'Scans') {
            isActive = location.pathname.startsWith('/scans');
          } else if (item.label === 'Reports') {
            isActive = location.pathname.startsWith('/reports');
          } else if (item.label === 'Settings') {
            isActive = location.pathname.startsWith('/settings');
          } else if (item.label === 'Dashboard') {
            isActive = location.pathname === '/';
          } else {
            isActive = location.pathname === item.path;
          }


          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={item.onClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group border ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300' : `${item.color} bg-slate-900/40`
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="truncate leading-tight text-xs">{item.label}</div>
                {item.sublabel && (
                  <div className="text-[10px] text-slate-500 font-mono truncate leading-none mt-0.5">
                    {item.sublabel}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom System Status & Version Pill */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 relative z-10 space-y-2.5">
        <div className="flex items-center justify-between px-2 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            SYSTEM
          </span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90 text-center">
          <div className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wider">
            v1.0.0
          </div>
          <div className="text-[9px] font-mono text-slate-400">
            Phase 1 &bull; Stable
          </div>
        </div>
      </div>
    </aside>
  );
};
