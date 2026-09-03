import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { serviceClient } from '../../src/server/api.js';
import { callbackUrlWithStatus, completeYouTubeAuthorization, readOAuthCallbackQuery } from '../../src/server/youtube.js';

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const { code, state, error } = readOAuthCallbackQuery(request.query);
  if (error || !code || !state) {
    response.redirect(302, callbackUrlWithStatus(error ? 'cancelled' : 'error'));
    return;
  }

  try {
    await completeYouTubeAuthorization(serviceClient(), code, state);
    response.redirect(302, callbackUrlWithStatus('connected'));
  } catch {
    response.redirect(302, callbackUrlWithStatus('error'));
  }
}
