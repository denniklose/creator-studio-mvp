import type { VercelRequest, VercelResponse } from '../src/server/vercel.js';
import { externalServicesEnabled } from '../src/server/config.js';
import { assertMethod, sendError, sendJson } from '../src/server/api.js';

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'GET');
    sendJson(response, 200, {
      status: 'ok',
      externalServicesEnabled: externalServicesEnabled(),
      version: 'pilot-1',
    });
  } catch (error) {
    sendError(response, error);
  }
}
