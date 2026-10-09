import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FolderGit2,
  Terminal,
  ShieldCheck,
  FileCode,
  FileText,
  Play,
  RefreshCw,
  Loader2,
  CheckCircle,
  Database,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { ProjectMetadata, ProjectScanSummary } from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';
import { CommandRunnerModal } from '../components/evidence/CommandRunnerModal.tsx';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  onStartAudit: (projectId: string) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onStartAudit,
}) => {
  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [scanSummary, setScanSummary] = useState<ProjectScanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  // Command runner modal state
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [execCommand, setExecCommand] = useState('');
  const [execPurpose, setExecPurpose] = useState('');

  useEffect(() => {
    loadProjectDetails();
  }, [projectId]);

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      const res = await AtlasClient.getProject(projectId);
      setProject(res.project);
      setScanSummary(res.scanSummary);

      if (res.scanSummary?.entryPoints && res.scanSummary.entryPoints.length > 0) {
        loadFile(res.scanSummary.entryPoints[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (relPath: string) => {
    setSelectedFile(relPath);
    setFileLoading(true);
    try {
      const res = await AtlasClient.readFile(projectId, relPath);
      setFileContent(res.content);
    } catch (err: any) {
      setFileContent(`[Error al leer archivo: ${err.message}]`);
    } finally {
      setFileLoading(false);
    }
  };

  const handleLaunchScript = (scriptName: string, scriptCmd: string) => {
    setExecCommand(scriptCmd);
    setExecPurpose(`Ejecución supervisada del script '${scriptName}'`);
    setExecModalOpen(true);
  };

  if (loading || !project) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        <span>Cargando inventario del proyecto...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">{project.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {project.filesCount} archivos
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{project.path}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onStartAudit(project.id)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditar Especificación</span>
          </button>
        </div>
      </div>

      {/* Structural Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Languages */}
        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-sky-400" />
            <span>Lenguajes Detectados</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {project.detectedLanguages.map((l) => (
              <div key={l.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono text-[11px]">{l.name}</span>
                <span className="text-slate-500 font-mono text-[10px]">{l.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Frameworks */}
        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Frameworks y Librerías</span>
          </div>
          <div className="space-y-1 pt-1 text-xs">
            {scanSummary?.frameworks && scanSummary.frameworks.length > 0 ? (
              scanSummary.frameworks.map((fw) => (
                <div key={fw.name} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-200">{fw.name}</span>
                  <span className="text-slate-500 font-mono text-[10px]">{fw.evidenceFile}</span>
                </div>
              ))
            ) : (
              <span className="text-slate-500 text-xs">Ninguno identificado</span>
            )}
          </div>
        </div>

        {/* Databases */}
        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Bases de Datos Detectadas</span>
          </div>
          <div className="space-y-1 pt-1 text-xs">
            {project.detectedDatabases.length > 0 ? (
              project.detectedDatabases.map((db) => (
                <div key={db} className="text-slate-200 text-[11px]">
                  {db}
                </div>
              ))
            ) : (
              <span className="text-slate-500 text-xs">Sin bases de datos directas</span>
            )}
          </div>
        </div>

        {/* Test files & Entry points */}
        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Puntos de Entrada y Pruebas</span>
          </div>
          <div className="space-y-1 pt-1 text-[11px] font-mono">
            <div className="text-slate-300">
              Pruebas: {scanSummary?.testFiles.length || 0} archivos
            </div>
            <div className="text-slate-400 truncate">
              Entrada: {project.entryPoints.join(', ') || 'index'}
            </div>
          </div>
        </div>
      </div>

      {/* Available Scripts Panel */}
      {scanSummary?.scripts && scanSummary.scripts.length > 0 && (
        <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Scripts Detectados en Manifiestos ({scanSummary.scripts.length})
            </h3>
            <span className="text-[11px] text-slate-500">
              Ejecución protegida con autorización previa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scanSummary.scripts.map((script) => (
              <div
                key={script.name}
                className="p-3 bg-[#090d13] border border-slate-800 rounded flex items-center justify-between group hover:border-slate-700"
              >
                <div className="space-y-0.5 truncate mr-2">
                  <div className="text-xs font-semibold font-mono text-slate-200">
                    {script.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {script.command}
                  </div>
                </div>

                <button
                  onClick={() => handleLaunchScript(script.name, script.command)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0"
                >
                  <Play className="w-3 h-3" />
                  <span>Ejecutar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safe File Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Relevant Files List */}
        <div className="bg-[#0d121a] border border-slate-800 rounded-lg p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Archivos Clave Inspeccionables
          </h3>

          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
            {[
              ...(scanSummary?.entryPoints || []),
              ...(scanSummary?.manifests.map((m) => m.path) || []),
              ...(scanSummary?.testFiles.slice(0, 10) || []),
              ...(scanSummary?.configFiles.slice(0, 10) || []),
            ].map((f) => (
              <button
                key={f}
                onClick={() => loadFile(f)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono truncate transition-colors flex items-center justify-between ${
                  selectedFile === f
                    ? 'bg-sky-950 text-sky-200 border border-sky-800'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{f}</span>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* File Content Preview */}
        <div className="lg:col-span-2 bg-[#090d13] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300 truncate">
              {selectedFile || 'Selecciona un archivo para ver su contenido'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Modo Solo Lectura</span>
          </div>

          <div className="flex-1 p-4 overflow-auto max-h-96">
            {fileLoading ? (
              <div className="flex items-center justify-center p-8 text-slate-500 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                <span>Leyendo archivo...</span>
              </div>
            ) : fileContent ? (
              <pre className="font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre">
                {fileContent}
              </pre>
            ) : (
              <div className="p-8 text-center text-slate-600 text-xs">
                Selecciona un archivo del panel izquierdo para inspeccionar su código fuente.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controlled Execution Modal */}
      <CommandRunnerModal
        isOpen={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        projectId={project.id}
        defaultCommand={execCommand}
        defaultWorkingDirectory={project.path}
        purpose={execPurpose}
      />
    </div>
  );
};
