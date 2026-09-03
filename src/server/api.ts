import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from './vercel.js';
import { MAX_SOURCE_CHARACTERS } from '../lib/creator.js';
import { externalServicesEnabled, requiredServerEnv } from './config.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function sendJson(response: VercelResponse, status: number, body: Record<string, unknown>): void {
  response.status(status).json(body);
}

export function sendError(response: VercelResponse, error: unknown): void {
  if (error instanceof ApiError) {
    sendJson(response, error.status, { error: error.code, message: error.message });
    return;
  }

  if (error instanceof Error && error.message.startsWith('MISSING_SERVER_CONFIG:')) {
    sendJson(response, 503, {
      error: 'SERVER_NOT_CONFIGURED',
      message: 'Dieser Pilot ist noch nicht vollständig konfiguriert.',
    });
    return;
  }

  if (error instanceof Error && error.message === 'INVALID_YOUTUBE_TOKEN_ENCRYPTION_KEY') {
    sendJson(response, 503, {
      error: 'SERVER_NOT_CONFIGURED',
      message: 'Die sichere YouTube-Verbindung ist noch nicht vollständig konfiguriert.',
    });
    return;
  }

  sendJson(response, 500, {
    error: 'INTERNAL_ERROR',
    message: 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.',
  });
}

export function assertMethod(request: VercelRequest, method: 'GET' | 'POST'): void {
  if (request.method !== method) {
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Diese Anfrage ist nicht erlaubt.');
  }
}

export function parseJsonBody<T>(request: VercelRequest): T {
  if (!request.body || typeof request.body !== 'object') {
    throw new ApiError(400, 'INVALID_REQUEST', 'Die Anfrage enthält keine gültigen Daten.');
  }
  return request.body as T;
}

export function serviceClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    throw new Error('MISSING_SERVER_CONFIG:SUPABASE_URL');
  }
  const { SUPABASE_SERVICE_ROLE_KEY } = requiredServerEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
  );

  return createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function bearerToken(request: VercelRequest): string {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Bitte melde dich zuerst an.');
  }
  return token;
}

export interface PilotUser {
  user: User;
  email: string;
  client: SupabaseClient;
}

export async function requireAuthenticatedUser(request: VercelRequest): Promise<Pick<PilotUser, 'user' | 'client'>> {
  const client = serviceClient();
  const { data, error } = await client.auth.getUser(bearerToken(request));
  if (error || !data.user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Deine Sitzung ist abgelaufen. Bitte fordere einen neuen E-Mail-Link an.');
  }

  return { user: data.user, client };
}

export async function requirePilotUser(request: VercelRequest): Promise<PilotUser> {
  const { client, user } = await requireAuthenticatedUser(request);
  if (!user.email) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Deine Sitzung enthält keine gültige E-Mail-Adresse.');
  }

  const email = user.email.toLowerCase();
  const { data: invite, error: inviteError } = await client
    .from('pilot_invites')
    .select('email, is_active')
    .eq('email', email)
    .maybeSingle();

  if (inviteError) {
    throw new ApiError(503, 'PILOT_NOT_CONFIGURED', 'Die Einladungsliste ist noch nicht eingerichtet.');
  }
  if (!invite?.is_active) {
    throw new ApiError(403, 'PILOT_ACCESS_DENIED', 'Für diesen Pilot ist deine Adresse noch nicht freigeschaltet.');
  }

  return { user, email, client };
}

export function requireExternalServices(): void {
  if (!externalServicesEnabled()) {
    throw new ApiError(503, 'EXTERNAL_SERVICES_DISABLED', 'Diese Vorschau löst bewusst keine externen KI- oder YouTube-Anfragen aus.');
  }
}

export async function assertProjectOwnership(
  client: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await client
    .from('projects')
    .select('id, user_id, title, platform, duration_seconds, rights_confirmed')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new ApiError(500, 'PROJECT_LOOKUP_FAILED', 'Das Projekt konnte nicht geprüft werden.');
  if (!data) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Dieses Projekt wurde nicht gefunden.');
  return data;
}

export async function assertAnalysisQuota(client: SupabaseClient, userId: string): Promise<void> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [recent, daily] = await Promise.all([
    client.from('usage_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', fifteenMinutesAgo),
    client.from('usage_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', dayAgo),
  ]);

  if (recent.error || daily.error) {
    throw new ApiError(503, 'USAGE_CHECK_FAILED', 'Die Nutzungsgrenze konnte gerade nicht geprüft werden.');
  }
  if ((recent.count ?? 0) >= 2) {
    throw new ApiError(429, 'RATE_LIMITED', 'Du hast zwei Analysen in kurzer Zeit gestartet. Bitte warte 15 Minuten.');
  }
  if ((daily.count ?? 0) >= 5) {
    throw new ApiError(429, 'DAILY_LIMIT_REACHED', 'Für heute sind die fünf Pilot-Analysen aufgebraucht.');
  }
}

export function assertSourceLimits(sources: Array<{ content: string }>): void {
  if (sources.length === 0) {
    throw new ApiError(400, 'NO_SOURCES', 'Wähle mindestens eine Text-, Skript- oder SRT-Quelle aus.');
  }
  if (sources.length > 3) {
    throw new ApiError(400, 'TOO_MANY_SOURCES', 'Für eine Analyse sind maximal drei Quellen erlaubt.');
  }
  const totalCharacters = sources.reduce((total, source) => total + source.content.length, 0);
  if (totalCharacters > MAX_SOURCE_CHARACTERS) {
    throw new ApiError(400, 'SOURCES_TOO_LARGE', 'Die ausgewählten Quellen sind zusammen zu lang. Erlaubt sind maximal 25.000 Zeichen.');
  }
}
