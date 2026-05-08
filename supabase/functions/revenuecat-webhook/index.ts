// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('KURBADA_SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('KURBADA_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const revenueCatSecretApiKey = (Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? '').trim();
const revenueCatSecretApiKeySource = revenueCatSecretApiKey ? 'REVENUECAT_SECRET_API_KEY' : 'missing';
const webhookAuthorization = (Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION') ?? '').trim();
const premiumEntitlementId = (Deno.env.get('REVENUECAT_PREMIUM_ENTITLEMENT_ID') ?? 'premium').trim();

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id?: string | null;
  original_app_user_id?: string | null;
  aliases?: string[];
  entitlement_ids?: string[] | null;
};

function addOneMonth(timestampMs: number) {
  const date = new Date(timestampMs);
  date.setMonth(date.getMonth() + 1);
  return date.getTime();
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function grantPromotionalEntitlement(appUserId: string) {
  console.log(
    JSON.stringify({
      scope: 'revenuecat-webhook',
      step: 'grant-promotional-entitlement',
      keySource: revenueCatSecretApiKeySource,
      keyPrefix: revenueCatSecretApiKey.slice(0, 4),
      entitlementId: premiumEntitlementId,
      appUserId,
    }),
  );

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(premiumEntitlementId)}/promotional`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${revenueCatSecretApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        end_time_ms: addOneMonth(Date.now()),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(
      JSON.stringify({
        scope: 'revenuecat-webhook',
        step: 'grant-promotional-entitlement-failed',
        keySource: revenueCatSecretApiKeySource,
        keyPrefix: revenueCatSecretApiKey.slice(0, 4),
        status: response.status,
        body,
      }),
    );
    throw new Error(`RevenueCat promotional entitlement grant failed: ${response.status} ${body}`);
  }
}

async function persistWebhookEvent(eventId: string, eventType: string, appUserId: string, payload: Record<string, unknown>) {
  const { error } = await client.from('revenuecat_webhook_events').insert({
    event_id: eventId,
    event_type: eventType,
    app_user_id: appUserId,
    payload,
  });

  if (error) {
    throw error;
  }
}

Deno.serve(async (request) => {
  if (!supabaseUrl || !serviceRoleKey || !revenueCatSecretApiKey) {
    return json(500, { error: 'Missing Supabase or RevenueCat server configuration.' });
  }

  if (webhookAuthorization) {
    const authorization = (request.headers.get('Authorization') ?? '').trim();
    if (authorization !== webhookAuthorization) {
      return json(401, { error: 'Unauthorized webhook request.' });
    }
  }

  let payload: { event?: RevenueCatEvent } | null = null;

  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Invalid webhook payload.' });
  }

  const event = payload?.event;

  if (!event?.id || !event.type) {
    return json(400, { error: 'Missing RevenueCat event payload.' });
  }

  const { data: existingEvent, error: existingEventError } = await client
    .from('revenuecat_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle();

  if (existingEventError) {
    return json(500, { error: existingEventError.message });
  }

  if (existingEvent) {
    return json(200, { ok: true, duplicate: true });
  }

  if (event.type !== 'INITIAL_PURCHASE' || !event.entitlement_ids?.includes(premiumEntitlementId)) {
    await persistWebhookEvent(
      event.id,
      event.type,
      event.app_user_id ?? 'unknown',
      payload as Record<string, unknown>,
    );
    return json(200, { ok: true, ignored: true });
  }

  const candidateUserIds = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ].filter((value): value is string => Boolean(value));

  if (!candidateUserIds.length) {
    return json(400, { error: 'RevenueCat event did not include an app user ID.' });
  }

  let referral: {
    id: string;
    referrer_user_id: string;
    referred_user_id: string;
    status: string;
  } | null = null;

  for (const candidate of candidateUserIds) {
    const { data, error } = await client
      .from('referrals')
      .select('id, referrer_user_id, referred_user_id, status')
      .eq('referred_user_id', candidate)
      .eq('status', 'pending')
      .maybeSingle();

    if (error) {
      return json(500, { error: error.message });
    }

    if (data) {
      referral = data;
      break;
    }
  }

  if (!referral) {
    await persistWebhookEvent(
      event.id,
      event.type,
      event.app_user_id ?? candidateUserIds[0],
      payload as Record<string, unknown>,
    );
    return json(200, { ok: true, referral: 'missing' });
  }

  if (referral.referrer_user_id === referral.referred_user_id) {
    await client
      .from('referrals')
      .update({
        status: 'rejected',
      })
      .eq('id', referral.id);

    await persistWebhookEvent(
      event.id,
      event.type,
      event.app_user_id ?? candidateUserIds[0],
      payload as Record<string, unknown>,
    );

    return json(200, { ok: true, referral: 'rejected-self-referral' });
  }

  try {
    await grantPromotionalEntitlement(referral.referrer_user_id);
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Failed to grant promotional entitlement.' });
  }

  const rewardedAt = new Date().toISOString();

  const { error: referralUpdateError } = await client
    .from('referrals')
    .update({
      status: 'rewarded',
      rewarded_at: rewardedAt,
    })
    .eq('id', referral.id)
    .eq('status', 'pending');

  if (referralUpdateError) {
    return json(500, { error: referralUpdateError.message });
  }

  try {
    await persistWebhookEvent(
      event.id,
      event.type,
      event.app_user_id ?? candidateUserIds[0],
      payload as Record<string, unknown>,
    );
  } catch (eventInsertError) {
    return json(500, { error: eventInsertError instanceof Error ? eventInsertError.message : 'Failed to persist webhook event.' });
  }

  return json(200, { ok: true, rewarded: true });
});
