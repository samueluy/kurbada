import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useEmergencyInfo, useEmergencyMutations } from '@/hooks/use-kurbada-data';

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

export default function EmergencyScreen() {
  const { session } = useAuth();
  const emergency = useEmergencyInfo(session?.user.id);
  const { saveEmergencyInfo } = useEmergencyMutations(session?.user.id);
  const shotRef = useRef<any>(null);

  const [form, setForm] = useState(emergency.data ?? emptyEmergencyInfo);

  useEffect(() => {
    if (emergency.data) {
      setForm(emergency.data);
    }
  }, [emergency.data]);

  return (
    <AppScrollScreen>
      <GlassCard style={{ gap: 12, padding: 20 }}>
        <AppText variant="screenTitle" style={{ fontSize: 30 }}>Emergency Info</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Store rider details and generate a QR wallpaper for your lock screen.
        </AppText>
        <FloatingField label="Full Name" value={form.full_name} onChangeText={(value) => setForm({ ...form, full_name: value })} placeholder="Samuel Uy" />
        <FloatingField label="Blood Type" value={form.blood_type} onChangeText={(value) => setForm({ ...form, blood_type: value as typeof form.blood_type })} placeholder="O+" />
        <FloatingField label="Allergies" value={form.allergies} onChangeText={(value) => setForm({ ...form, allergies: value })} placeholder="None reported" />
        <FloatingField label="Medical Conditions" value={form.conditions} onChangeText={(value) => setForm({ ...form, conditions: value })} placeholder="None reported" />
        <FloatingField label="Emergency Contact 1 Name" value={form.contact1_name} onChangeText={(value) => setForm({ ...form, contact1_name: value })} placeholder="Emergency Contact" />
        <FloatingField label="Emergency Contact 1 Phone" value={form.contact1_phone} onChangeText={(value) => setForm({ ...form, contact1_phone: value })} placeholder="+63917..." keyboardType="phone-pad" />
        <FloatingField label="Emergency Contact 2 Name" value={form.contact2_name} onChangeText={(value) => setForm({ ...form, contact2_name: value })} placeholder="Secondary Contact" />
        <FloatingField label="Emergency Contact 2 Phone" value={form.contact2_phone} onChangeText={(value) => setForm({ ...form, contact2_phone: value })} placeholder="+63918..." keyboardType="phone-pad" />
        <Button
          title="Save Emergency Info"
          onPress={() => saveEmergencyInfo.mutate({ ...form, id: form.id || '' })}
        />
      </GlassCard>

      <GlassCard style={{ gap: 12, padding: 20 }}>
        <AppText variant="bodyBold">Generate QR Wallpaper</AppText>
        <AppText variant="meta">Crash detection in MVP works while an active ride is open in the foreground.</AppText>
        <ViewShot ref={shotRef} options={{ result: 'tmpfile', quality: 1, width: 1080, height: 1920, format: 'png' }}>
          <View style={{ width: '100%', minHeight: 420, backgroundColor: '#111', borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 }}>
            <QRCode
              value={`EMERGENCY INFO\nName: ${form.full_name}\nBlood: ${form.blood_type}\nAllergies: ${form.allergies || 'None'}\nConditions: ${form.conditions || 'None'}\nContact 1: ${form.contact1_name} (${form.contact1_phone})\nContact 2: ${form.contact2_name || 'None'} (${form.contact2_phone || 'None'})`}
              size={180}
            />
            <AppText variant="screenTitle" style={{ color: '#fff', fontSize: 28 }}>{form.full_name}</AppText>
            <AppText variant="meta" style={{ color: '#fff', textAlign: 'center' }}>
              Emergency QR for Kurbada riders. Save to Photos, then set it manually as your lock screen wallpaper.
            </AppText>
          </View>
        </ViewShot>
        <Button
          title="Generate QR Wallpaper"
          onPress={async () => {
            try {
              const permission = await MediaLibrary.requestPermissionsAsync();
              if (!permission.granted) {
                throw new Error('Media library permission is required.');
              }

              const uri = await shotRef.current?.capture?.();
              if (!uri) {
                throw new Error('Could not capture the wallpaper.');
              }

              await MediaLibrary.saveToLibraryAsync(uri);
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
              }
            } catch (error) {
              Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
            }
          }}
        />
      </GlassCard>
    </AppScrollScreen>
  );
}
