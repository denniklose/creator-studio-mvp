import type { User } from '@supabase/supabase-js';
import type { AnalysisOutput, CreatorPlatform, ProjectDraft, SourceDraft, SourceKind } from './creator';
import { AnalysisOutputSchema, CreatorProfileSchema, ProjectDraftSchema, SourceDraftSchema } from './creator';
import { getSupabaseClient } from './supabase';
import type { CreatorProfile } from '../types';

export interface PilotProject {
  id: string;
  title: string;
  platform: CreatorPlatform;
  durationSeconds: 15 | 30 | 45 | 60;
  status: 'draft' | 'analyzing' | 'ready' | 'approved' | 'error';
  rightsConfirmed: boolean;
  createdAt: string;
}

export interface PilotSource {
  id: string;
  projectId: string;
  kind: SourceKind;
  filename: string | null;
  content: string;
  createdAt: string;
}

export interface PilotAnalysisRun {
  id: string;
  projectId: string;
  status: 'pending' | 'completed' | 'failed';
  result: AnalysisOutput | null;
  feedback: 'accepted' | 'edited' | 'not_a_fit' | null;
  createdAt: string;
}

export interface YoutubeConnectionStatus {
  connected: boolean;
  lastSyncedAt: string | null;
}

export class PilotApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

function clientOrThrow() {
  const client = getSupabaseClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  return client;
}

function profileFromRow(row: Record<string, unknown> | null): CreatorProfile {
  return {
    projectName: String(row?.display_name ?? ''),
    niche: String(row?.niche ?? ''),
    audience: String(row?.audience ?? ''),
    tone: String(row?.tone ?? ''),
    goal: String(row?.goal ?? ''),
  };
}

function projectFromRow(row: Record<string, unknown>): PilotProject {
  return {
    id: String(row.id),
    title: String(row.title),
    platform: row.platform as CreatorPlatform,
    durationSeconds: Number(row.duration_seconds) as PilotProject['durationSeconds'],
    status: row.status as PilotProject['status'],
    rightsConfirmed: Boolean(row.rights_confirmed),
    createdAt: String(row.created_at),
  };
}

function sourceFromRow(row: Record<string, unknown>): PilotSource {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    kind: row.kind as SourceKind,
    filename: typeof row.filename === 'string' ? row.filename : null,
    content: String(row.content),
    createdAt: String(row.created_at),
  };
}

function analysisFromRow(row: Record<string, unknown> | null): PilotAnalysisRun | null {
  if (!row) return null;
  const parsed = AnalysisOutputSchema.safeParse(row.result);
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    status: row.status as PilotAnalysisRun['status'],
    result: parsed.success ? parsed.data : null,
    feedback: row.feedback as PilotAnalysisRun['feedback'],
    createdAt: String(row.created_at),
  };
}

