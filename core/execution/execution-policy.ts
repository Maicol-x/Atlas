import path from 'path';

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  isDangerous: boolean;
  riskDescription?: string;
}

const BLOCKED_COMMAND_PATTERNS = [
  /rm\s+-rf\s+\/($|\s)/,
  /:\(\)\{\s*:\|:&\s*\};:/, // fork bomb
  /mkfs/,
  /dd\s+if=/,
  /shutdown/,
  /reboot/,
  /chmod\s+-R\s+777\s+\//,
  /wget.*\|\s*sh/,
  /curl.*\|\s*sh/,
  /format\s+[c-z]:/i,
];

export class ExecutionPolicy {
  static validate(
    command: string,
    workingDirectory: string,
    authorizedByUser: boolean,
    allowedRootDirs: string[] = []
  ): PolicyCheckResult {
    const trimmed = command.trim();
    if (!trimmed) {
      return { allowed: false, reason: 'Comando vacío', isDangerous: false };
    }

    // Dangerous pattern check
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          reason: 'Comando bloqueado por política de seguridad: patrón destructivo detectado',
          isDangerous: true,
          riskDescription: 'El comando contiene secuencias potencialmente catastróficas para el sistema anfitrión.',
        };
      }
    }

    // Explicit user authorization check (Rule 6: Solicitar autorización explícita)
    if (!authorizedByUser) {
      return {
        allowed: false,
        reason: 'Autorización explícita del usuario requerida antes de la ejecución.',
        isDangerous: false,
        riskDescription: 'Ningún comando puede ejecutarse sin confirmación activa del usuario.',
      };
    }

    // Working directory containment check
    const resolvedWorkDir = path.resolve(workingDirectory);
    if (allowedRootDirs.length > 0) {
      const isContained = allowedRootDirs.some((root) => {
        const resolvedRoot = path.resolve(root);
        return resolvedWorkDir.startsWith(resolvedRoot);
      });

      if (!isContained) {
        return {
          allowed: false,
          reason: `El directorio de trabajo (${resolvedWorkDir}) no está dentro de los directorios autorizados.`,
          isDangerous: true,
        };
      }
    }

    return { allowed: true, isDangerous: false };
  }
}
