/**
 * Atlas Structured Logger
 * Proporciona trazabilidad modular, niveles de severidad y omisión de secretos
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  module: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const memoryLogs: LogEntry[] = [];
const MAX_LOG_ENTRIES = 500;

function sanitizeSecrets(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    if (typeof data === 'string') {
      return data.replace(/(AIzaSy[A-Za-z0-9_-]{33}|ghp_[A-Za-z0-9]{36}|Bearer\s+[A-Za-z0-9._-]+)/g, '[REDACTED_SECRET]');
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeSecrets);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (/key|secret|token|password|auth|authorization/i.test(key)) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else {
      sanitized[key] = sanitizeSecrets(val);
    }
  }
  return sanitized;
}

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      module: this.module,
      level,
      message,
      context: context ? (sanitizeSecrets(context) as Record<string, unknown>) : undefined,
    };

    memoryLogs.unshift(entry);
    if (memoryLogs.length > MAX_LOG_ENTRIES) {
      memoryLogs.pop();
    }

    const consoleMsg = `[Atlas][${entry.level.toUpperCase()}][${entry.module}] ${message}`;
    if (level === 'error') {
      console.error(consoleMsg, entry.context || '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, entry.context || '');
    } else {
      console.log(consoleMsg, entry.context || '');
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  static getRecentLogs(limit = 100): LogEntry[] {
    return memoryLogs.slice(0, limit);
  }
}
