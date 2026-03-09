"use client";

import { createBrowserClient } from '@supabase/ssr';

let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars'
      );
    }
    _supabase = createBrowserClient(url, key);
  }
  return _supabase;
}

export const supabase = new Proxy({}, {
  get(_target, prop) {
    return getSupabase()[prop];
  },
});
