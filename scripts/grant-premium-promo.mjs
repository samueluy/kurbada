import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const [, , email, durationArg] = process.argv;

if (!email) {
  console.error('Usage: node scripts/grant-premium-promo.mjs <email> [months]');
  process.exit(1);
}

const months = Number(durationArg ?? '6');

if (!Number.isFinite(months) || months <= 0) {
  console.error('Months must be a positive number.');
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const revenueCatSecretApiKey = process.env.REVENUECAT_SECRET_API_KEY;
const premiumEntitlementId = process.env.REVENUECAT_PREMIUM_ENTITLEMENT_ID ?? 'premium';

if (!supabaseUrl || !serviceRoleKey || !revenueCatSecretApiKey) {
  console.error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or REVENUECAT_SECRET_API_KEY.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

function addMonths(timestampMs, monthCount) {
  const date = new Date(timestampMs);
  date.setMonth(date.getMonth() + monthCount);
  return date.getTime();
}

async function main() {
  const user = await findUserByEmail(email);

  if (!user) {
    console.error(`No Supabase auth user found for ${email}.`);
    process.exit(1);
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}/entitlements/${encodeURIComponent(premiumEntitlementId)}/promotional`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${revenueCatSecretApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        end_time_ms: addMonths(Date.now(), months),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RevenueCat promo grant failed: ${response.status} ${body}`);
  }

  console.log(`Granted ${months} month(s) of ${premiumEntitlementId} to ${email} (${user.id}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
