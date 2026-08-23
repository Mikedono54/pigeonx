import { planRank } from '../core/entitlements';
import { useAccount, type TeamRole } from '../state/useAccount';
import { usePlaces } from '../state/usePlaces';
import { callFunction, getSupabase, isMissingOnServer, plainMessage } from './supabase';

/**
 * A business: the places a team looks after together.
 *
 * The server owns the rules about who may do what. This file only asks, and
 * turns whatever comes back into plain words. Every call keeps working when
 * the server does not know about a piece yet.
 */

export interface Membership {
  orgId: string;
  name: string;
  role: TeamRole;
}

export interface Teammate {
  id: string;
  userId: string;
  role: TeamRole;
  /** what the row is called on screen */
  label: string;
  addedAt: number | null;
  you: boolean;
}

export interface BusinessOutcome<T = undefined> {
  ok: boolean;
  message: string;
  value?: T;
}

const NOT_READY = 'This part is not ready yet. Try again later.';

type Row = Record<string, unknown>;

function text(row: Row, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

export function roleFrom(value: unknown): TeamRole {
  return value === 'owner' || value === 'manager' ? value : 'staff';
}

/** Reads one business out of whatever shape the server sends. */
export function membershipFromRow(input: unknown): Membership | null {
  if (!input || typeof input !== 'object') return null;
  const row = input as Row;
  const nested = (row.organizations ?? row.organization) as Row | undefined;

  const orgId =
    text(row, 'org_id', 'organization_id') ??
    (nested ? text(nested, 'id') : null) ??
    text(row, 'id');
  if (!orgId) return null;

  const name =
    text(row, 'org_name', 'organization_name', 'name') ??
    (nested ? text(nested, 'name') : null) ??
    'Your business';

  return { orgId, name, role: roleFrom(row.role) };
}

/** Reads one teammate out of whatever shape the server sends. */
export function teammateFromRow(input: unknown, myUserId: string | null): Teammate {
  const row = (input ?? {}) as Row;
  const userId = text(row, 'user_id', 'id') ?? '';
  const added = text(row, 'joined_at', 'created_at', 'added_at');
  const you = myUserId !== null && userId === myUserId;
  const name = text(row, 'email', 'display_name', 'name');

  return {
    id: text(row, 'id') ?? userId,
    userId,
    role: roleFrom(row.role),
    label: you ? 'You' : (name ?? 'Teammate'),
    addedAt: added ? Date.parse(added) || null : null,
    you,
  };
}

export const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Teammate',
};

export const ROLE_HINT: Record<TeamRole, string> = {
  owner: 'Can do everything, including billing.',
  manager: 'Can add places, areas, speakers and times.',
  staff: 'Can play a sound and see what played.',
};

/** The link you send someone so they can join your business. */
export function joinLink(token: string): string {
  return `https://pigeonx.org/app/join?token=${encodeURIComponent(token)}`;
}

export function tokenFromInvite(data: unknown): string | null {
  if (typeof data === 'string' && data.length > 0) return data;
  if (Array.isArray(data)) return tokenFromInvite(data[0]);
  if (data && typeof data === 'object') {
    return text(data as Row, 'token', 'invite_token', 'id');
  }
  return null;
}

export function orgIdFromCreate(data: unknown): string | null {
  if (typeof data === 'string' && data.length > 0) return data;
  if (Array.isArray(data)) return orgIdFromCreate(data[0]);
  if (data && typeof data === 'object') {
    return text(data as Row, 'org_id', 'id');
  }
  return null;
}

/* ── asking the server ────────────────────────────────────────────────────── */

export async function myMemberships(): Promise<Membership[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc('my_memberships');
  if (error || !Array.isArray(data)) return [];
  return data.map(membershipFromRow).filter((m): m is Membership => m !== null);
}

export async function createBusiness(name: string): Promise<BusinessOutcome<Membership>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NOT_READY };
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: 'Give your business a name first.' };
  }

  const { data, error } = await callFunction(sb, 'create_org', { name: trimmed });
  if (error) {
    return {
      ok: false,
      message: isMissingOnServer(error) ? NOT_READY : plainMessage(error),
    };
  }

  const orgId = orgIdFromCreate(data);
  if (!orgId) return { ok: false, message: NOT_READY };

  return {
    ok: true,
    message: `${trimmed} is set up.`,
    value: { orgId, name: trimmed, role: 'owner' },
  };
}

export async function listTeam(orgId: string, myUserId: string | null): Promise<Teammate[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('org_members')
    .select('id, user_id, role, created_at')
    .eq('org_id', orgId);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => teammateFromRow(row, myUserId));
}

export async function inviteTeammate(
  orgId: string,
  email: string,
  role: TeamRole = 'staff',
): Promise<BusinessOutcome<string>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NOT_READY };

  const { data, error } = await callFunction(sb, 'invite_member', {
    org_id: orgId,
    email: email.trim(),
    role,
  });
  if (error) {
    return {
      ok: false,
      message: isMissingOnServer(error) ? NOT_READY : plainMessage(error),
    };
  }

  const token = tokenFromInvite(data);
  if (!token) return { ok: false, message: NOT_READY };
  return { ok: true, message: 'Send them this link.', value: joinLink(token) };
}

export async function removeTeammate(orgId: string, userId: string): Promise<BusinessOutcome> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NOT_READY };
  const { error } = await callFunction(sb, 'remove_member', {
    org_id: orgId,
    user_id: userId,
  });
  if (error) {
    return {
      ok: false,
      message: isMissingOnServer(error) ? NOT_READY : plainMessage(error),
    };
  }
  return { ok: true, message: 'They are off the team.' };
}

export async function acceptInvite(token: string): Promise<BusinessOutcome> {
  const sb = getSupabase();
  if (!sb) return { ok: false, message: NOT_READY };
  const { error } = await callFunction(sb, 'accept_invite', { token });
  if (error) {
    return {
      ok: false,
      message: isMissingOnServer(error) ? NOT_READY : plainMessage(error),
    };
  }
  return { ok: true, message: 'You are on the team.' };
}

/**
 * Looks up which business this person belongs to and points the whole app at
 * it. Called after a sign-in and after a business is set up.
 */
export async function refreshBusiness(): Promise<Membership | null> {
  const list = await myMemberships();
  const first = list[0] ?? null;

  useAccount
    .getState()
    .setBusiness(first ? { id: first.orgId, name: first.name, role: first.role } : null);
  usePlaces.getState().useBusiness(first?.orgId ?? null);

  if (first && planRank(useAccount.getState().plan) < planRank('business')) {
    useAccount.getState().setPlan('business');
  }

  return first;
}
