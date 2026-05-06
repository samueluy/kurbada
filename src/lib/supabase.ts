import 'react-native-url-polyfill/auto';

import { createClient, type Session } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from '@/lib/env';
import { appStorage } from '@/lib/storage';
import type { Database } from '@/types/database';

export const supabase = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        storage: appStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export type SupabaseSession = Session | null;
export { isSupabaseConfigured };
