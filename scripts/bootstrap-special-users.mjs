import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const users = [
  {
    email: 'dev@kurbada.local',
    password: process.env.KURBADA_DEV_PASSWORD,
    display_name: 'Kurbada Dev',
    access_override: 'development',
  },
  {
    email: 'apple-review@kurbada.app',
    password: process.env.KURBADA_APPLE_REVIEW_PASSWORD,
    display_name: 'Apple Review Rider',
    access_override: 'apple_review',
  },
];

for (const user of users) {
  if (!user.password) {
    console.error(`Missing password env for ${user.email}.`);
    process.exit(1);
  }
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const found = data.users.find((user) => user.email === email);
    if (found) return found;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser(user) {
  const existing = await findUserByEmail(user.email);

  let authUser = existing;

  if (!authUser) {
    const { data, error } = await client.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.display_name },
    });
    if (error) throw error;
    authUser = data.user;
  } else {
    const { data, error } = await client.auth.admin.updateUserById(authUser.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: { ...authUser.user_metadata, display_name: user.display_name },
    });
    if (error) throw error;
    authUser = data.user;
  }

  const { error: profileError } = await client.from('profiles').upsert({
    id: authUser.id,
    display_name: user.display_name,
    subscription_status: 'trialing',
    access_override: user.access_override,
  });

  if (profileError) throw profileError;

  console.log(`Upserted ${user.email} (${user.access_override})`);
}

async function main() {
  for (const user of users) {
    await ensureUser(user);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
