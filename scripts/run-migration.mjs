/**
 * Runs supabase/fix-rls-policies.sql against the Supabase project.
 *
 * Uses the Supabase Management API to execute raw SQL.
 *
 * Required env vars (in .env.local):
 *   VITE_SUPABASE_URL            – e.g. https://xxxx.supabase.co
 *   SUPABASE_DB_PASSWORD          – your database password
 *   SUPABASE_ACCESS_TOKEN         – personal access token from https://supabase.com/dashboard/account/tokens
 *
 * The project ref is extracted automatically from VITE_SUPABASE_URL.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Load .env.local manually (no extra deps) ---
function loadEnv() {
  const envPaths = ['.env.local', '.env'];
  for (const envFile of envPaths) {
    try {
      const raw = readFileSync(resolve(__dirname, '..', envFile), 'utf-8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      // file doesn't exist – skip
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  console.warn(
    '\n⚠  Skipping migration: VITE_SUPABASE_URL or SUPABASE_ACCESS_TOKEN not set.\n' +
    '   To enable automatic migrations, add to .env.local:\n' +
    '     SUPABASE_ACCESS_TOKEN=your-access-token\n' +
    '   Generate one at: https://supabase.com/dashboard/account/tokens\n'
  );
  process.exit(0); // don't fail the build
}

// Extract project ref from URL: https://<ref>.supabase.co
const refMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!refMatch) {
  console.error('❌  Could not extract project ref from VITE_SUPABASE_URL:', SUPABASE_URL);
  process.exit(0);
}
const projectRef = refMatch[1];

const sqlPath = resolve(__dirname, '..', 'supabase', 'fix-rls-policies.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log(`🔄  Running migration on project: ${projectRef}`);
console.log('   File: supabase/fix-rls-policies.sql');

try {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const result = await res.json();

  // Check if any statement returned an error
  const errors = (Array.isArray(result) ? result : [result]).filter(
    (r) => r.error || r.message
  );

  if (errors.length > 0) {
    console.warn('⚠  Migration completed with warnings:');
    errors.forEach((e) => console.warn('  ', e.error || e.message));
  } else {
    console.log('✅  Migration completed successfully!\n');
  }
} catch (err) {
  console.error('❌  Migration error:', err.message);
  console.error(
    '   You can run supabase/fix-rls-policies.sql manually in the Supabase SQL Editor.\n'
  );
  process.exit(0); // don't fail the build
}
