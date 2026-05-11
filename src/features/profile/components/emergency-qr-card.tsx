import QRCode from 'react-native-qrcode-svg';
import { ShieldAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';
import type { EmergencyInfo } from '@/types/domain';

export function EmergencyQRCard({
  emergency,
  onPress,
}: {
  emergency?: EmergencyInfo;
  onPress?: () => void;
}) {
  return (
    <GlassCard style={{ padding: 18, gap: 16, borderWidth: 0.5, borderColor: palette.danger }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: palette.danger }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: 'rgba(192,57,43,0.15)' }}>
            <AppText variant="label" style={{ color: palette.danger, letterSpacing: 0.8 }}>Emergency QR</AppText>
          </View>
          <AppText variant="h1" numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 18 }}>Serious when you need it.</AppText>
          <AppText variant="meta" numberOfLines={3} ellipsizeMode="tail" style={{ color: palette.textTertiary }}>
            {emergency?.full_name
              ? 'Keep your rider info ready on your lock screen for emergency response.'
              : 'Set up private rider details so bystanders can help faster after an accident.'}
          </AppText>
        </View>
        <View style={{ width: 60, height: 60, borderRadius: radius.sm, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {emergency?.full_name ? (
            <QRCode
              value={`EMERGENCY INFO\nName: ${emergency.full_name}\nBlood: ${emergency.blood_type}\nAllergies: ${emergency.allergies || 'None'}\nConditions: ${emergency.conditions || 'None'}\nContact 1: ${emergency.contact1_name} (${emergency.contact1_phone})\nContact 2: ${emergency.contact2_name || 'None'} (${emergency.contact2_phone || 'None'})`}
              size={46}
            />
          ) : (
            <ShieldAlert size={20} color={palette.textSecondary} />
          )}
        </View>
      </View>
      <Button title={emergency?.full_name ? 'Update Emergency Info' : 'Set Up Emergency Info'} variant="secondary" onPress={onPress} />
    </GlassCard>
  );
}
