import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius, typography } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';

function Field({ value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences' }: { value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; keyboardType?: TextInput['props']['keyboardType']; autoCapitalize?: TextInput['props']['autoCapitalize'] }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textTertiary}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      textContentType={secureTextEntry ? 'password' : keyboardType === 'email-address' ? 'emailAddress' : undefined}
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
  );
}

export default function SignInScreen() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22, overflow: 'visible' }}>
        <View style={{ gap: 6 }}>
          <AppText variant="brand" style={{ fontSize: 34, letterSpacing: 5 }}>
            KURBADA
          </AppText>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>Sign in</AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Access your rides, garage, and emergency info.
          </AppText>
        </View>

        {!isSupabaseConfigured ? (
          <AppText variant="meta" style={{ color: palette.danger }}>
            Supabase env vars are not configured yet. Add them to `.env` before using email auth.
          </AppText>
        ) : null}

        <Field value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />
        <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        <Button
          title={busy ? 'Signing in...' : 'Sign In'}
          disabled={busy}
          onPress={async () => {
            try {
              setBusy(true);
              await signIn(email.trim(), password);
            } catch (error) {
              Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          title="Forgot password?"
          variant="ghost"
          onPress={() => router.push('/(public)/auth/forgot-password' as any)}
        />
        <Link href="/(public)/auth/sign-up" asChild>
          <Button title="Create Account" variant="secondary" />
        </Link>
      </GlassCard>
    </AppScrollScreen>
  );
}
