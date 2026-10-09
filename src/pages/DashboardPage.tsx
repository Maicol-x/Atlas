import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  ShieldCheck,
  Compass,
  ArrowRight,
  Clock,
  Code2,
  Database,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  ProjectMetadata,
  AuditSession,
  ResearchQuery,
} from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';

interface DashboardPageProps {
  onNavigate: (tab: 'projects' | 'research' | 'audits' | 'knowledge' | 'settings', projectId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditSession[]>([]);
  const [recentQueries, setRecentQueries] = useState<ResearchQuery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [pList, qList] = await Promise.all([
        AtlasClient.getProjects(),
        AtlasClient.getRecentQueries(),
      ]);
      setProjects(pList);
      setRecentQueries(qList);

      // Fetch audits for projects
      if (pList.length > 0) {
        const auditPromises = pList.slice(0, 3).map((p) => AtlasClient.getAuditHistory(p.id));
        const allAudits = (await Promise.all(auditPromises)).flat();
        allAudits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentAudits(allAudits.slice(0, 5));
      }
    } catch (err) {
      console.error('Error al cargar datos del dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title & Technical Purpose */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
          Estación de Control Técnico
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Inventario local persistente, auditoría verificable y exploración de tecnologías.
        </p>
      </div>

      {/* Metrics Row - Anti-slop: clean typography and real counts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Proyectos Registrados</span>
            <FolderGit2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{projects.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Inspeccionados de forma segura en disco
          </div>
        </div>

        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Auditorías Completadas</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{recentAudits.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Contrastadas con especificaciones reales
          </div>
        </div>

        <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Consultas Tecnológicas</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{recentQueries.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Con fuentes verificadas en base de datos
          </div>
        </div>
      </div>

      {/* Split View: Proyectos Recientes y Últimas Auditorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos Recientes */}
        <section className="bg-[#0d121a] border border-slate-800 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-sky-400" />
              Proyectos Inspeccionados
            </h3>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded">
              <Code2 className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No hay proyectos escaneados todavía.</p>
              <button
                onClick={() => onNavigate('projects')}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
              >
                Escanear Directorio Local
              </button>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('projects', p.id)}
                  className="p-3 bg-[#090d13] border border-slate-800/80 hover:border-slate-700 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {p.filesCount} archivos
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-1 font-mono">
                    {p.path}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                    <span>
                      {p.detectedLanguages.map((l) => `${l.name} (${l.percentage}%)`).slice(0, 2).join(' · ')}
                    </span>
                    {p.detectedFrameworks.length > 0 && (
                      <>
                        <span aria-hidden="true">/</span>
                        <span className="text-slate-300">{p.detectedFrameworks.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Últimas Auditorías */}
        <section className="bg-[#0d121a] border border-slate-800 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Últimas Auditorías Verificables
            </h3>
            <button
              onClick={() => onNavigate('audits')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>Ver auditorías</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentAudits.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded">
              <FileCheck className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No se han realizado auditorías aún.</p>
              <button
                onClick={() => onNavigate('audits')}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
              >
                Auditar Especificación
              </button>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {recentAudits.map((a) => (
                <div
                  key={a.id}
                  onClick={() => onNavigate('audits')}
                  className="p-3 bg-[#090d13] border border-slate-800/80 hover:border-slate-700 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{a.projectName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono">
                    <span className="text-emerald-400">{a.verifiedCount} VERIFICADOS</span>
                    <span className="text-rose-400">{a.failedCount} FALLIDOS</span>
                    <span className="text-amber-400">{a.incompleteCount} INCOMPLETOS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Investigaciones Tecnológicas Recientes */}
      <section className="bg-[#0d121a] border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            Investigaciones Tecnológicas Recientes
          </h3>
          <button
            onClick={() => onNavigate('research')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>Explorar problema</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentQueries.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded">
            <p className="text-xs text-slate-400">
              Describe un problema técnico en lenguaje natural para descubrir librerías y patrones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentQueries.slice(0, 4).map((q) => (
              <div
                key={q.id}
                onClick={() => onNavigate('research')}
                className="p-3.5 bg-[#090d13] border border-slate-800/80 hover:border-slate-700 rounded cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium truncate max-w-[280px]">
                    "{q.problemDescription}"
                  </span>
                  <span className="text-slate-500 text-[10px] font-mono">
                    {q.technologies.length} tecnologías
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{q.technologies.map((t) => t.name).join(' · ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
