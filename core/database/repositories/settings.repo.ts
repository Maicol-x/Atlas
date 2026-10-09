import { runExecute, runQuery } from '../connection.ts';
import { ApplicationSettings } from '../../../shared/types/atlas.types.ts';

export class SettingsRepository {
  static async getSettings(): Promise<ApplicationSettings> {
    const rows = await runQuery<{
      gemini_api_key_configured: number;
      research_provider: 'local_first' | 'gemini_grounded';
      offline_only: number;
      allowed_directories: string;
      max_execution_timeout_seconds: number;
      max_file_size_to_inspect_kb: number;
      mask_secrets_in_reports: number;
      require_explicit_execution_auth: number;
      disable_telemetry: number;
    }>('SELECT * FROM application_settings WHERE id = "default"');

    const envHasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    if (rows.length === 0) {
      return {
        geminiApiKeyConfigured: envHasKey,
        researchProvider: 'local_first',
        offlineOnly: false,
        allowedDirectories: [],
        maxExecutionTimeoutSeconds: 30,
        maxFileSizeToInspectKB: 2048,
        maskSecretsInReports: true,
        requireExplicitExecutionAuth: true,
        disableTelemetry: true,
      };
    }

    const r = rows[0];
    return {
      geminiApiKeyConfigured: envHasKey || r.gemini_api_key_configured === 1,
      researchProvider: r.research_provider,
      offlineOnly: r.offline_only === 1,
      allowedDirectories: JSON.parse(r.allowed_directories || '[]'),
      maxExecutionTimeoutSeconds: r.max_execution_timeout_seconds,
      maxFileSizeToInspectKB: r.max_file_size_to_inspect_kb,
      maskSecretsInReports: r.mask_secrets_in_reports === 1,
      requireExplicitExecutionAuth: r.require_explicit_execution_auth === 1,
      disableTelemetry: r.disable_telemetry === 1,
    };
  }

  static async updateSettings(settings: Partial<ApplicationSettings>): Promise<ApplicationSettings> {
    const current = await this.getSettings();
    const updated: ApplicationSettings = { ...current, ...settings };
    const now = new Date().toISOString();

    await runExecute(
      `UPDATE application_settings SET
        gemini_api_key_configured = ?,
        research_provider = ?,
        offline_only = ?,
        allowed_directories = ?,
        max_execution_timeout_seconds = ?,
        max_file_size_to_inspect_kb = ?,
        mask_secrets_in_reports = ?,
        require_explicit_execution_auth = ?,
        disable_telemetry = ?,
        updated_at = ?
      WHERE id = "default"`,
      [
        updated.geminiApiKeyConfigured ? 1 : 0,
        updated.researchProvider,
        updated.offlineOnly ? 1 : 0,
        JSON.stringify(updated.allowedDirectories),
        updated.maxExecutionTimeoutSeconds,
        updated.maxFileSizeToInspectKB,
        updated.maskSecretsInReports ? 1 : 0,
        updated.requireExplicitExecutionAuth ? 1 : 0,
        updated.disableTelemetry ? 1 : 0,
        now,
      ]
    );

    return updated;
  }
}
