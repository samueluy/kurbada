import { Link, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';

export default function AuthConfirmedScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isPending = params.mode === 'pending';

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            {isPending ? 'Check your email' : 'Email confirmed'}
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {isPending
              ? 'We sent a verification link to your inbox. Confirm your email, then sign in to continue syncing your Garage and emergency card.'
              : 'Your Kurbada account is verified. Head back in and sign in to continue your setup.'}
          </AppText>
        </View>

        <Link href="/(public)/auth/sign-in" asChild>
          <Button title={isPending ? 'Back to Sign In' : 'Go to Sign In'} />
        </Link>
      </GlassCard>
    </AppScrollScreen>
  );
}
