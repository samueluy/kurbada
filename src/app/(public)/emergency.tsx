import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useEmergencyInfo, useEmergencyMutations } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';
import type { EmergencyBloodType } from '@/types/domain';

const bloodTypes: (EmergencyBloodType)[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const emptyEmergencyInfo = {
  id: '',
  full_name: '',
  blood_type: 'O+' as EmergencyBloodType,
  allergies: '',
  conditions: '',
  contact1_name: '',
  contact1_phone: '',
  contact2_name: '',
  contact2_phone: '',
};

export default function OnboardingEmergencyScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const { session } = useAuth();
  const emergency = useEmergencyInfo(session?.user.id);
  const { saveEmergencyInfo } = useEmergencyMutations(session?.user.id);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const [form, setForm] = useState(emergency.data ?? emptyEmergencyInfo);
  const isOnboarding = params.flow === 'onboarding';

  useEffect(() => {
    if (emergency.data) setForm(emergency.data);
  }, [emergency.data]);

  useEffect(() => {
    if (onboardingData.fullName) {
      setForm((prev) => ({ ...prev, full_name: onboardingData.fullName }));
    }
    if (onboardingData.emergencyContactName) {
      setForm((prev) => ({ ...prev, contact1_name: onboardingData.emergencyContactName }));
    }
    if (onboardingData.emergencyContactPhone) {
      setForm((prev) => ({ ...prev, contact1_phone: onboardingData.emergencyContactPhone }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qrValue = useMemo(
    () => JSON.stringify({
      name: form.full_name,
      blood: form.blood_type,
      contact: form.contact1_name,
      phone: form.contact1_phone,
    }),
    [form],
  );

  const handleContinue = async (skip = false) => {
    if (!skip) {
      setOnboardingData({
        fullName: form.full_name,
        bloodType: form.blood_type,
        emergencyContactName: form.contact1_name,
        emergencyContactPhone: form.contact1_phone,
        allergies: form.allergies,
        conditions: form.conditions,
      });

      if (session?.user.id) {
        await saveEmergencyInfo.mutateAsync({ ...form, id: form.id || '' });
      }
    }

    if (isOnboarding) {
      setOnboardingStep(5);
      router.replace('/(public)/features' as any);
    }
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          {isOnboarding ? (
            <>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(198,69,55,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={40} color={palette.danger} />
              </View>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <AppText variant="label" style={{ color: palette.textSecondary }}>
                  Step 4 of 8
                </AppText>
                <AppText variant="screenTitle" style={{ fontSize: 30, textAlign: 'center' }}>
                  Ride with peace of mind.
                </AppText>
                <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>
                  Generate your Emergency QR lockscreen.
                </AppText>
              </View>
            </>
          ) : (
            <>
              <AppText variant="screenTitle" style={{ fontSize: 30 }}>Emergency Info</AppText>
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                Store rider details and generate a QR wallpaper for your lock screen.
              </AppText>
            </>
          )}
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: radius.lg, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(198,69,55,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                <AppText variant="label" style={{ color: palette.danger, fontSize: 11 }}>
                  CRASH SAFETY
                </AppText>
              </View>
              <AppText variant="bodyBold">Your QR is ready</AppText>
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                Fill details so bystanders can help.
              </AppText>
            </View>
            <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              {form.full_name || form.contact1_phone ? (
                <QRCode value={qrValue} size={68} />
              ) : (
                <Ionicons name="qr-code-outline" size={36} color={palette.textTertiary} />
              )}
            </View>
          </View>
        </View>

        <FloatingField label="Full Name" value={form.full_name} onChangeText={(value) => setForm({ ...form, full_name: value })} placeholder="Juan dela Cruz" />
        <FloatingField
          label="Emergency Contact Name"
          value={form.contact1_name}
          onChangeText={(value) => setForm({ ...form, contact1_name: value })}
          placeholder="Mark dela Cruz"
        />

        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Blood Type</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {bloodTypes.map((bloodType) => (
              <Pressable
                key={bloodType}
                onPress={() => setForm({ ...form, blood_type: bloodType })}
                style={{
                  borderRadius: radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: form.blood_type === bloodType ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                }}>
                <AppText variant="button" style={{ color: form.blood_type === bloodType ? palette.text : palette.textSecondary, fontSize: 13 }}>
                  {bloodType}
                </AppText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setForm({ ...form, blood_type: 'O+' as EmergencyBloodType })}
              style={{ borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <AppText variant="button" style={{ color: palette.textTertiary, fontSize: 12 }}>
                I don&apos;t know
              </AppText>
            </Pressable>
          </View>
        </View>

        <FloatingField
          label="Emergency Contact Number"
          value={form.contact1_phone}
          onChangeText={(value) => setForm({ ...form, contact1_phone: value })}
          placeholder="+63917..."
          keyboardType="phone-pad"
        />

        <FloatingField
          label="Allergies (Optional)"
          value={form.allergies}
          onChangeText={(value) => setForm({ ...form, allergies: value })}
          placeholder="Penicillin"
        />

        <FloatingField
          label="Conditions (Optional)"
          value={form.conditions}
          onChangeText={(value) => setForm({ ...form, conditions: value })}
          placeholder="Asthma"
        />

        <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 12 }}>
          This is stored privately and only encoded in your QR code.
        </AppText>

        {isOnboarding ? (
          <>
            <Button title="Generate My Safety ID" onPress={() => handleContinue(false)} />
            <Button title="Skip, I'll do this later" variant="ghost" onPress={() => handleContinue(true)} />
          </>
        ) : (
          <>
            <Button title="Save Emergency Info" onPress={() => handleContinue(false)} />
          </>
        )}
      </GlassCard>
    </AppScrollScreen>
  );
}
