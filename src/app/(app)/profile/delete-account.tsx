import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius, typography } from '@/constants/theme';
import { requestAccountDeletion } from '@/lib/account';
import { queryClient } from '@/lib/query-client';
import { useAppStore } from '@/store/app-store';

export default function DeleteAccountScreen() {
  const resetForSignOut = useAppStore((state) => state.resetForSignOut);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const canDelete = confirmation.trim().toUpperCase() === 'DELETE';

  const handleDelete = () => {
    if (!canDelete || busy) return;
    Alert.alert(
      'Delete account?',
      'This permanently erases your rider profile, bikes, rides, fuel logs, and emergency info. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await requestAccountDeletion();
              resetForSignOut();
              queryClient.clear();
              router.replace('/(public)/auth/sign-in');
            } catch (error) {
              Alert.alert(
                'Could not delete account',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
      <GlassCard
        style={{ gap: 18, padding: 22, borderColor: palette.danger, borderWidth: 0.5 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="eyebrow" style={{ color: palette.danger }}>
            DANGER ZONE
          </AppText>
          <AppText variant="screenTitle" style={{ fontSize: 26 }}>
            Delete account
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary, lineHeight: 20 }}>
            This permanently removes your rider profile, every bike, every ride, every fuel log, your
            emergency info, and any referrals or lobby posts you created. Active subscriptions must be
            cancelled separately on the App Store or Google Play.
          </AppText>
        </View>
        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textTertiary }}>
            Type DELETE to confirm
          </AppText>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="DELETE"
            placeholderTextColor={palette.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            selectionColor={palette.danger}
            style={{
              minHeight: 52,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: canDelete ? palette.danger : palette.border,
              paddingHorizontal: 16,
              backgroundColor: palette.surface,
              color: palette.text,
              fontFamily: typography.body,
              fontSize: 15,
              letterSpacing: 2,
            }}
          />
        </View>
        <Button
          title={busy ? 'Deleting…' : 'Delete my account'}
          disabled={!canDelete || busy}
          onPress={handleDelete}
          style={{
            backgroundColor: canDelete ? palette.danger : palette.surfaceStrong,
            borderRadius: radius.pill,
            minHeight: 52,
          }}
        />
        <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
      </GlassCard>
    </AppScrollScreen>
  );
}
