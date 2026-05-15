import * as Notifications from 'expo-notifications';

type LobbyReminder = {
  listingId: string;
  title: string;
  meetupPoint: string;
  rideDate: string;
  role: 'joined' | 'hosting';
};

const COMEBACK_NOTIFICATION_KEY = 'kurbada-comeback-nudge';
const LOBBY_REMINDER_KEY_PREFIX = 'kurbada-lobby-reminder';
const COMEBACK_DELAY_MS = 72 * 60 * 60 * 1000;
const MIN_SCHEDULE_WINDOW_MS = 5 * 60 * 1000;
const LOBBY_REMINDER_LEAD_MS = 60 * 60 * 1000;

async function ensurePermission() {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status === 'granted') {
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();
  return request.status === 'granted';
}

export async function scheduleComebackNudgeNotification(lastRideAt?: string | null) {
  await cancelComebackNudgeNotification();

  if (!lastRideAt) {
    return;
  }

  if (!(await ensurePermission())) {
    return;
  }

  const targetAt = new Date(lastRideAt).getTime() + COMEBACK_DELAY_MS;
  const now = Date.now();
  const secondsUntilTrigger = Math.max(60, Math.round((targetAt > now ? targetAt - now : 60 * 60 * 1000) / 1000));

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for a ride?',
      body: "It's been a while since your last ride. A quick ride could keep your streak going.",
      data: { type: 'comeback_nudge', reminderKey: COMEBACK_NOTIFICATION_KEY },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilTrigger,
      repeats: false,
    },
  });
}

export async function cancelComebackNudgeNotification() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.reminderKey === COMEBACK_NOTIFICATION_KEY)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export async function syncLobbyReminderNotifications(reminders: LobbyReminder[]) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = scheduled.filter((item) => {
    const reminderKey = item.content.data?.reminderKey;
    return typeof reminderKey === 'string' && reminderKey.startsWith(LOBBY_REMINDER_KEY_PREFIX);
  });

  const upcoming = reminders
    .map((reminder) => ({
      ...reminder,
      reminderKey: `${LOBBY_REMINDER_KEY_PREFIX}:${reminder.listingId}:${reminder.role}`,
      triggerAt: new Date(reminder.rideDate).getTime() - LOBBY_REMINDER_LEAD_MS,
    }))
    .filter((item) => Number.isFinite(item.triggerAt) && item.triggerAt - Date.now() > MIN_SCHEDULE_WINDOW_MS);

  const desiredKeys = new Set(upcoming.map((item) => item.reminderKey));

  await Promise.all(
    existing
      .filter((item) => !desiredKeys.has(String(item.content.data?.reminderKey)))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );

  if (!upcoming.length) {
    return;
  }

  if (!(await ensurePermission())) {
    return;
  }

  const existingKeys = new Set(existing.map((item) => String(item.content.data?.reminderKey)));

  await Promise.all(
    upcoming
      .filter((item) => !existingKeys.has(item.reminderKey))
      .map((item) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: item.role === 'hosting' ? 'Your ride lobby starts soon' : 'Ride lobby reminder',
            body: `${item.title} meets at ${item.meetupPoint} in about an hour.`,
            data: {
              type: 'lobby_reminder',
              reminderKey: item.reminderKey,
              listingId: item.listingId,
            },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.triggerAt),
          },
        }),
      ),
  );
}

export async function cancelLobbyReminderNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => {
        const reminderKey = item.content.data?.reminderKey;
        return typeof reminderKey === 'string' && reminderKey.startsWith(LOBBY_REMINDER_KEY_PREFIX);
      })
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}
