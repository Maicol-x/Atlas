/**
 * Electron Preload Script
 * Expone un puente seguro y tipado al renderer mediante contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';

const atlasAPI = {
  // Proyectos
  scanDirectory: (dirPath: string) => ipcRenderer.invoke('project:scan', dirPath),
  getProjects: () => ipcRenderer.invoke('project:list'),
  getProject: (id: string) => ipcRenderer.invoke('project:get', id),
  readFile: (projectId: string, relativePath: string) => ipcRenderer.invoke('project:readFile', projectId, relativePath),

  // Investigación
  exploreProblem: (problem: string) => ipcRenderer.invoke('research:explore', problem),
  getRecentQueries: () => ipcRenderer.invoke('research:list'),

  // Auditoría
  runAudit: (projectId: string, spec: string, requirements?: any[]) =>
    ipcRenderer.invoke('audit:run', projectId, spec, requirements),
  getAuditHistory: (projectId: string) => ipcRenderer.invoke('audit:history', projectId),
  getAuditSession: (sessionId: string) => ipcRenderer.invoke('audit:get', sessionId),

  // Ejecución de comandos
  runCommand: (req: any) => ipcRenderer.invoke('execution:run', req),
  cancelExecution: (id: string) => ipcRenderer.invoke('execution:cancel', id),

  // Base de conocimiento
  getKnowledge: () => ipcRenderer.invoke('knowledge:list'),
  saveKnowledge: (item: any) => ipcRenderer.invoke('knowledge:save', item),
  deleteKnowledge: (id: string) => ipcRenderer.invoke('knowledge:delete', id),

  // Configuración
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
};

contextBridge.exposeInMainWorld('atlasAPI', atlasAPI);
