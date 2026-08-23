import {
  joinLink,
  membershipFromRow,
  orgIdFromCreate,
  roleFrom,
  teammateFromRow,
  tokenFromInvite,
} from '../src/services/business';
import { buildPlaces, speakerFromRow } from '../src/services/placesRemote';
import { liveFromRows } from '../src/services/live';
import { describePlace, elapsedClock, liveLabel, liveTone, speakerCount } from '../src/core/places';

describe('reading a business off the server', () => {
  it('takes the plain shape', () => {
    expect(membershipFromRow({ org_id: 'o1', org_name: 'Main Street', role: 'owner' })).toEqual({
      orgId: 'o1',
      name: 'Main Street',
      role: 'owner',
    });
  });

  it('takes a shape with the business tucked inside', () => {
    expect(
      membershipFromRow({
        organizations: { id: 'o2', name: 'Dock Co' },
        role: 'manager',
      }),
    ).toEqual({ orgId: 'o2', name: 'Dock Co', role: 'manager' });
  });

  it('falls back to the safest thing a person can do', () => {
    expect(membershipFromRow({ org_id: 'o3' })).toEqual({
      orgId: 'o3',
      name: 'Your business',
      role: 'staff',
    });
    expect(roleFrom('nonsense')).toBe('staff');
  });

  it('skips a row with no business in it', () => {
    expect(membershipFromRow(null)).toBeNull();
    expect(membershipFromRow({ role: 'owner' })).toBeNull();
  });
});

describe('reading a teammate', () => {
  it('knows which row is you', () => {
    const mate = teammateFromRow(
      { id: 'm1', user_id: 'u1', role: 'owner', created_at: '2026-08-01T00:00:00Z' },
      'u1',
    );
    expect(mate.you).toBe(true);
    expect(mate.label).toBe('You');
    expect(mate.role).toBe('owner');
  });

  it('names someone by their email when the server sends one', () => {
    const mate = teammateFromRow(
      { id: 'm2', user_id: 'u2', role: 'staff', email: 'them@example.com' },
      'u1',
    );
    expect(mate.label).toBe('them@example.com');
    expect(mate.you).toBe(false);
  });

  it('says teammate when there is no name to show', () => {
    expect(teammateFromRow({ user_id: 'u3' }, 'u1').label).toBe('Teammate');
  });
});

describe('the link you send someone', () => {
  it('points at the join page', () => {
    expect(joinLink('abc')).toBe('https://pigeonx.org/app/join?token=abc');
  });

  it('keeps an odd token safe to paste', () => {
    expect(joinLink('a b&c')).toBe('https://pigeonx.org/app/join?token=a%20b%26c');
  });

  it('reads the token back out of whatever the server sends', () => {
    expect(tokenFromInvite('t1')).toBe('t1');
    expect(tokenFromInvite({ token: 't2' })).toBe('t2');
    expect(tokenFromInvite([{ invite_token: 't3' }])).toBe('t3');
    expect(tokenFromInvite(null)).toBeNull();
  });

  it('reads a new business id out of whatever the server sends', () => {
    expect(orgIdFromCreate('o1')).toBe('o1');
    expect(orgIdFromCreate({ id: 'o2' })).toBe('o2');
    expect(orgIdFromCreate([{ org_id: 'o3' }])).toBe('o3');
    expect(orgIdFromCreate(undefined)).toBeNull();
  });
});

describe('building places out of flat lists', () => {
  const places = buildPlaces(
    [
      { id: 'l1', name: 'Main Street Hotel' },
      { id: 'l2', name: 'Dock' },
    ],
    [
      { id: 'z1', name: 'Roof', location_id: 'l1' },
      { id: 'z2', name: 'Patio', location_id: 'l1' },
    ],
    [
      { id: 'd1', name: 'Roof corner', zone_id: 'z1' },
      { id: 'd2', name: 'Roof edge', zone_id: 'z1' },
    ],
  );

  it('puts every area under its building', () => {
    expect(places[0].areas.map((a) => a.name)).toEqual(['Roof', 'Patio']);
    expect(places[1].areas).toEqual([]);
  });

  it('puts every speaker in its area', () => {
    expect(places[0].areas[0].speakers?.map((s) => s.name)).toEqual(['Roof corner', 'Roof edge']);
    expect(places[0].areas[1].speakers).toEqual([]);
  });

  it('counts what is inside a place', () => {
    expect(speakerCount(places[0])).toBe(2);
    expect(describePlace(places[0])).toBe('2 areas, 2 speakers');
    expect(describePlace(places[1])).toBe('0 areas, 0 speakers');
  });

  it('names a speaker with nothing in the row', () => {
    expect(speakerFromRow({}).name).toBe('Speaker');
  });
});

describe('what is playing right now', () => {
  it('reads an area that is playing', () => {
    const live = liveFromRows([
      { zone_id: 'z1', playing: true, started_at: '2026-08-21T12:00:00Z' },
    ]);
    expect(live.z1.playing).toBe(true);
    expect(live.z1.startedAt).toBe(Date.parse('2026-08-21T12:00:00Z'));
  });

  it('treats an open run as playing even with no flag', () => {
    const live = liveFromRows([{ zone_id: 'z2', started_at: '2026-08-21T12:00:00Z' }]);
    expect(live.z2.playing).toBe(true);
  });

  it('treats a finished run as off', () => {
    const live = liveFromRows([
      {
        zone_id: 'z3',
        started_at: '2026-08-21T12:00:00Z',
        ended_at: '2026-08-21T12:30:00Z',
      },
    ]);
    expect(live.z3.playing).toBe(false);
    expect(live.z3.startedAt).toBeNull();
  });

  it('shrugs off anything that is not a list', () => {
    expect(liveFromRows(null)).toEqual({});
    expect(liveFromRows([null, 3, { nothing: true }])).toEqual({});
  });
});

describe('the words on an area row', () => {
  const noon = Date.parse('2026-08-21T12:00:00Z');

  it('counts up while a sound plays', () => {
    expect(liveLabel({ playing: true, startedAt: noon }, noon + 12 * 60_000 + 40_000)).toBe(
      'Playing 12:40',
    );
  });

  it('says Off when nothing is playing', () => {
    expect(liveLabel({ playing: false, startedAt: null })).toBe('Off');
    expect(liveLabel(undefined)).toBe('Off');
  });

  it('says Playing with no clock when it does not know when it started', () => {
    expect(liveLabel({ playing: true, startedAt: null })).toBe('Playing');
  });

  it('marks a playing area so it stands out', () => {
    expect(liveTone({ playing: true, startedAt: noon })).toBe('running');
    expect(liveTone(undefined)).toBe('idle');
  });

  it('counts from zero', () => {
    expect(elapsedClock(0)).toBe('00:00');
    expect(elapsedClock(-5)).toBe('00:00');
    expect(elapsedClock(61_000)).toBe('01:01');
  });
});
