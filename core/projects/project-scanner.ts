import fs from 'fs';
import path from 'path';
import { FileTreeNode, ProjectMetadata } from '../../shared/types/atlas.types.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('ProjectScanner');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  'coverage',
]);

export interface ScanResult {
  metadata: ProjectMetadata;
  fileTree: FileTreeNode;
  allFilePaths: string[];
}

export class ProjectScanner {
  static async scanDirectory(targetPath: string, maxDepth = 6): Promise<ScanResult> {
    const resolvedPath = path.resolve(targetPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`La ruta especificada no existe: ${resolvedPath}`);
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isDirectory()) {
      throw new Error(`La ruta especificada no es un directorio: ${resolvedPath}`);
    }

    logger.info(`Escaneando directorio de forma segura: ${resolvedPath}`);

    const allFilePaths: string[] = [];
    const languageFileCounts: Record<string, number> = {};
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalSize = 0;

    function buildTree(currentPath: string, currentDepth: number): FileTreeNode {
      const name = path.basename(currentPath) || currentPath;
      const relativePath = path.relative(resolvedPath, currentPath) || '.';
      const itemStat = fs.statSync(currentPath);

      if (!itemStat.isDirectory()) {
        totalFiles++;
        totalSize += itemStat.size;
        allFilePaths.push(relativePath);

        const ext = path.extname(currentPath).toLowerCase();
        const lang = getLanguageByExtension(ext);
        if (lang) {
          languageFileCounts[lang] = (languageFileCounts[lang] || 0) + 1;
        }

        return {
          name,
          path: currentPath,
          relativePath,
          isDirectory: false,
          size: itemStat.size,
          extension: ext,
        };
      }

      totalDirectories++;
      const node: FileTreeNode = {
        name,
        path: currentPath,
        relativePath,
        isDirectory: true,
        children: [],
      };

      if (currentDepth >= maxDepth) {
        return node;
      }

      try {
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
          if (IGNORED_DIRS.has(entry) && itemStat.isDirectory()) {
            continue; // Skip traversing heavy dependency and build caches
          }
          const childPath = path.join(currentPath, entry);
          try {
            const childNode = buildTree(childPath, currentDepth + 1);
            node.children?.push(childNode);
          } catch (childErr) {
            logger.warn(`No se pudo leer entrada ${childPath}`, { error: String(childErr) });
          }
        }
      } catch (err) {
        logger.warn(`Error al leer directorio ${currentPath}`, { error: String(err) });
      }

      return node;
    }

    const fileTree = buildTree(resolvedPath, 0);

    // Calculate language percentages
    const totalLangFiles = Object.values(languageFileCounts).reduce((a, b) => a + b, 0) || 1;
    const detectedLanguages = Object.entries(languageFileCounts)
      .map(([name, count]) => ({
        name,
        percentage: Math.round((count / totalLangFiles) * 100),
        filesCount: count,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    const projectName = path.basename(resolvedPath) || 'Proyecto';
    const projectId = Buffer.from(resolvedPath).toString('base64url').slice(0, 16);

    const metadata: ProjectMetadata = {
      id: projectId,
      name: projectName,
      path: resolvedPath,
      lastScannedAt: new Date().toISOString(),
      detectedLanguages,
      detectedFrameworks: [],
      detectedDatabases: [],
      packageManagers: [],
      availableScripts: {},
      testFrameworks: [],
      entryPoints: [],
      filesCount: totalFiles,
      directoriesCount: totalDirectories,
      totalSize,
    };

    return {
      metadata,
      fileTree,
      allFilePaths,
    };
  }

  static async readFileSafely(projectRoot: string, relativeFilePath: string, maxBytes = 1024 * 1024): Promise<string> {
    const fullPath = path.resolve(projectRoot, relativeFilePath);
    const resolvedRoot = path.resolve(projectRoot);

    // Path traversal check
    if (!fullPath.startsWith(resolvedRoot)) {
      throw new Error(`Acceso denegado: intento de salida de directorio fuera de ${projectRoot}`);
    }

    if (!fs.existsSync(fullPath)) {
      throw new Error(`El archivo no existe: ${relativeFilePath}`);
    }

    const stat = fs.statSync(fullPath);
    if (stat.size > maxBytes) {
      throw new Error(`El archivo excede el tamaño máximo permitido de inspección (${Math.round(maxBytes / 1024)} KB)`);
    }

    return fs.readFileSync(fullPath, 'utf-8');
  }
}

function getLanguageByExtension(ext: string): string | null {
  const map: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.sql': 'SQL',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.sh': 'Shell',
    '.md': 'Markdown',
  };
  return map[ext] || null;
}
