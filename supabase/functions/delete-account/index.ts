// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('KURBADA_SUPABASE_URL') ?? '';
const serviceRoleKey =
  Deno.env.get('KURBADA_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('KURBADA_SUPABASE_ANON_KEY') ?? '';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(500, { error: 'Missing Supabase configuration.' });
  }
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'Missing or invalid Authorization header.' });
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) return json(401, { error: 'Empty bearer token.' });

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData?.user) return json(401, { error: 'Could not verify caller identity.' });

  const userId = userData.user.id;
  let body: { confirmUserId?: string } = {};
  try {
    body = await request.json();
  } catch {}
  if (body.confirmUserId && body.confirmUserId !== userId) {
    return json(400, { error: 'confirmUserId does not match caller.' });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId, true);
  if (deleteError) return json(500, { error: deleteError.message });
  return json(200, { ok: true, deleted: userId });
});
