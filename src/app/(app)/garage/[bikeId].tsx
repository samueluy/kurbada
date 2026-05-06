import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useMaintenanceTasks } from '@/hooks/use-kurbada-data';

export default function BikeProfileScreen() {
  const params = useLocalSearchParams<{ bikeId?: string }>();
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const bike = bikes.data?.find((item) => item.id === params.bikeId);
  const tasks = useMaintenanceTasks(bike?.id);

  if (!bike) {
    return null;
  }

  return (
    <AppScrollScreen>
      <GlassCard style={{ padding: 20, gap: 10 }}>
        <AppText variant="label">Bike profile</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>{bike.make} {bike.model}</AppText>
        <AppText variant="meta">{bike.year} • {bike.engine_cc} cc</AppText>
        <AppText variant="body">Current odometer: {bike.current_odometer_km.toLocaleString()} km</AppText>
      </GlassCard>

      <SectionHeader title="Maintenance Tracker" />
      {tasks.data?.map((task) => {
        const distanceSinceService = bike.current_odometer_km - task.last_done_odometer_km;
        const progress = Math.min(1, distanceSinceService / task.interval_km);
        const status = progress >= 1 ? 'Overdue' : progress >= 0.8 ? 'Due Soon' : 'OK';

        return (
          <GlassCard key={task.id} style={{ padding: 18, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="bodyBold">{task.task_name}</AppText>
              <AppText variant="label" style={{ color: status === 'OK' ? palette.success : status === 'Due Soon' ? palette.lime : palette.danger }}>{status}</AppText>
            </View>
            <AppText variant="meta">Every {task.interval_km.toLocaleString()} km</AppText>
            <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.round, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.max(6, progress * 100)}%`,
                  height: '100%',
                  backgroundColor:
                    status === 'OK' ? palette.success : status === 'Due Soon' ? palette.lime : palette.danger,
                }}
              />
            </View>
            <Button title="Log Service" variant="secondary" onPress={() => undefined} />
          </GlassCard>
        );
      })}
    </AppScrollScreen>
  );
}
