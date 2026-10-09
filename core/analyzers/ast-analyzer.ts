import { parse } from '@babel/parser';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('ASTAnalyzer');

export interface ParsedSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'route' | 'test';
  lineStart: number;
  lineEnd: number;
  snippet: string;
}

export interface ParsedFileAnalysis {
  filePath: string;
  imports: { module: string; defaultImport?: string; namedImports: string[] }[];
  exports: string[];
  symbols: ParsedSymbol[];
}

export class ASTAnalyzer {
  static analyzeTypeScript(filePath: string, sourceText: string): ParsedFileAnalysis {
    const imports: { module: string; defaultImport?: string; namedImports: string[] }[] = [];
    const exportsList: string[] = [];
    const symbols: ParsedSymbol[] = [];

    try {
      const ast = parse(sourceText, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        errorRecovery: true,
      });

      const lines = sourceText.split('\n');

      function traverse(node: any) {
        if (!node || typeof node !== 'object') return;

        const loc = node.loc;
        const lineStart = loc ? loc.start.line : 1;
        const lineEnd = loc ? loc.end.line : lineStart;
        const snippet = lines.slice(Math.max(0, lineStart - 1), Math.min(lines.length, lineStart + 2)).join('\n').trim();

        // Imports
        if (node.type === 'ImportDeclaration' && node.source) {
          const mod = node.source.value;
          const named: string[] = [];
          let def: string | undefined;

          if (node.specifiers) {
            for (const spec of node.specifiers) {
              if (spec.type === 'ImportDefaultSpecifier') {
                def = spec.local?.name;
              } else if (spec.type === 'ImportSpecifier') {
                named.push(spec.local?.name || spec.imported?.name);
              }
            }
          }

          imports.push({
            module: mod,
            defaultImport: def,
            namedImports: named,
          });
        }

        // Functions
        if (node.type === 'FunctionDeclaration' && node.id) {
          symbols.push({
            name: node.id.name,
            kind: 'function',
            lineStart,
            lineEnd,
            snippet,
          });
        }

        // Classes
        if (node.type === 'ClassDeclaration' && node.id) {
          symbols.push({
            name: node.id.name,
            kind: 'class',
            lineStart,
            lineEnd,
            snippet,
          });
        }

        // Interfaces & Type Aliases
        if ((node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration') && node.id) {
          symbols.push({
            name: node.id.name,
            kind: node.type === 'TSInterfaceDeclaration' ? 'interface' : 'type',
            lineStart,
            lineEnd,
            snippet,
          });
        }

        // Variables / Arrow Functions
        if (node.type === 'VariableDeclaration' && node.declarations) {
          for (const decl of node.declarations) {
            if (decl.id && decl.id.type === 'Identifier') {
              const isFn = decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression');
              symbols.push({
                name: decl.id.name,
                kind: isFn ? 'function' : 'variable',
                lineStart,
                lineEnd,
                snippet,
              });
            }
          }
        }

        // Test Call Expressions
        if (node.type === 'CallExpression') {
          const callee = node.callee;
          const calleeName = callee?.name || callee?.property?.name;
          if (['test', 'it', 'describe', 'suite'].includes(calleeName) && node.arguments?.length > 0) {
            const firstArg = node.arguments[0];
            const testName = firstArg?.value || 'anonymous test';
            symbols.push({
              name: `${calleeName}: ${testName}`,
              kind: 'test',
              lineStart,
              lineEnd,
              snippet,
            });
          }
        }

        // Exports
        if (node.type === 'ExportNamedDeclaration') {
          if (node.declaration?.id?.name) {
            exportsList.push(node.declaration.id.name);
          } else if (node.specifiers) {
            for (const sp of node.specifiers) {
              if (sp.exported?.name) exportsList.push(sp.exported.name);
            }
          }
        }

        for (const key of Object.keys(node)) {
          if (key === 'loc' || key === 'comments') continue;
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(traverse);
          } else if (child && typeof child === 'object') {
            traverse(child);
          }
        }
      }

      traverse(ast);
    } catch (err) {
      logger.warn(`Error al parsear AST de ${filePath}, recurriendo a análisis sintáctico lineal`, { error: String(err) });
      return this.analyzeGeneric(filePath, sourceText);
    }

    return {
      filePath,
      imports,
      exports: exportsList,
      symbols,
    };
  }

  static analyzeGeneric(filePath: string, content: string): ParsedFileAnalysis {
    const lines = content.split('\n');
    const imports: { module: string; namedImports: string[] }[] = [];
    const symbols: ParsedSymbol[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const lineNum = idx + 1;

      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        imports.push({ module: trimmed, namedImports: [] });
      }

      if (trimmed.startsWith('def ') || trimmed.startsWith('async def ')) {
        const match = trimmed.match(/def\s+([a-zA-Z0-9_]+)/);
        if (match) {
          symbols.push({
            name: match[1],
            kind: 'function',
            lineStart: lineNum,
            lineEnd: lineNum,
            snippet: trimmed,
          });
        }
      } else if (trimmed.startsWith('func ') || trimmed.startsWith('fn ')) {
        const match = trimmed.match(/(?:func|fn)\s+([a-zA-Z0-9_]+)/);
        if (match) {
          symbols.push({
            name: match[1],
            kind: 'function',
            lineStart: lineNum,
            lineEnd: lineNum,
            snippet: trimmed,
          });
        }
      }
    });

    return {
      filePath,
      imports,
      exports: [],
      symbols,
    };
  }
}
