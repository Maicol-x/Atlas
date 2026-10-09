import { AuditSession, SpecificationRequirement } from '../../shared/types/atlas.types.ts';
import { SpecificationParser } from './specification-parser.ts';
import { RequirementMatcher } from './requirement-matcher.ts';
import { FindingClassifier } from './finding-classifier.ts';
import { AuditRepository } from '../database/repositories/audit.repo.ts';
import { ProjectRepository } from '../database/repositories/project.repo.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('AuditEngine');

export class AuditEngine {
  static async runAudit(
    projectId: string,
    specificationText: string,
    customRequirements?: SpecificationRequirement[],
    checksExecuted: AuditSession['checksExecuted'] = []
  ): Promise<AuditSession> {
    const project = await ProjectRepository.getProjectById(projectId);
    if (!project) {
      throw new Error(`Proyecto no encontrado con ID: ${projectId}`);
    }

    const latestScan = await ProjectRepository.getLatestScanSummary(projectId);
    const files = latestScan
      ? [...latestScan.manifests.map((m) => m.path), ...latestScan.testFiles, ...latestScan.configFiles, ...latestScan.entryPoints]
      : [];

    // Parse specification if not already supplied
    const requirements = customRequirements || SpecificationParser.parse(specificationText);
    const sessionId = `audit-${Date.now()}`;
    const createdAt = new Date().toISOString();

    logger.info(`Iniciando auditoría técnica para ${project.name}`, {
      requirementsCount: requirements.length,
      filesCount: files.length,
    });

    const executionFailures = checksExecuted
      .filter((c) => c.exitCode !== 0)
      .map((c) => c.command);

    const findings = [];
    let verifiedCount = 0;
    let failedCount = 0;
    let incompleteCount = 0;
    let notVerifiableCount = 0;
    let notImplementedCount = 0;

    for (const req of requirements) {
      const matchResult = await RequirementMatcher.matchRequirement(project.path, files, req);
      const finding = FindingClassifier.classify(matchResult, sessionId, executionFailures);
      findings.push(finding);

      switch (finding.status) {
        case 'VERIFICADO':
          verifiedCount++;
          break;
        case 'FALLIDO':
          failedCount++;
          break;
        case 'INCOMPLETO':
          incompleteCount++;
          break;
        case 'NO_VERIFICABLE':
          notVerifiableCount++;
          break;
        case 'NO_IMPLEMENTADO':
          notImplementedCount++;
          break;
      }
    }

    const session: AuditSession = {
      id: sessionId,
      projectId: project.id,
      projectName: project.name,
      createdAt,
      specificationText,
      requirementsCount: requirements.length,
      verifiedCount,
      failedCount,
      incompleteCount,
      notVerifiableCount,
      notImplementedCount,
      findings,
      checksExecuted,
    };

    // Persist session to SQLite
    try {
      await AuditRepository.saveSession(session, requirements);
      logger.info(`Auditoría guardada exitosamente: ${sessionId}`);
    } catch (saveErr) {
      logger.error('Error al persistir sesión de auditoría en SQLite', { error: String(saveErr) });
    }

    return session;
  }

  static generateMarkdownReport(session: AuditSession): string {
    const lines = [
      `# Informe de Auditoría Técnica Verificable — Atlas`,
      ``,
      `**Proyecto:** ${session.projectName}`,
      `**Fecha:** ${session.createdAt}`,
      `**ID de Sesión:** \`${session.id}\``,
      ``,
      `## Resumen de Verificación`,
      `- **Total Requisitos:** ${session.requirementsCount}`,
      `- **VERIFICADO:** ${session.verifiedCount}`,
      `- **FALLIDO:** ${session.failedCount}`,
      `- **INCOMPLETO:** ${session.incompleteCount}`,
      `- **NO VERIFICABLE:** ${session.notVerifiableCount}`,
      `- **NO IMPLEMENTADO:** ${session.notImplementedCount}`,
      ``,
      `## Comprobaciones Dinámicas Ejecutadas`,
    ];

    if (session.checksExecuted.length === 0) {
      lines.push(`*No se ejecutaron comandos dinámicos. Auditoría basada estrictamente en inspección estática y AST.*`);
    } else {
      session.checksExecuted.forEach((c) => {
        lines.push(`- Comando: \`${c.command}\` | Código de salida: ${c.exitCode} | Duración: ${c.durationMs}ms`);
      });
    }

    lines.push(``, `## Detalle de Hallazgos y Evidencias`, ``);

    for (const f of session.findings) {
      lines.push(`### [${f.status}] ${f.requirementCode}: ${f.requirementTitle}`);
      lines.push(`- **Diagnóstico:** ${f.summary}`);
      lines.push(`- **Fundamento Técnico:** ${f.rationale}`);
      lines.push(`- **Limitaciones del Análisis:** ${f.limitations}`);

      if (f.evidence.length > 0) {
        lines.push(`- **Evidencias Registradas:**`);
        f.evidence.forEach((ev) => {
          lines.push(`  - \`${ev.filePath || 'Entorno'}\` (Líneas ${ev.lineStart || '?'}-${ev.lineEnd || '?'})`);
          if (ev.snippet) {
            lines.push(`    \`\`\``);
            lines.push(`    ${ev.snippet}`);
            lines.push(`    \`\`\``);
          }
        });
      } else {
        lines.push(`- **Evidencia:** Ninguna coincidencia reproducible localizada.`);
      }
      lines.push(``);
    }

    return lines.join('\n');
  }
}
