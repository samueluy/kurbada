import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { formatDuration } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useBikes } from '@/hooks/use-kurbada-data';
import { useRideSession } from '@/hooks/use-ride-session';
import { useUnfinishedRideRecovery } from '@/hooks/use-unfinished-ride-recovery';

function formatLastRecorded(timestamp: number | null) {
  if (!timestamp) {
    return 'No recent point saved';
  }

  return new Date(timestamp).toLocaleString();
}

export default function RideRecoveryScreen() {
  const { session } = useAuth();
  const recovery = useUnfinishedRideRecovery(Boolean(session?.user.id));
  const ride = useRideSession();
  const bikes = useBikes(session?.user.id);
  const [busyAction, setBusyAction] = useState<'resume' | 'save' | 'discard' | null>(null);

  const bikeLabel = useMemo(() => {
    const bikeId = recovery.data?.session.bikeId;
    if (!bikeId) return 'Saved bike';
    const bike = bikes.data?.find((item) => item.id === bikeId);
    return bike ? `${bike.make} ${bike.model}` : 'Saved bike';
  }, [bikes.data, recovery.data?.session.bikeId]);

  if (recovery.isLoading) {
    return (
      <AppScrollScreen>
        <GlassCard style={{ padding: 20, gap: 12 }}>
          <AppText variant="screenTitle">Recovering ride…</AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Checking if your last ride was interrupted.
          </AppText>
        </GlassCard>
      </AppScrollScreen>
    );
  }

  if (!recovery.data?.session) {
    return <Redirect href="/(app)/(tabs)/ride" />;
  }

  const durationSeconds = Math.max(
    0,
    Math.floor(((recovery.data.session.lastPointTimestamp ?? Date.now()) - recovery.data.session.startedAt) / 1000),
  );

  const handleResume = async () => {
    setBusyAction('resume');
    try {
      await ride.resumeRecoveredRide();
      router.replace('/(app)/ride/active');
    } catch (error) {
      Alert.alert('Could not resume ride', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSave = async () => {
    setBusyAction('save');
    try {
      const savedRide = await ride.saveRecoveredRide();
      router.replace({ pathname: '/(app)/ride/summary', params: { rideId: savedRide.id } });
    } catch (error) {
      Alert.alert('Could not save ride', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDiscard = async () => {
    setBusyAction('discard');
    try {
      await ride.discardRecoveredRide();
      router.replace('/(app)/(tabs)/ride');
    } catch (error) {
      Alert.alert('Could not discard ride', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <AppScrollScreen>
      <GlassCard style={{ padding: 22, gap: 14 }}>
        <AppText variant="eyebrow">UNFINISHED RIDE</AppText>
        <AppText variant="screenTitle">We recovered your unfinished ride.</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary, lineHeight: 22 }}>
          {recovery.data.isStale
            ? 'The app was interrupted and this ride has been idle for a while. You can save what was recorded or resume it if you are still riding.'
            : 'The app was interrupted before your ride could be finalized. Resume it or save what was already recorded.'}
        </AppText>
      </GlassCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <GlassCard style={{ flex: 1, padding: 16, gap: 6 }}>
          <AppText variant="label">Bike</AppText>
          <AppText variant="bodyBold">{bikeLabel}</AppText>
        </GlassCard>
        <GlassCard style={{ flex: 1, padding: 16, gap: 6 }}>
          <AppText variant="label">Duration</AppText>
          <AppText variant="bodyBold">{formatDuration(durationSeconds)}</AppText>
        </GlassCard>
      </View>

      <GlassCard style={{ padding: 18, gap: 8 }}>
        <AppText variant="label">Last Recorded</AppText>
        <AppText variant="bodyBold">{formatLastRecorded(recovery.data.session.lastPointTimestamp)}</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          {recovery.data.pointCount} route point{recovery.data.pointCount === 1 ? '' : 's'} captured
        </AppText>
      </GlassCard>

      <View style={{ gap: 10 }}>
        <Button
          title={busyAction === 'resume' ? 'Resuming…' : 'Resume Ride'}
          onPress={handleResume}
          disabled={busyAction !== null}
        />
        <Button
          title={busyAction === 'save' ? 'Saving…' : 'End & Save'}
          variant="secondary"
          onPress={handleSave}
          disabled={busyAction !== null}
        />
        <Button
          title={busyAction === 'discard' ? 'Discarding…' : 'Discard Ride'}
          variant="ghost"
          onPress={handleDiscard}
          disabled={busyAction !== null}
        />
      </View>
    </AppScrollScreen>
  );
}
