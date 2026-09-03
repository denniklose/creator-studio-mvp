import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './api.js';
import { appBaseUrl, requiredServerEnv } from './config.js';
import { decryptSecret, encryptSecret, pkceChallenge, randomUrlSafeValue, sha256 } from './crypto.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_DATA_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

interface GoogleTokenPayload {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface ConnectionRow {
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  access_token_expires_at: string | null;
  scope: string;
}

function googleConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI } = requiredServerEnv(
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI',
  );
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: GOOGLE_OAUTH_REDIRECT_URI };
}

function isoDate(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function isoTimestamp(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString();
}

function queryValue(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

async function googleToken(body: URLSearchParams): Promise<Required<Pick<GoogleTokenPayload, 'access_token'>> & GoogleTokenPayload> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json() as GoogleTokenPayload;
  if (!response.ok || !payload.access_token) {
    throw new ApiError(502, 'YOUTUBE_TOKEN_EXCHANGE_FAILED', 'Die YouTube-Verbindung konnte nicht bestätigt werden.');
  }
  return payload as Required<Pick<GoogleTokenPayload, 'access_token'>> & GoogleTokenPayload;
}

async function googleJson(url: URL, accessToken: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(502, 'YOUTUBE_SYNC_FAILED', 'Die eigenen YouTube-Daten konnten gerade nicht geladen werden.');
  }
  return payload;
}

