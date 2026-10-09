import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { ExecutionRequest, ExecutionResult } from '../../shared/types/atlas.types.ts';
import { ExecutionPolicy } from './execution-policy.ts';
import { SettingsRepository } from '../database/repositories/settings.repo.ts';
import { runExecute } from '../database/connection.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('CommandRunner');

export class CommandRunner {
  private static activeProcesses = new Map<string, ChildProcess>();

  static async runCommand(req: ExecutionRequest): Promise<ExecutionResult> {
    const settings = await SettingsRepository.getSettings();
    const policy = ExecutionPolicy.validate(
      req.command,
      req.workingDirectory,
      req.authorizedByUser,
      settings.allowedDirectories
    );

    if (!policy.allowed) {
      throw new Error(`Ejecución denegada por política de seguridad: ${policy.reason}`);
    }

    const execId = `exec-${Date.now()}`;
    const timeoutMs = req.timeoutMs || settings.maxExecutionTimeoutSeconds * 1000;
    const startTime = Date.now();
    logger.info(`Iniciando ejecución autorizada: ${req.command}`, { workDir: req.workingDirectory, timeoutMs });

    return new Promise((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let timedOut = false;
      const MAX_BUFFER = 512 * 1024; // 512 KB max output

      // Split command into executable and arguments or use shell
      const child = spawn(req.command, {
        cwd: path.resolve(req.workingDirectory),
        shell: true,
        env: {
          ...process.env,
          CI: 'true',
          NODE_ENV: 'test',
        },
      });

      this.activeProcesses.set(execId, child);

      const timer = setTimeout(() => {
        timedOut = true;
        logger.warn(`Tiempo límite excedido para comando ${req.command}. Terminando proceso.`);
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) child.kill('SIGKILL');
        }, 2000);
      }, timeoutMs);

      child.stdout?.on('data', (data) => {
        if (stdoutData.length < MAX_BUFFER) {
          stdoutData += data.toString();
        }
      });

      child.stderr?.on('data', (data) => {
        if (stderrData.length < MAX_BUFFER) {
          stderrData += data.toString();
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        this.activeProcesses.delete(execId);
        const durationMs = Date.now() - startTime;
        const result: ExecutionResult = {
          id: execId,
          command: req.command,
          workingDirectory: req.workingDirectory,
          exitCode: null,
          durationMs,
          stdout: stdoutData,
          stderr: stderrData || err.message,
          timedOut,
          error: `Error al iniciar proceso del sistema: ${err.message}`,
          executedAt: new Date().toISOString(),
        };
        this.persistExecution(req.projectId, result);
        resolve(result);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        this.activeProcesses.delete(execId);
        const durationMs = Date.now() - startTime;

        const result: ExecutionResult = {
          id: execId,
          command: req.command,
          workingDirectory: req.workingDirectory,
          exitCode: code,
          durationMs,
          stdout: stdoutData,
          stderr: stderrData,
          timedOut,
          error: timedOut ? 'Proceso terminado por límite de tiempo de ejecución (timeout)' : undefined,
          executedAt: new Date().toISOString(),
        };

        this.persistExecution(req.projectId, result);
        logger.info(`Ejecución finalizada con código ${code} en ${durationMs}ms`);
        resolve(result);
      });
    });
  }

  private static async persistExecution(projectId: string, result: ExecutionResult): Promise<void> {
    try {
      await runExecute(
        `INSERT INTO execution_records (
          id, project_id, command, working_directory, exit_code,
          duration_ms, stdout, stderr, timed_out, error, executed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.id,
          projectId,
          result.command,
          result.workingDirectory,
          result.exitCode,
          result.durationMs,
          result.stdout,
          result.stderr,
          result.timedOut ? 1 : 0,
          result.error || null,
          result.executedAt,
        ]
      );
    } catch (err) {
      logger.error('Error al persistir registro de ejecución', { error: String(err) });
    }
  }

  static cancelExecution(execId: string): boolean {
    const process = this.activeProcesses.get(execId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(execId);
      return true;
    }
    return false;
  }
}
