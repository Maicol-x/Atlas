import { runExecute, runQuery } from '../connection.ts';
import { AuditSession, AuditFinding, SpecificationRequirement } from '../../../shared/types/atlas.types.ts';

export class AuditRepository {
  static async saveSession(session: AuditSession, requirements: SpecificationRequirement[]): Promise<void> {
    await runExecute(
      `INSERT INTO audit_sessions (
        id, project_id, project_name, specification_text,
        requirements_count, verified_count, failed_count, incomplete_count,
        not_verifiable_count, not_implemented_count, checks_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.projectId,
        session.projectName,
        session.specificationText,
        session.requirementsCount,
        session.verifiedCount,
        session.failedCount,
        session.incompleteCount,
        session.notVerifiableCount,
        session.notImplementedCount,
        JSON.stringify(session.checksExecuted),
        session.createdAt,
      ]
    );

    // Save individual requirements
    for (const req of requirements) {
      await runExecute(
        `INSERT INTO audit_requirements (id, session_id, code, title, description, category, verification_method)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.id, session.id, req.code, req.title, req.description, req.category, req.verificationMethod]
      );
    }

    // Save findings
    for (const finding of session.findings) {
      await runExecute(
        `INSERT INTO audit_findings (
          id, session_id, requirement_id, requirement_code, requirement_title,
          status, summary, rationale, limitations, evidence_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finding.id,
          session.id,
          finding.requirementId,
          finding.requirementCode,
          finding.requirementTitle,
          finding.status,
          finding.summary,
          finding.rationale,
          finding.limitations,
          JSON.stringify(finding.evidence),
        ]
      );
    }
  }

  static async getSessionsForProject(projectId: string): Promise<AuditSession[]> {
    const rows = await runQuery<{
      id: string;
      project_id: string;
      project_name: string;
      specification_text: string;
      requirements_count: number;
      verified_count: number;
      failed_count: number;
      incomplete_count: number;
      not_verifiable_count: number;
      not_implemented_count: number;
      checks_json: string;
      created_at: string;
    }>('SELECT * FROM audit_sessions WHERE project_id = ? ORDER BY created_at DESC', [projectId]);

    const sessions: AuditSession[] = [];
    for (const r of rows) {
      const findings = await this.getFindingsForSession(r.id);
      sessions.push({
        id: r.id,
        projectId: r.project_id,
        projectName: r.project_name,
        specificationText: r.specification_text,
        requirementsCount: r.requirements_count,
        verifiedCount: r.verified_count,
        failedCount: r.failed_count,
        incompleteCount: r.incomplete_count,
        notVerifiableCount: r.not_verifiable_count,
        notImplementedCount: r.not_implemented_count,
        checksExecuted: JSON.parse(r.checks_json || '[]'),
        findings,
        createdAt: r.created_at,
      });
    }

    return sessions;
  }

  static async getSessionById(sessionId: string): Promise<AuditSession | null> {
    const rows = await runQuery<{
      id: string;
      project_id: string;
      project_name: string;
      specification_text: string;
      requirements_count: number;
      verified_count: number;
      failed_count: number;
      incomplete_count: number;
      not_verifiable_count: number;
      not_implemented_count: number;
      checks_json: string;
      created_at: string;
    }>('SELECT * FROM audit_sessions WHERE id = ?', [sessionId]);

    if (rows.length === 0) return null;
    const r = rows[0];
    const findings = await this.getFindingsForSession(r.id);
    return {
      id: r.id,
      projectId: r.project_id,
      projectName: r.project_name,
      specificationText: r.specification_text,
      requirementsCount: r.requirements_count,
      verifiedCount: r.verified_count,
      failedCount: r.failed_count,
      incompleteCount: r.incomplete_count,
      notVerifiableCount: r.not_verifiable_count,
      notImplementedCount: r.not_implemented_count,
      checksExecuted: JSON.parse(r.checks_json || '[]'),
      findings,
      createdAt: r.created_at,
    };
  }

  static async getRecentSessions(limit = 10): Promise<AuditSession[]> {
    const rows = await runQuery<{
      id: string;
      project_id: string;
      project_name: string;
      specification_text: string;
      requirements_count: number;
      verified_count: number;
      failed_count: number;
      incomplete_count: number;
      not_verifiable_count: number;
      not_implemented_count: number;
      checks_json: string;
      created_at: string;
    }>('SELECT * FROM audit_sessions ORDER BY created_at DESC LIMIT ?', [limit]);

    const sessions: AuditSession[] = [];
    for (const r of rows) {
      const findings = await this.getFindingsForSession(r.id);
      sessions.push({
        id: r.id,
        projectId: r.project_id,
        projectName: r.project_name,
        specificationText: r.specification_text,
        requirementsCount: r.requirements_count,
        verifiedCount: r.verified_count,
        failedCount: r.failed_count,
        incompleteCount: r.incomplete_count,
        notVerifiableCount: r.not_verifiable_count,
        notImplementedCount: r.not_implemented_count,
        checksExecuted: JSON.parse(r.checks_json || '[]'),
        findings,
        createdAt: r.created_at,
      });
    }

    return sessions;
  }

  static async getFindingsForSession(sessionId: string): Promise<AuditFinding[]> {
    const rows = await runQuery<{
      id: string;
      session_id: string;
      requirement_id: string;
      requirement_code: string;
      requirement_title: string;
      status: any;
      summary: string;
      rationale: string;
      limitations: string;
      evidence_json: string;
    }>('SELECT * FROM audit_findings WHERE session_id = ? ORDER BY requirement_code ASC', [sessionId]);

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      requirementId: r.requirement_id,
      requirementCode: r.requirement_code,
      requirementTitle: r.requirement_title,
      status: r.status,
      summary: r.summary,
      rationale: r.rationale,
      limitations: r.limitations,
      evidence: JSON.parse(r.evidence_json || '[]'),
    }));
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await runExecute('DELETE FROM audit_findings WHERE session_id = ?', [sessionId]);
    await runExecute('DELETE FROM audit_requirements WHERE session_id = ?', [sessionId]);
    await runExecute('DELETE FROM audit_sessions WHERE id = ?', [sessionId]);
  }
}