export function parseDurationSeconds(duration: string): number {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

export async function createYouTubeAuthorizationUrl(client: SupabaseClient, userId: string): Promise<string> {
  const { clientId, redirectUri } = googleConfig();
  const state = randomUrlSafeValue();
  const verifier = randomUrlSafeValue(48);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await client.from('youtube_oauth_states_private').delete().lt('expires_at', new Date().toISOString());
  const { error } = await client.from('youtube_oauth_states_private').insert({
    state_hash: sha256(state),
    user_id: userId,
    encrypted_code_verifier: encryptSecret(verifier),
    expires_at: expiresAt,
  });
  if (error) throw new ApiError(500, 'YOUTUBE_STATE_CREATE_FAILED', 'Die sichere YouTube-Verbindung konnte nicht vorbereitet werden.');

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('scope', YOUTUBE_SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', pkceChallenge(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function completeYouTubeAuthorization(client: SupabaseClient, code: string, state: string): Promise<void> {
  const stateHash = sha256(state);
  const { data: savedState, error: stateError } = await client
    .from('youtube_oauth_states_private')
    .select('user_id, encrypted_code_verifier, expires_at')
    .eq('state_hash', stateHash)
    .maybeSingle();

  await client.from('youtube_oauth_states_private').delete().eq('state_hash', stateHash);
  if (stateError || !savedState || new Date(savedState.expires_at).getTime() < Date.now()) {
    throw new ApiError(400, 'INVALID_YOUTUBE_STATE', 'Die YouTube-Verbindung ist abgelaufen. Starte sie bitte erneut.');
  }

  const { clientId, clientSecret, redirectUri } = googleConfig();
  const token = await googleToken(new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: decryptSecret(savedState.encrypted_code_verifier),
  }));

  const { data: existing } = await client
    .from('oauth_connections_private')
    .select('encrypted_refresh_token')
    .eq('user_id', savedState.user_id)
    .eq('provider', 'youtube')
    .maybeSingle();

  const { error } = await client.from('oauth_connections_private').upsert({
    user_id: savedState.user_id,
    provider: 'youtube',
    encrypted_access_token: encryptSecret(token.access_token),
    encrypted_refresh_token: token.refresh_token
      ? encryptSecret(token.refresh_token)
      : existing?.encrypted_refresh_token ?? null,
    access_token_expires_at: new Date(Date.now() + Math.max(token.expires_in ?? 3600, 60) * 1000).toISOString(),
    scope: token.scope ?? YOUTUBE_SCOPES.join(' '),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new ApiError(500, 'YOUTUBE_CONNECTION_SAVE_FAILED', 'Die YouTube-Verbindung konnte nicht gespeichert werden.');
}

async function activeYouTubeToken(client: SupabaseClient, userId: string): Promise<string> {
  const { data: connection, error } = await client
    .from('oauth_connections_private')
    .select('encrypted_access_token, encrypted_refresh_token, access_token_expires_at, scope')
    .eq('user_id', userId)
    .eq('provider', 'youtube')
    .maybeSingle();

  if (error || !connection) {
    throw new ApiError(409, 'YOUTUBE_NOT_CONNECTED', 'Verbinde zuerst deinen eigenen YouTube-Kanal.');
  }

  const row = connection as ConnectionRow;
  const expiresAt = row.access_token_expires_at ? new Date(row.access_token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 2 * 60 * 1000) {
    return decryptSecret(row.encrypted_access_token);
  }
  if (!row.encrypted_refresh_token) {
    throw new ApiError(401, 'YOUTUBE_RECONNECT_REQUIRED', 'Die YouTube-Verbindung ist abgelaufen. Verbinde deinen Kanal bitte erneut.');
  }

  const { clientId, clientSecret } = googleConfig();
  const token = await googleToken(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: decryptSecret(row.encrypted_refresh_token),
  }));

  const { error: updateError } = await client.from('oauth_connections_private').update({
    encrypted_access_token: encryptSecret(token.access_token),
    encrypted_refresh_token: token.refresh_token ? encryptSecret(token.refresh_token) : row.encrypted_refresh_token,
    access_token_expires_at: new Date(Date.now() + Math.max(token.expires_in ?? 3600, 60) * 1000).toISOString(),
    scope: token.scope ?? row.scope,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('provider', 'youtube');
  if (updateError) throw new ApiError(500, 'YOUTUBE_TOKEN_REFRESH_FAILED', 'Die YouTube-Verbindung konnte nicht erneuert werden.');
  return token.access_token;
}

export async function syncOwnYouTubeChannel(client: SupabaseClient, userId: string, projectId: string): Promise<{ cached: boolean; snapshot: Record<string, unknown>; syncedAt: string }> {
  const cacheThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: cached, error: cachedError } = await client
    .from('youtube_snapshots')
    .select('snapshot, synced_at')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .gte('synced_at', cacheThreshold)
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cachedError) throw new ApiError(500, 'YOUTUBE_CACHE_LOOKUP_FAILED', 'Der vorhandene YouTube-Snapshot konnte nicht geprüft werden.');
  if (cached) return { cached: true, snapshot: cached.snapshot as Record<string, unknown>, syncedAt: cached.synced_at };

  const accessToken = await activeYouTubeToken(client, userId);
  const channelResponse = await googleJson(new URL(`${YOUTUBE_DATA_URL}/channels?part=snippet,contentDetails&mine=true`), accessToken);
  const channel = Array.isArray(channelResponse.items) ? channelResponse.items[0] as Record<string, unknown> | undefined : undefined;
  const channelId = typeof channel?.id === 'string' ? channel.id : '';
  const snippet = channel?.snippet as Record<string, unknown> | undefined;
  const channelTitle = typeof snippet?.title === 'string' ? snippet.title : 'Eigener YouTube-Kanal';
  if (!channelId) throw new ApiError(502, 'YOUTUBE_CHANNEL_NOT_FOUND', 'Dein eigener YouTube-Kanal konnte nicht gefunden werden.');

  const searchUrl = new URL(`${YOUTUBE_DATA_URL}/search`);
  searchUrl.search = new URLSearchParams({
    part: 'snippet',
    forMine: 'true',
    type: 'video',
    order: 'date',
    maxResults: '20',
    videoDuration: 'short',
    publishedAfter: isoTimestamp(90),
  }).toString();
  const searchResponse = await googleJson(searchUrl, accessToken);
  const recentIds = (Array.isArray(searchResponse.items) ? searchResponse.items : [])
    .map((item) => (item as Record<string, unknown>).id as Record<string, unknown> | undefined)
    .map((id) => typeof id?.videoId === 'string' ? id.videoId : null)
    .filter((id): id is string => Boolean(id));

  let recentShorts: Array<Record<string, unknown>> = [];
  if (recentIds.length > 0) {
    const videosUrl = new URL(`${YOUTUBE_DATA_URL}/videos`);
    videosUrl.search = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: recentIds.join(','),
      maxResults: '20',
    }).toString();
    const videoResponse = await googleJson(videosUrl, accessToken);
    recentShorts = (Array.isArray(videoResponse.items) ? videoResponse.items : [])
      .map((item) => item as Record<string, unknown>)
      .map((video) => {
        const videoSnippet = video.snippet as Record<string, unknown> | undefined;
        const details = video.contentDetails as Record<string, unknown> | undefined;
        const statistics = video.statistics as Record<string, unknown> | undefined;
        return {
          id: video.id,
          title: videoSnippet?.title ?? 'Ohne Titel',
          publishedAt: videoSnippet?.publishedAt ?? null,
          durationSeconds: parseDurationSeconds(String(details?.duration ?? '')),
          views: statistics?.viewCount ?? null,
          likes: statistics?.likeCount ?? null,
          comments: statistics?.commentCount ?? null,
        };
      })
      .filter((video) => typeof video.durationSeconds === 'number' && video.durationSeconds <= 60);
  }

  const analyticsUrl = new URL(YOUTUBE_ANALYTICS_URL);
  analyticsUrl.search = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: isoDate(90),
    endDate: isoDate(0),
    metrics: 'views,averageViewDuration,averageViewPercentage,likes,comments',
    dimensions: 'video',
    sort: '-views',
    maxResults: '20',
  }).toString();
  const analytics = await googleJson(analyticsUrl, accessToken);
  const headers = Array.isArray(analytics.columnHeaders) ? analytics.columnHeaders : [];
  const headerNames = headers.map((header) => String((header as Record<string, unknown>).name ?? 'metric'));
  const recentShortIds = new Set(recentShorts.map((video) => String(video.id)));
  const analyticsRows = (Array.isArray(analytics.rows) ? analytics.rows : [])
    .map((row) => {
      const values = Array.isArray(row) ? row : [];
      return Object.fromEntries(headerNames.map((name, index) => [name, values[index] ?? null]));
    })
    .filter((row) => recentShortIds.has(String(row.video ?? '')));

  const syncedAt = new Date().toISOString();
  const snapshot = {
    source: 'own-youtube-channel',
    collectedAt: syncedAt,
    channel: { id: channelId, title: channelTitle },
    recentShorts,
    analyticsLast90Days: analyticsRows,
  };

  const { error: saveError } = await client.from('youtube_snapshots').insert({
    project_id: projectId,
    user_id: userId,
    channel_id: channelId,
    channel_title: channelTitle,
    snapshot,
    synced_at: syncedAt,
  });
  if (saveError) throw new ApiError(500, 'YOUTUBE_SNAPSHOT_SAVE_FAILED', 'Der YouTube-Snapshot konnte nicht gespeichert werden.');
  return { cached: false, snapshot, syncedAt };
}

