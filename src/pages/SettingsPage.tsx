import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Database,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Terminal,
  Save,
} from 'lucide-react';
import { ApplicationSettings } from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await AtlasClient.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const updated = await AtlasClient.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error al guardar configuración: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        <span>Cargando configuración del sistema...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
          Configuración y Políticas de Seguridad
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ajustes de persistencia local, políticas de ejecución protegida y privacidad de auditorías.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Proveedor de Investigación */}
        <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Proveedor de Investigación Tecnológica
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Modo de Operación</label>
              <select
                value={settings.researchProvider}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    researchProvider: e.target.value as 'local_first' | 'gemini_grounded',
                  })
                }
                className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="local_first">
                  Local-First: Consultar base local verificada (offline-first)
                </option>
                <option value="gemini_grounded">
                  Gemini Grounded: Ampliar consultas con fuentes externas oficiales
                </option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-300 font-medium">Estado de GEMINI_API_KEY: </span>
                <span className="text-slate-400">
                  {settings.geminiApiKeyConfigured
                    ? 'Configurada en el entorno (Activa)'
                    : 'No configurada (Operando en modo local 100% autónomo)'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800">
                {settings.geminiApiKeyConfigured ? 'LISTA' : 'AUTÓNOMO'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="offlineOnly"
                checked={settings.offlineOnly}
                onChange={(e) => setSettings({ ...settings, offlineOnly: e.target.checked })}
                className="rounded border-slate-700 text-sky-500 bg-[#090d13]"
              />
              <label htmlFor="offlineOnly" className="text-slate-300 cursor-pointer">
                Forzar modo sin conexión estricto (no realizar ninguna llamada externa de red)
              </label>
            </div>
          </div>
        </div>

        {/* Políticas de Ejecución y Sandbox */}
        <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Políticas de Ejecución Supervisada
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requireExplicitAuth"
                checked={settings.requireExplicitExecutionAuth}
                onChange={(e) =>
                  setSettings({ ...settings, requireExplicitExecutionAuth: e.target.checked })
                }
                className="rounded border-slate-700 text-sky-500 bg-[#090d13]"
              />
              <label htmlFor="requireExplicitAuth" className="text-slate-300 cursor-pointer font-medium">
                Exigir autorización explícita obligatoria antes de ejecutar cualquier comando en disco
              </label>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Tiempo Límite Máximo de Ejecución (segundos)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={settings.maxExecutionTimeoutSeconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxExecutionTimeoutSeconds: Number(e.target.value) || 30,
                  })
                }
                className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Si un proceso excede este límite, Atlas enviará SIGTERM y SIGKILL automáticamente para evitar procesos zombi.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Tamaño Máximo de Archivo a Inspeccionar (KB)
              </label>
              <input
                type="number"
                min={128}
                max={10240}
                value={settings.maxFileSizeToInspectKB}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxFileSizeToInspectKB: Number(e.target.value) || 2048,
                  })
                }
                className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Privacidad & Reportes */}
        <div className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Privacidad y Enmascaramiento de Secretos
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maskSecrets"
                checked={settings.maskSecretsInReports}
                onChange={(e) =>
                  setSettings({ ...settings, maskSecretsInReports: e.target.checked })
                }
                className="rounded border-slate-700 text-sky-500 bg-[#090d13]"
              />
              <label htmlFor="maskSecrets" className="text-slate-300 cursor-pointer">
                Enmascarar tokens, contraseñas y claves de API detectadas en informes de evidencia
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="disableTelemetry"
                checked={settings.disableTelemetry}
                onChange={(e) =>
                  setSettings({ ...settings, disableTelemetry: e.target.checked })
                }
                className="rounded border-slate-700 text-sky-500 bg-[#090d13]"
              />
              <label htmlFor="disableTelemetry" className="text-slate-300 cursor-pointer">
                Telemetría y analítica completamente desactivadas (Atlas es estrictamente privado)
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Configuración guardada en SQLite correctamente.</span>
            </div>
          )}
          {!savedSuccess && <div />}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors shadow-sm ml-auto"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Preferencias</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
