import path from 'path';
import { ConfidenceLevel, ProjectScanSummary, ProjectMetadata } from '../../shared/types/atlas.types.ts';
import { ManifestAnalyzer, ParsedManifest } from '../analyzers/manifest-analyzer.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('ProjectClassifier');

export class ProjectClassifier {
  static classify(
    projectRoot: string,
    allFiles: string[],
    metadata: ProjectMetadata
  ): { summary: ProjectScanSummary; updatedMetadata: ProjectMetadata } {
    const manifests: ParsedManifest[] = [];
    const frameworksMap = new Map<string, { version?: string; evidenceFile: string }>();
    const databasesSet = new Set<string>();
    const testFrameworksSet = new Set<string>();
    const entryPoints: string[] = [];
    const testFiles: string[] = [];
    const configFiles: string[] = [];
    const packageManagersSet = new Set<string>();
    const scripts: ProjectScanSummary['scripts'] = [];

    // Find manifest files
    const manifestCandidates = [
      'package.json',
      'requirements.txt',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'composer.json',
      'Gemfile',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
    ];

    for (const relFile of allFiles) {
      const baseName = path.basename(relFile).toLowerCase();

      // Detect manifests
      if (manifestCandidates.includes(baseName) || baseName.startsWith('docker-compose')) {
        const parsed = ManifestAnalyzer.analyze(projectRoot, relFile);
        if (parsed) {
          manifests.push(parsed);
          packageManagersSet.add(parsed.manager);

          // Add scripts from manifest
          for (const [scriptName, scriptCmd] of Object.entries(parsed.scripts)) {
            let category: 'test' | 'build' | 'lint' | 'start' | 'other' = 'other';
            const sLower = scriptName.toLowerCase();
            if (sLower.includes('test') || sLower.includes('spec') || sLower.includes('check')) category = 'test';
            else if (sLower.includes('build') || sLower.includes('bundle') || sLower.includes('compile')) category = 'build';
            else if (sLower.includes('lint') || sLower.includes('format')) category = 'lint';
            else if (sLower.includes('start') || sLower.includes('dev') || sLower.includes('serve')) category = 'start';

            scripts.push({
              name: scriptName,
              command: scriptCmd,
              source: relFile,
              category,
            });
          }
        }
      }

      // Detect test files
      if (
        baseName.includes('.test.') ||
        baseName.includes('.spec.') ||
        relFile.startsWith('tests/') ||
        relFile.startsWith('test/') ||
        baseName.startsWith('test_')
      ) {
        testFiles.push(relFile);
      }

      // Detect config files
      if (
        baseName.includes('config') ||
        baseName.startsWith('.') ||
        baseName.endsWith('.toml') ||
        baseName.endsWith('.yaml') ||
        baseName.endsWith('.yml')
      ) {
        configFiles.push(relFile);
      }

      // Detect entry points
      if (
        baseName === 'server.ts' ||
        baseName === 'main.tsx' ||
        baseName === 'main.ts' ||
        baseName === 'index.ts' ||
        baseName === 'index.js' ||
        baseName === 'app.ts' ||
        baseName === 'main.py' ||
        baseName === 'app.py' ||
        baseName === 'main.rs' ||
        baseName === 'main.go'
      ) {
        entryPoints.push(relFile);
      }
    }

    // Inspect all combined dependencies across manifests
    for (const manifest of manifests) {
      const allDeps = { ...manifest.dependencies, ...manifest.devDependencies };

      // Framework detection
      const frameworkRules: Record<string, string[]> = {
        React: ['react', 'react-dom'],
        'Next.js': ['next'],
        Vue: ['vue'],
        Angular: ['@angular/core'],
        Svelte: ['svelte'],
        Express: ['express'],
        Fastify: ['fastify'],
        NestJS: ['@nestjs/core'],
        Vite: ['vite', '@vitejs/plugin-react'],
        TailwindCSS: ['tailwindcss', '@tailwindcss/vite'],
        Django: ['django'],
        Flask: ['flask'],
        FastAPI: ['fastapi'],
        Actix: ['actix-web'],
        Axum: ['axum'],
        Tokio: ['tokio'],
        Gin: ['github.com/gin-gonic/gin'],
        Fiber: ['github.com/gofiber/fiber'],
        Electron: ['electron'],
      };

      for (const [fwName, matchKeys] of Object.entries(frameworkRules)) {
        for (const key of matchKeys) {
          if (allDeps[key]) {
            frameworksMap.set(fwName, {
              version: allDeps[key],
              evidenceFile: manifest.filePath,
            });
            break;
          }
        }
      }

      // Database detection
      const dbRules: Record<string, string[]> = {
        SQLite: ['sqlite3', 'better-sqlite3', 'sql.js', 'rusqlite'],
        PostgreSQL: ['pg', 'postgres', 'psycopg2', 'tokio-postgres', 'drizzle-orm'],
        MySQL: ['mysql2', 'mysql'],
        MongoDB: ['mongodb', 'mongoose', 'pymongo'],
        Redis: ['redis', 'ioredis'],
        Prisma: ['@prisma/client', 'prisma'],
      };

      for (const [dbName, matchKeys] of Object.entries(dbRules)) {
        for (const key of matchKeys) {
          if (allDeps[key]) {
            databasesSet.add(dbName);
            break;
          }
        }
      }

      // Test framework detection
      const testRules: Record<string, string[]> = {
        Vitest: ['vitest'],
        Jest: ['jest', '@types/jest'],
        Mocha: ['mocha'],
        Playwright: ['@playwright/test'],
        Cypress: ['cypress'],
        Pytest: ['pytest'],
      };

      for (const [testName, matchKeys] of Object.entries(testRules)) {
        for (const key of matchKeys) {
          if (allDeps[key]) {
            testFrameworksSet.add(testName);
            break;
          }
        }
      }
    }

    // Build scan summary
    const scanId = `scan-${Date.now()}`;
    const scannedAt = new Date().toISOString();

    const scanSummary: ProjectScanSummary = {
      id: scanId,
      projectId: metadata.id,
      scannedAt,
      languages: metadata.detectedLanguages.map((l) => ({
        name: l.name,
        percentage: l.percentage,
        confidence: (l.percentage > 20 ? 'confirmed' : 'inferred') as ConfidenceLevel,
      })),
      frameworks: Array.from(frameworksMap.entries()).map(([name, val]) => ({
        name,
        version: val.version,
        evidenceFile: val.evidenceFile,
      })),
      manifests: manifests.map((m) => ({
        path: m.filePath,
        manager: m.manager,
        dependenciesCount: Object.keys(m.dependencies).length + Object.keys(m.devDependencies).length,
      })),
      scripts,
      testFiles,
      configFiles,
      entryPoints,
    };

    const updatedMetadata: ProjectMetadata = {
      ...metadata,
      lastScannedAt: scannedAt,
      detectedFrameworks: Array.from(frameworksMap.keys()),
      detectedDatabases: Array.from(databasesSet),
      packageManagers: Array.from(packageManagersSet),
      availableScripts: scripts.reduce((acc, s) => ({ ...acc, [s.name]: s.command }), {}),
      testFrameworks: Array.from(testFrameworksSet),
      entryPoints,
    };

    logger.info(`Clasificación de proyecto completa: ${metadata.name}`, {
      frameworks: updatedMetadata.detectedFrameworks,
      databases: updatedMetadata.detectedDatabases,
      scriptsCount: scripts.length,
      testFilesCount: testFiles.length,
    });

    return { summary: scanSummary, updatedMetadata };
  }
}
