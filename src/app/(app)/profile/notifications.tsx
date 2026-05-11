import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

export default function NotificationsScreen() {
  const crashAlertsEnabled = useAppStore((state) => state.crashAlertsEnabled);
  const setCrashAlertsEnabled = useAppStore((state) => state.setCrashAlertsEnabled);
  const maintenanceRemindersEnabled = useAppStore((state) => state.maintenanceRemindersEnabled);
  const setMaintenanceRemindersEnabled = useAppStore((state) => state.setMaintenanceRemindersEnabled);
  const thresholds = useAppStore((state) => state.maintenanceReminderThresholds);
  const setThresholds = useAppStore((state) => state.setMaintenanceReminderThresholds);
  const dailySummaryEnabled = useAppStore((state) => state.dailySummaryEnabled);
  const setDailySummaryEnabled = useAppStore((state) => state.setDailySummaryEnabled);
  const dailySummaryHour = useAppStore((state) => state.dailySummaryHour);
  const setDailySummaryHour = useAppStore((state) => state.setDailySummaryHour);
  const [showAddThreshold, setShowAddThreshold] = useState(false);
  const [newThreshold, setNewThreshold] = useState('');

  const addThreshold = () => {
    const value = parseInt(newThreshold, 10);
    if (!isNaN(value) && value > 0 && value <= 100 && !thresholds.includes(value)) {
      setThresholds([...thresholds, value].sort((a, b) => a - b));
    }
    setShowAddThreshold(false);
    setNewThreshold('');
  };

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Settings</AppText>
        <AppText variant="screenTitle">Notifications</AppText>
        <AppText variant="body">Control when and how Kurbada alerts you.</AppText>
      </View>

      <SectionHeader title="Alerts" />
      <GlassCard style={{ padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyBold">Crash Alerts</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Vibrates and starts a countdown when a sudden stop is detected.
            </AppText>
          </View>
          <Switch
            value={crashAlertsEnabled}
            onValueChange={setCrashAlertsEnabled}
            trackColor={{ false: palette.surfaceMuted, true: palette.danger }}
            thumbColor={crashAlertsEnabled ? '#FFFFFF' : palette.textTertiary}
          />
        </View>
      </GlassCard>

      <SectionHeader title="Daily Summary" />
      <GlassCard style={{ padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyBold">Daily ride summary</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              A gentle end-of-day nudge with today&apos;s distance, fuel, and net earnings.
            </AppText>
          </View>
          <Switch
            value={dailySummaryEnabled}
            onValueChange={setDailySummaryEnabled}
            trackColor={{ false: palette.surfaceMuted, true: palette.lime }}
            thumbColor={dailySummaryEnabled ? '#FFFFFF' : palette.textTertiary}
          />
        </View>

        {dailySummaryEnabled ? (
          <View style={{ gap: 8 }}>
            <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 11, marginTop: 4 }}>
              DELIVER AT
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {[17, 18, 19, 20, 21, 22].map((h) => {
                const active = dailySummaryHour === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => setDailySummaryHour(h)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? palette.text : 'rgba(255,255,255,0.06)',
                      borderWidth: 0.5,
                      borderColor: active ? palette.text : palette.border,
                    }}>
                    <AppText
                      variant="button"
                      style={{ fontSize: 12, color: active ? palette.background : palette.textSecondary }}>
                      {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </GlassCard>

      <SectionHeader title="Maintenance" />
      <GlassCard style={{ padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="bodyBold">Maintenance Reminders</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Get notified when a service is coming due.
            </AppText>
          </View>
          <Switch
            value={maintenanceRemindersEnabled}
            onValueChange={setMaintenanceRemindersEnabled}
            trackColor={{ false: palette.surfaceMuted, true: palette.lime }}
            thumbColor={maintenanceRemindersEnabled ? '#FFFFFF' : palette.textTertiary}
          />
        </View>

        {maintenanceRemindersEnabled ? (
          <View style={{ gap: 8 }}>
            <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 11, marginTop: 4 }}>
              REMINDER THRESHOLDS (%)
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {thresholds.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    Alert.alert('Remove threshold?', `Stop notifying at ${t}%`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', onPress: () => setThresholds(thresholds.filter((x) => x !== t)) },
                    ]);
                  }}
                  style={{
                    borderRadius: radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <AppText variant="button" style={{ fontSize: 12 }}>
                    {t}%
                  </AppText>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setShowAddThreshold(true)}
                style={{
                  borderRadius: radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: palette.surfaceMuted,
                }}>
                <AppText variant="button" style={{ fontSize: 12, color: palette.textSecondary }}>+ Add</AppText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </GlassCard>

      <Modal visible={showAddThreshold} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowAddThreshold(false)}>
          <Pressable onPress={() => undefined}>
            <View style={{ backgroundColor: '#1E1E1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.surfaceStrong, alignSelf: 'center' }} />
              <AppText variant="sectionTitle" style={{ fontSize: 20 }}>Add Threshold</AppText>
              <FloatingField
                label="PERCENTAGE (%)"
                value={newThreshold}
                onChangeText={setNewThreshold}
                placeholder="75"
                keyboardType="number-pad"
              />
              <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
                You will be notified when a maintenance task reaches this percentage of its interval.
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button title="Cancel" variant="ghost" onPress={() => setShowAddThreshold(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Add" onPress={addThreshold} style={{ backgroundColor: '#C0392B', borderRadius: 13, minHeight: 48 }} />
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppScrollScreen>
  );
}
