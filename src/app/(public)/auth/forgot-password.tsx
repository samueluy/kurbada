import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) {
      Alert.alert('Not available', 'Auth is not configured in this build.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setSent(true);
    } catch (error) {
      Alert.alert(
        'Could not send reset email',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="screenTitle" style={{ fontSize: 28 }}>
            Reset password
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Enter your email and we&apos;ll send a password reset link.
          </AppText>
        </View>
        {sent ? (
          <AppText variant="meta" style={{ color: palette.success }}>
            Check your inbox for the reset link. You can close this screen.
          </AppText>
        ) : (
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={palette.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={palette.danger}
            style={{
              minHeight: 52,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              paddingHorizontal: 16,
              backgroundColor: palette.surface,
              color: palette.text,
              fontFamily: typography.body,
              fontSize: 15,
            }}
          />
        )}
        <Button
          title={busy ? 'Sending…' : sent ? 'Back to Sign In' : 'Send reset link'}
          disabled={busy}
          onPress={sent ? () => router.replace('/(public)/auth/sign-in') : handleSubmit}
        />
        {!sent ? <Button title="Back to Sign In" variant="ghost" onPress={() => router.back()} /> : null}
      </GlassCard>
    </AppScrollScreen>
  );
}
