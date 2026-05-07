import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const [, , action, email] = process.argv;

if (!action || !email || !['grant', 'revoke'].includes(action)) {
  console.error('Usage: node scripts/set-closed-testing-access.mjs <grant|revoke> <email>');
  process.exit(1);
}

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

async function main() {
  const user = await findUserByEmail(email);

  if (!user) {
    console.error(`No Supabase auth user found for ${email}.`);
    process.exit(1);
  }

  const accessOverride = action === 'grant' ? 'closed_testing' : 'none';

  const { error } = await client
    .from('profiles')
    .update({ access_override: accessOverride })
    .eq('id', user.id);

  if (error) {
    throw error;
  }

  console.log(`${action === 'grant' ? 'Granted' : 'Removed'} closed testing access for ${email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
