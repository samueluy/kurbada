import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useBikes, useMaintenanceTasks } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';

export function useMaintenanceReminders() {
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const primaryBike = bikes.data?.[0];
  const tasks = useMaintenanceTasks(primaryBike?.id);
  const enabled = useAppStore((state) => state.maintenanceRemindersEnabled);
  const thresholds = useAppStore((state) => state.maintenanceReminderThresholds);
  const lastNotified = useAppStore((state) => state.maintenanceReminderLastNotified);
  const setLastNotified = useAppStore((state) => state.setMaintenanceReminderLastNotified);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !primaryBike || !tasks.data?.length) return;

    const sortedThresholds = [...thresholds].sort((a, b) => a - b);

    for (const task of tasks.data) {
      const distanceSince = primaryBike.current_odometer_km - task.last_done_odometer_km;
      const kmProgress = Math.min(100, (distanceSince / task.interval_km) * 100);

      const lastDone = new Date(task.last_done_date);
      const daysSince = Math.max(0, Math.floor((Date.now() - lastDone.getTime()) / 86_400_000));
      const dateProgress = task.interval_days
        ? Math.min(100, (daysSince / task.interval_days) * 100)
        : 0;

      const overallProgress = Math.max(kmProgress, dateProgress);

      const lastThreshold = lastNotified[task.id] ?? 0;
      const highestPassed = sortedThresholds
        .filter((t) => t > lastThreshold && overallProgress >= t)
        .sort((a, b) => b - a)[0];

      if (highestPassed === undefined) continue;

      const dedupeKey = `${task.id}-${highestPassed}`;
      if (notifiedRef.current.has(dedupeKey)) continue;
      notifiedRef.current.add(dedupeKey);

      const remaining = task.interval_km - distanceSince;
      const body =
        overallProgress >= 100
          ? `⛔ OVERDUE: ${task.task_name} requires service now (${Math.abs(Math.round(remaining)).toLocaleString()} km past due)`
          : overallProgress >= 90
            ? `⚠ ${task.task_name} almost due (${Math.round(remaining).toLocaleString()} km remaining)`
            : `Reminder: ${task.task_name} is at ${Math.round(overallProgress)}% of its service interval`;

      Notifications.scheduleNotificationAsync({
        content: {
          title: overallProgress >= 100 ? '⛔ Service Overdue' : 'Maintenance Reminder',
          body,
          sound: true,
        },
        trigger: null,
      }).catch(() => undefined);

      setLastNotified(task.id, highestPassed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, primaryBike, tasks.data]);
}
