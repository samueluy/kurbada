import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CrashAlertModal } from '@/components/ride/crash-alert-modal';
import { LeanAngleGauge } from '@/components/ride/lean-angle-gauge';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { HUDStatCard } from '@/components/ui/hud-stat-card';
import { palette, radius } from '@/constants/theme';
import { formatCurrencyPhp, formatDuration } from '@/lib/format';
import { useRideSession } from '@/hooks/use-ride-session';
import type { RideMode } from '@/types/domain';

function SpeedHero({ speedKmh, mode }: { speedKmh: number; mode: RideMode }) {
  const isWeekend = mode === 'weekend';
  const color = isWeekend ? palette.danger : palette.lime;
  const displaySpeed = Math.round(speedKmh);

  if (isWeekend) {
    return (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 2 }}>
          WEEKEND
        </AppText>
        <AppText variant="heroMetric" style={{ fontSize: 88, color: palette.text, lineHeight: 92 }}>
          {displaySpeed}
        </AppText>
        <AppText variant="label" style={{ color, fontSize: 16, lineHeight: 20, letterSpacing: 3 }}>
          KM/H
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 2 }}>
        DAILY
      </AppText>
      <AppText variant="heroMetric" style={{ fontSize: 52, color: palette.textSecondary, lineHeight: 56 }}>
        {displaySpeed}
      </AppText>
      <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 14, lineHeight: 18, letterSpacing: 2 }}>
        KM/H
      </AppText>
    </View>
  );
}

function EconomyHero({ telemetry }: { telemetry: ReturnType<typeof useRideSession>['telemetry'] }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12, letterSpacing: 2 }}>
        DAILY
      </AppText>
      <AppText variant="heroMetric" style={{ fontSize: 72, color: palette.lime, lineHeight: 78 }}>
        {formatCurrencyPhp(telemetry.estimatedFuelCost)}
      </AppText>
      <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 14, lineHeight: 18 }}>
        burned so far
      </AppText>
    </View>
  );
}

export default function ActiveRideScreen() {
  const params = useLocalSearchParams<{ mode?: RideMode; bikeId?: string; fuelPrice?: string; fuelRate?: string }>();
  const ride = useRideSession();
  const insets = useSafeAreaInsets();
  const isWeekend = ride.mode === 'weekend';

  useEffect(() => {
    if (ride.state === 'idle' && params.bikeId) {
      const fuelPrice = Number(params.fuelPrice) || 65;
      const fuelRate = Number(params.fuelRate) || 28;
      ride.startRide((params.mode as RideMode) ?? 'weekend', params.bikeId, fuelPrice, fuelRate).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.bikeId, params.mode, params.fuelPrice, params.fuelRate]);

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

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
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
      </View>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, gap: 24 }}>

        {/* Hero stat */}
        {isWeekend ? (
          <SpeedHero speedKmh={ride.telemetry.speedKmh} mode={ride.mode} />
        ) : (
          <>
            {ride.dashboardView === 'economy' ? (
              <EconomyHero telemetry={ride.telemetry} />
            ) : (
              <SpeedHero speedKmh={ride.telemetry.speedKmh} mode={ride.mode} />
            )}
          </>
        )}

        {/* Lean angle gauge (weekend only) */}
        {isWeekend ? (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <LeanAngleGauge
              leanAngle={ride.telemetry.leanAngleDeg}
              speed={ride.telemetry.speedKmh}
              calibrating={ride.state === 'calibrating'}
            />
            <AppText variant="label" style={{ color: palette.danger, fontSize: 14, lineHeight: 18 }}>
              MAX {ride.telemetry.maxLeanAngleDeg.toFixed(0)}°
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 16 }}>
              <AppText variant="bodyBold" style={{ color: palette.lime, fontSize: 32 }}>
                {ride.telemetry.estimatedFuelLiters.toFixed(1)}
              </AppText>
              <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>LITERS</AppText>
            </View>
            <View style={{ alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 16 }}>
              <AppText variant="bodyBold" style={{ color: palette.text, fontSize: 32 }}>
                {ride.telemetry.distanceKm > 0
                  ? (ride.telemetry.distanceKm / Math.max(ride.telemetry.estimatedFuelLiters, 0.01)).toFixed(1)
                  : '0.0'}
              </AppText>
              <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>KM/L</AppText>
            </View>
          </View>
        )}

        {/* HUD stat row */}
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <HUDStatCard label="Distance" value={`${ride.telemetry.distanceKm.toFixed(1)}`} unit="km" />
          <HUDStatCard label="Time" value={formatDuration(ride.telemetry.durationSeconds)} />
          {isWeekend ? (
            <HUDStatCard label="Elevation" value={`${ride.telemetry.altitudeMeters.toFixed(0)}`} unit="m" />
          ) : (
            <HUDStatCard label="Cost" value={formatCurrencyPhp(ride.telemetry.estimatedFuelCost)} />
          )}
        </View>

        {/* Sensor status */}
        <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
          {isWeekend ? '● Gyro + Accelerometer active' : '● GPS only · Battery efficient'}
        </AppText>
      </View>

      {/* Calibration overlay */}
      {ride.state === 'calibrating' && ride.calibrationCountdown !== null ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 15, gap: 24 }}>
          <AppText variant="screenTitle" style={{ textAlign: 'center' }}>
            Hold phone upright{'\n'}and still
          </AppText>
          <AppText variant="heroMetric" style={{ fontSize: 80, color: ride.calibrationCountdown <= 1 ? palette.success : palette.text }}>
            {ride.calibrationCountdown}
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Capture in {ride.calibrationCountdown}s
          </AppText>
        </View>
      ) : ride.state === 'calibrating' ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 15, gap: 16 }}>
          <AppText variant="screenTitle">Calibrate zero reference</AppText>
          <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary }}>
            Mount the phone, hold the bike upright and still,{'\n'}then capture the neutral horizon.
          </AppText>
          <Button title="Capture Zero Reference" onPress={() => ride.completeCalibration()} />
        </View>
      ) : null}

      {/* Stop button */}
      {(ride.state === 'active' || ride.state === 'calibrating') ? (
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
                ■ STOP RIDE
              </AppText>
            </Pressable>
          </LinearGradient>
          <AppText variant="meta" style={{ color: palette.textTertiary, textAlign: 'center', fontSize: 11 }}>
            Hold the phone in a mount for accurate lean tracking.
          </AppText>
        </View>
      ) : null}

      <CrashAlertModal
        visible={ride.crashCountdown !== null}
        countdown={ride.crashCountdown ?? 0}
        onDismiss={ride.dismissCrashAlert}
        onHelp={ride.requestHelp}
      />
    </View>
  );
}
