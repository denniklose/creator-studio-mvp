import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { z } from 'zod';
import { ApiError, assertMethod, parseJsonBody, requireAuthenticatedUser, sendError, sendJson } from '../../src/server/api.js';

const DeleteAccountSchema = z.object({
  confirmation: z.literal('MEINE DATEN LÖSCHEN'),
});

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'POST');
    DeleteAccountSchema.parse(parseJsonBody(request));
    const { client, user } = await requireAuthenticatedUser(request);
    const { error } = await client.auth.admin.deleteUser(user.id, false);
    if (error) {
      throw new ApiError(500, 'ACCOUNT_DELETE_FAILED', 'Dein Konto konnte gerade nicht vollständig gelöscht werden. Bitte versuche es später erneut.');
    }
    sendJson(response, 200, { status: 'deleted' });
  } catch (error) {
    sendError(response, error);
  }
}
