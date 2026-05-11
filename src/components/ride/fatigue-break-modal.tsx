import { Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';

/**
 * Fatigue break nudge — shown after 3+ hours of continuous riding.
 * Single-fire per ride. Apple likes safety reminders; this one is explicit about
 * not being medical advice.
 */
export function FatigueBreakModal({
  visible,
  onDismiss,
  onEnd,
}: {
  visible: boolean;
  onDismiss: () => void;
  onEnd: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 }}>
        <GlassCard style={{ gap: 14, padding: 24 }}>
          <AppText variant="label" style={{ color: palette.lime, letterSpacing: 1.2 }}>
            RIDE SAFE
          </AppText>
          <AppText variant="screenTitle" style={{ fontSize: 24 }}>
            Time for a break?
          </AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>
            You have been riding for over 3 hours. Fatigue slows reaction time and increases crash risk. Stretch, rehydrate, and grab some food.
          </AppText>
          <View style={{ gap: 10 }}>
            <Button title="Got it — keep riding" variant="secondary" onPress={onDismiss} />
            <Button title="End ride now" onPress={onEnd} style={{ backgroundColor: palette.danger }} />
          </View>
          <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11, textAlign: 'center' }}>
            This is a safety reminder, not medical advice.
          </AppText>
        </GlassCard>
      </View>
    </Modal>
  );
}
