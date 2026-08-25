import type { BirdTarget } from '../core/personalization';
import type { OutputKind } from '../core/profiles';
import { padSeconds, trimSeconds } from '../core/protectionPlans';
import type { RemoteOutcome } from './placesRemote';
import { localSoundId, remoteSoundId } from './soundIds';
import { getSupabase, isMissingOnServer, plainMessage } from './supabase';

/**
 * The protection plans a business keeps.
 *
 * A person's own plans live on their phone and are carried up. A business's
 * plans are the other way round: the account holds them, every phone on the
 * team reads the same ones, and one of them is attached to an area so that
 * whoever presses Start on that roof runs what the manager wrote.
 *
 * There is no copy of these on the phone, on purpose. Two people editing the
 * same plan on two phones is exactly the case where a local copy goes stale
 * and somebody plays last week's rotation.
 */

const NO_ACCOUNT = 'Sign in to see the plans your business keeps.';
const NOT_READY = 'This part is not ready yet. Try again later.';

export interface OrgPlan {
  /** the account's own id, which is the only id this plan ever has */
  id: string;
  /** the area it looks after, when it is attached to one */
  zoneId: string | null;
  name: string;
  target: BirdTarget;
  /** built-in sound ids, in rotation order */
  soundIds: string[];
  randomizeOrder: boolean;
  intervalSeconds: number;
  sessionMinutes: number;
  output: OutputKind;
  volume: number;
  /** "22:00", or null when the plan has no quiet hours */
  quietStart: string | null;
  quietEnd: string | null;
  /** 1 is Monday, 7 is Sunday, the way `protection_plans.days` counts */
  days: number[];
  startsOn: string | null;
  endsOn: string | null;
}

export type OrgPlanDraft = Omit<OrgPlan, 'id'> & { id?: string };

type Row = Record<string, unknown>;

const OUTPUT_KINDS: OutputKind[] = ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'];
const BIRD_TARGETS: BirdTarget[] = [
  'pigeons',
  'gulls',
  'starlings',
  'corvids',
  'mixed_small',
  'unsure',
];

const COLUMNS =
  'id, zone_id, name, target, sound_ids, randomize_order, interval_seconds, session_minutes, output, volume, quiet_start, quiet_end, days, starts_on, ends_on';

function str(row: Row, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * A sound this phone has never heard of is dropped rather than shown as an
 * id. The plan plays whatever is left of it, the same way a person's own plan
 * does.
 */
export function orgPlanFromRow(input: unknown): OrgPlan {
  const row = (input ?? {}) as Row;
  const output = OUTPUT_KINDS.includes(row.output as OutputKind)
    ? (row.output as OutputKind)
    : 'phone';
  const target = BIRD_TARGETS.includes(row.target as BirdTarget)
    ? (row.target as BirdTarget)
    : 'unsure';
  const soundIds = (Array.isArray(row.sound_ids) ? (row.sound_ids as string[]) : [])
    .map((id) => localSoundId(id))
    .filter((id): id is string => id !== null);

  return {
    id: str(row, 'id') ?? '',
    zoneId: str(row, 'zone_id'),
    name: str(row, 'name') ?? 'Protection plan',
    target,
    soundIds,
    randomizeOrder: row.randomize_order !== false,
    intervalSeconds: typeof row.interval_seconds === 'number' ? row.interval_seconds : 0,
    sessionMinutes: typeof row.session_minutes === 'number' ? row.session_minutes : 15,
    output,
    volume: typeof row.volume === 'number' ? row.volume : 0.85,
    quietStart: trimSeconds(str(row, 'quiet_start')),
    quietEnd: trimSeconds(str(row, 'quiet_end')),
    days: Array.isArray(row.days) ? (row.days as number[]) : [1, 2, 3, 4, 5, 6, 7],
    startsOn: str(row, 'starts_on'),
    endsOn: str(row, 'ends_on'),
  };
}

/** The same plan going the other way. */
export function orgPlanToRow(orgId: string, plan: OrgPlanDraft): Record<string, unknown> {
  return {
    owner_org_id: orgId,
    owner_user_id: null,
    user_place_id: null,
    zone_id: plan.zoneId,
    name: plan.name,
    target: plan.target,
    sound_ids: plan.soundIds
      .map((id) => remoteSoundId(id))
      .filter((id): id is string => id !== null),
    randomize_order: plan.randomizeOrder,
    interval_seconds: plan.intervalSeconds,
    session_minutes: plan.sessionMinutes,
    output: plan.output,
    volume: plan.volume,
    quiet_start: padSeconds(plan.quietStart),
    quiet_end: padSeconds(plan.quietEnd),
    days: plan.days,
    starts_on: plan.startsOn,
    ends_on: plan.endsOn,
  };
}

function failed(error: unknown): RemoteOutcome<never> {
  const e = error as { code?: string; message?: string };
  return { ok: false, message: isMissingOnServer(e) ? NOT_READY : plainMessage(e) };
}

export async function fetchOrgPlans(orgId: string): Promise<RemoteOutcome<OrgPlan[]>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NO_ACCOUNT };

  const { data, error } = await sb
    .from('protection_plans')
    .select(COLUMNS)
    .eq('owner_org_id', orgId)
    .order('name');
  if (error) return failed(error);

  return { ok: true, message: '', value: (data ?? []).map(orgPlanFromRow) };
}

/** Writes a plan the business owns, and hands back the id it now has. */
export async function saveOrgPlan(
  orgId: string,
  plan: OrgPlanDraft,
): Promise<RemoteOutcome<string>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NO_ACCOUNT };

  const payload = orgPlanToRow(orgId, plan);

  if (plan.id) {
    const { error } = await sb.from('protection_plans').update(payload).eq('id', plan.id);
    return error ? failed(error) : { ok: true, message: 'Saved.', value: plan.id };
  }

  const { data, error } = await sb
    .from('protection_plans')
    .insert(payload)
    .select('id')
    .single();
  if (error) return failed(error);
  return {
    ok: true,
    message: `${plan.name} is looking after this area.`,
    value: ((data ?? {}) as Row).id as string,
  };
}

/** Puts one plan in charge of one area, or takes it off. */
export async function attachOrgPlan(
  planId: string,
  zoneId: string | null,
): Promise<RemoteOutcome> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NO_ACCOUNT };
  const { error } = await sb
    .from('protection_plans')
    .update({ zone_id: zoneId })
    .eq('id', planId);
  return error ? failed(error) : { ok: true, message: 'Saved.' };
}

export async function removeOrgPlan(planId: string): Promise<RemoteOutcome> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NO_ACCOUNT };
  const { error } = await sb.from('protection_plans').delete().eq('id', planId);
  return error ? failed(error) : { ok: true, message: 'Deleted.' };
}
