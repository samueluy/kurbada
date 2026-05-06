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
    <GlassCard style={{ padding: 18, gap: 16, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(198,69,55,0.14)' }}>
            <AppText variant="label" style={{ color: palette.danger }}>Emergency QR</AppText>
          </View>
          <AppText variant="sectionTitle" style={{ fontSize: 22 }}>Serious when you need it.</AppText>
          <AppText variant="meta">
            {emergency?.full_name
              ? 'Keep your rider info ready on your lock screen for emergency response.'
              : 'Set up private rider details so bystanders can help faster after an accident.'}
          </AppText>
        </View>
        <View style={{ width: 84, height: 84, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
          {emergency?.full_name ? (
            <QRCode value={JSON.stringify(emergency)} size={64} />
          ) : (
            <ShieldAlert size={26} color={palette.textSecondary} />
          )}
        </View>
      </View>
      <Button title="Set Up Emergency Info" variant="secondary" onPress={onPress} />
    </GlassCard>
  );
}
