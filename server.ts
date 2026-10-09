import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runMigrations } from './core/database/migrations.ts';
import { ProjectRepository } from './core/database/repositories/project.repo.ts';
import { ResearchRepository } from './core/database/repositories/research.repo.ts';
import { AuditRepository } from './core/database/repositories/audit.repo.ts';
import { KnowledgeRepository } from './core/database/repositories/knowledge.repo.ts';
import { SettingsRepository } from './core/database/repositories/settings.repo.ts';
import { ProjectScanner } from './core/projects/project-scanner.ts';
import { ProjectClassifier } from './core/projects/project-classifier.ts';
import { ResearchService } from './core/research/research.service.ts';
import { AuditEngine } from './core/audit/audit-engine.ts';
import { CommandRunner } from './core/execution/command-runner.ts';
import { Logger } from './core/logging/logger.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = new Logger('Server');

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Initialize SQLite database and run versioned migrations
  try {
    await runMigrations();
    logger.info('Base de datos SQLite y migraciones inicializadas exitosamente.');
  } catch (err) {
    logger.error('Error al inicializar migraciones de base de datos', { error: String(err) });
  }

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Atlas Technical Engine',
      timestamp: new Date().toISOString(),
    });
  });

  // Projects
  app.get('/api/projects', async (_req, res) => {
    try {
      const projects = await ProjectRepository.getAllProjects();
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/projects/scan', async (req, res) => {
    try {
      const { dirPath } = req.body;
      if (!dirPath || typeof dirPath !== 'string') {
        return res.status(400).json({ error: 'Ruta de directorio requerida' });
      }

      const scanResult = await ProjectScanner.scanDirectory(dirPath);
      const { summary, updatedMetadata } = ProjectClassifier.classify(
        dirPath,
        scanResult.allFilePaths,
        scanResult.metadata
      );

      await ProjectRepository.upsertProject(updatedMetadata);
      await ProjectRepository.saveScanSummary(summary);

      res.json({
        project: updatedMetadata,
        scanSummary: summary,
        fileTree: scanResult.fileTree,
      });
    } catch (err: any) {
      logger.error('Error al escanear directorio', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const project = await ProjectRepository.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }
      const latestScan = await ProjectRepository.getLatestScanSummary(project.id);
      res.json({ project, scanSummary: latestScan });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/projects/:id/file', async (req, res) => {
    try {
      const project = await ProjectRepository.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }
      const relativePath = req.query.path as string;
      if (!relativePath) {
        return res.status(400).json({ error: 'Parámetro de ruta relativo requerido' });
      }

      const content = await ProjectScanner.readFileSafely(project.path, relativePath);
      res.json({ path: relativePath, content });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      await ProjectRepository.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Research
  app.post('/api/research/explore', async (req, res) => {
    try {
      const { problemDescription } = req.body;
      if (!problemDescription) {
        return res.status(400).json({ error: 'Descripción del problema requerida' });
      }
      const result = await ResearchService.exploreProblem(problemDescription);
      res.json(result);
    } catch (err: any) {
      logger.error('Error al investigar problema', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/research/queries', async (_req, res) => {
    try {
      const queries = await ResearchRepository.getRecentQueries(25);
      res.json(queries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/research/technologies', async (_req, res) => {
    try {
      const techs = await ResearchRepository.getAllSavedTechnologies();
      res.json(techs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Audit
  app.post('/api/audit/run', async (req, res) => {
    try {
      const { projectId, specificationText, requirements, checksExecuted } = req.body;
      if (!projectId || !specificationText) {
        return res.status(400).json({ error: 'projectId y specificationText requeridos' });
      }

      const session = await AuditEngine.runAudit(
        projectId,
        specificationText,
        requirements,
        checksExecuted || []
      );
      res.json(session);
    } catch (err: any) {
      logger.error('Error al ejecutar auditoría', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/audit/history/:projectId', async (req, res) => {
    try {
      const sessions = await AuditRepository.getSessionsForProject(req.params.projectId);
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/audit/session/:id', async (req, res) => {
    try {
      const session = await AuditRepository.getSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }
      res.json(session);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/audit/session/:id', async (req, res) => {
    try {
      await AuditRepository.deleteSession(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Execution
  app.post('/api/execution/run', async (req, res) => {
    try {
      const { projectId, command, workingDirectory, authorizedByUser, timeoutMs } = req.body;
      if (!command || !workingDirectory) {
        return res.status(400).json({ error: 'command y workingDirectory requeridos' });
      }

      const result = await CommandRunner.runCommand({
        projectId: projectId || 'standalone',
        command,
        workingDirectory,
        purpose: req.body.purpose || 'Comprobación de auditoría',
        authorizedByUser: Boolean(authorizedByUser),
        timeoutMs,
      });

      res.json(result);
    } catch (err: any) {
      logger.error('Error al ejecutar comando', { error: err.message });
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/execution/cancel', (req, res) => {
    try {
      const { id } = req.body;
      const cancelled = CommandRunner.cancelExecution(id);
      res.json({ cancelled });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Knowledge base
  app.get('/api/knowledge', async (_req, res) => {
    try {
      const items = await KnowledgeRepository.getAllItems();
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/knowledge', async (req, res) => {
    try {
      const item = req.body;
      if (!item.title || !item.content) {
        return res.status(400).json({ error: 'title y content requeridos' });
      }
      await KnowledgeRepository.saveItem(item);
      res.json({ success: true, item });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/knowledge/:id', async (req, res) => {
    try {
      await KnowledgeRepository.deleteItem(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings
  app.get('/api/settings', async (_req, res) => {
    try {
      const settings = await SettingsRepository.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const updated = await SettingsRepository.updateSettings(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // System Logs
  app.get('/api/logs', (_req, res) => {
    res.json(Logger.getRecentLogs(50));
  });

  // Setup Vite dev server or static files
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    logger.info('Vite dev server montado en middlewares de Express.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Atlas Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  logger.error('Error fatal al iniciar servidor', { error: String(err) });
  process.exit(1);
});
