# PigeonX Platform — Design Spec

Date: 2026-08-21
Status: approved by owner (verbal, chat) — build order below

## 1. Goal

Turn pigeonx.org (a client-only React/Vite PWA with a Web Audio tone generator, no backend, no accounts, no payments) into:

1. A native iOS + Android app (Expo) that is a real deterrence control center: audio engine that survives screen lock, real Bluetooth output routing, saved profiles, schedules, zones/devices, and a Free → Pro → Business → Enterprise entitlement model.
2. A redesigned pigeonx.org: marketing site plus the Business/Enterprise web dashboard.
3. A Supabase backend shared by both.

PigeonX is wholly separate from SnapMind: separate repo, Supabase project, bundle IDs, EAS project, Netlify site. Nothing is imported from the SnapMind codebase.

## 2. Non-goals (v1)

- Hardware firmware. The app ships a BLE provisioning flow + device registry + a **simulated device**; the emitter firmware is a later project.
- Live payments. RevenueCat (app IAP) and Stripe (web Business/Enterprise) are wired behind an `EntitlementProvider` interface but run in sandbox/stub mode until keys are supplied.
- Camera/motion detection ("Future Smart Detection") — schema leaves room (`zones.trigger_mode`), no UI.
- Species beyond birds.

## 3. Physics constraints the product must respect

- Phone speakers and Bluetooth codecs (SBC/AAC) roll off hard around 16–20 kHz. The app therefore shows an **effective range indicator** per output (phone speaker ≈ ≤18 kHz, BT speaker ≈ ≤19 kHz, PigeonX hardware ≈ up to 25 kHz) and never pretends 25 kHz out of a phone is real.
- 15–18 kHz is audible to many humans (esp. under 30). Any profile with energy above 17 kHz shows a **"guests may hear this"** badge.
- Audible deterrent profiles (distress/predator calls, randomized sweeps) are included because they are the better-evidenced approach; the user chooses.
- iOS will not run arbitrary background timers. Schedules on a phone are **reminders + one-tap start** (local notifications); true unattended schedules are executed by PigeonX hardware (or a simulated device). The UI says this plainly.

## 4. Architecture

```
~/pigeonx/
  apps/mobile/        Expo SDK 54, TypeScript, expo-router, NativeWind
  apps/web/           React 18 + Vite + TypeScript + Tailwind; routes: / (marketing), /app/* (dashboard)
  packages/core/      shared TS: audio profile definitions, entitlement gates, Supabase types, zod schemas
  supabase/           migrations, RLS policies, edge functions, seed
  docs/               specs + plans
```

- pnpm workspaces. Root `tsconfig.base.json`, shared ESLint/Prettier.
- `packages/core` is the single source of truth for: tier → feature gates, system audio profiles, DB row types (generated from Supabase), zod validators used by both apps.

### 4.1 Backend (Supabase, new project `pigeonx`)

Tables (all with `created_at`, `updated_at`, RLS on):

| table | purpose | key columns |
|---|---|---|
| `profiles` | one per auth user | `id (=auth.uid)`, `display_name`, `plan` (`free`/`pro`), `rc_app_user_id` |
| `organizations` | Business/Enterprise tenant | `id`, `name`, `plan` (`business`/`enterprise`), `stripe_customer_id`, `contact_email` |
| `org_members` | membership + role | `org_id`, `user_id`, `role` (`owner`/`manager`/`staff`) |
| `locations` | a physical property | `id`, `org_id`, `name`, `address`, `timezone`, `business_hours jsonb` |
| `zones` | an area within a location (patio, rooftop) | `id`, `location_id`, `name`, `trigger_mode` (`manual`/`schedule`/`motion`), `active_profile_id` |
| `devices` | speakers / PigeonX hardware | `id`, `zone_id`, `kind` (`phone`/`bt_speaker`/`pigeonx_emitter`/`simulated`), `name`, `ble_id`, `last_seen_at`, `status`, `firmware` |
| `audio_profiles` | system + user/org profiles | `id`, `owner_user_id` nullable, `owner_org_id` nullable, `is_system`, `name`, `kind` (`tone`/`sweep`/`pulse`/`sample`), `params jsonb`, `min_plan` |
| `schedules` | recurring windows | `id`, `zone_id`, `profile_id`, `days int[]`, `start_time`, `end_time`, `enabled`, `executor` (`device`/`reminder`) |
| `sessions` | every run, the pilot proof-point log | `id`, `zone_id` nullable, `user_id`, `device_id` nullable, `profile_id`, `started_at`, `ended_at`, `output_kind`, `peak_freq_hz`, `source` (`manual`/`schedule`/`remote`) |
| `subscriptions` | mirror of RevenueCat/Stripe state | `id`, `user_id` nullable, `org_id` nullable, `provider`, `product_id`, `status`, `current_period_end`, `raw jsonb` |

