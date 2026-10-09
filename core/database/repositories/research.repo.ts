import { runExecute, runQuery } from '../connection.ts';
import { ResearchQuery, TechnologyRecord } from '../../../shared/types/atlas.types.ts';

export class ResearchRepository {
  static async saveQuery(query: ResearchQuery): Promise<void> {
    await runExecute(
      `INSERT INTO research_queries (
        id, problem_description, provider, offline_mode,
        comparison_summary, technologies_json, warnings_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        query.id,
        query.problemDescription,
        query.provider,
        query.offlineMode ? 1 : 0,
        query.comparisonSummary || '',
        JSON.stringify(query.technologies),
        JSON.stringify(query.warnings),
        query.createdAt,
      ]
    );

    // Also upsert individual tech records
    for (const tech of query.technologies) {
      await this.upsertTechnology(tech);
    }
  }

  static async getRecentQueries(limit = 20): Promise<ResearchQuery[]> {
    const rows = await runQuery<{
      id: string;
      problem_description: string;
      provider: 'local_engine' | 'gemini_grounded' | 'hybrid';
      offline_mode: number;
      comparison_summary: string;
      technologies_json: string;
      warnings_json: string;
      created_at: string;
    }>('SELECT * FROM research_queries ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map((r) => ({
      id: r.id,
      problemDescription: r.problem_description,
      provider: r.provider,
      offlineMode: r.offline_mode === 1,
      comparisonSummary: r.comparison_summary || undefined,
      technologies: JSON.parse(r.technologies_json),
      warnings: JSON.parse(r.warnings_json),
      createdAt: r.created_at,
    }));
  }

  static async getQueryById(id: string): Promise<ResearchQuery | null> {
    const rows = await runQuery<{
      id: string;
      problem_description: string;
      provider: 'local_engine' | 'gemini_grounded' | 'hybrid';
      offline_mode: number;
      comparison_summary: string;
      technologies_json: string;
      warnings_json: string;
      created_at: string;
    }>('SELECT * FROM research_queries WHERE id = ?', [id]);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      problemDescription: r.problem_description,
      provider: r.provider,
      offlineMode: r.offline_mode === 1,
      comparisonSummary: r.comparison_summary || undefined,
      technologies: JSON.parse(r.technologies_json),
      warnings: JSON.parse(r.warnings_json),
      createdAt: r.created_at,
    };
  }

  static async upsertTechnology(tech: TechnologyRecord): Promise<void> {
    const now = new Date().toISOString();
    const existing = await runQuery<{ id: string }>(
      'SELECT id FROM technology_records WHERE name = ?',
      [tech.name]
    );

    if (existing.length > 0) {
      await runExecute(
        `UPDATE technology_records SET
          category = ?,
          description = ?,
          how_it_works = ?,
          problem_solved = ?,
          prerequisites_json = ?,
          limitations_json = ?,
          alternatives_json = ?,
          when_to_use = ?,
          ecosystem_json = ?,
          maturity = ?,
          is_verified = ?,
          offline_available = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          tech.category,
          tech.description,
          tech.howItWorks,
          tech.problemSolved,
          JSON.stringify(tech.prerequisites),
          JSON.stringify(tech.limitations),
          JSON.stringify(tech.alternatives),
          tech.whenToUse,
          JSON.stringify(tech.ecosystem),
          tech.maturity,
          tech.isVerified ? 1 : 0,
          tech.offlineAvailable ? 1 : 0,
          now,
          existing[0].id,
        ]
      );
    } else {
      await runExecute(
        `INSERT INTO technology_records (
          id, name, category, description, how_it_works, problem_solved,
          prerequisites_json, limitations_json, alternatives_json, when_to_use,
          ecosystem_json, maturity, is_verified, offline_available, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tech.id,
          tech.name,
          tech.category,
          tech.description,
          tech.howItWorks,
          tech.problemSolved,
          JSON.stringify(tech.prerequisites),
          JSON.stringify(tech.limitations),
          JSON.stringify(tech.alternatives),
          tech.whenToUse,
          JSON.stringify(tech.ecosystem),
          tech.maturity,
          tech.isVerified ? 1 : 0,
          tech.offlineAvailable ? 1 : 0,
          now,
        ]
      );
    }
  }

  static async getAllSavedTechnologies(): Promise<TechnologyRecord[]> {
    const rows = await runQuery<{
      id: string;
      name: string;
      category: any;
      description: string;
      how_it_works: string;
      problem_solved: string;
      prerequisites_json: string;
      limitations_json: string;
      alternatives_json: string;
      when_to_use: string;
      ecosystem_json: string;
      maturity: any;
      is_verified: number;
      offline_available: number;
    }>('SELECT * FROM technology_records ORDER BY name ASC');

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      howItWorks: r.how_it_works,
      problemSolved: r.problem_solved,
      prerequisites: JSON.parse(r.prerequisites_json || '[]'),
      limitations: JSON.parse(r.limitations_json || '[]'),
      alternatives: JSON.parse(r.alternatives_json || '[]'),
      whenToUse: r.when_to_use,
      ecosystem: JSON.parse(r.ecosystem_json || '[]'),
      maturity: r.maturity,
      sources: [],
      isVerified: r.is_verified === 1,
      offlineAvailable: r.offline_available === 1,
    }));
  }
}
