/**
 * Atlas Automated Test Suite
 * Validador de persistencia, políticas de seguridad, parser de especificaciones y clasificación de hallazgos
 */

import { SpecificationParser } from '../core/audit/specification-parser.ts';
import { FindingClassifier } from '../core/audit/finding-classifier.ts';
import { ExecutionPolicy } from '../core/execution/execution-policy.ts';
import { runMigrations } from '../core/database/migrations.ts';
import { SettingsRepository } from '../core/database/repositories/settings.repo.ts';
import { ProjectScanner } from '../core/projects/project-scanner.ts';
import { ProjectClassifier } from '../core/projects/project-classifier.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('=== Iniciando Suite de Pruebas Automatizadas de Atlas ===\n');

  // Test 1: SpecificationParser
  console.log('[Test Suite 1: SpecificationParser]');
  const specText = `
  1. REQ-01: Base de datos SQLite persistente con migraciones
  2. REQ-02: Exploración segura de directorios en modo solo lectura
  - [ ] REQ-03: Auditoría técnica verificable
  `;
  const reqs = SpecificationParser.parse(specText);
  assert(reqs.length === 3, 'Parsea exactamente 3 requisitos numerados o con viñetas');
  assert(reqs[0].code === 'REQ-01', 'Identifica correctamente el código REQ-01');
  assert(reqs[0].title.includes('SQLite'), 'Extrae el título del requisito');

  // Test 2: ExecutionPolicy Security
  console.log('\n[Test Suite 2: ExecutionPolicy & Sandbox Security]');
  const dangerousCheck = ExecutionPolicy.validate('rm -rf /', '.', true, []);
  assert(!dangerousCheck.allowed, 'Bloquea comandos destructivos tipo rm -rf /');
  assert(dangerousCheck.isDangerous, 'Marca el comando como peligroso');

  const unauthCheck = ExecutionPolicy.validate('npm test', '.', false, []);
  assert(!unauthCheck.allowed, 'Bloquea ejecución si no cuenta con autorización explícita del usuario');

  const safeCheck = ExecutionPolicy.validate('npm test', '.', true, []);
  assert(safeCheck.allowed, 'Permite comando seguro con autorización explícita');

  // Test 3: FindingClassifier Verification States
  console.log('\n[Test Suite 3: FindingClassifier Canonical States]');
  const verifiedFinding = FindingClassifier.classify({
    requirement: reqs[0],
    evidence: [
      { id: '1', type: 'file_content', filePath: 'core/database/connection.ts', description: 'sqlite', timestamp: '' },
      { id: '2', type: 'ast_symbol', filePath: 'core/database/migrations.ts', description: 'migrations', timestamp: '' },
    ],
    hasDirectSymbols: true,
    hasRelevantFiles: true,
    hasAssociatedTests: true,
    isPartial: false,
  }, 'session-test');
  assert(verifiedFinding.status === 'VERIFICADO', 'Clasifica como VERIFICADO cuando existen evidencias suficientes');

  const notImplementedFinding = FindingClassifier.classify({
    requirement: { id: 'r2', code: 'REQ-99', title: 'Feature inexistente', description: '', category: 'functional', verificationMethod: 'static_analysis' },
    evidence: [],
    hasDirectSymbols: false,
    hasRelevantFiles: false,
    hasAssociatedTests: false,
    isPartial: false,
  }, 'session-test');
  assert(notImplementedFinding.status === 'NO_IMPLEMENTADO', 'Clasifica como NO_IMPLEMENTADO ante ausencia de coincidencias');

  // Test 4: Database Persistence in SQLite
  console.log('\n[Test Suite 4: SQLite Database & Versioned Migrations]');
  await runMigrations();
  const settings = await SettingsRepository.getSettings();
  assert(settings !== null, 'Configuración leída exitosamente desde SQLite');
  assert(settings.disableTelemetry === true, 'Telemetría confirmada como desactivada');

  // Test 5: Safe Project Scanner
  console.log('\n[Test Suite 5: Safe Read-Only Project Scanner]');
  const scan = await ProjectScanner.scanDirectory('.');
  assert(scan.allFilePaths.length > 5, 'Escanea archivos del repositorio actual de forma segura');
  const { summary } = ProjectClassifier.classify('.', scan.allFilePaths, scan.metadata);
  assert(summary.frameworks.some(f => f.name === 'React'), 'Detecta React como framework instalado');

  console.log(`\n=== Resumen de Pruebas: ${passed} pasadas, ${failed} fallidas ===`);
  if (failed > 0) process.exit(1);
}

runAllTests().catch((err) => {
  console.error('Error fatal durante las pruebas:', err);
  process.exit(1);
});
