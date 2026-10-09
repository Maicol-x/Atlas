import { ResearchQuery, TechnologyRecord } from '../../shared/types/atlas.types.ts';
import { VERIFIED_LOCAL_KNOWLEDGE } from './local-tech-knowledge.ts';
import { GeminiResearchProvider } from './gemini-research-provider.ts';
import { TechnologyComparator } from './technology-comparator.ts';
import { ResearchRepository } from '../database/repositories/research.repo.ts';
import { SettingsRepository } from '../database/repositories/settings.repo.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('ResearchService');

export class ResearchService {
  static async searchLocal(queryText: string): Promise<TechnologyRecord[]> {
    const qLower = queryText.toLowerCase().trim();
    const words = qLower.split(/\s+/).filter(Boolean);

    return VERIFIED_LOCAL_KNOWLEDGE.filter((item) => {
      const target = `${item.name} ${item.description} ${item.problemSolved} ${item.howItWorks} ${item.category} ${item.ecosystem.join(' ')} ${item.alternatives.join(' ')}`.toLowerCase();
      return words.some((word) => target.includes(word));
    });
  }

  static async exploreProblem(problemDescription: string): Promise<ResearchQuery> {
    const settings = await SettingsRepository.getSettings();
    const queryId = `query-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const localMatches = await this.searchLocal(problemDescription);
    const warnings: string[] = [];
    let technologies: TechnologyRecord[] = [];
    let provider: ResearchQuery['provider'] = 'local_engine';
    let comparisonSummary = '';
    let isOffline = settings.offlineOnly;

    // Check if we should attempt Gemini
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

    if (!isOffline && hasKey && settings.researchProvider === 'gemini_grounded') {
      try {
        const geminiResult = await GeminiResearchProvider.researchProblem(problemDescription);
        provider = localMatches.length > 0 ? 'hybrid' : 'gemini_grounded';
        
        // Combine: give priority to local verified items with the same name, append new ones
        const mergedMap = new Map<string, TechnologyRecord>();
        for (const localItem of localMatches) {
          mergedMap.set(localItem.name.toLowerCase(), localItem);
        }
        for (const geminiItem of geminiResult.technologies) {
          if (!mergedMap.has(geminiItem.name.toLowerCase())) {
            mergedMap.set(geminiItem.name.toLowerCase(), geminiItem);
          }
        }

        technologies = Array.from(mergedMap.values());
        comparisonSummary = geminiResult.summary;
        warnings.push(...geminiResult.warnings);
      } catch (err) {
        logger.warn('Fallo consulta externa Gemini, recurriendo a base local', { error: String(err) });
        isOffline = true;
        warnings.push('No se pudo conectar con el proveedor de investigación externa. Resultados limitados a la base de conocimiento local.');
        technologies = localMatches.length > 0 ? localMatches : VERIFIED_LOCAL_KNOWLEDGE.slice(0, 3);
      }
    } else {
      isOffline = true;
      provider = 'local_engine';
      if (!hasKey) {
        warnings.push('GEMINI_API_KEY no configurada. Atlas opera en modo local con base de conocimiento verificada.');
      } else if (settings.offlineOnly) {
        warnings.push('Modo sin conexión forzado en la configuración del sistema.');
      }
      technologies = localMatches.length > 0 ? localMatches : VERIFIED_LOCAL_KNOWLEDGE.slice(0, 4);
    }

    if (!comparisonSummary && technologies.length > 0) {
      const comp = TechnologyComparator.compare(technologies);
      comparisonSummary = comp.summary;
    }

    const result: ResearchQuery = {
      id: queryId,
      problemDescription,
      createdAt,
      provider,
      technologies,
      comparisonSummary,
      offlineMode: isOffline,
      warnings,
    };

    // Save to SQLite
    try {
      await ResearchRepository.saveQuery(result);
    } catch (saveErr) {
      logger.error('Error al guardar consulta de investigación en SQLite', { error: String(saveErr) });
    }

    return result;
  }
}
