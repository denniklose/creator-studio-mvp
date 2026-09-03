import type { VercelRequest, VercelResponse } from '../src/server/vercel.js';
import { AnalysisRequestSchema, CreatorProfileSchema } from '../src/lib/creator.js';
import { createCreatorAnalysis } from '../src/server/analysis.js';
import {
  ApiError,
  assertAnalysisQuota,
  assertMethod,
  assertProjectOwnership,
  assertSourceLimits,
  parseJsonBody,
  requireExternalServices,
  requirePilotUser,
  sendError,
  sendJson,
} from '../src/server/api.js';

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'POST');
    requireExternalServices();
    const input = AnalysisRequestSchema.parse(parseJsonBody(request));
    const { client, user } = await requirePilotUser(request);
    const project = await assertProjectOwnership(client, user.id, input.projectId);

    if (!project.rights_confirmed || !input.rightsConfirmed) {
      throw new ApiError(400, 'RIGHTS_CONFIRMATION_REQUIRED', 'Bestätige bitte, dass du diese Inhalte verwenden darfst.');
    }

    await assertAnalysisQuota(client, user.id);

    const { data: sources, error: sourcesError } = await client
      .from('sources')
      .select('id, kind, filename, content')
      .eq('project_id', input.projectId)
      .eq('user_id', user.id)
      .in('id', input.sourceIds);

    if (sourcesError) throw new ApiError(500, 'SOURCE_LOOKUP_FAILED', 'Die Quellen konnten nicht geladen werden.');
    if (!sources || sources.length !== input.sourceIds.length) {
      throw new ApiError(400, 'INVALID_SOURCES', 'Eine oder mehrere ausgewählte Quellen gehören nicht zu diesem Projekt.');
    }
    assertSourceLimits(sources);

    const { data: profileRow, error: profileError } = await client
      .from('profiles')
      .select('display_name, niche, audience, tone, goal')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw new ApiError(500, 'PROFILE_LOOKUP_FAILED', 'Dein Creator-Profil konnte nicht geladen werden.');

    const profile = CreatorProfileSchema.parse({
      displayName: profileRow?.display_name ?? '',
      niche: profileRow?.niche ?? '',
      audience: profileRow?.audience ?? '',
      tone: profileRow?.tone ?? '',
      goal: profileRow?.goal ?? '',
    });

    const { data: snapshot, error: snapshotError } = await client
      .from('youtube_snapshots')
      .select('channel_title, synced_at, snapshot')
      .eq('project_id', input.projectId)
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (snapshotError) throw new ApiError(500, 'YOUTUBE_LOOKUP_FAILED', 'Der YouTube-Snapshot konnte nicht geladen werden.');

    const { data: run, error: runError } = await client
      .from('analysis_runs')
      .insert({
        project_id: input.projectId,
        user_id: user.id,
        source_ids: input.sourceIds,
        model: 'openai/gpt-5.6-luna',
        status: 'pending',
      })
      .select('id')
      .single();
    if (runError || !run) throw new ApiError(500, 'ANALYSIS_CREATE_FAILED', 'Die Analyse konnte nicht vorbereitet werden.');

    const { data: usageEvent, error: usageError } = await client
      .from('usage_events')
      .insert({
        analysis_run_id: run.id,
        user_id: user.id,
        model: 'openai/gpt-5.6-luna',
      })
      .select('id')
      .single();
    if (usageError || !usageEvent) throw new ApiError(500, 'USAGE_CREATE_FAILED', 'Die Kostenbegrenzung konnte nicht vorbereitet werden.');

    try {
      const result = await createCreatorAnalysis({
        userId: user.id,
        profile,
        project: {
          title: String(project.title),
          platform: String(project.platform),
          durationSeconds: Number(project.duration_seconds),
        },
        sources,
        youtubeSnapshot: snapshot,
      });

      const updates = await Promise.all([
        client.from('analysis_runs').update({
          status: 'completed',
          result: result.output,
          updated_at: new Date().toISOString(),
        }).eq('id', run.id),
        client.from('usage_events').update({
          input_tokens: result.usage.inputTokens,
          output_tokens: result.usage.outputTokens,
          total_tokens: result.usage.totalTokens,
        }).eq('id', usageEvent.id),
        client.from('projects').update({
          status: 'ready',
          updated_at: new Date().toISOString(),
        }).eq('id', input.projectId).eq('user_id', user.id),
      ]);
      if (updates.some(({ error }) => error)) {
        throw new ApiError(500, 'ANALYSIS_SAVE_FAILED', 'Das Textpaket konnte nicht vollständig gespeichert werden.');
      }

      sendJson(response, 200, {
        analysisRunId: run.id,
        result: result.output,
        usage: result.usage,
      });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'AI_REQUEST_FAILED';
      await client.from('analysis_runs').update({
        status: 'failed',
        error_code: code,
        updated_at: new Date().toISOString(),
      }).eq('id', run.id);
      throw error;
    }
  } catch (error) {
    sendError(response, error);
  }
}
