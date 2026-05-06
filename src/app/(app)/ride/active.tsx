import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar, View } from 'react-native';

import { CrashAlertModal } from '@/components/ride/crash-alert-modal';
import { HUDStatCard } from '@/components/ui/hud-stat-card';
import { LeanAngleGauge } from '@/components/ride/lean-angle-gauge';
import { RideBottomSheet } from '@/components/ride/ride-bottom-sheet';
import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Colors, palette, radius } from '@/constants/theme';
import { formatDuration } from '@/lib/format';
import { useRideSession } from '@/hooks/use-ride-session';
import type { RideMode } from '@/types/domain';

export default function ActiveRideScreen() {
  const params = useLocalSearchParams<{ mode?: RideMode; bikeId?: string }>();
  const ride = useRideSession();

  useEffect(() => {
    if (ride.state === 'idle' && params.bikeId) {
      ride.startRide((params.mode as RideMode) ?? 'weekend', params.bikeId).catch(() => undefined);
    }
  }, [params.bikeId, params.mode, ride]);

  return (
    <AppScreen style={{ backgroundColor: Colors.hudBg, paddingTop: 8 }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, gap: 18 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary }}>
            Live Ride
          </AppText>
          <AppText variant="sectionTitle" style={{ color: palette.text }}>
            Stay inside the curve.
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <HUDStatCard label="Speed" value={ride.telemetry.speedKmh.toFixed(0)} unit="km/h" />
          <HUDStatCard label="Duration" value={formatDuration(ride.telemetry.durationSeconds)} />
          <HUDStatCard label="Distance" value={ride.telemetry.distanceKm.toFixed(1)} unit="km" />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LeanAngleGauge
            leanAngle={ride.telemetry.leanAngleDeg}
            speed={ride.telemetry.speedKmh}
            calibrating={ride.state === 'calibrating'}
          />
          <AppText variant="label" style={{ color: palette.danger }}>
            MAX {ride.telemetry.maxLeanAngleDeg.toFixed(0)}deg
          </AppText>

          {ride.state === 'calibrating' ? (
            <GlassCard
              style={{
                position: 'absolute',
                alignSelf: 'stretch',
                backgroundColor: 'rgba(255,255,255,0.08)',
                gap: 16,
                marginHorizontal: 8,
              }}>
              <AppText variant="sectionTitle">
                Calibrate zero reference
              </AppText>
              <AppText variant="meta" style={{ textAlign: 'center' }}>
                Mount the phone, hold the bike upright and still, then capture the machine&apos;s neutral horizon.
              </AppText>
              <Button title="Capture Zero Reference" onPress={() => ride.completeCalibration()} />
            </GlassCard>
          ) : null}
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <Button
            title="End Ride"
            onPress={async () => {
              const savedRide = await ride.stopRide();
              if (savedRide) {
                router.replace({ pathname: '/(app)/ride/summary', params: { rideId: savedRide.id } });
              } else {
                router.back();
              }
            }}
            style={{ alignSelf: 'center', minWidth: 160, borderRadius: radius.pill, backgroundColor: palette.danger }}
          />
          <AppText variant="meta">Precision telemetry is active while this screen stays in the foreground.</AppText>
        </View>
      </View>

      <RideBottomSheet routeGeoJson={ride.routePreview} />

      <CrashAlertModal
        visible={ride.crashCountdown !== null}
        countdown={ride.crashCountdown ?? 0}
        onDismiss={ride.dismissCrashAlert}
        onHelp={ride.requestHelp}
      />
    </AppScreen>
  );
}
