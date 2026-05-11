import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useEarnings } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';

function toCSV(rows: { earned_at: string; amount: number; platform: string; notes?: string | null }[]) {
  const header = 'date,amount_php,platform,notes';
  const body = rows
    .map((r) => {
      const notes = (r.notes ?? '').replace(/"/g, '""');
      return `${r.earned_at},${r.amount.toFixed(2)},${r.platform},"${notes}"`;
    })
    .join('\n');
  return `${header}\n${body}\n`;
}

export default function WorkModeScreen() {
  const { session } = useAuth();
  const workMode = useAppStore((s) => s.workMode);
  const setWorkMode = useAppStore((s) => s.setWorkMode);
  const dailyEarningsGoal = useAppStore((s) => s.dailyEarningsGoal);
  const setDailyEarningsGoal = useAppStore((s) => s.setDailyEarningsGoal);
  const ridingPersona = useAppStore((s) => s.ridingPersona);
  const setRidingPersona = useAppStore((s) => s.setRidingPersona);
  const earnings = useEarnings(session?.user.id);
  const [goalInput, setGoalInput] = useState(String(dailyEarningsGoal ?? 1500));
  const [busy, setBusy] = useState(false);

  const handleSaveGoal = () => {
    const value = Number(goalInput);
    if (Number.isFinite(value) && value >= 0) {
      setDailyEarningsGoal(value);
      Alert.alert('Saved', `Daily goal set to ₱${value.toFixed(0)}.`);
    } else {
      Alert.alert('Invalid amount', 'Enter a valid number.');
    }
  };

  const handleExportCurrentMonth = async () => {
    try {
      setBusy(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const rows = (earnings.data ?? [])
        .filter((e) => new Date(e.earned_at) >= start)
        .sort((a, b) => a.earned_at.localeCompare(b.earned_at));
      if (!rows.length) {
        Alert.alert('No data', 'No earnings logged this month yet.');
        return;
      }
      const csv = toCSV(rows);
      const monthLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const file = new File(Paths.cache, `kurbada-earnings-${monthLabel}.csv`);
      try { file.delete(); } catch { /* no-op */ }
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: `Kurbada earnings ${monthLabel}`,
        });
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScrollScreen showWordmark={false}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Work Mode</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>
          Track your income honestly.
        </AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Enable Work Mode if you use your bike for Grab, Lalamove, FoodPanda, MoveIt, or other income. You&apos;ll get earnings entry after rides, daily goal tracking, and monthly income export.
        </AppText>
      </View>

      <GlassCard style={{ padding: 18, gap: 14, borderRadius: radius.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold">Work Mode</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Earnings entry and income features.
            </AppText>
          </View>
          <Switch
            value={workMode}
            onValueChange={(v) => {
              setWorkMode(v);
              if (v && ridingPersona !== 'work') setRidingPersona('work');
            }}
            trackColor={{ false: palette.surfaceStrong, true: palette.danger }}
          />
        </View>
      </GlassCard>

      {workMode ? (
        <>
          <GlassCard style={{ padding: 18, gap: 12, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Daily earnings goal</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Shown on your dashboard as a progress bar.
            </AppText>
            <FloatingField
              label="DAILY GOAL (PHP)"
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="1500"
              keyboardType="numeric"
            />
            <Button title="Save goal" onPress={handleSaveGoal} />
          </GlassCard>

          <GlassCard style={{ padding: 18, gap: 12, borderRadius: radius.lg }}>
            <AppText variant="bodyBold">Monthly income export</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Download a CSV of this month&apos;s earnings. Bank- and loan-friendly format.
            </AppText>
            <Button
              title={busy ? 'Preparing...' : 'Export CSV'}
              variant="secondary"
              disabled={busy}
              onPress={handleExportCurrentMonth}
            />
          </GlassCard>
        </>
      ) : null}

      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </AppScrollScreen>
  );
}
