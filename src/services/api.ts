/**
 * Atlas Client Service Bridge
 * Conecta transparentemente con Electron IPC si está disponible, o con los endpoints REST de Express
 */

import {
  ProjectMetadata,
  ProjectScanSummary,
  FileTreeNode,
  ResearchQuery,
  TechnologyRecord,
  AuditSession,
  SpecificationRequirement,
  ExecutionRequest,
  ExecutionResult,
  SavedKnowledgeItem,
  ApplicationSettings,
} from '../../shared/types/atlas.types.ts';

declare global {
  interface Window {
    atlasAPI?: any;
  }
}

const isElectron = typeof window !== 'undefined' && Boolean(window.atlasAPI);

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `Error HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // Ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const AtlasClient = {
  // Proyectos
  async getProjects(): Promise<ProjectMetadata[]> {
    if (isElectron) return window.atlasAPI.getProjects();
    return request<ProjectMetadata[]>('/api/projects');
  },

  async scanDirectory(dirPath: string): Promise<{
    project: ProjectMetadata;
    scanSummary: ProjectScanSummary;
    fileTree: FileTreeNode;
  }> {
    if (isElectron) return window.atlasAPI.scanDirectory(dirPath);
    return request('/api/projects/scan', {
      method: 'POST',
      body: JSON.stringify({ dirPath }),
    });
  },

  async getProject(id: string): Promise<{ project: ProjectMetadata; scanSummary: ProjectScanSummary }> {
    if (isElectron) return window.atlasAPI.getProject(id);
    return request(`/api/projects/${id}`);
  },

  async readFile(projectId: string, relativePath: string): Promise<{ path: string; content: string }> {
    if (isElectron) return window.atlasAPI.readFile(projectId, relativePath);
    return request(`/api/projects/${projectId}/file?path=${encodeURIComponent(relativePath)}`);
  },

  async deleteProject(id: string): Promise<void> {
    return request(`/api/projects/${id}`, { method: 'DELETE' });
  },

  // Investigación
  async exploreProblem(problemDescription: string): Promise<ResearchQuery> {
    if (isElectron) return window.atlasAPI.exploreProblem(problemDescription);
    return request<ResearchQuery>('/api/research/explore', {
      method: 'POST',
      body: JSON.stringify({ problemDescription }),
    });
  },

  async getRecentQueries(): Promise<ResearchQuery[]> {
    if (isElectron) return window.atlasAPI.getRecentQueries();
    return request<ResearchQuery[]>('/api/research/queries');
  },

  async getSavedTechnologies(): Promise<TechnologyRecord[]> {
    return request<TechnologyRecord[]>('/api/research/technologies');
  },

  // Auditorías
  async runAudit(
    projectId: string,
    specificationText: string,
    requirements?: SpecificationRequirement[],
    checksExecuted?: any[]
  ): Promise<AuditSession> {
    if (isElectron) return window.atlasAPI.runAudit(projectId, specificationText, requirements);
    return request<AuditSession>('/api/audit/run', {
      method: 'POST',
      body: JSON.stringify({ projectId, specificationText, requirements, checksExecuted }),
    });
  },

  async getAuditHistory(projectId: string): Promise<AuditSession[]> {
    if (isElectron) return window.atlasAPI.getAuditHistory(projectId);
    return request<AuditSession[]>(`/api/audit/history/${projectId}`);
  },

  async getAuditSession(id: string): Promise<AuditSession> {
    if (isElectron) return window.atlasAPI.getAuditSession(id);
    return request<AuditSession>(`/api/audit/session/${id}`);
  },

  async deleteAuditSession(id: string): Promise<void> {
    return request(`/api/audit/session/${id}`, { method: 'DELETE' });
  },

  // Ejecución controlada
  async runCommand(req: ExecutionRequest): Promise<ExecutionResult> {
    if (isElectron) return window.atlasAPI.runCommand(req);
    return request<ExecutionResult>('/api/execution/run', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async cancelExecution(id: string): Promise<boolean> {
    if (isElectron) return window.atlasAPI.cancelExecution(id);
    const res = await request<{ cancelled: boolean }>('/api/execution/cancel', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    return res.cancelled;
  },

  // Base de conocimiento
  async getKnowledge(): Promise<SavedKnowledgeItem[]> {
    if (isElectron) return window.atlasAPI.getKnowledge();
    return request<SavedKnowledgeItem[]>('/api/knowledge');
  },

  async saveKnowledge(item: SavedKnowledgeItem): Promise<void> {
    if (isElectron) return window.atlasAPI.saveKnowledge(item);
    return request('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async deleteKnowledge(id: string): Promise<void> {
    if (isElectron) return window.atlasAPI.deleteKnowledge(id);
    return request(`/api/knowledge/${id}`, { method: 'DELETE' });
  },

  // Configuración
  async getSettings(): Promise<ApplicationSettings> {
    if (isElectron) return window.atlasAPI.getSettings();
    return request<ApplicationSettings>('/api/settings');
  },

  async updateSettings(settings: Partial<ApplicationSettings>): Promise<ApplicationSettings> {
    if (isElectron) return window.atlasAPI.updateSettings(settings);
    return request<ApplicationSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },
};
