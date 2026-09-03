const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const clientConfig = {
  supabaseUrl,
  supabasePublishableKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabasePublishableKey),
};

export function currentAppUrl(): string {
  return window.location.origin;
}
