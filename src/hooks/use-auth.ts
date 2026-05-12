import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { claimPendingReferralForUser } from '@/lib/referrals';
import { queryClient } from '@/lib/query-client';
import { isSupabaseConfigured, supabase, type SupabaseSession } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';

export type AuthBootstrapPhase = 'booting' | 'interactive' | 'degraded' | 'error';

type AuthContextValue = {
  session: SupabaseSession;
  loading: boolean;
  signingOut: boolean;
  bootstrapPhase: AuthBootstrapPhase;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ requiresEmailVerification: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function sanitizeAnonymousOnboardingDraft(nextSession: SupabaseSession) {
  if (!nextSession?.user?.id) {
    return;
  }

  const appState = useAppStore.getState();
  const normalizedSessionEmail = nextSession.user.email?.trim().toLowerCase() ?? null;

  if (
    appState.onboardingDraftScope === 'anonymous-signup'
    && (
      appState.onboardingDraftTargetMode !== 'new-account-only'
      || (
        appState.onboardingDraftTargetEmail
        && normalizedSessionEmail
        && appState.onboardingDraftTargetEmail !== normalizedSessionEmail
      )
    )
  ) {
    appState.clearAnonymousOnboardingDraft();
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SupabaseSession>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [bootstrapPhase, setBootstrapPhase] = useState<AuthBootstrapPhase>(
    isSupabaseConfigured ? 'booting' : 'interactive',
  );
  const bootstrapStartedAtRef = useRef(Date.now());
  const signingOut = useAppStore((state) => state.authSigningOut);
  const clearAnonymousOnboardingDraft = useAppStore((state) => state.clearAnonymousOnboardingDraft);
  const markOnboardingDraftForNewAccount = useAppStore((state) => state.markOnboardingDraftForNewAccount);
  const resetForSignOut = useAppStore((state) => state.resetForSignOut);
  const setAuthSigningOut = useAppStore((state) => state.setAuthSigningOut);
  const setDidSignOut = useAppStore((state) => state.setDidSignOut);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setBootstrapPhase('interactive');
      return undefined;
    }

    let mounted = true;

    void supabase.auth.getSession()
      .then(({ data }) => {
        if (data.session?.user?.id) {
          setDidSignOut(false);
          sanitizeAnonymousOnboardingDraft(data.session);
        }

        if (mounted) {
          setSession(data.session);
          setLoading(false);
          setBootstrapPhase('interactive');
          console.info(`[bootstrap] session_hydrated_ms=${Date.now() - bootstrapStartedAtRef.current}`);
        }
      })
      .catch((error) => {
        console.warn('[bootstrap] session_hydrate_failed', error);
        if (mounted) {
          setSession(null);
          setLoading(false);
          setBootstrapPhase('degraded');
        }
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      setBootstrapPhase('interactive');
      console.info(`[bootstrap] auth_state_change session=${nextSession?.user?.id ? 'present' : 'none'} ms=${Date.now() - bootstrapStartedAtRef.current}`);

      if (nextSession?.user?.id) {
        setDidSignOut(false);
        sanitizeAnonymousOnboardingDraft(nextSession);
        void claimPendingReferralForUser(
          nextSession.user.id,
          (nextSession.user.user_metadata?.display_name as string | undefined) ?? nextSession.user.email ?? undefined,
        );
      }

      if (!nextSession) {
        setAuthSigningOut(false);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setAuthSigningOut, setDidSignOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase environment variables are not configured.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
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

    markOnboardingDraftForNewAccount(email);

    if (!data.session) {
      return { requiresEmailVerification: true };
    }

    return { requiresEmailVerification: false };
  }, [markOnboardingDraftForNewAccount]);

  const signOut = useCallback(async () => {
    setAuthSigningOut(true);
    clearAnonymousOnboardingDraft();
    resetForSignOut();
    queryClient.clear();
    setSession(null);
    setLoading(false);
    setBootstrapPhase('interactive');
    router.replace('/(public)/auth/sign-in');

    if (!supabase) {
      setAuthSigningOut(false);
      return;
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setAuthSigningOut(false);
    }
  }, [clearAnonymousOnboardingDraft, resetForSignOut, setAuthSigningOut]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    signingOut,
    bootstrapPhase,
    signIn,
    signUp,
    signOut,
  }), [bootstrapPhase, loading, session, signIn, signOut, signUp, signingOut]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
