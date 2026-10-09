import { GoogleGenAI } from '@google/genai';
import { TechnologyRecord } from '../../shared/types/atlas.types.ts';
import { Logger } from '../logging/logger.ts';

const logger = new Logger('GeminiResearchProvider');

export class GeminiResearchProvider {
  private static getClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({});
  }

  static async researchProblem(problemDescription: string): Promise<{
    technologies: TechnologyRecord[];
    summary: string;
    warnings: string[];
  }> {
    const ai = this.getClient();
    if (!ai) {
      throw new Error('La clave GEMINI_API_KEY no está configurada en las variables de entorno.');
    }

    logger.info('Consultando Gemini para investigación tecnológica fundamentada', { problem: problemDescription });

    const prompt = `
Eres el motor de investigación de Atlas, un explorador tecnológico de alta fidelidad.
El usuario describe este problema técnico:
"${problemDescription}"

Investiga y presenta entre 2 y 4 tecnologías, bibliotecas, arquitecturas, protocolos o herramientas reales para resolverlo.

PRINCIPIOS ESTRICTOS:
1. No inventes bibliotecas, versiones ni APIs que no existan.
2. Distingue claramente qué resuelve, cómo funciona, prerrequisitos, limitaciones reales, alternativas y cuándo conviene usarla.
3. Clasifica la categoría de cada una entre:
   ['library', 'framework', 'dev_tool', 'architecture_pattern', 'protocol_standard', 'storage_database', 'queue_background', 'analysis_testing', 'ai_data', 'infrastructure_deployment']
4. Identifica las fuentes oficiales y marca las inferencias como tales.

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura:
{
  "summary": "Resumen técnico global de cómo abordar este problema",
  "technologies": [
    {
      "id": "tech-slug",
      "name": "Nombre exacto de la tecnología",
      "category": "categoria_exacta",
      "description": "Descripción concisa",
      "howItWorks": "Mecanismo técnico real y arquitectura",
      "problemSolved": "Problema específico que resuelve",
      "prerequisites": ["Prerrequisito 1", "Prerrequisito 2"],
      "limitations": ["Limitación real 1", "Compensación 2"],
      "alternatives": ["Alternativa real 1", "Alternativa real 2"],
      "whenToUse": "Criterio decisional exacto de conveniencia",
      "ecosystem": ["TypeScript", "Linux", ...],
      "maturity": "stable",
      "isVerified": true,
      "sources": [
        {
          "id": "src-1",
          "title": "Documentación oficial o repositorio",
          "url": "URL oficial si es conocida de forma verificable",
          "type": "official_doc",
          "verifiedAt": "${new Date().toISOString().split('T')[0]}"
        }
      ]
    }
  ],
  "warnings": ["Advertencias sobre consideraciones de seguridad o límites de la investigación"]
}
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      return {
        technologies: (parsed.technologies || []).map((t: any) => ({
          ...t,
          offlineAvailable: false,
        })),
        summary: parsed.summary || 'Investigación técnica procesada.',
        warnings: parsed.warnings || [],
      };
    } catch (err) {
      logger.error('Fallo en la llamada a Gemini Research Provider', { error: String(err) });
      throw err;
    }
  }
}
