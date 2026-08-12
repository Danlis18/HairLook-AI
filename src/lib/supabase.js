import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let client;
export function getSupabase() {
  if (config.demoMode) return null;
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseSecretKey) throw new Error('Supabase is not configured');
  client = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  return client;
}
