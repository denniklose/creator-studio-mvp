import type { VercelRequest, VercelResponse } from '../../src/server/vercel.js';
import { z } from 'zod';
import { appBaseUrl } from '../../src/server/config.js';
import { assertMethod, parseJsonBody, sendError, sendJson, serviceClient } from '../../src/server/api.js';

const RequestLinkSchema = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
});

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  try {
    assertMethod(request, 'POST');
    const { email } = RequestLinkSchema.parse(parseJsonBody(request));
    const client = serviceClient();
    const { data: invite, error: inviteError } = await client
      .from('pilot_invites')
      .select('email, is_active')
      .eq('email', email)
      .maybeSingle();

    if (inviteError) {
      throw new Error('PILOT_INVITE_LOOKUP_FAILED');
    }
    if (!invite?.is_active) {
      sendJson(response, 403, {
        error: 'PILOT_ACCESS_DENIED',
        message: 'Für diesen Pilot ist deine Adresse noch nicht freigeschaltet.',
      });
      return;
    }

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: appBaseUrl(),
      },
    });
    if (error) {
      sendJson(response, 400, {
        error: 'MAGIC_LINK_FAILED',
        message: 'Der E-Mail-Link konnte nicht versendet werden. Bitte prüfe, ob deine Einladung in Supabase angelegt wurde.',
      });
      return;
    }

    sendJson(response, 200, { status: 'sent' });
  } catch (error) {
    sendError(response, error);
  }
}
