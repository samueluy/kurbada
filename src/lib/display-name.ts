import { supabase } from '@/lib/supabase';

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function isDisplayNameTakenError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '') : '';
  return code === '23505'
    || message.toLowerCase().includes('display name')
    || message.toLowerCase().includes('username')
    || message.toLowerCase().includes('taken');
}

export async function isDisplayNameAvailable(displayName: string, excludeUserId?: string) {
  const normalized = normalizeDisplayName(displayName);

  if (!normalized) {
    return false;
  }

  if (!supabase) {
    return true;
  }

  const { data, error } = await (supabase as any).rpc('is_display_name_available', {
    p_display_name: normalized,
    p_exclude_user_id: excludeUserId ?? null,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}
