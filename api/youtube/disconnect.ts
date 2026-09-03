import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { assertMethod, requirePilotUser, sendError, sendJson } from '../../src/server/api.js';
import { disconnectYouTube } from '../../src/server/youtube.js';

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'POST');
    const { client, user } = await requirePilotUser(request);
    await disconnectYouTube(client, user.id);
    sendJson(response, 200, { status: 'disconnected' });
  } catch (error) {
    sendError(response, error);
  }
}
