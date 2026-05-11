import { useEffect, useState } from 'react';

import { env } from '@/lib/env';
import {
  getRevenueCatSubscriptionSummary,
  subscribeToCustomerInfo,
} from '@/services/revenuecat';

export type RevenueCatStatus = Awaited<ReturnType<typeof getRevenueCatSubscriptionSummary>>;

const INACTIVE_STATUS: RevenueCatStatus = {
  hasPremium: false,
  status: 'inactive',
  periodType: null,
  expirationDate: null,
  willRenew: false,
  productIdentifier: null,
};

export function useRevenueCatStatus() {
  const [status, setStatus] = useState<RevenueCatStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(env.revenueCatEnabled);

  useEffect(() => {
    let cancelled = false;

    if (!env.revenueCatEnabled) {
      setStatus(INACTIVE_STATUS);
      setIsLoading(false);
      return;
    }

    const refresh = async () => {
      try {
        const next = await getRevenueCatSubscriptionSummary();
        if (!cancelled) {
          setStatus(next);
        }
      } catch {
        if (!cancelled) {
          setStatus(INACTIVE_STATUS);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void refresh();

    const unsubscribe = subscribeToCustomerInfo(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    status: status?.status ?? 'inactive',
    hasPremium: status?.hasPremium ?? false,
    willRenew: status?.willRenew ?? false,
    expirationDate: status?.expirationDate ?? null,
    isLoading,
  };
}
