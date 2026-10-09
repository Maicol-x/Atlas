import { AuditFinding, RequirementStatus } from '../../shared/types/atlas.types.ts';
import { MatchAnalysisResult } from './requirement-matcher.ts';

export class FindingClassifier {
  static classify(
    matchResult: MatchAnalysisResult,
    sessionId: string,
    executionFailures: string[] = []
  ): AuditFinding {
    const { requirement, evidence, hasDirectSymbols, hasRelevantFiles, hasAssociatedTests } = matchResult;

    let status: RequirementStatus;
    let summary: string;
    let rationale: string;
    let limitations: string;

    // Check if dynamic execution failed for this requirement
    const isExecutionFailed = executionFailures.some((fail) =>
      fail.toLowerCase().includes(requirement.code.toLowerCase()) ||
      fail.toLowerCase().includes(requirement.title.toLowerCase())
    );

    if (isExecutionFailed) {
      status = 'FALLIDO';
      summary = `Comprobación dinámica fallida durante la verificación de ${requirement.code}.`;
      rationale = 'Una ejecución reproducible de pruebas o scripts asociados retornó un código de error distinto de cero o aserción fallida.';
      limitations = 'Verificación limitada a los scripts y pruebas ejecutados bajo autorización explícita.';
    } else if (hasDirectSymbols && (hasAssociatedTests || evidence.length >= 2)) {
      status = 'VERIFICADO';
      summary = `Implementación localizada y verificada con evidencia suficiente (${evidence.length} referencias).`;
      rationale = `Se encontraron símbolos de código fuente concretos (funciones/clases/rutas) correspondientes a '${requirement.title}'.`;
      limitations = 'Análisis estático exhaustivo sobre los archivos fuente inspeccionados. No se asume ausencia de defectos en casos de borde no testeados.';
    } else if (hasRelevantFiles && (hasDirectSymbols || evidence.length > 0)) {
      status = 'INCOMPLETO';
      summary = `Implementación parcial detectada; faltan pruebas asociadas o componentes requeridos.`;
      rationale = 'Existen archivos y referencias relacionadas con el requisito, pero no se hallaron pruebas automatizadas o símbolos completos de integración.';
      limitations = 'La implementación observada puede requerir cableado adicional, validación de esquemas o pruebas de regresión.';
    } else if (!hasRelevantFiles && evidence.length === 0) {
      status = 'NO_IMPLEMENTADO';
      summary = `No se localizó implementación suficiente en el repositorio auditado.`;
      rationale = 'La búsqueda léxica y de árbol sintáctico (AST) sobre los archivos del proyecto no encontró referencias directas ni módulos correspondientes.';
      limitations = 'Ausencia de evidencia en los archivos inspeccionados. Nota: no debe confundirse con prueba matemática de ausencia si el código depende de librerías externas no descargadas.';
    } else {
      status = 'NO_VERIFICABLE';
      summary = `La evidencia disponible no permite llegar a una conclusión definitiva.`;
      rationale = 'El requisito depende de variables externas, infraestructura en tiempo de ejecución o credenciales no presentes en el repositorio.';
      limitations = 'Imposible verificar de manera estática sin un entorno de ejecución completo configurado.';
    }

    return {
      id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      requirementId: requirement.id,
      requirementCode: requirement.code,
      requirementTitle: requirement.title,
      status,
      summary,
      rationale,
      limitations,
      evidence,
    };
  }
}
