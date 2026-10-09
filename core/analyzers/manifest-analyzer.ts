import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('ManifestAnalyzer');

export interface ParsedManifest {
  filePath: string;
  manager: string;
  name?: string;
  version?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines?: Record<string, string>;
}

export class ManifestAnalyzer {
  static analyze(projectRoot: string, relativePath: string): ParsedManifest | null {
    const fullPath = path.resolve(projectRoot, relativePath);
    if (!fs.existsSync(fullPath)) return null;

    const fileName = path.basename(fullPath).toLowerCase();

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');

      if (fileName === 'package.json') {
        const json = JSON.parse(content);
        return {
          filePath: relativePath,
          manager: 'npm/yarn/pnpm/bun',
          name: json.name,
          version: json.version,
          dependencies: json.dependencies || {},
          devDependencies: json.devDependencies || {},
          scripts: json.scripts || {},
          engines: json.engines || {},
        };
      }

      if (fileName === 'requirements.txt') {
        const deps: Record<string, string> = {};
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([a-zA-Z0-9_\-\[\]]+)([=><~!].+)?$/);
          if (match) {
            deps[match[1]] = match[2] || '*';
          }
        }
        return {
          filePath: relativePath,
          manager: 'pip',
          dependencies: deps,
          devDependencies: {},
          scripts: {},
        };
      }

      if (fileName === 'pyproject.toml') {
        const deps: Record<string, string> = {};
        const scripts: Record<string, string> = {};
        // Simple TOML line parse without heavy native toml module
        let inDeps = false;
        let inScripts = false;
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('[')) {
            inDeps = trimmed.includes('dependencies');
            inScripts = trimmed.includes('scripts');
            continue;
          }
          if (inDeps && trimmed.includes('=')) {
            const [k, v] = trimmed.split('=').map((s) => s.trim().replace(/["']/g, ''));
            if (k) deps[k] = v || '*';
          }
          if (inScripts && trimmed.includes('=')) {
            const [k, v] = trimmed.split('=').map((s) => s.trim().replace(/["']/g, ''));
            if (k) scripts[k] = v || '*';
          }
        }
        return {
          filePath: relativePath,
          manager: 'poetry/pip/uv',
          dependencies: deps,
          devDependencies: {},
          scripts,
        };
      }

      if (fileName === 'cargo.toml') {
        const deps: Record<string, string> = {};
        const devDeps: Record<string, string> = {};
        let currentSection = '';
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('[')) {
            currentSection = trimmed;
            continue;
          }
          if (trimmed.includes('=')) {
            const [k, v] = trimmed.split('=').map((s) => s.trim().replace(/["']/g, ''));
            if (currentSection.includes('dev-dependencies')) {
              devDeps[k] = v || '*';
            } else if (currentSection.includes('dependencies')) {
              deps[k] = v || '*';
            }
          }
        }
        return {
          filePath: relativePath,
          manager: 'cargo',
          dependencies: deps,
          devDependencies: devDeps,
          scripts: {},
        };
      }

      if (fileName === 'go.mod') {
        const deps: Record<string, string> = {};
        let inRequire = false;
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('require (')) {
            inRequire = true;
            continue;
          }
          if (inRequire && trimmed === ')') {
            inRequire = false;
            continue;
          }
          if (inRequire) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) deps[parts[0]] = parts[1];
          } else if (trimmed.startsWith('require ')) {
            const parts = trimmed.slice(8).trim().split(/\s+/);
            if (parts.length >= 2) deps[parts[0]] = parts[1];
          }
        }
        return {
          filePath: relativePath,
          manager: 'go modules',
          dependencies: deps,
          devDependencies: {},
          scripts: {},
        };
      }

      if (fileName === 'dockerfile') {
        return {
          filePath: relativePath,
          manager: 'docker',
          dependencies: {},
          devDependencies: {},
          scripts: {},
        };
      }

      if (fileName.includes('docker-compose')) {
        try {
          const parsed = YAML.parse(content);
          const services = Object.keys(parsed?.services || {});
          const deps: Record<string, string> = {};
          for (const s of services) {
            deps[s] = parsed.services[s]?.image || 'local-build';
          }
          return {
            filePath: relativePath,
            manager: 'docker-compose',
            dependencies: deps,
            devDependencies: {},
            scripts: {},
          };
        } catch {
          // Fallback if YAML fails
        }
      }
    } catch (err) {
      logger.warn(`Error al analizar manifiesto ${relativePath}`, { error: String(err) });
    }

    return null;
  }
}
