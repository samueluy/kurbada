import { useQuery } from '@tanstack/react-query';

import { getUserAccess } from '@/lib/access';
import { sampleProfile } from '@/lib/mock-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useLocalAppStore } from '@/store/local-app-store';

export function useUserProfile(userId?: string) {
  const localProfile = useLocalAppStore((state) => state.profile);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  return useQuery({
    queryKey: ['profile', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return localProfile ?? sampleProfile;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) {
        throw error;
      }

      const profile = data as any;

      return {
        id: profile.id,
        display_name: profile.display_name ?? 'Kurbada Rider',
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        subscription_status: profile.subscription_status,
        subscription_expires_at: profile.subscription_expires_at,
        access_override: profile.access_override,
      };
    },
    initialData: useRemote ? undefined : localProfile,
  });
}

export function useUserAccess(userId?: string) {
  const profileQuery = useUserProfile(userId);

  return useQuery({
    queryKey: ['access', userId ?? 'local', profileQuery.data?.access_override, profileQuery.data?.subscription_status],
    queryFn: () => getUserAccess(profileQuery.data),
    initialData: {
      hasAccess: true,
      reason: 'disabled' as const,
      accessOverride: profileQuery.data?.access_override ?? 'none',
    },
  });
}
