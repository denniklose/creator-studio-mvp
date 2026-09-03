import { z } from 'zod';

export const SOURCE_KINDS = ['text', 'script', 'srt'] as const;
export const PLATFORMS = ['shorts', 'reels', 'tiktok'] as const;
export const DURATIONS = [15, 30, 45, 60] as const;

export const MAX_SOURCE_COUNT = 3;
export const MAX_SOURCE_CHARACTERS = 25_000;
export const MAX_OUTPUT_TOKENS = 1_800;

export type SourceKind = (typeof SOURCE_KINDS)[number];
export type CreatorPlatform = (typeof PLATFORMS)[number];
export type CreatorDuration = (typeof DURATIONS)[number];

export const CreatorProfileSchema = z.object({
  displayName: z.string().trim().max(80),
  niche: z.string().trim().max(120),
  audience: z.string().trim().max(180),
  tone: z.string().trim().max(120),
  goal: z.string().trim().max(240),
});

export const ProjectDraftSchema = z.object({
  title: z.string().trim().min(1, 'Bitte gib dem Projekt einen Namen.').max(120),
  platform: z.enum(PLATFORMS),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  rightsConfirmed: z.literal(true, {
    error: 'Bestätige bitte, dass du diese Inhalte verwenden darfst.',
  }),
});

export const SourceDraftSchema = z.object({
  kind: z.enum(SOURCE_KINDS),
  filename: z.string().trim().max(160).nullable(),
  content: z.string().trim().min(1, 'Die Quelle ist leer.').max(MAX_SOURCE_CHARACTERS),
});

const SceneSchema = z.object({
  id: z.number().int().min(1).max(6),
  label: z.string().trim().min(1).max(48),
  durationSeconds: z.number().int().min(1).max(30),
  script: z.string().trim().min(1).max(600),
  generationHint: z.string().trim().min(1).max(400),
});

export const AnalysisOutputSchema = z.object({
  summary: z.string().trim().min(1).max(700),
  winningPatterns: z.array(z.string().trim().min(1).max(300)).min(1).max(5),
  contentAngles: z.array(z.object({
    title: z.string().trim().min(1).max(90),
    rationale: z.string().trim().min(1).max(300),
  })).length(3),
  hooks: z.array(z.string().trim().min(1).max(180)).length(5),
  recommendedHook: z.string().trim().min(1).max(180),
  script: z.string().trim().min(1).max(2_000),
  scenes: z.array(SceneSchema).length(6),
  claimsToVerify: z.array(z.string().trim().min(1).max(240)).max(8),
  reviewChecklist: z.array(z.string().trim().min(1).max(180)).min(3).max(8),
  warnings: z.array(z.string().trim().min(1).max(240)).max(5),
});

export type CreatorProfileInput = z.infer<typeof CreatorProfileSchema>;
export type ProjectDraft = z.infer<typeof ProjectDraftSchema>;
export type SourceDraft = z.infer<typeof SourceDraftSchema>;
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

export const AnalysisRequestSchema = z.object({
  projectId: z.string().uuid(),
  sourceIds: z.array(z.string().uuid()).min(1).max(MAX_SOURCE_COUNT),
  platform: z.enum(PLATFORMS),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  rightsConfirmed: z.literal(true),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export function isCreatorDuration(value: number): value is CreatorDuration {
  return DURATIONS.includes(value as CreatorDuration);
}

export function sourceKindFromFilename(filename: string): SourceKind | null {
  const extension = filename.trim().split('.').pop()?.toLowerCase();
  if (extension === 'srt') return 'srt';
  if (extension === 'md') return 'script';
  if (extension === 'txt') return 'text';
  return null;
}

export function isAllowedSourceFile(file: File): boolean {
  return sourceKindFromFilename(file.name) !== null;
}

export function platformLabel(platform: CreatorPlatform): string {
  return platform === 'shorts' ? 'YouTube Shorts' : platform === 'reels' ? 'Instagram Reels' : 'TikTok';
}
