import { env } from '@/lib/env';
import { canMakeRevenueCatPurchases, getPremiumAccessState } from '@/services/revenuecat';
import type { AccessOverride, Profile } from '@/types/domain';

export type UserAccess = {
  hasAccess: boolean;
  reason: 'disabled' | 'premium' | 'override' | 'missing' | 'bootstrap' | 'grace' | 'billing_unavailable';
  accessOverride: AccessOverride;
};

export async function getUserAccess(
  profile?: Profile | null,
  options?: {
    allowOnboardingGrace?: boolean;
  },
): Promise<UserAccess> {
  const accessOverride = profile?.access_override ?? 'none';
  const allowOnboardingGrace = options?.allowOnboardingGrace ?? false;

  if (!env.revenueCatEnabled) {
    return { hasAccess: true, reason: 'disabled', accessOverride };
  }

  if (accessOverride !== 'none') {
    return { hasAccess: true, reason: 'override', accessOverride };
  }

  const billingAvailable = await canMakeRevenueCatPurchases();
  console.info(
    `[bootstrap] access_can_make_purchases available=${billingAvailable} grace_candidate=${allowOnboardingGrace}`,
  );

  if (!billingAvailable) {
    return {
      hasAccess: allowOnboardingGrace,
      reason: allowOnboardingGrace ? 'grace' : 'billing_unavailable',
      accessOverride,
    };
  }

  const hasPremium = await Promise.race<boolean | null>([
    getPremiumAccessState(),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2500);
    }),
  ]);
  console.info(
    `[bootstrap] access_entitlement_result result=${hasPremium === null ? 'pending' : hasPremium ? 'premium' : 'missing'} grace_candidate=${allowOnboardingGrace}`,
  );

  if (hasPremium === null) {
    return {
      hasAccess: true,
      reason: allowOnboardingGrace ? 'grace' : 'bootstrap',
      accessOverride,
    };
  }

  return {
    hasAccess: hasPremium,
    reason: hasPremium ? 'premium' : 'missing',
    accessOverride,
  };
}
