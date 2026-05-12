import { env } from '@/lib/env';
import { getPremiumAccessState } from '@/services/revenuecat';
import type { AccessOverride, Profile } from '@/types/domain';

export type UserAccess = {
  hasAccess: boolean;
  reason: 'disabled' | 'premium' | 'override' | 'missing' | 'bootstrap';
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

  const hasPremium = await Promise.race<boolean | null>([
    getPremiumAccessState(),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2500);
    }),
  ]);

  if (hasPremium === null) {
    return {
      hasAccess: true,
      reason: 'bootstrap',
      accessOverride,
    };
  }

  return {
    hasAccess: hasPremium,
    reason: hasPremium ? 'premium' : 'missing',
    accessOverride,
  };
}
