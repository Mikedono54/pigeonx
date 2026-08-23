/**
 * Config for the dashboard.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time. If a build ever runs
 * without those set, we fall back to `window.__PIGEONX_ENV__`, which a small
 * script in index.html fills in. Both values are public on purpose: the anon
 * key is meant to sit in a browser, row level security is what guards the data.
 */

type WindowEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  APPLE_WEB_AUTH?: string;
};

declare global {
  interface Window {
    __PIGEONX_ENV__?: WindowEnv;
  }
}

function fromWindow(): WindowEnv {
  if (typeof window === 'undefined') return {};
  return window.__PIGEONX_ENV__ ?? {};
}

function pick(viteValue: string | undefined, key: keyof WindowEnv): string {
  const value = viteValue && viteValue.length > 0 ? viteValue : fromWindow()[key];
  return value ?? '';
}

export const SUPABASE_URL = pick(import.meta.env.VITE_SUPABASE_URL, 'SUPABASE_URL');
export const SUPABASE_ANON_KEY = pick(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  'SUPABASE_ANON_KEY',
);
export const APPLE_WEB_AUTH =
  pick(import.meta.env.VITE_APPLE_WEB_AUTH, 'APPLE_WEB_AUTH') === '1';

/** True when we have enough to talk to the backend. */
export const HAS_BACKEND = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Where magic links come back to. Local runs come back to the local server. */
export function siteOrigin(): string {
  if (typeof window === 'undefined') return 'https://pigeonx.org';
  const { origin, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
  return 'https://pigeonx.org';
}
