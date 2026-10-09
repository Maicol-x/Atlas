import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  Sparkles,
  Loader2,
  ExternalLink,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  BookOpen,
  Filter,
} from 'lucide-react';
import { TechnologyRecord, ResearchQuery } from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';

export const TechnologyExplorerPage: React.FC = () => {
  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState<ResearchQuery | null>(null);
  const [recentQueries, setRecentQueries] = useState<ResearchQuery[]>([]);
  const [selectedTechsForComparison, setSelectedTechsForComparison] = useState<TechnologyRecord[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadRecentQueries();
  }, []);

  const loadRecentQueries = async () => {
    try {
      const list = await AtlasClient.getRecentQueries();
      setRecentQueries(list);
      if (list.length > 0 && !activeQuery) {
        setActiveQuery(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim()) return;

    setLoading(true);
    try {
      const result = await AtlasClient.exploreProblem(queryInput.trim());
      setActiveQuery(result);
      setSelectedTechsForComparison([]);
      setShowComparison(false);
      await loadRecentQueries();
    } catch (err: any) {
      alert(`Error en la investigación: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompare = (tech: TechnologyRecord) => {
    if (selectedTechsForComparison.some((t) => t.id === tech.id)) {
      setSelectedTechsForComparison(selectedTechsForComparison.filter((t) => t.id !== tech.id));
    } else {
      if (selectedTechsForComparison.length >= 3) {
        alert('Puedes comparar un máximo de 3 tecnologías simultáneamente.');
        return;
      }
      setSelectedTechsForComparison([...selectedTechsForComparison, tech]);
    }
  };

  const handleSaveToKnowledge = async (tech: TechnologyRecord) => {
    try {
      await AtlasClient.saveKnowledge({
        id: `know-${Date.now()}`,
        title: `${tech.name}: Solución para ${tech.problemSolved}`,
        content: `Mecanismo: ${tech.howItWorks}\n\nCuándo usar: ${tech.whenToUse}\n\nLimitaciones: ${tech.limitations.join(', ')}`,
        category: tech.category,
        tags: [tech.name, ...tech.ecosystem],
        relatedTechnology: tech.name,
        sourceUrl: tech.sources[0]?.url,
        verifiedConclusion: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSavedSuccess(tech.name);
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
          Explorador Tecnológico Personal
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Describe tu problema técnico en lenguaje natural y descubre soluciones, arquitecturas y librerías verificadas.
        </p>
      </div>

      {/* Natural Language Query Bar */}
      <form onSubmit={handleSearch} className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-3">
        <label className="block text-xs font-medium text-slate-300">
          ¿Qué problema técnico necesitas resolver?
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Compass className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ej: colas de tareas en segundo plano con reintentos para Node.js, base de datos analítica local..."
              disabled={loading}
              className="w-full bg-[#090d13] border border-slate-700/80 rounded pl-9 pr-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !queryInput.trim()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded text-xs font-medium transition-colors ${
              loading
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Investigando...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Investigar Tecnologías</span>
              </>
            )}
          </button>
        </div>

        {/* Quick query presets */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 flex-wrap">
          <span className="text-slate-500">Ejemplos rápidos:</span>
          {[
            'procesamiento de tareas asíncronas en segundo plano',
            'base de datos analítica local sin servidor',
            'búsqueda predictiva con tolerancia a errores tipográficos',
            'arquitectura limpia y aislamiento de dominio',
            'búsqueda semántica y embeddings vectoriales',
          ].map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => {
                setQueryInput(preset);
              }}
              className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </form>

      {/* Query Results & Technology Cards */}
      {activeQuery && (
        <div className="space-y-6">
          {/* Query Summary Banner */}
          <div className="p-4 bg-[#090d13] border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Resultados para: "{activeQuery.problemDescription}"
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {activeQuery.offlineMode ? 'Modo Offline / Local' : 'Proveedor Grounded'}
                </span>
              </div>
              {activeQuery.comparisonSummary && (
                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                  {activeQuery.comparisonSummary}
                </p>
              )}
            </div>

            {/* Compare Trigger */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedTechsForComparison.length >= 2 && (
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {showComparison ? 'Ocultar Comparativa' : `Comparar (${selectedTechsForComparison.length})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Warnings if offline or limited */}
          {activeQuery.warnings.length > 0 && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs text-slate-400 space-y-1">
              {activeQuery.warnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Success Banner */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>"{savedSuccess}" guardado correctamente en la Base de Conocimiento.</span>
            </div>
          )}

          {/* Side-by-Side Comparison Matrix */}
          {showComparison && selectedTechsForComparison.length >= 2 && (
            <div className="p-5 bg-[#0d121a] border border-sky-800/60 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Matriz Comparativa Técnica
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="p-2.5 bg-[#090d13] w-48">Dimensión</th>
                      {selectedTechsForComparison.map((t) => (
                        <th key={t.id} className="p-2.5 bg-[#090d13] font-bold text-slate-200">
                          {t.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="p-2.5 font-medium text-slate-400 bg-slate-900/30">Problema</td>
                      {selectedTechsForComparison.map((t) => (
                        <td key={t.id} className="p-2.5 text-slate-300 leading-relaxed">
                          {t.problemSolved}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-400 bg-slate-900/30">Mecanismo</td>
                      {selectedTechsForComparison.map((t) => (
                        <td key={t.id} className="p-2.5 text-slate-300 leading-relaxed font-mono text-[11px]">
                          {t.howItWorks}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-400 bg-slate-900/30">Prerrequisitos</td>
                      {selectedTechsForComparison.map((t) => (
                        <td key={t.id} className="p-2.5 text-slate-300">
                          {t.prerequisites.join(', ')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-400 bg-slate-900/30">Limitaciones</td>
                      {selectedTechsForComparison.map((t) => (
                        <td key={t.id} className="p-2.5 text-rose-300/90 leading-relaxed">
                          {t.limitations.join('; ')}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-400 bg-slate-900/30">Cuándo Conviene</td>
                      {selectedTechsForComparison.map((t) => (
                        <td key={t.id} className="p-2.5 text-emerald-300/90 leading-relaxed">
                          {t.whenToUse}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Technology Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeQuery.technologies.map((tech) => {
              const isSelectedForCompare = selectedTechsForComparison.some((t) => t.id === tech.id);

              return (
                <div
                  key={tech.id}
                  className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-100">{tech.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                            {tech.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {tech.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSaveToKnowledge(tech)}
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Guardar en Base de Conocimiento"
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* How it works */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                        ¿Cómo funciona internamente?
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono text-[11px] bg-[#090d13] p-2.5 rounded border border-slate-800/80">
                        {tech.howItWorks}
                      </p>
                    </div>

                    {/* Prerequisites & Limitations */}
                    <div className="space-y-2 pt-1 text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Prerrequisitos: </span>
                        <span className="text-slate-300">{tech.prerequisites.join(' · ')}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 font-medium">Limitaciones: </span>
                        <span className="text-slate-300">{tech.limitations.join('; ')}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-medium">Cuándo usar: </span>
                        <span className="text-slate-300">{tech.whenToUse}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Alternativas: </span>
                        <span className="text-slate-400">{tech.alternatives.join(', ')}</span>
                      </div>
                    </div>

                    {/* Verified sources */}
                    {tech.sources.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                          Fuentes Verificadas
                        </span>
                        <div className="space-y-1">
                          {tech.sources.map((s) => (
                            <div key={s.id} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 truncate">{s.title}</span>
                              {s.url && (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono text-[10px] ml-2 shrink-0"
                                >
                                  <span>Doc</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleCompare(tech)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        isSelectedForCompare
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isSelectedForCompare ? 'Seleccionada para comparar' : 'Añadir a comparativa'}
                    </button>

                    <div className="text-[10px] font-mono text-slate-500">
                      Madurez: <span className="text-slate-300 uppercase">{tech.maturity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
