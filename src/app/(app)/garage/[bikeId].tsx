import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikeMutations, useBikes, useMaintenanceMutations, useMaintenanceTasks } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';
import type { MaintenanceTask } from '@/types/domain';

const defaultIntervals: Record<string, { km: number; days: number | null }> = {
  'Engine Oil Change': { km: 3000, days: 180 },
  'Chain Tension & Lube': { km: 600, days: 90 },
  'Brake Fluid': { km: 12000, days: 730 },
  'Air Filter': { km: 9000, days: 365 },
  'Spark Plugs': { km: 12000, days: 730 },
  'Coolant': { km: 18000, days: 730 },
  'Tire Pressure Check': { km: 200, days: 14 },
};

function daysToMonthsLabel(days: number): string {
  if (days < 60) return `${days} days`;
  const months = Math.round(days / 30);
  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${rem}m`;
}

function Toast({ message }: { message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: 100,
      left: 20,
      right: 20,
      opacity,
      backgroundColor: Colors.s2,
      borderRadius: radius.md,
      borderLeftWidth: 3,
      borderLeftColor: Colors.green,
      paddingHorizontal: 16,
      paddingVertical: 12,
      zIndex: 200,
    }}>
      <AppText variant="bodyBold" style={{ fontSize: 13 }}>{message}</AppText>
    </Animated.View>
  );
}

export default function BikeProfileScreen() {
  const params = useLocalSearchParams<{ bikeId?: string }>();
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const bike = bikes.data?.find((item) => item.id === params.bikeId);
  const tasks = useMaintenanceTasks(bike?.id);
  const { addMaintenanceTask, updateMaintenanceTask, deleteMaintenanceTask } = useMaintenanceMutations(session?.user.id);
  const { saveBike } = useBikeMutations(session?.user.id);
  const activeBikeId = useAppStore((state) => state.activeBikeId);
  const setActiveBikeId = useAppStore((state) => state.setActiveBikeId);
  const isPrimary = bike?.id === activeBikeId;
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTaskName, setCustomTaskName] = useState('');
  const [customInterval, setCustomInterval] = useState('');
  const [customIntervalMonths, setCustomIntervalMonths] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [showOdometerEdit, setShowOdometerEdit] = useState(false);
  const [odometerInput, setOdometerInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const autoSeededRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmTask, setConfirmTask] = useState<MaintenanceTask | null>(null);
  const [editTask, setEditTask] = useState<MaintenanceTask | null>(null);
  const [editIntervalKm, setEditIntervalKm] = useState('');
  const [editIntervalMonths, setEditIntervalMonths] = useState('');
  const [editCost, setEditCost] = useState('');
  const [menuTask, setMenuTask] = useState<MaintenanceTask | null>(null);

  useEffect(() => {
    if (bike && tasks.data && tasks.data.length === 0 && !autoSeededRef.current) {
      autoSeededRef.current = true;
      const defaults = [
        { task_name: 'Engine Oil Change', interval_km: 3000, interval_days: 180, cost: 500 },
        { task_name: 'Chain Tension & Lube', interval_km: 600, interval_days: 90, cost: 150 },
        { task_name: 'Brake Fluid', interval_km: 12000, interval_days: 730, cost: 300 },
        { task_name: 'Air Filter', interval_km: 9000, interval_days: 365, cost: 400 },
        { task_name: 'Spark Plugs', interval_km: 12000, interval_days: 730, cost: 350 },
        { task_name: 'Coolant', interval_km: 18000, interval_days: 730, cost: 500 },
        { task_name: 'Tire Pressure Check', interval_km: 200, interval_days: 14, cost: 0 },
      ];
      defaults.forEach((tpl) => {
        addMaintenanceTask.mutate({
          bike_id: bike.id,
          task_name: tpl.task_name,
          interval_km: tpl.interval_km,
          interval_days: tpl.interval_days,
          cost: tpl.cost ?? null,
          last_done_odometer_km: bike.current_odometer_km,
          last_done_date: new Date().toISOString().slice(0, 10),
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bike, tasks.data]);

  if (!bike) return null;
  const bikeTitle = bike.nickname?.trim() || `${bike.make} ${bike.model}`;
  const trackedMaintenanceBudget = (tasks.data ?? []).reduce((sum, task) => sum + (task.cost ?? 0), 0);

  const handleLogService = (task: typeof confirmTask) => {
    if (!task || !bike) return;
    updateMaintenanceTask.mutate({
      ...task,
      last_done_odometer_km: bike.current_odometer_km,
      last_done_date: new Date().toISOString().slice(0, 10),
    });
    setConfirmTask(null);
    setToastMessage(`✓ ${task.task_name} logged`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleEditSave = () => {
    if (!editTask || !bike) return;
    const newKm = Number(editIntervalKm) || editTask.interval_km;
    const newMonths = editIntervalMonths.trim();
    const newDays = newMonths ? Math.round(Number(newMonths) * 30) : null;

    updateMaintenanceTask.mutate({
      ...editTask,
      interval_km: newKm,
      interval_days: newDays,
      cost: editCost.trim() ? Number(editCost) : undefined,
    });
    setEditTask(null);
    setEditIntervalKm('');
    setEditIntervalMonths('');
    setEditCost('');
    setToastMessage('✓ Interval updated');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDelete = (taskId: string, taskName: string) => {
    Alert.alert(
      `Delete ${taskName}?`,
      'This will remove the task and its service history.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMaintenanceTask.mutate({ taskId, bikeId: bike.id }) },
      ],
    );
  };

  return (
    <AppScrollScreen>
      <GlassCard style={{ padding: 20, gap: 10 }}>
        <AppText variant="eyebrow">Bike Profile</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>{bikeTitle}</AppText>
        {bike.nickname?.trim() ? (
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {bike.make} {bike.model}
          </AppText>
        ) : null}
        <AppText variant="meta">{bike?.year} · {bike?.engine_cc} cc</AppText>
        <AppText variant="body">Current odometer: {bike?.current_odometer_km.toLocaleString()} km</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Tracked maintenance budget: ~₱{trackedMaintenanceBudget.toLocaleString()}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 0,
            gap: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <Pressable
            onPress={() => {
              setNicknameInput(bike.nickname ?? '');
              setShowNicknameEdit(true);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: radius.pill,
              backgroundColor: Colors.s3,
              borderWidth: 0.5,
              borderColor: Colors.border,
              flexShrink: 0,
            }}>
            <AppText variant="button" style={{ fontSize: 13, color: Colors.t1 }}>Edit Name</AppText>
          </Pressable>
          <Pressable
            onPress={() => {
              setOdometerInput(bike.current_odometer_km.toString());
              setShowOdometerEdit(true);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: radius.pill,
              backgroundColor: Colors.s3,
              borderWidth: 0.5,
              borderColor: Colors.border,
              flexShrink: 0,
            }}>
            <AppText variant="button" style={{ fontSize: 13, color: Colors.t1 }}>Edit Odometer</AppText>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/(app)/garage/achievements/[bikeId]' as any, params: { bikeId: bike.id } })}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 9,
              borderRadius: radius.pill,
              backgroundColor: Colors.s3,
              borderWidth: 0.5,
              borderColor: Colors.border,
              flexShrink: 0,
            }}>
            <AppText variant="button" style={{ fontSize: 13, color: Colors.t1 }}>Achievements</AppText>
          </Pressable>
          {isPrimary ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: radius.pill,
                backgroundColor: Colors.redDim,
                borderWidth: 0.5,
                borderColor: Colors.redBorder,
                flexShrink: 0,
              }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.red }} />
              <AppText variant="button" style={{ fontSize: 12, color: Colors.red }}>Primary Bike</AppText>
            </View>
          ) : (
            <Pressable
              onPress={() => setActiveBikeId(bike.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderRadius: radius.pill,
                backgroundColor: Colors.s3,
                borderWidth: 0.5,
                borderColor: Colors.border,
                flexShrink: 0,
              }}>
              <AppText variant="button" style={{ fontSize: 13, color: Colors.t1 }}>Set as Primary</AppText>
            </Pressable>
          )}
        </ScrollView>
      </GlassCard>

      <SectionHeader title="Maintenance Tracker" />
      <GlassCard style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        {tasks.data?.map((task, index) => {
          const distanceSinceService = bike.current_odometer_km - task.last_done_odometer_km;
          const kmProgress = Math.min(1, distanceSinceService / task.interval_km);

          const lastDone = new Date(task.last_done_date);
          const daysSince = Math.max(0, Math.floor((Date.now() - lastDone.getTime()) / 86_400_000));
          const dateProgress = task.interval_days ? Math.min(1, daysSince / task.interval_days) : 0;
          const hasDateInterval = task.interval_days != null;

          const overallProgress = Math.max(kmProgress, dateProgress);
          const status = overallProgress >= 1 ? 'Overdue' : overallProgress >= 0.8 ? 'Due Soon' : 'OK';
          const statusStyle =
            status === 'OK'
              ? { bg: Colors.greenDim, fg: Colors.green, bar: Colors.green }
              : status === 'Due Soon'
                ? { bg: Colors.amberDim, fg: Colors.amber, bar: Colors.amber }
                : { bg: Colors.redDim, fg: Colors.red, bar: Colors.red };

          const dateCloser = hasDateInterval && dateProgress > kmProgress;

          return (
            <View key={task.id}>
              <Pressable
                onPress={() => setConfirmTask(task)}
                onLongPress={() => setMenuTask(task)}
                style={{ paddingVertical: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="h3">{task.task_name}</AppText>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <AppText variant="meta" style={{ fontSize: 12 }}>Every {task.interval_km.toLocaleString()} km</AppText>
                      {hasDateInterval ? (
                        <AppText variant="meta" style={{ fontSize: 11, color: dateCloser ? '#F39C12' : palette.textTertiary }}>
                          Every {daysToMonthsLabel(task.interval_days!)}
                        </AppText>
                      ) : null}
                      {task.cost != null && task.cost > 0 ? (
                        <AppText variant="meta" style={{ fontSize: 11, color: palette.textTertiary }}>
                          ~₱{task.cost.toLocaleString()} per service
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs }}>
                      <AppText variant="label" style={{ color: statusStyle.fg, letterSpacing: 0.8 }}>{status}</AppText>
                    </View>
                    <Pressable onPress={() => setMenuTask(task)} hitSlop={8} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="dots-vertical" size={16} color={palette.textTertiary} />
                    </Pressable>
                  </View>
                </View>

                {/* Dual-progress bar */}
                <View style={{ height: 3, backgroundColor: palette.surfaceStrong, borderRadius: 2, overflow: 'hidden', marginTop: 6, position: 'relative' }}>
                  {hasDateInterval ? (
                    <View style={{
                      position: 'absolute',
                      left: 0, top: 0, bottom: 0,
                      width: `${Math.min(100, Math.max(0, dateProgress * 100))}%`,
                      backgroundColor: dateProgress > kmProgress ? '#C0392B' : '#F39C12',
                      borderRadius: 2,
                    }} />
                  ) : null}
                  <View style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, Math.max(6, kmProgress * 100))}%`,
                    backgroundColor: Colors.green,
                    borderRadius: 2,
                  }} />
                </View>
              </Pressable>
              {index < (tasks.data?.length ?? 0) - 1 ? <View style={{ height: 0.5, backgroundColor: palette.border }} /> : null}
            </View>
          );
        })}
      </GlassCard>

      <View style={{ paddingTop: 8 }}>
        <Button title="+ Add Custom Task" variant="ghost" onPress={() => setShowCustomForm(true)} />
      </View>

      {/* Log Service Confirmation Modal */}
      <KeyboardSheet
        visible={Boolean(confirmTask)}
        onClose={() => setConfirmTask(null)}
        title="Log Service"
        subtitle={confirmTask?.task_name}>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          This will reset the interval counter to your current odometer: {bike.current_odometer_km.toLocaleString()} km.
        </AppText>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="meta" style={{ color: palette.textTertiary }}>Current odometer</AppText>
            <AppText variant="meta">{bike.current_odometer_km.toLocaleString()} km</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="meta" style={{ color: palette.textTertiary }}>Next due at</AppText>
            <AppText variant="meta">{(bike.current_odometer_km + (confirmTask?.interval_km ?? 0)).toLocaleString()} km</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="meta" style={{ color: palette.textTertiary }}>Date</AppText>
            <AppText variant="meta">{new Date().toISOString().slice(0, 10)}</AppText>
          </View>
        </View>
        <Button
          title="Confirm Service"
          onPress={() => handleLogService(confirmTask)}
          style={{ backgroundColor: Colors.red, borderRadius: 13, minHeight: 48 }}
        />
        <Button title="Cancel" variant="ghost" onPress={() => setConfirmTask(null)} />
      </KeyboardSheet>

      {/* Edit Interval Modal */}
      <KeyboardSheet
        visible={Boolean(editTask)}
        onClose={() => setEditTask(null)}
        title={`Edit ${editTask?.task_name ?? 'Task'}`}>
        <FloatingField
          label="INTERVAL (KM)"
          value={editIntervalKm}
          onChangeText={setEditIntervalKm}
          placeholder={editTask?.interval_km.toString()}
          keyboardType="number-pad"
        />
        <FloatingField
          label="INTERVAL (MONTHS)"
          value={editIntervalMonths}
          onChangeText={setEditIntervalMonths}
          placeholder={editTask?.interval_days ? Math.round(editTask.interval_days / 30).toString() : ''}
          keyboardType="number-pad"
        />
        <FloatingField
          label="COST PER SERVICE (PHP)"
          value={editCost}
          onChangeText={setEditCost}
          placeholder={editTask?.cost?.toString() ?? ''}
          keyboardType="number-pad"
        />
        <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
          Leave blank to track by km only.
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="ghost" onPress={() => setEditTask(null)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Save" onPress={handleEditSave} style={{ backgroundColor: Colors.red, borderRadius: 13, minHeight: 48 }} />
          </View>
        </View>
      </KeyboardSheet>

      <KeyboardSheet
        visible={showNicknameEdit}
        onClose={() => setShowNicknameEdit(false)}
        title="Edit Bike Name">
        <FloatingField
          label="BIKE NAME"
          value={nicknameInput}
          onChangeText={setNicknameInput}
          placeholder={`${bike.make} ${bike.model}`}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="ghost" onPress={() => setShowNicknameEdit(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Save"
              onPress={() => {
                saveBike.mutate({ ...bike, nickname: nicknameInput.trim() || null });
                setShowNicknameEdit(false);
              }}
              style={{ backgroundColor: Colors.red, borderRadius: 13, minHeight: 48 }}
            />
          </View>
        </View>
      </KeyboardSheet>

      <KeyboardSheet
        visible={showOdometerEdit}
        onClose={() => setShowOdometerEdit(false)}
        title="Edit Odometer">
        <FloatingField
          label="CURRENT ODOMETER (KM)"
          value={odometerInput}
          onChangeText={setOdometerInput}
          placeholder={bike.current_odometer_km.toString()}
          keyboardType="number-pad"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="ghost" onPress={() => setShowOdometerEdit(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Save"
              onPress={() => {
                const value = Number(odometerInput);
                if (!isNaN(value) && value > 0) {
                  saveBike.mutate({ ...bike, current_odometer_km: value });
                }
                setShowOdometerEdit(false);
              }}
              style={{ backgroundColor: Colors.red, borderRadius: 13, minHeight: 48 }}
            />
          </View>
        </View>
      </KeyboardSheet>

      <KeyboardSheet
        visible={showCustomForm}
        onClose={() => setShowCustomForm(false)}
        title="Add Custom Task">
        <FloatingField label="TASK NAME" value={customTaskName} onChangeText={setCustomTaskName} placeholder="Brake Pads" />
        <FloatingField label="INTERVAL (KM)" value={customInterval} onChangeText={setCustomInterval} placeholder="8000" keyboardType="number-pad" />
        <FloatingField label="INTERVAL (MONTHS)" value={customIntervalMonths} onChangeText={setCustomIntervalMonths} placeholder="6" keyboardType="number-pad" />
        <FloatingField label="COST (PHP)" value={customCost} onChangeText={setCustomCost} placeholder="500" keyboardType="number-pad" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => {
                setShowCustomForm(false);
                setCustomTaskName('');
                setCustomInterval('');
                setCustomIntervalMonths('');
                setCustomCost('');
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Save Task"
              onPress={() => {
                if (!customTaskName || !customInterval) return;
                const months = Number(customIntervalMonths);
                addMaintenanceTask.mutate({
                  bike_id: bike.id,
                  task_name: customTaskName,
                  interval_km: Number(customInterval),
                  interval_days: customIntervalMonths.trim() ? months * 30 : null,
                  cost: customCost.trim() ? Number(customCost) : undefined,
                  last_done_odometer_km: bike.current_odometer_km,
                  last_done_date: new Date().toISOString().slice(0, 10),
                });
                setShowCustomForm(false);
                setCustomTaskName('');
                setCustomInterval('');
                setCustomIntervalMonths('');
                setCustomCost('');
              }}
              style={{ backgroundColor: Colors.red, borderRadius: 13, minHeight: 48 }}
            />
          </View>
        </View>
      </KeyboardSheet>

      {/* Context Menu Modal */}
      <Modal visible={Boolean(menuTask)} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setMenuTask(null)}>
          <Pressable onPress={() => undefined}>
            <View style={{ backgroundColor: Colors.s2, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: palette.surfaceStrong, alignSelf: 'center' }} />
              <AppText variant="bodyBold" style={{ textAlign: 'center', paddingBottom: 8 }}>{menuTask?.task_name}</AppText>

              <Pressable
                onPress={() => {
                  const t = menuTask;
                  setMenuTask(null);
                  if (t) { setEditTask(t); setEditIntervalKm(t.interval_km.toString()); setEditIntervalMonths(t.interval_days ? Math.round(t.interval_days / 30).toString() : ''); setEditCost(t.cost?.toString() ?? ''); }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 }}>
                <Ionicons name="pencil-outline" size={20} color={palette.textSecondary} />
                <AppText variant="body">Edit Interval</AppText>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = menuTask;
                  const def = t ? defaultIntervals[t.task_name] : undefined;
                  if (t && def) {
                    setMenuTask(null);
                    updateMaintenanceTask.mutate({ ...t, interval_km: def.km, interval_days: def.days });
                    setToastMessage('✓ Reset to default');
                    setTimeout(() => setToastMessage(null), 2500);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 }}>
                <Ionicons name="refresh-outline" size={20} color={palette.textSecondary} />
                <AppText variant="body">Reset to Default</AppText>
              </Pressable>

              <Pressable
                onPress={() => {
                  const t = menuTask;
                  setMenuTask(null);
                  if (t) handleDelete(t.id, t.task_name);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8 }}>
                <Ionicons name="trash-outline" size={20} color={palette.danger} />
                <AppText variant="body" style={{ color: palette.danger }}>Delete Task</AppText>
              </Pressable>

              <Button title="Cancel" variant="ghost" onPress={() => setMenuTask(null)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {toastMessage ? <Toast message={toastMessage} /> : null}
    </AppScrollScreen>
  );
}
