import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { Colors, palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useMaintenanceTasks } from '@/hooks/use-kurbada-data';

function getTaskIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('oil')) return 'oil';
  if (lower.includes('chain')) return 'link-variant';
  if (lower.includes('brake')) return 'car-brake-fluid-level';
  if (lower.includes('air') || lower.includes('filter')) return 'air-filter';
  if (lower.includes('spark')) return 'flash';
  if (lower.includes('coolant')) return 'thermometer';
  if (lower.includes('tire') || lower.includes('tyre')) return 'tire';
  return 'wrench';
}

function getStatusColor(progress: number): { bg: string; fg: string; bar: string; badge: string; label: string } {
  if (progress >= 1) return { bg: Colors.redDim, fg: Colors.red, bar: Colors.red, badge: 'OVERDUE', label: 'OVERDUE' };
  if (progress >= 0.9) return { bg: Colors.amberDim, fg: Colors.amber, bar: Colors.amber, badge: 'SOON', label: 'DUE SOON' };
  return { bg: Colors.amberDim, fg: Colors.amber, bar: Colors.amber, badge: 'SOON', label: 'DUE SOON' };
}

export function UpcomingMaintenanceCard() {
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const primaryBike = bikes.data?.[0];
  const tasks = useMaintenanceTasks(primaryBike?.id);

  if (!primaryBike || !tasks.data?.length) return null;

  const dueTasks = tasks.data
    .map((task) => {
      const distanceSinceService = primaryBike.current_odometer_km - task.last_done_odometer_km;
      const progress = distanceSinceService / task.interval_km;
      return { ...task, progress };
    })
    .filter((t) => t.progress >= 0.8)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  if (!dueTasks.length) return null;

  return (
    <GlassCard style={{
      padding: 16,
      borderWidth: 0.5,
      borderColor: 'rgba(192,57,43,0.30)',
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="eyebrow" style={{ color: Colors.red }}>UPCOMING MAINTENANCE</AppText>
        <MaterialCommunityIcons name="wrench" size={16} color={Colors.red} />
      </View>

      {dueTasks.map((task, i) => {
        const status = getStatusColor(task.progress);
        const distanceSince = primaryBike.current_odometer_km - task.last_done_odometer_km;
        const remainingKm = task.interval_km - distanceSince;

        return (
          <View key={task.id} style={{ marginTop: i === 0 ? 12 : 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={getTaskIcon(task.task_name) as any} size={16} color={palette.textSecondary} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <AppText variant="bodyBold" style={{ fontSize: 14 }}>{task.task_name}</AppText>
                <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>
                  {task.progress >= 1
                    ? `Overdue by ${Math.abs(remainingKm).toLocaleString()} km`
                    : `Due in ${remainingKm.toLocaleString()} km`}
                </AppText>
              </View>
              <View style={{
                backgroundColor: status.bg,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.xs,
              }}>
                <AppText variant="label" style={{ color: status.fg, fontSize: 10, letterSpacing: 0.8 }}>{status.badge}</AppText>
              </View>
            </View>

            <View style={{ height: 2, backgroundColor: palette.surfaceStrong, borderRadius: 1, overflow: 'hidden', marginTop: 8 }}>
              <View style={{
                width: `${Math.min(100, Math.max(6, task.progress * 100))}%`,
                height: '100%',
                backgroundColor: status.bar,
              }} />
            </View>
          </View>
        );
      })}

      <AppText
        variant="bodyBold"
        style={{ color: palette.textTertiary, fontSize: 13, textAlign: 'right', marginTop: 12 }}
        onPress={() => primaryBike && router.push({ pathname: '/(app)/garage/[bikeId]', params: { bikeId: primaryBike.id } })}>
        View All in Garage →
      </AppText>
    </GlassCard>
  );
}
