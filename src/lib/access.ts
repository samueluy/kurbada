import { env } from '@/lib/env';
import { getRevenueCatPremiumStatus } from '@/services/revenuecat';
import type { AccessOverride, Profile } from '@/types/domain';

export type UserAccess = {
  hasAccess: boolean;
  reason: 'disabled' | 'premium' | 'override' | 'missing';
  accessOverride: AccessOverride;
};

export async function getUserAccess(profile?: Profile | null): Promise<UserAccess> {
  const accessOverride = profile?.access_override ?? 'none';

  if (!env.revenueCatEnabled) {
    return { hasAccess: true, reason: 'disabled', accessOverride };
  }

  if (accessOverride !== 'none') {
    return { hasAccess: true, reason: 'override', accessOverride };
  }

  const hasPremium = await getRevenueCatPremiumStatus();

  return {
    hasAccess: hasPremium,
    reason: hasPremium ? 'premium' : 'missing',
    accessOverride,
  };
}
