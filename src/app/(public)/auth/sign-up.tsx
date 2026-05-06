import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';

function Field({ value, onChangeText, placeholder, secureTextEntry = false }: { value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textTertiary}
      secureTextEntry={secureTextEntry}
      style={{
        minHeight: 52,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: 16,
        backgroundColor: palette.surface,
      }}
    />
  );
}

export default function SignUpScreen() {
  const { session, signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (env.devBypassAppGate) {
    return <Redirect href="/(app)/(tabs)/ride" />;
  }

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>Create account</AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Start with your rider identity, then finish bike setup in the next step.
          </AppText>
        </View>

        <Field value={displayName} onChangeText={setDisplayName} placeholder="Display name" />
        <Field value={email} onChangeText={setEmail} placeholder="Email" />
        <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

        <Button
          title={busy ? 'Creating...' : 'Create Account'}
          disabled={busy}
          onPress={async () => {
            try {
              setBusy(true);
              await signUp(email.trim(), password, displayName.trim());
              router.replace('/(public)/bike-setup');
            } catch (error) {
              Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        />
        <Link href="/(public)/auth/sign-in" asChild>
          <Button title="Back to Sign In" variant="secondary" />
        </Link>
      </GlassCard>
    </AppScrollScreen>
  );
}
