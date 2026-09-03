import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { z } from 'zod';
import { assertMethod, assertProjectOwnership, requireExternalServices, requirePilotUser, sendError } from '../../src/server/api.js';
import { createYouTubeAuthorizationUrl } from '../../src/server/youtube.js';

const QuerySchema = z.object({ projectId: z.string().uuid() });

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'GET');
    requireExternalServices();
    const { projectId } = QuerySchema.parse(request.query);
    const { client, user } = await requirePilotUser(request);
    await assertProjectOwnership(client, user.id, projectId);
    response.redirect(302, await createYouTubeAuthorizationUrl(client, user.id));
  } catch (error) {
    sendError(response, error);
  }
}
