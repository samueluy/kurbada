import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { claimPendingReferralForUser } from '@/lib/referrals';
import { isSupabaseConfigured, supabase, type SupabaseSession } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<SupabaseSession>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);

      if (nextSession?.user?.id) {
        void claimPendingReferralForUser(
          nextSession.user.id,
          (nextSession.user.user_metadata?.display_name as string | undefined) ?? nextSession.user.email ?? undefined,
        );
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase environment variables are not configured.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!supabase) {
      throw new Error('Supabase environment variables are not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: Linking.createURL('/auth/confirmed'),
      },
    });
    if (error) {
      throw error;
    }

    if (!data.session) {
      return { requiresEmailVerification: true };
    }

    return { requiresEmailVerification: false };
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  return { session, loading, signIn, signUp, signOut };
}
