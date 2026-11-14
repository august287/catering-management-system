// Supabase Edge Function: manage-staff
// Lets a super admin delete a staff account or set a staff member's password.
// These need the service role key, so they can't run in the browser.
//
// Deploy (once): in the Supabase dashboard, Edge Functions -> Deploy a new function,
// name it "manage-staff", paste this file, and deploy. Or with the CLI:
//   supabase functions deploy manage-staff
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
//
// Body:
//   { action: 'delete', user_id: string }
//   { action: 'set_password', user_id: string, password: string }
//
// Rules (checked here, on the server):
//   * The caller must be signed in and have the 'super_admin' role.
//   * The target must be staff ('admin' or 'super_admin'). Customer accounts are refused.
//   * A super admin cannot delete or change the password of their own account here.
//   * New passwords must be 8+ characters with upper and lower case, a number and a symbol.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Same rule as the Register and Reset Password pages.
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
const STAFF_ROLES = ['admin', 'super_admin'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Who is asking?
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) return json({ error: 'Not signed in.' }, 401);
  const callerId = authData.user.id;

  const { data: caller } = await admin.from('profiles').select('role').eq('id', callerId).single();
  if (caller?.role !== 'super_admin') {
    return json({ error: 'Only super admins can manage staff accounts.' }, 403);
  }

  let body: { action?: string; user_id?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const { action, user_id: targetId, password } = body;
  if (!targetId || typeof targetId !== 'string') return json({ error: 'user_id is required.' }, 400);
  if (targetId === callerId) {
    return json({ error: 'You cannot delete or change the password of your own account here.' }, 403);
  }

  const { data: target } = await admin.from('profiles').select('id, name, role').eq('id', targetId).single();
  if (!target) return json({ error: 'User not found.' }, 404);
  if (!STAFF_ROLES.includes(target.role)) {
    return json({ error: 'Only staff accounts (Admin or Super Admin) can be managed here.' }, 403);
  }

  if (action === 'delete') {
    // Deleting the auth user also removes the profile and its notifications (on delete cascade).
    const { error } = await admin.auth.admin.deleteUser(targetId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, action, user_id: targetId });
  }

  if (action === 'set_password') {
    if (typeof password !== 'string' || !STRONG_PASSWORD.test(password)) {
      return json(
        {
          error:
            'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.',
        },
        400
      );
    }
    const { error } = await admin.auth.admin.updateUserById(targetId, { password });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, action, user_id: targetId });
  }

  return json({ error: "action must be 'delete' or 'set_password'." }, 400);
});
