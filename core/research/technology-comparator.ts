import { TechnologyRecord } from '../../shared/types/atlas.types.ts';

export interface ComparisonDimension {
  title: string;
  key: keyof TechnologyRecord | 'comparison';
  values: Record<string, string>;
}

export class TechnologyComparator {
  static compare(technologies: TechnologyRecord[]): {
    dimensions: ComparisonDimension[];
    summary: string;
  } {
    if (technologies.length === 0) {
      return { dimensions: [], summary: 'No hay tecnologías seleccionadas para comparar.' };
    }

    const dimensions: ComparisonDimension[] = [
      {
        title: 'Problema que Resuelve',
        key: 'problemSolved',
        values: technologies.reduce((acc, t) => ({ ...acc, [t.name]: t.problemSolved }), {}),
      },
      {
        title: 'Mecanismo Interno (Cómo Funciona)',
        key: 'howItWorks',
        values: technologies.reduce((acc, t) => ({ ...acc, [t.name]: t.howItWorks }), {}),
      },
      {
        title: 'Requisitos y Prerrequisitos',
        key: 'prerequisites',
        values: technologies.reduce(
          (acc, t) => ({ ...acc, [t.name]: t.prerequisites.join('; ') || 'Ninguno específico' }),
          {}
        ),
      },
      {
        title: 'Limitaciones y Compensaciones',
        key: 'limitations',
        values: technologies.reduce(
          (acc, t) => ({ ...acc, [t.name]: t.limitations.join('; ') || 'No documentadas' }),
          {}
        ),
      },
      {
        title: 'Cuándo Conviene Usarla',
        key: 'whenToUse',
        values: technologies.reduce((acc, t) => ({ ...acc, [t.name]: t.whenToUse }), {}),
      },
      {
        title: 'Ecosistema y Madurez',
        key: 'maturity',
        values: technologies.reduce(
          (acc, t) => ({ ...acc, [t.name]: `${t.maturity.toUpperCase()} (${t.ecosystem.join(', ')})` }),
          {}
        ),
      },
    ];

    const techNames = technologies.map((t) => t.name).join(' vs ');
    const summary = `Comparativa técnica entre ${techNames}. Se evaluaron ${dimensions.length} dimensiones arquitectónicas y operativas basadas en fuentes verificables.`;

    return { dimensions, summary };
  }
}
