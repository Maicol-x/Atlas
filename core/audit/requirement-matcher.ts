import path from 'path';
import fs from 'fs';
import { EvidenceRecord, SpecificationRequirement } from '../../shared/types/atlas.types.ts';
import { ASTAnalyzer } from '../analyzers/ast-analyzer.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('RequirementMatcher');

export interface MatchAnalysisResult {
  requirement: SpecificationRequirement;
  evidence: EvidenceRecord[];
  hasDirectSymbols: boolean;
  hasRelevantFiles: boolean;
  hasAssociatedTests: boolean;
  isPartial: boolean;
}

export class RequirementMatcher {
  static async matchRequirement(
    projectRoot: string,
    allFiles: string[],
    req: SpecificationRequirement
  ): Promise<MatchAnalysisResult> {
    const evidence: EvidenceRecord[] = [];
    const queryWords = this.extractKeywords(`${req.title} ${req.description}`);
    
    let hasDirectSymbols = false;
    let hasRelevantFiles = false;
    let hasAssociatedTests = false;
    let matchedFilesCount = 0;

    for (const relFile of allFiles) {
      const baseName = path.basename(relFile).toLowerCase();
      const ext = path.extname(relFile).toLowerCase();

      // Check if file name matches keywords
      const isFileNameRelevant = queryWords.some((w) => baseName.includes(w));
      const isTestFile = baseName.includes('test') || baseName.includes('spec');

      // Only inspect text source files
      if (!['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.json', '.yaml', '.yml', '.toml'].includes(ext)) {
        continue;
      }

      const fullPath = path.resolve(projectRoot, relFile);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > 256 * 1024) continue; // Skip large files in fast matcher

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lowerContent = content.toLowerCase();

        // Check keyword matches in content
        const matchedKeywords = queryWords.filter((w) => lowerContent.includes(w));

        if (matchedKeywords.length >= 1 || isFileNameRelevant) {
          hasRelevantFiles = true;
          matchedFilesCount++;

          if (isTestFile && matchedKeywords.length > 0) {
            hasAssociatedTests = true;
          }

          // Inspect AST for TypeScript/JavaScript
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            const ast = ASTAnalyzer.analyzeTypeScript(relFile, content);
            for (const sym of ast.symbols) {
              const symLower = sym.name.toLowerCase();
              if (queryWords.some((w) => symLower.includes(w))) {
                hasDirectSymbols = true;
                evidence.push({
                  id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: 'ast_symbol',
                  filePath: relFile,
                  lineStart: sym.lineStart,
                  lineEnd: sym.lineEnd,
                  snippet: sym.snippet,
                  description: `Símbolo ${sym.kind} '${sym.name}' identificado en el código fuente`,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }

          // Extract code snippet if relevant keywords found
          const lines = content.split('\n');
          for (let i = 0; i < lines.length && evidence.length < 5; i++) {
            const line = lines[i];
            const lineLower = line.toLowerCase();
            if (queryWords.some((w) => lineLower.includes(w))) {
              const start = Math.max(0, i - 1);
              const end = Math.min(lines.length - 1, i + 2);
              const snippet = lines.slice(start, end + 1).join('\n');

              evidence.push({
                id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: 'file_content',
                filePath: relFile,
                lineStart: start + 1,
                lineEnd: end + 1,
                snippet: snippet.slice(0, 300),
                description: `Coincidencia textual de requisitos en ${relFile}:${i + 1}`,
                timestamp: new Date().toISOString(),
              });
              break; // One snippet per file is sufficient
            }
          }
        }
      } catch (err) {
        // Skip unreadable files gracefully
      }

      if (evidence.length >= 6) {
        break;
      }
    }

    const isPartial = matchedFilesCount > 0 && !hasDirectSymbols && !hasAssociatedTests;

    return {
      requirement: req,
      evidence,
      hasDirectSymbols,
      hasRelevantFiles,
      hasAssociatedTests,
      isPartial,
    };
  }

  private static extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'para', 'con', 'en', 'por', 'sobre', 'y', 'o',
      'que', 'se', 'es', 'son', 'al', 'su', 'sus', 'como', 'the', 'a', 'an', 'and', 'or', 'for', 'with',
      'in', 'on', 'by', 'at', 'to', 'from', 'of', 'is', 'are', 'be', 'req', 'requisito'
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
  }
}
