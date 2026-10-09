import { runExecute, runQuery, saveDatabase } from './connection.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('Migrations');

interface Migration {
  version: number;
  name: string;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_atlas_schema',
    up: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS application_settings (
        id TEXT PRIMARY KEY,
        gemini_api_key_configured INTEGER NOT NULL DEFAULT 0,
        research_provider TEXT NOT NULL DEFAULT 'local_first',
        offline_only INTEGER NOT NULL DEFAULT 0,
        allowed_directories TEXT NOT NULL DEFAULT '[]',
        max_execution_timeout_seconds INTEGER NOT NULL DEFAULT 30,
        max_file_size_to_inspect_kb INTEGER NOT NULL DEFAULT 2048,
        mask_secrets_in_reports INTEGER NOT NULL DEFAULT 1,
        require_explicit_execution_auth INTEGER NOT NULL DEFAULT 1,
        disable_telemetry INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        description TEXT,
        last_scanned_at TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS project_scans (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        summary_json TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS detected_technologies (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        version TEXT,
        confidence TEXT NOT NULL,
        evidence_file TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS research_queries (
        id TEXT PRIMARY KEY,
        problem_description TEXT NOT NULL,
        provider TEXT NOT NULL,
        offline_mode INTEGER NOT NULL,
        comparison_summary TEXT,
        technologies_json TEXT NOT NULL,
        warnings_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS technology_records (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        how_it_works TEXT NOT NULL,
        problem_solved TEXT NOT NULL,
        prerequisites_json TEXT NOT NULL,
        limitations_json TEXT NOT NULL,
        alternatives_json TEXT NOT NULL,
        when_to_use TEXT NOT NULL,
        ecosystem_json TEXT NOT NULL,
        maturity TEXT NOT NULL,
        is_verified INTEGER NOT NULL,
        offline_available INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS source_references (
        id TEXT PRIMARY KEY,
        technology_id TEXT,
        title TEXT NOT NULL,
        url TEXT,
        type TEXT NOT NULL,
        verified_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (technology_id) REFERENCES technology_records(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS audit_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        specification_text TEXT NOT NULL,
        requirements_count INTEGER NOT NULL DEFAULT 0,
        verified_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        incomplete_count INTEGER NOT NULL DEFAULT 0,
        not_verifiable_count INTEGER NOT NULL DEFAULT 0,
        not_implemented_count INTEGER NOT NULL DEFAULT 0,
        checks_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS audit_requirements (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        code TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        verification_method TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS audit_findings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        requirement_id TEXT NOT NULL,
        requirement_code TEXT NOT NULL,
        requirement_title TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        rationale TEXT NOT NULL,
        limitations TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES audit_sessions(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS execution_records (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        command TEXT NOT NULL,
        working_directory TEXT NOT NULL,
        exit_code INTEGER,
        duration_ms INTEGER NOT NULL,
        stdout TEXT NOT NULL,
        stderr TEXT NOT NULL,
        timed_out INTEGER NOT NULL,
        error TEXT,
        executed_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS saved_knowledge (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        related_technology TEXT,
        related_project_id TEXT,
        source_url TEXT,
        verified_conclusion INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    ],
  },
];

export async function runMigrations(): Promise<void> {
  logger.info('Iniciando verificación de migraciones de base de datos...');

  // Ensure migrations table exists
  await runExecute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = await runQuery<{ version: number }>('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      logger.info(`Aplicando migración v${migration.version}: ${migration.name}`);
      for (const sql of migration.up) {
        await runExecute(sql);
      }
      await runExecute(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, new Date().toISOString()]
      );
      logger.info(`Migración v${migration.version} completada con éxito.`);
    }
  }

  // Seed default settings if not exists
  const settingsCount = await runQuery<{ count: number }>('SELECT COUNT(*) as count FROM application_settings');
  if (settingsCount.length === 0 || settingsCount[0].count === 0) {
    await runExecute(`
      INSERT INTO application_settings (
        id, gemini_api_key_configured, research_provider, offline_only,
        allowed_directories, max_execution_timeout_seconds, max_file_size_to_inspect_kb,
        mask_secrets_in_reports, require_explicit_execution_auth, disable_telemetry, updated_at
      ) VALUES (
        'default', 0, 'local_first', 0,
        '[]', 30, 2048,
        1, 1, 1, ?
      )
    `, [new Date().toISOString()]);
    logger.info('Configuración predeterminada inicializada en SQLite');
  }

  saveDatabase();
}
