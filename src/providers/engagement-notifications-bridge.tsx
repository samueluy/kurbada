import { useEffect, useMemo } from 'react';

import {
  cancelComebackNudgeNotification,
  cancelLobbyReminderNotifications,
  scheduleComebackNudgeNotification,
  syncLobbyReminderNotifications,
} from '@/lib/engagement-notifications';
import { useAuth } from '@/hooks/use-auth';
import { useMyRideListingRsvps, useRideListings, useRides } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';

type ReminderItem = {
  listingId: string;
  title: string;
  meetupPoint: string;
  rideDate: string;
  role: 'joined' | 'hosting';
};

export function EngagementNotificationsBridge() {
  const { session } = useAuth();
  const comebackNudgesEnabled = useAppStore((state) => state.comebackNudgesEnabled);
  const lobbyRemindersEnabled = useAppStore((state) => state.lobbyRemindersEnabled);
  const rides = useRides(session?.user.id, { enabled: comebackNudgesEnabled });
  const listings = useRideListings(session?.user.id, { enabled: lobbyRemindersEnabled });
  const myRsvps = useMyRideListingRsvps(lobbyRemindersEnabled ? session?.user.id : undefined);

  const latestRideAt = rides.data?.[0]?.started_at ?? null;

  const lobbyReminders = useMemo(() => {
    if (!session?.user.id || !listings.data?.length) {
      return [];
    }

    const listingMap = new Map(listings.data.map((listing) => [listing.id, listing]));
    const joined: ReminderItem[] = (myRsvps.data ?? [])
      .map((rsvp) => listingMap.get(rsvp.listing_id))
      .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing))
      .map((listing) => ({
        listingId: listing.id,
        title: listing.title?.trim() || listing.destination,
        meetupPoint: listing.meetup_point,
        rideDate: listing.ride_date,
        role: 'joined' as const,
      }));

    const hosting: ReminderItem[] = listings.data
      .filter((listing) => listing.host_user_id === session.user.id)
      .map((listing) => ({
        listingId: listing.id,
        title: listing.title?.trim() || listing.destination,
        meetupPoint: listing.meetup_point,
        rideDate: listing.ride_date,
        role: 'hosting' as const,
      }));

    const deduped = new Map<string, ReminderItem>();
    [...hosting, ...joined].forEach((item) => {
      deduped.set(`${item.listingId}:${item.role}`, item);
    });
    return Array.from(deduped.values());
  }, [listings.data, myRsvps.data, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !comebackNudgesEnabled) {
      void cancelComebackNudgeNotification();
      return;
    }

    void scheduleComebackNudgeNotification(latestRideAt);
  }, [comebackNudgesEnabled, latestRideAt, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !lobbyRemindersEnabled) {
      void cancelLobbyReminderNotifications();
      return;
    }

    void syncLobbyReminderNotifications(lobbyReminders);
  }, [lobbyReminders, lobbyRemindersEnabled, session?.user.id]);

  return null;
}
