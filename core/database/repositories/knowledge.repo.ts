import { runExecute, runQuery } from '../connection.ts';
import { SavedKnowledgeItem } from '../../../shared/types/atlas.types.ts';

export class KnowledgeRepository {
  static async getAllItems(): Promise<SavedKnowledgeItem[]> {
    const rows = await runQuery<{
      id: string;
      title: string;
      content: string;
      category: string;
      tags_json: string;
      related_technology: string | null;
      related_project_id: string | null;
      source_url: string | null;
      verified_conclusion: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM saved_knowledge ORDER BY updated_at DESC');

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      tags: JSON.parse(r.tags_json || '[]'),
      relatedTechnology: r.related_technology || undefined,
      relatedProjectId: r.related_project_id || undefined,
      sourceUrl: r.source_url || undefined,
      verifiedConclusion: r.verified_conclusion === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  static async saveItem(item: SavedKnowledgeItem): Promise<void> {
    const existing = await runQuery<{ id: string }>('SELECT id FROM saved_knowledge WHERE id = ?', [item.id]);
    const now = new Date().toISOString();

    if (existing.length > 0) {
      await runExecute(
        `UPDATE saved_knowledge SET
          title = ?,
          content = ?,
          category = ?,
          tags_json = ?,
          related_technology = ?,
          related_project_id = ?,
          source_url = ?,
          verified_conclusion = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          item.title,
          item.content,
          item.category,
          JSON.stringify(item.tags),
          item.relatedTechnology || null,
          item.relatedProjectId || null,
          item.sourceUrl || null,
          item.verifiedConclusion ? 1 : 0,
          now,
          item.id,
        ]
      );
    } else {
      await runExecute(
        `INSERT INTO saved_knowledge (
          id, title, content, category, tags_json,
          related_technology, related_project_id, source_url,
          verified_conclusion, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.title,
          item.content,
          item.category,
          JSON.stringify(item.tags),
          item.relatedTechnology || null,
          item.relatedProjectId || null,
          item.sourceUrl || null,
          item.verifiedConclusion ? 1 : 0,
          item.createdAt || now,
          now,
        ]
      );
    }
  }

  static async deleteItem(id: string): Promise<void> {
    await runExecute('DELETE FROM saved_knowledge WHERE id = ?', [id]);
  }
}