- RLS: users read/write their own `profiles`, `audio_profiles`, `sessions`; org rows visible to `org_members` of that org; `staff` can start sessions and edit zones' active profile but not billing/members; `manager` adds zones/devices/schedules; `owner` everything.
- Helper RPCs: `my_orgs()`, `start_session(zone_id, profile_id, device_id)`, `end_session(session_id)`, `zone_activity(zone_id, from, to)`, `location_report(location_id, week)`.
- Realtime enabled on `zones`, `devices`, `sessions` so the dashboard reflects a phone starting a run within ~1 s.
- Edge functions: `rc-webhook` (RevenueCat → `subscriptions` + `profiles.plan`), `stripe-webhook` (Stripe → `subscriptions` + `organizations.plan`), `weekly-report` (cron; per-location summary email, stub sender in v1).
- Auth: email magic link + Apple + Google on mobile; email magic link on web. One auth pool for both.

### 4.2 Entitlements (`packages/core/entitlements.ts`)

```
Feature                        Free   Pro   Business  Enterprise
system profiles                3      all   all       all
audible profiles (calls)       –      ✓     ✓         ✓
custom profile builder         –      ✓     ✓         ✓
saved profiles                 1      ∞     ∞         ∞
session cap                    15m    ∞     ∞         ∞
schedules (reminder)           –      ✓     ✓         ✓
schedules (device executor)    –      –     ✓         ✓
remembered BT devices          –      ✓     ✓         ✓
session history                7d     ∞     ∞         ∞
locations / zones / devices    –      –     ✓         ✓
team members + roles           –      –     ✓ (5)     ∞
web dashboard                  –      –     ✓         ✓
multi-location org view        –      –     –         ✓
analytics + CSV export         –      –     –         ✓
```

`EntitlementProvider` interface: `getPlan(user): Plan`, `can(feature): boolean`. Implementations: `SandboxEntitlements` (reads `profiles.plan` / `organizations.plan`, togglable from a dev menu) now; `RevenueCatEntitlements` / `StripeEntitlements` later without touching callers.

Prices (display only until keys exist): Pro $4.99/mo or $29.99/yr; Business $29/mo per location; Enterprise "contact sales".

### 4.3 Mobile app (`apps/mobile`)

Stack: Expo SDK 54, expo-router, TypeScript, NativeWind (Tailwind tokens shared with web), `expo-av` → audio session config for background playback (`UIBackgroundModes: audio`), custom audio engine via `react-native-audio-api` (Web-Audio-compatible oscillators/gain on native) with a JS fallback to pre-rendered sample loops for `sample` profiles; `react-native-ble-plx` for PigeonX hardware provisioning; `expo-notifications` for reminder schedules; `@supabase/supabase-js` + `expo-secure-store` session storage; `react-native-purchases` behind the entitlement interface (not initialized until keys).

Screens (tabs: **Home · Deterrent · Zones · Schedules · Account**):

