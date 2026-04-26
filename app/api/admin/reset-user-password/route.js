import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

async function createUserScopedClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op in route handler
        },
      },
    }
  );
}

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(req) {
  try {
    const { targetUserId, newPassword } = await req.json();
    if (!targetUserId || !newPassword) {
      return NextResponse.json({ error: 'targetUserId and newPassword are required' }, { status: 400 });
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = await createUserScopedClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: actorMemberships, error: actorErr } = await supabase
      .from('bank_members')
      .select('bank_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);

    if (actorErr) {
      return NextResponse.json({ error: actorErr.message || 'Permission check failed' }, { status: 403 });
    }

    const adminBankIds = (actorMemberships || []).map((m) => m.bank_id);
    if (adminBankIds.length === 0) {
      return NextResponse.json({ error: 'Only owner/admin can reset passwords' }, { status: 403 });
    }

    const { data: targetMemberships, error: targetErr } = await supabase
      .from('bank_members')
      .select('bank_id')
      .eq('user_id', targetUserId)
      .in('bank_id', adminBankIds);

    if (targetErr || !targetMemberships?.length) {
      return NextResponse.json({ error: 'Target user is outside your bank scope' }, { status: 403 });
    }

    const admin = getAdminClient();
    const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || 'Password reset failed' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
