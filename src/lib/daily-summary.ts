import * as Notifications from 'expo-notifications';

export const DAILY_SUMMARY_ID = 'kurbada-daily-summary';

/**
 * Schedules (or re-schedules) a daily local notification at the given local hour.
 * Content is generic — users open the app to see the computed ride summary for today.
 *
 * Apple / Play Store notes:
 *   - Uses local notifications only (no remote push server required).
 *   - Single daily notification (not spammy).
 *   - User controls the toggle + hour from Settings → Notifications.
 *   - Requires `NOTIFICATIONS` permission, which is requested during onboarding
 *     and re-prompted if disabled.
 */
export async function scheduleDailySummaryNotification(hour: number) {
  const safeHour = Math.max(0, Math.min(23, Math.round(hour)));

  // Remove any existing scheduled daily summary to avoid duplicates.
  await cancelDailySummaryNotification();

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      const request = await Notifications.requestPermissionsAsync();
      if (request.status !== 'granted') {
        return { scheduled: false, reason: 'permission_denied' as const };
      }
    }

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_SUMMARY_ID,
      content: {
        title: 'Today\u2019s ride summary',
        body: 'Tap to see distance, fuel cost, and efficiency.',
        data: { type: 'daily_summary' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: safeHour,
        minute: 0,
      },
    });

    return { scheduled: true as const };
  } catch (error) {
    return {
      scheduled: false as const,
      reason: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

export async function cancelDailySummaryNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_SUMMARY_ID);
  } catch {
    // No-op — identifier may not exist, which is fine.
  }
}