- **Onboarding** (3 cards: what it does, what it honestly can/can't do, pick output) → sign in (magic link / Apple / Google) or continue as guest (Free, local only; account prompt on first Pro action).
- **Home** — zone cards (or "My space" for solo users) with status pill (Idle / Running 12:40 / Scheduled 6 pm), big Start, today's sessions count, upgrade nudge if Free.
- **Deterrent** — profile picker (cards, tier-locked ones show a lock), live spectrum visualizer, frequency + volume controls (for tone/sweep kinds), duration chip row (15/30/60/∞), **Output** selector (Phone / system Bluetooth route / paired PigeonX device / Simulated), effective-range indicator, guests-may-hear badge, Start/Stop. Running state persists in a notification with Stop action.
- **Profiles** (from Deterrent) — list system + mine; Pro builder: kind, base/target Hz, sweep rate, pulse on/off ms, randomization %, loudness; preview 5 s.
- **Zones** — Business: locations → zones → devices; add device via BLE scan (or "Add simulated device"); assign profile; see live status. Solo users see this as a locked teaser.
- **Schedules** — per zone: days, start/end, profile, executor (Reminder on this phone / Device). Reminder schedules fire local notifications with a "Start now" action.
- **History** (from Account) — session list, per-day totals, export (Enterprise).
- **Account** — plan badge, paywall sheet (Pro monthly/yearly; Business CTA opens web), org switcher, dev menu (sandbox plan toggle, simulated devices) in non-production builds.

Audio engine contract (`apps/mobile/src/audio/engine.ts`):
`load(profile) · start(output) · stop() · setVolume(0–1) · setParam(key, value) · onSpectrum(cb)` — profiles of kind `tone` (single osc), `sweep` (osc + LFO on frequency), `pulse` (osc × gate), `sample` (looped asset: distress/predator calls bundled under `assets/audio/`). Engine emits `session_started/ended` to a `SessionRecorder` that writes `sessions` rows (queued offline, flushed on reconnect).

### 4.4 Website (`apps/web`)

Marketing `/`: Hero (headline + app badges + phone mock), Problem (4 pain cards), How it works (3 steps), Platform pillars (frequency control, Bluetooth, scheduling, zones, dashboard, future detection), Pricing (Free/Pro/Business/Enterprise), Hardware (emitter teaser, "join the pilot"), Pilots/Proof (placeholder metrics pulled from a CMS-free JSON), FAQ (incl. honest efficacy/audibility answers), Contact (Netlify form). SEO meta, OG image, sitemap.

Dashboard `/app/*` (Business/Enterprise, Supabase auth): Overview (locations grid with live zone status), Location → Zones → Devices, Schedules editor, Activity log (sessions table w/ filters), Reports (weekly per-location: sessions, run-time, coverage; Enterprise: cross-location comparison + CSV), Team (invite by email, roles), Billing (Stripe portal stub), Org settings.

Design direction: dark navy base (`#0B1220` family), bird mark retained, accent gradient teal→electric blue, generous spacing, Inter/Geist-style type, hospitality-tech tone (calm, premium, "system" not "gadget"). Tokens defined once in `packages/core/tokens.ts` and exported to Tailwind (web) and NativeWind (mobile). Final palette/type chosen with ui-ux-pro-max during plan ①.

Deploy: Netlify site currently serving pigeonx.org (owner account samcash415@gmail.com — the owner logs in via `netlify login`; no credentials stored). SPA redirect, `/app/*` → index.

## 5. Error handling

- Audio: engine start failures (no output, audio session interrupted by a call) surface as inline banners with a retry; interruptions auto-resume when the session ends if the user hasn't stopped.
- Network: app is offline-first for solo use (profiles + sessions cached in SQLite via `expo-sqlite`; sync queue). Dashboard shows stale-data banner when realtime drops.
- Entitlements: every gated action goes through `can()`; failure opens the paywall sheet, never a dead button.
- BLE: scan timeout 15 s → "No PigeonX devices found" + simulated-device option.

## 6. Testing

- `packages/core`: vitest unit tests for entitlement matrix and profile validators.
- Supabase: SQL tests for RLS (staff cannot read billing; cross-org isolation) run via `supabase test db`.
- Mobile: jest + RNTL for engine state machine (mocked native audio), session recorder queue, paywall gating; Maestro smoke flow (onboard → start → stop) for EAS preview builds.
- Web: vitest + RTL for dashboard data hooks; Playwright smoke (marketing renders, dashboard auth gate).

## 7. Build order (each gets its own implementation plan)

1. **Foundation** — monorepo, Supabase project + schema + RLS + seed profiles, `packages/core` (tokens, entitlements, profiles), design tokens via ui-ux-pro-max.
2. **Mobile core** — audio engine, Deterrent + Profiles + Home + Onboarding + Account/paywall (sandbox), session recording, EAS dev/preview builds.
3. **Website** — marketing redesign + deploy to pigeonx.org.
4. **Business** — Zones/devices/schedules (mobile) + web dashboard (overview, location, activity, team).
5. **Enterprise + hardware** — org analytics, CSV, BLE provisioning + simulated device, weekly report function.

## 8. Open items (not blocking)

- Apple/Google accounts: owner's existing accounts for now, transfer later. Bundle IDs `org.pigeonx.app`.
- RevenueCat + Stripe keys: later; sandbox entitlements until then.
- Distress/predator call samples: need licensed/CC0 recordings; v1 ships synthesized placeholders clearly labeled.
