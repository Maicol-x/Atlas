import React from 'react';
import { Shield, Sparkles, Terminal, Database } from 'lucide-react';
import { ApplicationSettings } from '../../../shared/types/atlas.types.ts';

interface AppHeaderProps {
  settings: ApplicationSettings | null;
  activeProjectName?: string;
  onOpenSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  settings,
  activeProjectName,
  onOpenSettings,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#0d121a] px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {activeProjectName ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Proyecto activo:</span>
            <span className="text-slate-200 font-medium px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700/60 font-mono">
              {activeProjectName}
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            Estación de Trabajo Técnico · Análisis y Verificación
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* Verification Engine Mode */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>Base Local Verificada</span>
        </div>

        {/* AI Provider Status */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          {settings?.geminiApiKeyConfigured ? (
            <span className="text-slate-300">Gemini Conectado</span>
          ) : (
            <span className="text-slate-400">Modo Local Offline</span>
          )}
        </div>

        {/* Execution Guard Policy */}
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200"
          title="Política de ejecución protegida: requiere autorización explícita"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sandbox Activo</span>
        </div>
      </div>
    </header>
  );
};
