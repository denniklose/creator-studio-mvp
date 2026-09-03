import { describe, expect, it } from 'vitest';
import {
  AnalysisOutputSchema,
  ProjectDraftSchema,
  SourceDraftSchema,
  isCreatorDuration,
  sourceKindFromFilename,
} from '../src/lib/creator';

function validOutput() {
  return {
    summary: 'Klare Zusammenfassung.',
    winningPatterns: ['Ein klarer Hook.'],
    contentAngles: [
      { title: 'Winkel eins', rationale: 'Warum er funktioniert.' },
      { title: 'Winkel zwei', rationale: 'Warum er funktioniert.' },
      { title: 'Winkel drei', rationale: 'Warum er funktioniert.' },
    ],
    hooks: ['Hook 1', 'Hook 2', 'Hook 3', 'Hook 4', 'Hook 5'],
    recommendedHook: 'Hook 1',
    script: 'Skript für das Kurzvideo.',
    scenes: Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      label: `Szene ${index + 1}`,
      durationSeconds: 5,
      script: `Text für Szene ${index + 1}.`,
      generationHint: `Hinweis für Szene ${index + 1}.`,
    })),
    claimsToVerify: [],
    reviewChecklist: ['Fakten prüfen.', 'Hook prüfen.', 'Untertitel prüfen.'],
    warnings: [],
  };
}

describe('Creator Studio input contracts', () => {
  it('accepts only the four agreed video durations', () => {
    expect(isCreatorDuration(15)).toBe(true);
    expect(isCreatorDuration(30)).toBe(true);
    expect(isCreatorDuration(22)).toBe(false);
  });

  it('maps only approved text source file types', () => {
    expect(sourceKindFromFilename('skript.md')).toBe('script');
    expect(sourceKindFromFilename('untertitel.SRT')).toBe('srt');
    expect(sourceKindFromFilename('aufnahme.mp4')).toBeNull();
  });

  it('requires the explicit content-rights confirmation', () => {
    expect(ProjectDraftSchema.safeParse({
      title: 'Video', platform: 'shorts', durationSeconds: 30, rightsConfirmed: false,
    }).success).toBe(false);
  });

  it('rejects source text above the per-source character limit', () => {
    expect(SourceDraftSchema.safeParse({
      kind: 'text', filename: 'quelle.txt', content: 'a'.repeat(25_001),
    }).success).toBe(false);
  });

  it('requires a complete six-scene structured AI result', () => {
    const result = validOutput();
    expect(AnalysisOutputSchema.safeParse(result).success).toBe(true);
    result.scenes.pop();
    expect(AnalysisOutputSchema.safeParse(result).success).toBe(false);
  });
});
