import { describe, expect, it } from 'vitest';
import { assertSourceLimits } from '../src/server/api';
import { parseDurationSeconds } from '../src/server/youtube';

describe('Server guard rails', () => {
  it('rejects more than 25,000 selected source characters', () => {
    expect(() => assertSourceLimits([{ content: 'a'.repeat(20_000) }, { content: 'b'.repeat(5_001) }])).toThrow(/maximal 25.000 Zeichen/);
  });

  it('allows a small set of three selected sources', () => {
    expect(() => assertSourceLimits([{ content: 'a' }, { content: 'b' }, { content: 'c' }])).not.toThrow();
  });

  it('keeps only real short-video durations', () => {
    expect(parseDurationSeconds('PT59S')).toBe(59);
    expect(parseDurationSeconds('PT1M1S')).toBe(61);
    expect(parseDurationSeconds('invalid')).toBe(Number.POSITIVE_INFINITY);
  });
});
