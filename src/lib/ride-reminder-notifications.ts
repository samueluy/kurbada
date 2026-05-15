import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { useRideStore } from '@/store/ride-store';

const START_RIDE_CATEGORY = 'kurbada-start-ride';
const STOP_RIDE_CATEGORY = 'kurbada-stop-ride';

const START_RIDE_ID = 'kurbada-start-ride-reminder';
const STOP_RIDE_ID = 'kurbada-stop-ride-reminder';

export async function ensureRideReminderCategories() {
  await Notifications.setNotificationCategoryAsync(START_RIDE_CATEGORY, [
    {
      identifier: 'start-ride',
      buttonTitle: 'Start Ride',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync(STOP_RIDE_CATEGORY, [
    {
      identifier: 'stop-ride',
      buttonTitle: 'Stop Ride',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);
}

export async function scheduleStartRideReminder() {
  await Notifications.dismissNotificationAsync(START_RIDE_ID).catch(() => undefined);

  await Notifications.scheduleNotificationAsync({
    identifier: START_RIDE_ID,
    content: {
      title: 'Looks like you\'re riding',
      subtitle: 'Tap to start tracking your ride',
      body: 'Kurbada detected movement — start logging your route, fuel, and cost.',
      data: { type: 'start-ride-reminder' },
      categoryIdentifier: START_RIDE_CATEGORY,
    },
    trigger: null,
  });
}

export async function scheduleStopRideReminder(minutesStationary: number) {
  await Notifications.dismissNotificationAsync(STOP_RIDE_ID).catch(() => undefined);

  await Notifications.scheduleNotificationAsync({
    identifier: STOP_RIDE_ID,
    content: {
      title: 'Still parked?',
      subtitle: `Stationary for ${minutesStationary} min — tap to end your ride`,
      body: 'Your ride appears to have stopped. Tap to save your route and stats.',
      data: { type: 'stop-ride-reminder' },
      categoryIdentifier: STOP_RIDE_CATEGORY,
    },
    trigger: null,
  });
}

export async function cancelRideReminders() {
  await Notifications.dismissNotificationAsync(START_RIDE_ID).catch(() => undefined);
  await Notifications.dismissNotificationAsync(STOP_RIDE_ID).catch(() => undefined);
}

export function handleRideReminderResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const type = data?.type as string | undefined;
  const actionId = response.actionIdentifier;

  if (type === 'start-ride-reminder' && actionId !== 'dismiss') {
    router.navigate('/(app)/(tabs)/ride?autoStart=true');
  }

  if (type === 'stop-ride-reminder' && actionId !== 'dismiss') {
    useRideStore.getState().setStopRideRequested(true);
  }
}
