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
        referral_code: profile.referral_code,
      };
    },
    initialData: useRemote ? undefined : localProfile,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });
}

export function useUserAccess(userId?: string) {
  const profileQuery = useUserProfile(userId);
  const needsPremiumResolution =
    Boolean(userId)
    && profileQuery.data?.access_override === 'none';
  const accessQuery = useQuery({
    queryKey: ['access', userId ?? 'local', profileQuery.data?.access_override, profileQuery.data?.subscription_status],
    enabled: Boolean(userId) && !profileQuery.isLoading,
    queryFn: () => getUserAccess(profileQuery.data),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  const accessData = accessQuery.data ?? {
    hasAccess: true,
    reason: 'bootstrap' as const,
    accessOverride: profileQuery.data?.access_override ?? 'none',
  };

  const hasResolvedAccess = !needsPremiumResolution || accessQuery.isSuccess || accessQuery.isError;
  const shouldRequirePaywall =
    hasResolvedAccess
    && accessData.reason !== 'bootstrap'
    && !accessData.hasAccess;

  return {
    ...accessQuery,
    data: accessData,
    hasResolvedAccess,
    shouldRequirePaywall,
    isLoading: Boolean(userId) && profileQuery.isLoading,
    isRefreshingPremium: Boolean(userId) && !profileQuery.isLoading && accessQuery.isFetching,
  };
}
