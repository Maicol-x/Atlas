import React, { useState } from 'react';
import { Terminal, AlertTriangle, Play, X, Loader2, Check, ShieldAlert } from 'lucide-react';
import { ExecutionRequest, ExecutionResult } from '../../../shared/types/atlas.types.ts';
import { AtlasClient } from '../../services/api.ts';

interface CommandRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  defaultCommand?: string;
  defaultWorkingDirectory?: string;
  purpose?: string;
  onExecutionCompleted?: (result: ExecutionResult) => void;
}

export const CommandRunnerModal: React.FC<CommandRunnerModalProps> = ({
  isOpen,
  onClose,
  projectId,
  defaultCommand = 'npm test',
  defaultWorkingDirectory = '.',
  purpose = 'Verificación dinámica de pruebas del proyecto',
  onExecutionCompleted,
}) => {
  const [command, setCommand] = useState(defaultCommand);
  const [workingDirectory, setWorkingDirectory] = useState(defaultWorkingDirectory);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!isAuthorized) {
      setError('Se requiere autorización explícita antes de la ejecución.');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const execResult = await AtlasClient.runCommand({
        projectId,
        command,
        workingDirectory,
        purpose,
        authorizedByUser: true,
      });

      setResult(execResult);
      if (onExecutionCompleted) {
        onExecutionCompleted(execResult);
      }
    } catch (err: any) {
      setError(err.message || 'Error en la ejecución del comando');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = async () => {
    if (result?.id && isRunning) {
      await AtlasClient.cancelExecution(result.id);
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f141c] border border-slate-700/80 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Ejecución Controlada de Comprobación
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Warning banner */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-300">Control de Seguridad y Verificación</p>
              <p className="text-amber-200/80 leading-relaxed">
                Atlas nunca ejecuta código de manera inadvertida. Revisa el comando y el directorio
                de trabajo antes de autorizar su ejecución.
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Comando a Ejecutar
              </label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={isRunning}
                className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Directorio de Trabajo
              </label>
              <input
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                disabled={isRunning}
                className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Propósito</label>
              <p className="text-slate-300 bg-slate-900/60 px-3 py-2 rounded border border-slate-800">
                {purpose}
              </p>
            </div>
          </div>

          {/* Authorization Checkbox */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isAuthorized}
                onChange={(e) => setIsAuthorized(e.target.checked)}
                disabled={isRunning}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-0 bg-[#090d13]"
              />
              <span className="text-slate-300 font-medium">
                Autorizo explícitamente la ejecución de este comando bajo supervisión en el sistema local.
              </span>
            </label>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Execution Result Log */}
          {result && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span>Código de Salida:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      result.exitCode === 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {result.exitCode ?? 'Desconocido'}
                  </span>
                </div>
                <span>Duración: {result.durationMs}ms</span>
              </div>

              {result.stdout && (
                <div>
                  <div className="text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wider">
                    Salida Estándar (STDOUT)
                  </div>
                  <pre className="p-3 bg-[#090d13] border border-slate-800 rounded font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {result.stdout}
                  </pre>
                </div>
              )}

              {result.stderr && (
                <div>
                  <div className="text-[10px] text-rose-400 mb-1 font-mono uppercase tracking-wider">
                    Errores (STDERR)
                  </div>
                  <pre className="p-3 bg-rose-950/20 border border-rose-900/50 rounded font-mono text-[11px] text-rose-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {result.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded text-xs font-medium transition-colors"
              >
                Cancelar Proceso
              </button>
            ) : (
              <button
                onClick={handleExecute}
                disabled={!isAuthorized}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                  isAuthorized
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Autorizar y Ejecutar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
