import { Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';

export function CrashAlertModal({
  visible,
  countdown,
  onDismiss,
  onHelp,
}: {
  visible: boolean;
  countdown: number;
  onDismiss: () => void;
  onHelp: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 }}>
        <GlassCard style={{ gap: 16, padding: 24 }}>
          <AppText variant="label" style={{ color: palette.danger }}>Crash safety</AppText>
          <AppText variant="screenTitle" style={{ fontSize: 28 }}>
            Crash Detected
          </AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>
            We felt a high-G impact. If you do nothing, Kurbada will start the help flow in {countdown}s.
          </AppText>
          <View style={{ gap: 12 }}>
            <Button title="I'm OK" variant="secondary" onPress={onDismiss} />
            <Button title="Get Help" onPress={onHelp} style={{ backgroundColor: palette.danger }} />
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}