export async function loadProfile(userId: string): Promise<CreatorProfile> {
  const { data, error } = await clientOrThrow().from('profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return profileFromRow(data as Record<string, unknown> | null);
}

export async function saveProfile(userId: string, profile: CreatorProfile): Promise<CreatorProfile> {
  const parsed = CreatorProfileSchema.parse({
    displayName: profile.projectName,
    niche: profile.niche,
    audience: profile.audience,
    tone: profile.tone,
    goal: profile.goal,
  });
  const { data, error } = await clientOrThrow().from('profiles').upsert({
    user_id: userId,
    display_name: parsed.displayName,
    niche: parsed.niche,
    audience: parsed.audience,
    tone: parsed.tone,
    goal: parsed.goal,
    onboarding_completed: Boolean(parsed.audience && parsed.tone && parsed.goal),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select('*').single();
  if (error) throw error;
  return profileFromRow(data as Record<string, unknown>);
}

export async function loadProjects(): Promise<PilotProject[]> {
  const { data, error } = await clientOrThrow().from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(projectFromRow);
}

export async function createProject(userId: string, draft: ProjectDraft): Promise<PilotProject> {
  const parsed = ProjectDraftSchema.parse(draft);
  const { data, error } = await clientOrThrow().from('projects').insert({
    user_id: userId,
    title: parsed.title,
    platform: parsed.platform,
    duration_seconds: parsed.durationSeconds,
    rights_confirmed: parsed.rightsConfirmed,
  }).select('*').single();
  if (error) throw error;
  return projectFromRow(data as Record<string, unknown>);
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await clientOrThrow().from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

export async function loadSources(projectId: string): Promise<PilotSource[]> {
  const { data, error } = await clientOrThrow().from('sources').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(sourceFromRow);
}

export async function addSource(userId: string, projectId: string, source: SourceDraft): Promise<PilotSource> {
  const parsed = SourceDraftSchema.parse(source);
  const { data, error } = await clientOrThrow().from('sources').insert({
    user_id: userId,
    project_id: projectId,
    kind: parsed.kind,
    filename: parsed.filename,
    content: parsed.content,
  }).select('*').single();
  if (error) throw error;
  return sourceFromRow(data as Record<string, unknown>);
}

export async function deleteSource(sourceId: string): Promise<void> {
  const { error } = await clientOrThrow().from('sources').delete().eq('id', sourceId);
  if (error) throw error;
}

export async function loadLatestAnalysis(projectId: string): Promise<PilotAnalysisRun | null> {
  const { data, error } = await clientOrThrow()
    .from('analysis_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return analysisFromRow(data as Record<string, unknown> | null);
}

export async function saveAnalysisResult(runId: string, result: AnalysisOutput): Promise<void> {
  const { error } = await clientOrThrow().from('analysis_runs').update({
    result,
    updated_at: new Date().toISOString(),
  }).eq('id', runId);
  if (error) throw error;
}

export async function saveAnalysisFeedback(runId: string, feedback: PilotAnalysisRun['feedback']): Promise<void> {
  const { error } = await clientOrThrow().from('analysis_runs').update({
    feedback,
    updated_at: new Date().toISOString(),
  }).eq('id', runId);
  if (error) throw error;
}

async function accessToken(): Promise<string> {
  const { data, error } = await clientOrThrow().auth.getSession();
  if (error || !data.session?.access_token) throw new PilotApiError(401, 'UNAUTHORIZED', 'Bitte melde dich erneut an.');
  return data.session.access_token;
}

export async function pilotApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${await accessToken()}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new PilotApiError(response.status, String(payload.error ?? 'REQUEST_FAILED'), String(payload.message ?? 'Die Anfrage ist fehlgeschlagen.'));
  }
  return payload as T;
}

export async function requestPilotMagicLink(email: string): Promise<void> {
  const response = await fetch('/api/auth/request-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new PilotApiError(response.status, String(payload.error ?? 'MAGIC_LINK_FAILED'), String(payload.message ?? 'Der Link konnte nicht versendet werden.'));
}

export async function verifyPilotAccess(): Promise<void> {
  await pilotApi('/api/auth/me');
}

export async function runCreatorAnalysis(input: {
  projectId: string;
  sourceIds: string[];
  platform: CreatorPlatform;
  durationSeconds: number;
  rightsConfirmed: boolean;
}): Promise<{ analysisRunId: string; result: AnalysisOutput; usage: { inputTokens: number; outputTokens: number; totalTokens: number } }> {
  return pilotApi('/api/analysis', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getYouTubeStatus(projectId: string): Promise<YoutubeConnectionStatus> {
  return pilotApi(`/api/youtube/status?projectId=${encodeURIComponent(projectId)}`);
}

export async function syncYouTube(projectId: string): Promise<{ cached: boolean; syncedAt: string }> {
  return pilotApi('/api/youtube/sync', { method: 'POST', body: JSON.stringify({ projectId }) });
}

export async function disconnectYouTubeConnection(): Promise<void> {
  await pilotApi('/api/youtube/disconnect', { method: 'POST' });
}

export async function deleteEntireAccount(): Promise<void> {
  await pilotApi('/api/account/delete', { method: 'POST', body: JSON.stringify({ confirmation: 'MEINE DATEN LÖSCHEN' }) });
  await clientOrThrow().auth.signOut();
}

export function beginYouTubeConnect(projectId: string): void {
  window.location.assign(`/api/youtube/connect?projectId=${encodeURIComponent(projectId)}`);
}

export async function signOut(): Promise<void> {
  const { error } = await clientOrThrow().auth.signOut();
  if (error) throw error;
}

export function isSignedIn(user: User | null): user is User {
  return Boolean(user);
}
