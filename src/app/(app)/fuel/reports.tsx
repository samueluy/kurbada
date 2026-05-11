import { BarChart } from 'react-native-gifted-charts';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { chartColors, palette } from '@/constants/theme';
import { formatCurrencyPhp } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useFuelLogs } from '@/hooks/use-kurbada-data';

export default function FuelReportsScreen() {
  const { session } = useAuth();
  const fuelLogs = useFuelLogs(session?.user.id);

  const data = (fuelLogs.data ?? []).slice(0, 6).reverse().map((item, index) => ({
    value: Math.round(item.total_cost),
    label: item.logged_at.slice(5),
    frontColor: chartColors[index % chartColors.length],
  }));

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="label">Fuel Reports</AppText>
        <AppText variant="screenTitle">See the cost of keeping the machine moving.</AppText>
      </View>
      <SectionHeader title="Fuel Reports" />
      <GlassCard style={{ padding: 18 }}>
        {data.length ? (
            <BarChart
              data={data}
              barWidth={32}
              spacing={18}
              hideRules
              yAxisThickness={0}
              xAxisThickness={0}
              isAnimated
              xAxisLabelTextStyle={{ color: palette.textTertiary, fontSize: 10 }}
              yAxisTextStyle={{ color: palette.textTertiary, fontSize: 10 }}
            />
        ) : (
          <AppText variant="meta">Add fuel logs to populate the chart.</AppText>
        )}
      </GlassCard>

      <SectionHeader title="Totals" />
      <GlassCard style={{ padding: 18 }}>
        {(fuelLogs.data ?? []).map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: palette.divider }}>
            <AppText variant="meta">{item.logged_at}</AppText>
            <AppText variant="bodyBold">{formatCurrencyPhp(item.total_cost)}</AppText>
          </View>
        ))}
      </GlassCard>
    </AppScrollScreen>
  );
}
