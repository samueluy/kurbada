import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen, AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useEmergencyMutations } from '@/hooks/use-kurbada-data';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
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
  const { saveEmergencyInfo } = useEmergencyMutations(session?.user.id);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const [form, setForm] = useState({
    ...emptyEmergencyInfo,
    full_name: onboardingData.fullName,
    blood_type: onboardingData.bloodType,
    allergies: onboardingData.allergies,
    conditions: onboardingData.conditions,
    contact1_name: onboardingData.emergencyContactName,
    contact1_phone: onboardingData.emergencyContactPhone,
  });
  const isOnboarding = params.flow === 'onboarding';
  const onboardingScrollRef = useRef<ScrollView>(null);
  const phoneFieldYRef = useRef<number>(0);

  const qrValue = useMemo(
    () => `EMERGENCY INFO\nName: ${form.full_name}\nBlood: ${form.blood_type}\nContact: ${form.contact1_name} (${form.contact1_phone})`,
    [form],
  );

  const handleContinue = async (skip = false) => {
    if (!skip) {
      setOnboardingData({ fullName: form.full_name, bloodType: form.blood_type, emergencyContactName: form.contact1_name, emergencyContactPhone: form.contact1_phone, allergies: form.allergies, conditions: form.conditions });
      if (session?.user.id) {
        await saveEmergencyInfo.mutateAsync({ ...form, id: form.id || '' });
      }
    }
    if (isOnboarding) {
      setOnboardingStep(5);
      router.push(getOnboardingRoute(5) as any);
    }
  };

  const handlePhoneFieldLayout = useCallback((event: LayoutChangeEvent) => {
    phoneFieldYRef.current = event.nativeEvent.layout.y;
  }, []);

  const handlePhoneFieldFocus = useCallback(() => {
    // Scroll the field toward the top of the visible area so the keyboard doesn't hide it
    const targetY = Math.max(phoneFieldYRef.current - 80, 0);
    onboardingScrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, []);

  const renderContent = (forOnboarding: boolean) => (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {forOnboarding ? (
          <Pressable onPress={() => { setOnboardingStep(3); router.replace(getOnboardingRoute(3) as any); }}>
            <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
          </Pressable>
        ) : null}
        <AppText variant="label" style={{ color: palette.textSecondary }}>Step 4 of {ONBOARDING_TOTAL_STEPS}</AppText>
      </View>

      <View style={{ alignItems: 'center', gap: 16 }}>
        {forOnboarding ? (
          <>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(198,69,55,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={40} color={palette.danger} />
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <AppText variant="screenTitle" style={{ fontSize: 30, textAlign: 'center' }}>Ride with peace of mind.</AppText>
              <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>Generate your Emergency QR lockscreen.</AppText>
            </View>
          </>
        ) : (
          <>
            <AppText variant="screenTitle" style={{ fontSize: 30 }}>Emergency Info</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>Store rider details and generate a QR wallpaper for your lock screen.</AppText>
          </>
        )}
      </View>

      <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: radius.lg, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(198,69,55,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <AppText variant="label" style={{ color: palette.danger, fontSize: 11 }}>CRASH SAFETY</AppText>
            </View>
            <AppText variant="bodyBold">Your QR is ready</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>Fill details so bystanders can help.</AppText>
          </View>
          <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            {form.full_name || form.contact1_phone ? <QRCode value={qrValue} size={68} /> : <Ionicons name="qr-code-outline" size={36} color={palette.textTertiary} />}
          </View>
        </View>
      </View>

      <FloatingField label="Full Name" value={form.full_name} onChangeText={(value) => setForm({ ...form, full_name: value })} placeholder="Juan dela Cruz" />
      <FloatingField label="Emergency Contact Name" value={form.contact1_name} onChangeText={(value) => setForm({ ...form, contact1_name: value })} placeholder="Mark dela Cruz" />

      <View style={{ gap: 8 }}>
        <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Blood Type</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {bloodTypes.map((bloodType) => (
            <Pressable key={bloodType} onPress={() => setForm({ ...form, blood_type: bloodType })} style={{ borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: form.blood_type === bloodType ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)' }}>
              <AppText variant="button" style={{ color: form.blood_type === bloodType ? palette.text : palette.textSecondary, fontSize: 13 }}>{bloodType}</AppText>
            </Pressable>
          ))}
          <Pressable onPress={() => setForm({ ...form, blood_type: 'O+' as EmergencyBloodType })} style={{ borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <AppText variant="button" style={{ color: palette.textTertiary, fontSize: 12 }}>I don&apos;t know</AppText>
          </Pressable>
        </View>
      </View>

      <View onLayout={forOnboarding ? handlePhoneFieldLayout : undefined}>
        <FloatingField
          label="Emergency Contact Number"
          value={form.contact1_phone}
          onChangeText={(value) => setForm({ ...form, contact1_phone: value })}
          placeholder="+63917..."
          keyboardType="phone-pad"
          onFocus={forOnboarding ? handlePhoneFieldFocus : undefined}
        />
      </View>

      <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 12 }}>This is stored privately and only encoded in your QR code.</AppText>
    </>
  );

  if (isOnboarding) {
    return (
      <AppScreen style={{ padding: 0 }} showWordmark={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
          <GlassCard style={{ flex: 1, borderRadius: 0, padding: 22, gap: 18 }}>
            <ScrollView
              ref={onboardingScrollRef}
              contentContainerStyle={{ gap: 18, paddingBottom: 140 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {renderContent(true)}
            </ScrollView>
            <View style={{ gap: 10 }}>
              <Button title="Generate My Safety ID" onPress={() => handleContinue(false)} />
              <Button title="Skip, I'll do this later" variant="ghost" onPress={() => handleContinue(true)} />
            </View>
          </GlassCard>
        </KeyboardAvoidingView>
      </AppScreen>
    );
  }

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
      <GlassCard style={{ gap: 18, padding: 22 }}>
        {renderContent(false)}
        <Button title="Generate My Safety ID" onPress={() => handleContinue(false)} />
        <Button title="Skip, I'll do this later" variant="ghost" onPress={() => handleContinue(true)} />
      </GlassCard>
    </AppScrollScreen>
  );
}
