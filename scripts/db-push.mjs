#!/usr/bin/env node
/**
 * `supabase db push` with the connection this machine can actually reach.
 *
 * The CLI defaults to the session pooler on port 5432, which times out from
 * here; the transaction pooler on 6543 works. This wrapper reads `.env`, builds
 * that URL and forwards any extra flags:
 *
 *   node scripts/db-push.mjs            # apply pending migrations
 *   node scripts/db-push.mjs --include-seed
 *   node scripts/db-push.mjs --dry-run
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const env = {};
for (const line of readFileSync(`${root}.env`, 'utf8').split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const ref = env.SUPABASE_PROJECT_REF;
const password = env.SUPABASE_DB_PASSWORD;
const region = env.SUPABASE_DB_REGION ?? 'us-west-1';
if (!ref || !password) {
  console.error('.env is missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD');
  process.exit(2);
}

const dbUrl = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;

const result = spawnSync(
  'npx',
  ['-y', 'supabase@latest', 'db', 'push', '--db-url', dbUrl, '--yes', ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN ?? readAccessToken() ?? '',
    },
  },
);
process.exit(result.status ?? 1);

function readAccessToken() {
  try {
    return readFileSync(`${process.env.HOME}/.supabase/access-token`, 'utf8').trim();
  } catch {
    return null;
  }
}
