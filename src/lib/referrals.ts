import { createId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/app-store';
import { useLocalAppStore } from '@/store/local-app-store';
import type { ReferralRecord } from '@/types/domain';

type ReferralLookup = {
  referrer_user_id: string;
  display_name: string;
  referral_code: string;
};

type ReferralValidationResult =
  | {
      valid: true;
      normalizedCode: string;
      referrer: ReferralLookup;
    }
  | {
      valid: false;
      normalizedCode: string;
      reason: string;
    };

function toReferralRecord(record: any): ReferralRecord {
  return {
    id: record.id,
    referrer_user_id: record.referrer_user_id,
    referred_user_id: record.referred_user_id,
    referral_code: record.referral_code,
    referred_display_name: record.referred_display_name ?? null,
    status: record.status,
    rewarded_at: record.rewarded_at ?? null,
    notified_at: record.notified_at ?? null,
    created_at: record.created_at,
  };
}

export function normalizeReferralCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

async function lookupReferralCode(inputCode: string): Promise<ReferralLookup | null> {
  const normalizedCode = normalizeReferralCode(inputCode);

  if (!normalizedCode) {
    return null;
  }

  if (supabase && isSupabaseConfigured) {
    const client = supabase as any;
    const { data, error } = await client.rpc('lookup_referral_code', {
      input_code: normalizedCode,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return null;
    }

    return {
      referrer_user_id: row.referrer_user_id,
      display_name: row.display_name,
      referral_code: row.referral_code,
    };
  }

  const profile = useLocalAppStore.getState().profile;
  if (profile.referral_code !== normalizedCode) {
    return null;
  }

  return {
    referrer_user_id: profile.id,
    display_name: profile.display_name,
    referral_code: profile.referral_code,
  };
}

export async function validateReferralCode(inputCode: string, currentUserId?: string): Promise<ReferralValidationResult> {
  const normalizedCode = normalizeReferralCode(inputCode);

  if (!normalizedCode) {
    return {
      valid: false,
      normalizedCode,
      reason: 'Enter a referral code to continue.',
    };
  }

  const referrer = await lookupReferralCode(normalizedCode);

  if (!referrer) {
    return {
      valid: false,
      normalizedCode,
      reason: 'That referral code could not be found.',
    };
  }

  if (currentUserId && referrer.referrer_user_id === currentUserId) {
    return {
      valid: false,
      normalizedCode,
      reason: 'You cannot use your own referral code.',
    };
  }

  return {
    valid: true,
    normalizedCode,
    referrer,
  };
}

export async function claimReferralCodeForUser({
  code,
  referredUserId,
  referredDisplayName,
}: {
  code: string;
  referredUserId: string;
  referredDisplayName?: string;
}) {
  const validation = await validateReferralCode(code, referredUserId);

  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const cleanedDisplayName = referredDisplayName?.trim() || null;

  if (supabase && isSupabaseConfigured) {
    const client = supabase as any;
    const { data: existing, error: existingError } = await client
      .from('referrals')
      .select('*')
      .eq('referred_user_id', referredUserId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing && existing.status !== 'pending') {
      throw new Error('This referral can no longer be changed.');
    }

    const payload = {
      referrer_user_id: validation.referrer.referrer_user_id,
      referred_user_id: referredUserId,
      referral_code: validation.referrer.referral_code,
      referred_display_name: cleanedDisplayName,
      status: 'pending' as const,
    };

    const builder = existing
      ? client.from('referrals').update(payload).eq('id', existing.id)
      : client.from('referrals').insert(payload);

    const { data, error } = await builder.select().single();

    if (error) {
      throw error;
    }

    const savedReferral = toReferralRecord(data);
    useLocalAppStore.getState().upsertReferral(savedReferral);
    useAppStore.getState().setPendingReferralCode(savedReferral.referral_code);
    return savedReferral;
  }

  const state = useLocalAppStore.getState();
  const existingReferral = state.referrals.find((item) => item.referred_user_id === referredUserId);

  if (existingReferral && existingReferral.status !== 'pending') {
    throw new Error('This referral can no longer be changed.');
  }

  const localReferral: ReferralRecord = {
    id: existingReferral?.id ?? createId(),
    referrer_user_id: validation.referrer.referrer_user_id,
    referred_user_id: referredUserId,
    referral_code: validation.referrer.referral_code,
    referred_display_name: cleanedDisplayName,
    status: 'pending',
    rewarded_at: existingReferral?.rewarded_at ?? null,
    notified_at: existingReferral?.notified_at ?? null,
    created_at: existingReferral?.created_at ?? new Date().toISOString(),
  };

  state.upsertReferral(localReferral);
  useAppStore.getState().setPendingReferralCode(localReferral.referral_code);
  return localReferral;
}

export async function claimPendingReferralForUser(userId: string, displayName?: string) {
  const pendingCode = useAppStore.getState().pendingReferralCode;

  if (!pendingCode) {
    return null;
  }

  try {
    const referral = await claimReferralCodeForUser({
      code: pendingCode,
      referredUserId: userId,
      referredDisplayName: displayName,
    });
    useAppStore.getState().setPendingReferralCode('');
    return referral;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to apply referral code.';
    if (
      message.includes('could not be found')
      || message.includes('own referral')
      || message.includes('can no longer be changed')
    ) {
      useAppStore.getState().setPendingReferralCode('');
    }
    return null;
  }
}

export { toReferralRecord };
