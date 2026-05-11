import { useEffect } from 'react';

import { cancelDailySummaryNotification, scheduleDailySummaryNotification } from '@/lib/daily-summary';
import { useAppStore } from '@/store/app-store';

/**
 * Watches the daily summary preference and re-schedules the local notification
 * whenever the toggle flips or the preferred hour changes. Renders nothing.
 */
export function DailySummaryBridge() {
  const enabled = useAppStore((s) => s.dailySummaryEnabled);
  const hour = useAppStore((s) => s.dailySummaryHour);

  useEffect(() => {
    if (enabled) {
      void scheduleDailySummaryNotification(hour);
    } else {
      void cancelDailySummaryNotification();
    }
  }, [enabled, hour]);

  return null;
}
