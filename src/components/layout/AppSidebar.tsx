import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Compass,
  ShieldCheck,
  BookMarked,
  Settings,
  HardDrive,
  Cpu,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'projects' | 'research' | 'audits' | 'knowledge' | 'settings';

interface AppSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  projectsCount: number;
  auditsCount: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
  projectsCount,
  auditsCount,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Inicio', icon: LayoutDashboard },
    { id: 'projects' as NavTab, label: 'Proyectos', icon: FolderGit2, count: projectsCount },
    { id: 'research' as NavTab, label: 'Explorador Tecnológico', icon: Compass },
    { id: 'audits' as NavTab, label: 'Auditorías', icon: ShieldCheck, count: auditsCount },
    { id: 'knowledge' as NavTab, label: 'Base de Conocimiento', icon: BookMarked },
    { id: 'settings' as NavTab, label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090d13] border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">Atlas</h1>
            <p className="text-[11px] text-slate-400">Auditor & Explorador</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-3.5 border-t border-slate-800/80 text-[11px] text-slate-500 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Almacenamiento SQLite</span>
          </div>
          <span className="text-emerald-400 font-mono text-[10px]">LOCAL</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Entorno Privado · Sin Telemetría
        </div>
      </div>
    </aside>
  );
};
