import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Play,
  History,
  Download,
  AlertTriangle,
  Code2,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  Loader2,
  ArrowRight,
  Terminal,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ProjectMetadata,
  AuditSession,
  AuditFinding,
  SpecificationRequirement,
  RequirementStatus,
  ExecutionResult,
} from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { CommandRunnerModal } from '../components/evidence/CommandRunnerModal.tsx';

interface AuditPageProps {
  initialProjectId?: string;
}

export const AuditPage: React.FC<AuditPageProps> = ({ initialProjectId }) => {
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '');
  const [specificationText, setSpecificationText] = useState(
`1. REQ-01: Almacenamiento persistente local con base de datos SQLite y migraciones versionadas.
2. REQ-02: Exploración segura de directorios locales en modo solo lectura sin ejecutar código desconocido.
3. REQ-03: Auditoría verificable con clasificación estricta (VERIFICADO, FALLIDO, INCOMPLETO, NO VERIFICABLE, NO IMPLEMENTADO).
4. REQ-04: Ejecución de comandos protegida con autorización explícita obligatoria del usuario y timeouts.
5. REQ-05: Eliminación de telemetría y privacidad estricta sin envío de código a servicios externos no autorizados.
6. REQ-06: Base de conocimiento personal para almacenar tecnologías, problemas y decisiones arquitectónicas.`
  );

  const [auditing, setAuditing] = useState(false);
  const [activeSession, setActiveSession] = useState<AuditSession | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditSession[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  // Command execution modal state for dynamic test verification
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [execCommand, setExecCommand] = useState('npm test');
  const [execPurpose, setExecPurpose] = useState('');

  // Comparison state
  const [compareSession, setCompareSession] = useState<AuditSession | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadAuditHistory(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const list = await AtlasClient.getProjects();
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditHistory = async (projId: string) => {
    try {
      const history = await AtlasClient.getAuditHistory(projId);
      setAuditHistory(history);
      if (history.length > 0 && !activeSession) {
        setActiveSession(history[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunAudit = async () => {
    if (!selectedProjectId || !specificationText.trim()) return;

    setAuditing(true);
    try {
      const session = await AtlasClient.runAudit(selectedProjectId, specificationText);
      setActiveSession(session);
      await loadAuditHistory(selectedProjectId);
    } catch (err: any) {
      alert(`Error al ejecutar auditoría: ${err.message}`);
    } finally {
      setAuditing(false);
    }
  };

  const toggleExpand = (findingId: string) => {
    setExpandedFindings((prev) => ({ ...prev, [findingId]: !prev[findingId] }));
  };

  const handleExportMarkdown = () => {
    if (!activeSession) return;
    const lines = [
      `# Informe de Auditoría Técnica — Atlas`,
      `**Proyecto:** ${activeSession.projectName}`,
      `**Fecha:** ${activeSession.createdAt}`,
      `**Sesión:** ${activeSession.id}`,
      ``,
      `## Resumen de Estados`,
      `- VERIFICADO: ${activeSession.verifiedCount}`,
      `- FALLIDO: ${activeSession.failedCount}`,
      `- INCOMPLETO: ${activeSession.incompleteCount}`,
      `- NO VERIFICABLE: ${activeSession.notVerifiableCount}`,
      `- NO IMPLEMENTADO: ${activeSession.notImplementedCount}`,
      ``,
      `## Hallazgos y Evidencias`,
    ];

    activeSession.findings.forEach((f) => {
      lines.push(`\n### [${f.status}] ${f.requirementCode}: ${f.requirementTitle}`);
      lines.push(`- **Diagnóstico:** ${f.summary}`);
      lines.push(`- **Fundamento:** ${f.rationale}`);
      lines.push(`- **Limitaciones:** ${f.limitations}`);
      if (f.evidence.length > 0) {
        lines.push(`- **Evidencia Registrada:**`);
        f.evidence.forEach((ev) => {
          lines.push(`  - \`${ev.filePath || 'Entorno'}\` (${ev.description})`);
          if (ev.snippet) {
            lines.push(`    \`\`\`\n    ${ev.snippet}\n    \`\`\``);
          }
        });
      }
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-auditoria-${activeSession.id}.md`;
    a.click();
  };

  const handleDynamicTestComplete = async (execResult: ExecutionResult) => {
    // If dynamic test execution was performed, we can re-evaluate with the test check!
    if (!activeSession) return;
    try {
      const updatedSession = await AtlasClient.runAudit(
        activeSession.projectId,
        activeSession.specificationText,
        undefined,
        [
          ...(activeSession.checksExecuted || []),
          {
            command: execResult.command,
            exitCode: execResult.exitCode ?? -1,
            durationMs: execResult.durationMs,
            authorized: true,
          },
        ]
      );
      setActiveSession(updatedSession);
      await loadAuditHistory(activeSession.projectId);
    } catch (err: any) {
      console.error('Error actualizando auditoría tras prueba', err);
    }
  };

  const filteredFindings = (activeSession?.findings || []).filter((f) => {
    if (filterStatus === 'all') return true;
    return f.status === filterStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
          Auditoría Verificable de Proyectos
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Contrasta especificaciones de requisitos con código fuente, configuraciones y pruebas reales.
        </p>
      </div>

      {/* Audit Setup & Specification Input */}
      <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Proyecto a Auditar
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {projects.length === 0 && <option value="">Sin proyectos registrados</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.path})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end justify-between">
            <div className="text-[11px] text-slate-400">
              Clasificación canónica de requisitos:
              <span className="text-emerald-400 ml-1">VERIFICADO</span> ·
              <span className="text-rose-400 ml-1">FALLIDO</span> ·
              <span className="text-amber-400 ml-1">INCOMPLETO</span> ·
              <span className="text-sky-400 ml-1">NO VERIFICABLE</span> ·
              <span className="text-slate-400 ml-1">NO IMPLEMENTADO</span>
            </div>

            <button
              onClick={handleRunAudit}
              disabled={auditing || !selectedProjectId}
              className={`flex items-center gap-2 px-5 py-2 rounded text-xs font-medium transition-colors ${
                auditing || !selectedProjectId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {auditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Auditando Código...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Ejecutar Auditoría</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Specification Editor */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">
            Especificación de Requisitos Técnicos
          </label>
          <textarea
            value={specificationText}
            onChange={(e) => setSpecificationText(e.target.value)}
            rows={5}
            className="w-full bg-[#090d13] border border-slate-700/80 rounded p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
            placeholder="Introduce los requisitos técnicos numerados o en viñetas..."
          />
        </div>
      </div>

      {/* Active Session Results */}
      {activeSession && (
        <div className="space-y-6">
          {/* Audit Metrics & Summary Bar */}
          <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-200">
                  Informe de Auditoría: {activeSession.projectName}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(activeSession.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeSession.requirementsCount} requisitos contrastados contra evidencia sintáctica y estática.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setExecCommand('npm test');
                  setExecPurpose('Comprobación dinámica de pruebas del proyecto');
                  setExecModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                title="Ejecutar comprobación de pruebas bajo supervisión"
              >
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span>Ejecutar Pruebas</span>
              </button>

              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Exportar MD</span>
              </button>
            </div>
          </div>

          {/* Interactive Filter Bar */}
          <div className="flex items-center gap-1.5 p-1 bg-[#090d13] border border-slate-800 rounded-lg text-xs overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                filterStatus === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({activeSession.requirementsCount})
            </button>
            <button
              onClick={() => setFilterStatus('VERIFICADO')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                filterStatus === 'VERIFICADO'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              VERIFICADOS ({activeSession.verifiedCount})
            </button>
            <button
              onClick={() => setFilterStatus('FALLIDO')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                filterStatus === 'FALLIDO'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              FALLIDOS ({activeSession.failedCount})
            </button>
            <button
              onClick={() => setFilterStatus('INCOMPLETO')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                filterStatus === 'INCOMPLETO'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              INCOMPLETOS ({activeSession.incompleteCount})
            </button>
            <button
              onClick={() => setFilterStatus('NO_VERIFICABLE')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                filterStatus === 'NO_VERIFICABLE'
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : 'text-slate-400 hover:text-sky-300'
              }`}
            >
              NO VERIFICABLE ({activeSession.notVerifiableCount})
            </button>
            <button
              onClick={() => setFilterStatus('NO_IMPLEMENTADO')}
              className={`px-3 py-1.5 rounded transition-colors font-medium ${
                filterStatus === 'NO_IMPLEMENTADO'
                  ? 'bg-slate-800 text-slate-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NO IMPLEMENTADO ({activeSession.notImplementedCount})
            </button>
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            {filteredFindings.map((finding) => {
              const isExpanded = expandedFindings[finding.id] ?? false;

              return (
                <div
                  key={finding.id}
                  className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-3 transition-colors hover:border-slate-700"
                >
                  {/* Finding Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2.5">
                        <StatusBadge status={finding.status} />
                        <span className="text-xs font-bold font-mono text-slate-200">
                          {finding.requirementCode}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-100">
                          {finding.requirementTitle}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {finding.summary}
                      </p>
                    </div>

                    <button
                      onClick={() => toggleExpand(finding.id)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title={isExpanded ? 'Contraer detalles' : 'Expandir evidencias'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Fundamento Técnico */}
                  <div className="pt-2 border-t border-slate-800/80 text-xs space-y-1">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                      Fundamento Técnico y Razón
                    </span>
                    <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                      {finding.rationale}
                    </p>
                  </div>

                  {/* Expanded Evidence & Limitations */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      <div>
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                          Limitaciones del Análisis
                        </span>
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                          {finding.limitations}
                        </p>
                      </div>

                      {finding.evidence.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
                            Evidencias Concretas Registradas ({finding.evidence.length})
                          </span>

                          <div className="space-y-2">
                            {finding.evidence.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-3 bg-[#090d13] border border-slate-800 rounded space-y-1.5 text-xs font-mono"
                              >
                                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                  <span className="text-sky-400 font-semibold truncate">
                                    {ev.filePath || 'Entorno de Ejecución'}
                                  </span>
                                  <span>
                                    {ev.lineStart ? `Líneas ${ev.lineStart}-${ev.lineEnd}` : ''}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-[11px]">{ev.description}</div>
                                {ev.snippet && (
                                  <pre className="p-2 bg-[#06090e] border border-slate-800/60 rounded text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                                    {ev.snippet}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controlled Execution Modal for dynamic testing */}
      <CommandRunnerModal
        isOpen={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        projectId={selectedProjectId}
        defaultCommand={execCommand}
        defaultWorkingDirectory={projects.find((p) => p.id === selectedProjectId)?.path || '.'}
        purpose={execPurpose}
        onExecutionCompleted={handleDynamicTestComplete}
      />
    </div>
  );
};