export async function youtubeConnectionStatus(client: SupabaseClient, userId: string, projectId: string): Promise<{ connected: boolean; lastSyncedAt: string | null }> {
  const [{ data: connection, error: connectionError }, { data: snapshot, error: snapshotError }] = await Promise.all([
    client.from('oauth_connections_private').select('user_id').eq('user_id', userId).eq('provider', 'youtube').maybeSingle(),
    client.from('youtube_snapshots').select('synced_at').eq('user_id', userId).eq('project_id', projectId).order('synced_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (connectionError || snapshotError) throw new ApiError(500, 'YOUTUBE_STATUS_FAILED', 'Der Status der YouTube-Verbindung konnte nicht geladen werden.');
  return { connected: Boolean(connection), lastSyncedAt: snapshot?.synced_at ?? null };
}

export async function disconnectYouTube(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.from('oauth_connections_private').delete().eq('user_id', userId).eq('provider', 'youtube');
  if (error) throw new ApiError(500, 'YOUTUBE_DISCONNECT_FAILED', 'Die YouTube-Verbindung konnte nicht getrennt werden.');
}

export function callbackUrlWithStatus(status: 'connected' | 'cancelled' | 'error'): string {
  return `${appBaseUrl()}/?youtube=${status}`;
}

export function readOAuthCallbackQuery(query: Record<string, string | string[] | undefined>): { code: string | null; state: string | null; error: string | null } {
  return { code: queryValue(query.code), state: queryValue(query.state), error: queryValue(query.error) };
}
