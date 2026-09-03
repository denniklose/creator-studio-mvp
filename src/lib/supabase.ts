import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { clientConfig } from './config';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!clientConfig.isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(clientConfig.supabaseUrl, clientConfig.supabasePublishableKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
