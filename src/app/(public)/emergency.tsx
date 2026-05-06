import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useEmergencyInfo, useEmergencyMutations } from '@/hooks/use-kurbada-data';

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const emptyEmergencyInfo = {
  id: '',
  full_name: '',
  blood_type: 'O+' as const,
  allergies: '',
  conditions: '',
  contact1_name: '',
  contact1_phone: '',
  contact2_name: '',
  contact2_phone: '',
};

export default function OnboardingEmergencyScreen() {
  const { session } = useAuth();
  const emergency = useEmergencyInfo(session?.user.id);
  const { saveEmergencyInfo } = useEmergencyMutations(session?.user.id);
  const [form, setForm] = useState(emergency.data ?? emptyEmergencyInfo);

  useEffect(() => {
    if (emergency.data) {
      setForm(emergency.data);
    }
  }, [emergency.data]);

  const qrValue = useMemo(
    () =>
      JSON.stringify({
        name: form.full_name,
        blood: form.blood_type,
        allergies: form.allergies,
        conditions: form.conditions,
        contact1: { name: form.contact1_name, phone: form.contact1_phone },
        contact2: { name: form.contact2_name, phone: form.contact2_phone },
      }),
    [form],
  );

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        <ProgressDots total={6} current={4} />
        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary }}>
            Step 5 of 6 — Your safety
          </AppText>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            Emergency Info
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Add the details you want encoded into your QR lockscreen so bystanders can help fast in an emergency.
          </AppText>
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: radius.lg, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(198,69,55,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText variant="label" style={{ color: palette.danger }}>
                  CRASH SAFETY
                </AppText>
              </View>
              <AppText variant="bodyBold">
                Your QR is ready
              </AppText>
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                Fill details so bystanders can help.
              </AppText>
            </View>
            <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              {form.full_name || form.contact1_phone ? <QRCode value={qrValue} size={68} /> : <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' }} />}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {bloodTypes.map((bloodType) => (
            <Pressable
              key={bloodType}
              onPress={() => setForm({ ...form, blood_type: bloodType })}
              style={{
                borderRadius: radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 8,
                backgroundColor: form.blood_type === bloodType ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
              }}>
              <AppText variant="button" style={{ color: form.blood_type === bloodType ? palette.text : palette.textSecondary, fontSize: 13 }}>
                {bloodType}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <FloatingField label="Contact Name" value={form.contact1_name} onChangeText={(value) => setForm({ ...form, contact1_name: value })} containerStyle={{ flex: 1 }} />
          <FloatingField label="Contact Phone" value={form.contact1_phone} onChangeText={(value) => setForm({ ...form, contact1_phone: value })} keyboardType="phone-pad" containerStyle={{ flex: 1 }} />
        </View>
        <FloatingField label="Allergies" value={form.allergies} onChangeText={(value) => setForm({ ...form, allergies: value })} />
        <FloatingField label="Medical Conditions" value={form.conditions} onChangeText={(value) => setForm({ ...form, conditions: value })} />
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          This is stored privately and only encoded in your QR code.
        </AppText>

        <Button
          title="Save & Continue →"
          onPress={async () => {
            await saveEmergencyInfo.mutateAsync({ ...form, id: form.id || '' });
            router.replace('/(public)/paywall');
          }}
        />
        <Button title="Skip" variant="ghost" onPress={() => router.replace('/(public)/paywall')} />
      </GlassCard>
    </AppScrollScreen>
  );
}
