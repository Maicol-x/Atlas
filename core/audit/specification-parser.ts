import { SpecificationRequirement } from '../../shared/types/atlas.types.ts';

export class SpecificationParser {
  static parse(rawText: string): SpecificationRequirement[] {
    const lines = rawText.split('\n');
    const requirements: SpecificationRequirement[] = [];
    let currentReq: Partial<SpecificationRequirement> | null = null;
    let reqIndex = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match patterns like:
      // "1. Requisito...", "REQ-01: Requisito...", "- [ ] Requisito...", "* Requisito..."
      const codeMatch = trimmed.match(/^(?:REQ-(\d+)|(\d+)[.)]|[-*]\s*(?:\[[ xX]?\])?)\s*:?\s*(.+)$/i);

      if (codeMatch) {
        if (currentReq && currentReq.title) {
          requirements.push(this.finalizeRequirement(currentReq, reqIndex++));
        }

        const titleText = (codeMatch[3] || codeMatch[0]).trim();
        const detectedCode = codeMatch[1] ? `REQ-${codeMatch[1].padStart(2, '0')}` : `REQ-${String(reqIndex).padStart(2, '0')}`;

        currentReq = {
          code: detectedCode,
          title: titleText,
          description: titleText,
          category: this.detectCategory(titleText),
          verificationMethod: this.detectVerificationMethod(titleText),
        };
      } else if (currentReq) {
        // Append additional details to description
        currentReq.description = `${currentReq.description} ${trimmed}`.trim();
      }
    }

    if (currentReq && currentReq.title) {
      requirements.push(this.finalizeRequirement(currentReq, reqIndex));
    }

    // If no numbered/bulleted format was detected, treat paragraphs or lines as individual requirements
    if (requirements.length === 0 && rawText.trim().length > 0) {
      const paragraphs = rawText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      paragraphs.forEach((p, idx) => {
        const firstSentence = p.split(/[.?!]/)[0] || p;
        requirements.push({
          id: `req-${idx + 1}`,
          code: `REQ-${String(idx + 1).padStart(2, '0')}`,
          title: firstSentence.slice(0, 100),
          description: p,
          category: this.detectCategory(p),
          verificationMethod: this.detectVerificationMethod(p),
        });
      });
    }

    return requirements;
  }

  private static finalizeRequirement(req: Partial<SpecificationRequirement>, index: number): SpecificationRequirement {
    return {
      id: `req-${index}`,
      code: req.code || `REQ-${String(index).padStart(2, '0')}`,
      title: req.title || `Requisito ${index}`,
      description: req.description || req.title || '',
      category: req.category || 'functional',
      verificationMethod: req.verificationMethod || 'static_analysis',
    };
  }

  private static detectCategory(text: string): SpecificationRequirement['category'] {
    const lower = text.toLowerCase();
    if (lower.includes('seguridad') || lower.includes('auth') || lower.includes('token') || lower.includes('privacid') || lower.includes('secreto')) {
      return 'security';
    }
    if (lower.includes('prueba') || lower.includes('test') || lower.includes('cobertura') || lower.includes('spec')) {
      return 'testing';
    }
    if (lower.includes('rendimiento') || lower.includes('latencia') || lower.includes('concurrencia') || lower.includes('cache')) {
      return 'performance';
    }
    if (lower.includes('arquitectura') || lower.includes('patron') || lower.includes('modular') || lower.includes('puertos')) {
      return 'architectural';
    }
    return 'functional';
  }

  private static detectVerificationMethod(text: string): SpecificationRequirement['verificationMethod'] {
    const lower = text.toLowerCase();
    if (lower.includes('prueba') || lower.includes('ejecut') || lower.includes('test') || lower.includes('comando')) {
      return 'test_execution';
    }
    if (lower.includes('config') || lower.includes('variable') || lower.includes('.env') || lower.includes('docker')) {
      return 'config_inspection';
    }
    return 'static_analysis';
  }
}
