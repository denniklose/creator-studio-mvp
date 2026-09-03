import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { z } from 'zod';
import { assertMethod, assertProjectOwnership, parseJsonBody, requireExternalServices, requirePilotUser, sendError, sendJson } from '../../src/server/api.js';
import { syncOwnYouTubeChannel } from '../../src/server/youtube.js';

const SyncSchema = z.object({ projectId: z.string().uuid() });

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'POST');
    requireExternalServices();
    const { projectId } = SyncSchema.parse(parseJsonBody(request));
    const { client, user } = await requirePilotUser(request);
    await assertProjectOwnership(client, user.id, projectId);
    sendJson(response, 200, await syncOwnYouTubeChannel(client, user.id, projectId));
  } catch (error) {
    sendError(response, error);
  }
}
