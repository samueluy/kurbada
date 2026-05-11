import { Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';

/**
 * Crash alert modal — surfaces a cancellable countdown before dialing 911.
 * Apple App Review requires:
 *   - Clear indication that contact is with public emergency services
 *   - Cancellable (we show a big "I'm OK" button)
 *   - Disclosure that detection may be imperfect (copy below)
 *   - No claim of guaranteed detection
 */
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
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 }}>
        <GlassCard style={{ gap: 16, padding: 24, borderWidth: 1, borderColor: palette.danger }}>
          <AppText variant="label" style={{ color: palette.danger }}>POSSIBLE CRASH DETECTED</AppText>
          <AppText variant="screenTitle" style={{ fontSize: 28 }}>
            Calling 911 in {Math.max(countdown, 0)}s
          </AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>
            We felt a high-G impact. Kurbada will dial public emergency services (911 in the Philippines) when the countdown ends.
          </AppText>
          <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11, lineHeight: 16 }}>
            Crash detection uses your phone&apos;s motion sensors and may not detect every crash or may trigger falsely. If you&apos;re OK, tap &quot;I&apos;m OK&quot; now.
          </AppText>
          <View style={{ gap: 12 }}>
            <Button
              title="I'M OK — CANCEL"
              onPress={onDismiss}
              style={{ backgroundColor: palette.success, minHeight: 56 }}
            />
            <Button title="Call 911 Now" variant="secondary" onPress={onHelp} />
          </View>
        </GlassCard>
      </View>
    </Modal>
  );
}
