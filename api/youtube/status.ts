import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { z } from 'zod';
import { assertMethod, assertProjectOwnership, requirePilotUser, sendError, sendJson } from '../../src/server/api.js';
import { youtubeConnectionStatus } from '../../src/server/youtube.js';

const QuerySchema = z.object({ projectId: z.string().uuid() });

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'GET');
    const { projectId } = QuerySchema.parse(request.query);
    const { client, user } = await requirePilotUser(request);
    await assertProjectOwnership(client, user.id, projectId);
    sendJson(response, 200, await youtubeConnectionStatus(client, user.id, projectId));
  } catch (error) {
    sendError(response, error);
  }
}
