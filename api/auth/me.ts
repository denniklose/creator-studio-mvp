import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { assertMethod, requirePilotUser, sendError, sendJson } from '../../src/server/api.js';

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'GET');
    const { email } = await requirePilotUser(request);
    sendJson(response, 200, { status: 'ok', email });
  } catch (error) {
    sendError(response, error);
  }
}
