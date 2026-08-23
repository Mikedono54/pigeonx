import { describe, expect, it } from 'vitest';
import {
  AcceptInviteInput,
  CreateOrgInput,
  InviteMemberInput,
  RemoveMemberInput,
  StripeCheckoutInput,
  UserDeviceInput,
  UserScheduleInput,
} from './schemas.js';

const ORG = '00000000-0000-0000-0000-0000000000aa';
const USER = '00000000-0000-0000-0000-0000000000bb';
const PROFILE = '00000000-0000-0000-0000-000000000001';

describe('CreateOrgInput', () => {
  it('trims the name', () => {
    expect(CreateOrgInput.parse({ name: '  Harbor Hotel  ' }).name).toBe('Harbor Hotel');
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(CreateOrgInput.safeParse({ name: '' }).success).toBe(false);
    expect(CreateOrgInput.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('InviteMemberInput', () => {
  it('lowercases the email so the address matches at accept time', () => {
    const parsed = InviteMemberInput.parse({ org_id: ORG, email: '  Sam@Example.COM ' });
    expect(parsed.email).toBe('sam@example.com');
  });

  it('defaults the role to staff', () => {
    expect(InviteMemberInput.parse({ org_id: ORG, email: 'sam@example.com' }).role).toBe('staff');
  });

  it('accepts owner and manager roles', () => {
    for (const role of ['owner', 'manager', 'staff'] as const) {
      expect(InviteMemberInput.safeParse({ org_id: ORG, email: 'a@b.co', role }).success).toBe(
        true,
      );
    }
  });

  it('rejects a role that is not a role', () => {
    expect(
      InviteMemberInput.safeParse({ org_id: ORG, email: 'a@b.co', role: 'admin' }).success,
    ).toBe(false);
  });

  it('rejects a bad address or a bad org id', () => {
    expect(InviteMemberInput.safeParse({ org_id: ORG, email: 'not-an-email' }).success).toBe(false);
    expect(InviteMemberInput.safeParse({ org_id: 'org-1', email: 'a@b.co' }).success).toBe(false);
  });
});

describe('AcceptInviteInput', () => {
  it('accepts a uuid token', () => {
    expect(AcceptInviteInput.safeParse({ token: ORG }).success).toBe(true);
  });

  it('rejects anything that is not a uuid', () => {
    expect(AcceptInviteInput.safeParse({ token: 'abc123' }).success).toBe(false);
    expect(AcceptInviteInput.safeParse({}).success).toBe(false);
  });
});

describe('RemoveMemberInput', () => {
  it('needs both ids', () => {
    expect(RemoveMemberInput.safeParse({ org_id: ORG, user_id: USER }).success).toBe(true);
    expect(RemoveMemberInput.safeParse({ org_id: ORG }).success).toBe(false);
  });
});

describe('UserScheduleInput', () => {
  const base = {
    profile_id: PROFILE,
    days: [1, 2, 3],
    start_time: '06:00',
    end_time: '09:00',
  };

  it('defaults to a reminder on this phone, enabled', () => {
    const parsed = UserScheduleInput.parse(base);
    expect(parsed.executor).toBe('reminder');
    expect(parsed.enabled).toBe(true);
    expect(parsed.zone_id).toBeUndefined();
  });

  it('rejects an empty window', () => {
    expect(UserScheduleInput.safeParse({ ...base, end_time: '06:00' }).success).toBe(false);
  });

  it('rejects a day outside 0–6 and an empty day list', () => {
    expect(UserScheduleInput.safeParse({ ...base, days: [7] }).success).toBe(false);
    expect(UserScheduleInput.safeParse({ ...base, days: [] }).success).toBe(false);
  });
});

describe('UserDeviceInput', () => {
  it('accepts every device kind', () => {
    for (const kind of ['phone', 'bt_speaker', 'pigeonx_emitter', 'simulated'] as const) {
      expect(UserDeviceInput.safeParse({ kind, name: 'Patio' }).success).toBe(true);
    }
  });

  it('needs a name', () => {
    expect(UserDeviceInput.safeParse({ kind: 'phone', name: '' }).success).toBe(false);
  });
});

describe('StripeCheckoutInput', () => {
  const base = {
    org_id: ORG,
    locations: 3,
    success_url: 'https://pigeonx.org/app/billing?ok=1',
    cancel_url: 'https://pigeonx.org/app/billing',
  };

  it('accepts a whole number of locations', () => {
    expect(StripeCheckoutInput.parse(base).locations).toBe(3);
  });

  it('rejects zero, fractional or absurd location counts', () => {
    expect(StripeCheckoutInput.safeParse({ ...base, locations: 0 }).success).toBe(false);
    expect(StripeCheckoutInput.safeParse({ ...base, locations: 1.5 }).success).toBe(false);
    expect(StripeCheckoutInput.safeParse({ ...base, locations: 100_000 }).success).toBe(false);
  });

  it('rejects a non-url redirect', () => {
    expect(StripeCheckoutInput.safeParse({ ...base, success_url: '/app/billing' }).success).toBe(
      false,
    );
  });
});
