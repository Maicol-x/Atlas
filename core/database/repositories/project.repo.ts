import { runExecute, runQuery } from '../connection.ts';
import { ProjectMetadata, ProjectScanSummary } from '../../../shared/types/atlas.types.ts';

export class ProjectRepository {
  static async getAllProjects(): Promise<ProjectMetadata[]> {
    const rows = await runQuery<{
      id: string;
      name: string;
      path: string;
      last_scanned_at: string | null;
      metadata_json: string | null;
    }>('SELECT id, name, path, last_scanned_at, metadata_json FROM projects ORDER BY updated_at DESC');

    return rows.map((r) => {
      const meta = r.metadata_json ? JSON.parse(r.metadata_json) : {};
      return {
        id: r.id,
        name: r.name,
        path: r.path,
        lastScannedAt: r.last_scanned_at || new Date().toISOString(),
        detectedLanguages: meta.detectedLanguages || [],
        detectedFrameworks: meta.detectedFrameworks || [],
        detectedDatabases: meta.detectedDatabases || [],
        packageManagers: meta.packageManagers || [],
        availableScripts: meta.availableScripts || {},
        testFrameworks: meta.testFrameworks || [],
        entryPoints: meta.entryPoints || [],
        filesCount: meta.filesCount || 0,
        directoriesCount: meta.directoriesCount || 0,
        totalSize: meta.totalSize || 0,
      };
    });
  }

  static async getProjectById(id: string): Promise<ProjectMetadata | null> {
    const rows = await runQuery<{
      id: string;
      name: string;
      path: string;
      last_scanned_at: string | null;
      metadata_json: string | null;
    }>('SELECT id, name, path, last_scanned_at, metadata_json FROM projects WHERE id = ?', [id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    const meta = r.metadata_json ? JSON.parse(r.metadata_json) : {};
    return {
      id: r.id,
      name: r.name,
      path: r.path,
      lastScannedAt: r.last_scanned_at || new Date().toISOString(),
      detectedLanguages: meta.detectedLanguages || [],
      detectedFrameworks: meta.detectedFrameworks || [],
      detectedDatabases: meta.detectedDatabases || [],
      packageManagers: meta.packageManagers || [],
      availableScripts: meta.availableScripts || {},
      testFrameworks: meta.testFrameworks || [],
      entryPoints: meta.entryPoints || [],
      filesCount: meta.filesCount || 0,
      directoriesCount: meta.directoriesCount || 0,
      totalSize: meta.totalSize || 0,
    };
  }

  static async getProjectByPath(projectPath: string): Promise<ProjectMetadata | null> {
    const rows = await runQuery<{
      id: string;
      name: string;
      path: string;
      last_scanned_at: string | null;
      metadata_json: string | null;
    }>('SELECT id, name, path, last_scanned_at, metadata_json FROM projects WHERE path = ?', [projectPath]);

    if (rows.length === 0) return null;
    return this.getProjectById(rows[0].id);
  }

  static async upsertProject(project: ProjectMetadata): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.getProjectByPath(project.path);
    const metaJson = JSON.stringify({
      detectedLanguages: project.detectedLanguages,
      detectedFrameworks: project.detectedFrameworks,
      detectedDatabases: project.detectedDatabases,
      packageManagers: project.packageManagers,
      availableScripts: project.availableScripts,
      testFrameworks: project.testFrameworks,
      entryPoints: project.entryPoints,
      filesCount: project.filesCount,
      directoriesCount: project.directoriesCount,
      totalSize: project.totalSize,
    });

    if (existing) {
      await runExecute(
        `UPDATE projects SET 
          name = ?, 
          last_scanned_at = ?, 
          metadata_json = ?, 
          updated_at = ? 
        WHERE id = ?`,
        [project.name, project.lastScannedAt, metaJson, now, existing.id]
      );
    } else {
      await runExecute(
        `INSERT INTO projects (id, name, path, last_scanned_at, metadata_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [project.id, project.name, project.path, project.lastScannedAt, metaJson, now, now]
      );
    }
  }

  static async saveScanSummary(scan: ProjectScanSummary): Promise<void> {
    await runExecute(
      `INSERT INTO project_scans (id, project_id, scanned_at, summary_json) VALUES (?, ?, ?, ?)`,
      [scan.id, scan.projectId, scan.scannedAt, JSON.stringify(scan)]
    );
  }

  static async getLatestScanSummary(projectId: string): Promise<ProjectScanSummary | null> {
    const rows = await runQuery<{ summary_json: string }>(
      'SELECT summary_json FROM project_scans WHERE project_id = ? ORDER BY scanned_at DESC LIMIT 1',
      [projectId]
    );
    if (rows.length === 0) return null;
    return JSON.parse(rows[0].summary_json);
  }

  static async deleteProject(id: string): Promise<void> {
    await runExecute('DELETE FROM projects WHERE id = ?', [id]);
  }
}
