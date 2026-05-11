import { supabase } from '@/lib/supabase';

export async function requestAccountDeletion() {
  if (!supabase) throw new Error('Supabase is not configured in this build.');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to delete your account.');

  const { data, error } = await supabase.functions.invoke<{ ok: boolean; deleted: string }>(
    'delete-account',
    {
      method: 'POST',
      body: { confirmUserId: user.id },
    },
  );
  if (error) throw new Error(error.message || 'Account deletion failed.');
  if (!data?.ok) throw new Error('Account deletion did not complete.');

  await supabase.auth.signOut().catch(() => undefined);
  return data;
}
