import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Search,
  FolderOpen,
  Loader2,
  AlertCircle,
  FileCode2,
  Terminal,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { ProjectMetadata, ProjectScanSummary, FileTreeNode } from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';

interface ProjectsPageProps {
  onSelectProject: (projectId: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [inputPath, setInputPath] = useState('.');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await AtlasClient.getProjects();
      setProjects(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanDirectory = async () => {
    if (!inputPath.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await AtlasClient.scanDirectory(inputPath.trim());
      await loadProjects();
      onSelectProject(res.project.id);
    } catch (err: any) {
      setError(err.message || 'Error al escanear directorio');
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este registro de proyecto de la base de datos local?')) return;
    try {
      await AtlasClient.deleteProject(id);
      await loadProjects();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
          Proyectos de Software
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Inspección estática de repositorios locales: estructura, dependencias, frameworks y scripts verificables.
        </p>
      </div>

      {/* Directory Scanner Bar */}
      <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-3">
        <label className="block text-xs font-medium text-slate-300">
          Seleccionar o Introducir Ruta de Directorio Local
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <FolderOpen className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="Ej: . o /home/user/project o C:\Workspace\my-app"
              disabled={scanning}
              className="w-full bg-[#090d13] border border-slate-700/80 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            onClick={handleScanDirectory}
            disabled={scanning || !inputPath.trim()}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-medium transition-colors ${
              scanning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
            }`}
          >
            {scanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Inspeccionando...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Inspeccionar Proyecto</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span>* La inspección estática es estrictamente de solo lectura. No ejecuta código, pruebas ni instala dependencias.</span>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Proyectos Registrados ({projects.length})
          </h3>
          <button
            onClick={loadProjects}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span>Cargando proyectos desde SQLite...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
            No hay proyectos inspeccionados aún. Ingresa '.' para escanear el repositorio actual.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className="p-5 bg-[#0d121a] border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-sm">
                      {p.path}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(e, p.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </div>
                </div>

                {/* Languages breakdown */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Lenguajes identificados</span>
                    <span className="font-mono text-slate-500">{p.filesCount} archivos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    {p.detectedLanguages.slice(0, 3).map((lang) => (
                      <span key={lang.name} className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <span>{lang.name}</span>
                        <span className="text-slate-500">({lang.percentage}%)</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Frameworks & Package Managers */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500">Frameworks:</span>
                    <span className="text-slate-200">
                      {p.detectedFrameworks.length > 0 ? p.detectedFrameworks.join(', ') : 'Ninguno detectado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-slate-500 shrink-0">
                    <Terminal className="w-3 h-3" />
                    <span>{Object.keys(p.availableScripts || {}).length} scripts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
