import { useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { cancelInvite, inviteMember, listInvites, listMembers, removeMember } from '../lib/db';
import { DEMO_INVITES, DEMO_MEMBERS, demoWriteBlocked, isDemo } from '../lib/demo';
import { dateLabel } from '../lib/derive';
import type { Invite, MemberRole, TeamMember } from '../lib/types';
import {
  Card,
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  Input,
  Label,
  PageHead,
  Pill,
  Select,
  SkeletonRows,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import { Dialog } from '../components/Dialog';

type TeamData = {
  members: TeamMember[];
  invites: Invite[];
  invitesError: unknown;
};

const ROLES: Array<{ value: MemberRole; label: string; note: string }> = [
  { value: 'staff', label: 'Staff', note: 'Can play sounds and see what played.' },
  { value: 'manager', label: 'Manager', note: 'Can also add places, areas and schedules.' },
  { value: 'owner', label: 'Owner', note: 'Can do everything, including billing.' },
];

function roleLabel(role: MemberRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function joinLink(token: string): string {
  return `https://pigeonx.org/app/join?token=${token}`;
}

export default function Team() {
  const { business, userId } = useAuth();
  const demo = isDemo();
  const orgId = business?.org_id ?? null;
  const amOwner = business?.role === 'owner';
  const canInvite = business?.role === 'owner' || business?.role === 'manager';

  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('staff');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);

  const state = useAsync<TeamData>(async () => {
    if (demo) return { members: DEMO_MEMBERS, invites: DEMO_INVITES, invitesError: null };
    if (!orgId) return { members: [], invites: [], invitesError: null };
    const members = await listMembers(orgId);
    let invites: Invite[] = [];
    let invitesError: unknown = null;
    try {
      invites = await listInvites(orgId);
    } catch (err) {
      invitesError = err;
    }
    return { members, invites, invitesError };
  }, [orgId, demo]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  }

  async function sendInvite() {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      if (demo) demoWriteBlocked();
      const token = await inviteMember(orgId, email.trim(), role);
      setFreshLink(joinLink(token));
      setInviting(false);
      setEmail('');
      state.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<void>, close: () => void) {
    setBusy(true);
    setError(null);
    try {
      if (demo) demoWriteBlocked();
      await action();
      close();
      state.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const members = state.data?.members ?? [];
  const invites = state.data?.invites ?? [];

  return (
    <>
      <PageHead
        title="Team"
        intro="Who can run sounds at your places, and what each of them can change."
        action={
          <Button
            onClick={() => {
              setError(null);
              setInviting(true);
            }}
            disabled={!canInvite}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Invite someone
          </Button>
        }
      />

      {freshLink ? (
        <Card className="mt-6 border-accent">
          <Label className="text-accent">Invite ready</Label>
          <p className="mt-3 text-[15px] text-ink">
            Send this link to the person you invited. It only works for the address you typed, and
            it runs out in seven days.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              readOnly
              value={freshLink}
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 min-w-0 flex-1 border border-line bg-alt px-3 font-mono text-[13px] text-ink"
              aria-label="Invite link"
            />
            <GhostButton onClick={() => void copy(freshLink)}>
              <Copy size={14} strokeWidth={1.75} aria-hidden />
              {copied === freshLink ? 'Copied' : 'Copy link'}
            </GhostButton>
            <GhostButton onClick={() => setFreshLink(null)}>Done</GhostButton>
          </div>
        </Card>
      ) : null}

      {state.error ? (
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="border-b border-line pb-3 text-[18px] font-semibold">People</h2>
        <div className="mt-5">
          {state.loading && !state.data ? (
            <SkeletonRows rows={3} />
          ) : members.length === 0 ? (
            <Empty title="Only you so far. Invite the people who look after these places." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Person</Th>
                  <Th>Role</Th>
                  <Th>Joined</Th>
                  <Th className="text-right">{''}</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isYou = m.user_id === userId;
                  return (
                    <tr key={m.id}>
                      <Td>
                        {m.display_name ?? (isYou ? 'You' : 'Teammate')}
                        {isYou && m.display_name ? ' (you)' : ''}
                      </Td>
                      <Td>
                        <Pill>{roleLabel(m.role)}</Pill>
                      </Td>
                      <Td className="whitespace-nowrap">{dateLabel(m.created_at)}</Td>
                      <Td className="text-right">
                        {amOwner && !isYou ? (
                          <GhostButton danger onClick={() => setRemovingMember(m)}>
                            Remove
                          </GhostButton>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="border-b border-line pb-3 text-[18px] font-semibold">Waiting to join</h2>
        <div className="mt-5">
          {state.data?.invitesError ? (
            <ErrorNote error={state.data.invitesError} onRetry={state.reload} />
          ) : invites.length === 0 ? (
            <Empty title="Nobody is waiting. Invite a teammate and their link shows up here." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Link runs out</Th>
                  <Th className="text-right">{''}</Th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <Td>{i.email}</Td>
                    <Td>
                      <Pill>{roleLabel(i.role)}</Pill>
                    </Td>
                    <Td className="whitespace-nowrap">{dateLabel(i.expires_at)}</Td>
                    <Td className="text-right whitespace-nowrap">
                      <GhostButton onClick={() => void copy(joinLink(i.token))}>
                        <Copy size={14} strokeWidth={1.75} aria-hidden />
                        {copied === joinLink(i.token) ? 'Copied' : 'Copy link'}
                      </GhostButton>{' '}
                      {canInvite ? (
                        <GhostButton
                          danger
                          onClick={() =>
                            void run(
                              () => cancelInvite(i.id),
                              () => undefined,
                            )
                          }
                        >
                          Cancel
                        </GhostButton>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </section>

      <Dialog
        open={inviting}
        title="Invite someone"
        onClose={() => setInviting(false)}
        onSubmit={() => void sendInvite()}
        submitLabel="Make the link"
        busy={busy}
        error={error}
      >
        <Field label="Their email" htmlFor="invite-email">
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dana@harbourhouse.com"
          />
        </Field>
        <Field
          label="What they can do"
          hint={ROLES.find((r) => r.value === role)?.note}
          htmlFor="invite-role"
        >
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
          >
            {ROLES.filter((r) => r.value !== 'owner' || amOwner).map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>

      <Dialog
        open={removingMember !== null}
        title="Remove this person"
        onClose={() => setRemovingMember(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (removingMember && orgId) await removeMember(orgId, removingMember.user_id);
            },
            () => setRemovingMember(null),
          )
        }
        submitLabel="Remove them"
        danger
        busy={busy}
        error={error}
      >
        <p className="text-[16px] text-ink">
          They lose access to {business?.name ?? 'this business'} right away. What they already ran
          stays in your history.
        </p>
      </Dialog>
    </>
  );
}
