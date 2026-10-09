import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('Database');

let sqlJsInstance: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'atlas.sqlite');

export async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsInstance) {
    sqlJsInstance = await initSqlJs();
  }
  return sqlJsInstance;
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await getSqlJs();

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      logger.info('Base de datos SQLite cargada desde archivo existente', { path: DB_PATH });
    } catch (err) {
      logger.error('Error al cargar base de datos existente, inicializando nueva', { error: String(err) });
      dbInstance = new SQL.Database();
    }
  } else {
    logger.info('Inicializando nueva base de datos SQLite', { path: DB_PATH });
    dbInstance = new SQL.Database();
    saveDatabase();
  }

  return dbInstance;
}

export function saveDatabase(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    logger.error('Error al persistir base de datos a disco', { error: String(err) });
  }
}

export async function runQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    logger.error('Error ejecutando consulta SQL', { sql, error: String(err) });
    throw err;
  }
}

export async function runExecute(sql: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();
  try {
    if (params.length === 0) {
      db.run(sql);
    } else {
      const stmt = db.prepare(sql);
      stmt.run(params);
      stmt.free();
    }
    saveDatabase();
  } catch (err) {
    logger.error('Error ejecutando sentencia SQL', { sql, error: String(err) });
    throw err;
  }
}
