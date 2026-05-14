import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, InteractionManager, Pressable, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrashAlertModal } from '@/components/ride/crash-alert-modal';
import { FatigueBreakModal } from '@/components/ride/fatigue-break-modal';
import { AppText } from '@/components/ui/app-text';
import { HUDStatCard } from '@/components/ui/hud-stat-card';
import { palette, radius } from '@/constants/theme';
import { formatCurrencyPhp, formatDuration } from '@/lib/format';
import { useRideSession } from '@/hooks/use-ride-session';
import { useAppStore } from '@/store/app-store';

function RideKeepAwake() {
  useKeepAwake();
  return null;
}

export default function ActiveRideScreen() {
  const params = useLocalSearchParams<{ bikeId?: string; fuelPrice?: string; fuelRate?: string }>();
  const ride = useRideSession();
  const insets = useSafeAreaInsets();
  const keepScreenAwakeDuringRide = useAppStore((state) => state.keepScreenAwakeDuringRide);
  const requestedBikeId = Array.isArray(params.bikeId) ? params.bikeId[0] : params.bikeId;
  const requestedFuelPrice = Array.isArray(params.fuelPrice) ? params.fuelPrice[0] : params.fuelPrice;
  const requestedFuelRate = Array.isArray(params.fuelRate) ? params.fuelRate[0] : params.fuelRate;

  useEffect(() => {
    if (ride.state === 'idle' && requestedBikeId) {
      const fuelPrice = Number(requestedFuelPrice) || 65;
      const fuelRate = Number(requestedFuelRate) || 28;
      const task = InteractionManager.runAfterInteractions(() => {
        ride.startRide(requestedBikeId, fuelPrice, fuelRate).catch(() => undefined);
      });

      return () => task.cancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedBikeId, requestedFuelPrice, requestedFuelRate]);

  const handleStop = async () => {
    try {
      const savedRide = await ride.stopRide();
      if (savedRide) {
        router.replace({ pathname: '/(app)/ride/summary', params: { rideId: savedRide.id } });
      } else {
        router.back();
      }
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save the ride. Please try again.');
    }
  };

  const displaySpeed = Math.round(ride.telemetry.displaySpeedKmh);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {keepScreenAwakeDuringRide && (ride.state === 'active' || ride.state === 'starting' || ride.state === 'saving') ? <RideKeepAwake /> : null}
      <StatusBar barStyle="light-content" />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 14, letterSpacing: 5 }}>
          KURBADA
        </AppText>
        <View style={{ width: 108 }} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, gap: 24 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 2 }}>
            SPEED
          </AppText>
          <AppText variant="heroMetric" style={{ fontSize: 96, color: palette.text, lineHeight: 104 }}>
            {displaySpeed}
          </AppText>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 16, lineHeight: 20, letterSpacing: 3 }}>
            KM/H
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 16, minWidth: 96 }}>
            <AppText variant="bodyBold" style={{ color: palette.text, fontSize: 28 }}>
              {ride.telemetry.estimatedFuelLiters.toFixed(1)}
            </AppText>
            <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>LITERS</AppText>
          </View>
          <View style={{ alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 16, minWidth: 96 }}>
            <AppText variant="bodyBold" style={{ color: palette.lime, fontSize: 28 }}>
              {formatCurrencyPhp(ride.telemetry.estimatedFuelCost)}
            </AppText>
            <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>COST</AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <HUDStatCard label="Distance" value={`${ride.telemetry.distanceKm.toFixed(1)}`} unit="km" />
          <HUDStatCard label="Time" value={formatDuration(ride.telemetry.durationSeconds)} />
          <HUDStatCard label="Elevation" value={`${ride.telemetry.altitudeMeters.toFixed(0)}`} unit="m" />
        </View>

        <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
          ● GPS tracking · Crash detection on
        </AppText>
      </View>

      {(ride.state === 'active' || ride.state === 'starting') ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 10 }}>
          <LinearGradient
            colors={['#C0392B', '#E63946']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: radius.pill, overflow: 'hidden' }}>
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                { paddingVertical: 18, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 },
              ]}>
              <AppText variant="bodyBold" style={{ color: '#FFFFFF', fontSize: 18, letterSpacing: 1 }}>
                ■ END RIDE
              </AppText>
            </Pressable>
          </LinearGradient>
          <AppText variant="meta" style={{ color: palette.textTertiary, textAlign: 'center', fontSize: 11 }}>
            If the app is interrupted, Kurbada will offer to recover this ride on next launch.
          </AppText>
        </View>
      ) : null}

      <CrashAlertModal
        visible={ride.crashCountdown !== null}
        countdown={ride.crashCountdown ?? 0}
        onDismiss={ride.dismissCrashAlert}
        onHelp={ride.requestHelp}
      />

      <FatigueBreakModal
        visible={ride.fatiguePromptShown}
        onDismiss={ride.dismissFatiguePrompt}
        onEnd={async () => {
          ride.dismissFatiguePrompt();
          await handleStop();
        }}
      />
    </View>
  );
}
