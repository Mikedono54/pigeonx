import {
  areaLine,
  attentionIn,
  attentionLine,
  lastSessionLine,
  protectionMode,
  rollUp,
  speakerLine,
  statusLine,
  type PlaceState,
} from '../src/core/businessPlaces';
import { can, ROLE_LABEL, ROLE_POWERS, whyNot } from '../src/core/team';
import { FLEET_STATUS_LABEL, fleetStatus } from '../src/core/speakerStatus';

function place(patch: Partial<PlaceState> = {}): PlaceState {
  return {
    id: 'l1',
    name: 'Main Street Hotel',
    target: 'pigeons',
    areas: [{ id: 'a1', name: 'Roof', planName: 'Pigeon Rotation' }],
    speakers: [{ id: 's1', name: 'Roof Speaker', status: 'online' }],
    scheduled: false,
    lastSessionAt: null,
    plansKnown: true,
    ...patch,
  };
}

describe('what a place card says it is doing', () => {
  it('names the birds and the way it is being looked after', () => {
    expect(statusLine(place())).toBe('Pigeons · Protected manually');
  });

  it('says a schedule is on when one points at it', () => {
    expect(statusLine(place({ scheduled: true }))).toBe('Pigeons · Schedule active');
  });

  it('leaves the birds out when nobody has said which ones', () => {
    expect(statusLine(place({ target: null }))).toBe('Protected manually');
  });

  it('puts trouble ahead of the schedule, because trouble stops it', () => {
    const broken = place({
      scheduled: true,
      speakers: [{ id: 's1', name: 'Roof Speaker', status: 'offline' }],
    });
    expect(protectionMode(broken)).toBe('attention');
    expect(statusLine(broken)).toBe('Pigeons · Needs attention');
  });

  it('calls an area with no plan trouble too', () => {
    expect(protectionMode(place({ areas: [{ id: 'a1', name: 'Roof', planName: null }] }))).toBe(
      'attention',
    );
  });

  it('never calls a place broken before the plans have been read', () => {
    const loading = place({
      areas: [{ id: 'a1', name: 'Roof', planName: null }],
      plansKnown: false,
    });
    expect(protectionMode(loading)).toBe('manual');
    expect(attentionIn(loading).areasWithoutPlan).toBe(0);
  });
});

describe('the last session line', () => {
  const now = new Date(2026, 7, 25, 12, 0);

  it('reads as a day and a clock', () => {
    expect(lastSessionLine(new Date(2026, 7, 25, 8, 14).getTime(), now)).toBe(
      'Last session: Today at 8:14 AM',
    );
    expect(lastSessionLine(new Date(2026, 7, 24, 17, 5).getTime(), now)).toBe(
      'Last session: Yesterday at 5:05 PM',
    );
  });

  it('says nothing has played rather than inventing a time', () => {
    expect(lastSessionLine(null, now)).toBe('No sessions yet');
  });
});

describe('the speaker line', () => {
  it('names the one speaker and what the account says about it', () => {
    expect(speakerLine([{ id: 's1', name: 'Roof Speaker', status: 'online' }])).toBe(
      'Roof Speaker · Online',
    );
    expect(speakerLine([{ id: 's2', name: 'Dock Speaker', status: 'offline' }])).toBe(
      'Dock Speaker · Offline',
    );
  });

  it('admits when nobody has heard from it yet', () => {
    expect(speakerLine([{ id: 's3', name: 'New Speaker', status: 'unknown' }])).toBe(
      'New Speaker · Not known yet',
    );
  });

  it('counts them once there is more than one, and leads with what is wrong', () => {
    const three = [
      { id: 's1', name: 'A', status: 'online' as const },
      { id: 's2', name: 'B', status: 'offline' as const },
      { id: 's3', name: 'C', status: 'online' as const },
    ];
    expect(speakerLine(three)).toBe('3 speakers · 1 offline');
    expect(speakerLine(three.map((s) => ({ ...s, status: 'online' as const })))).toBe(
      '3 speakers · 3 online',
    );
    expect(speakerLine(three.map((s) => ({ ...s, status: 'unknown' as const })))).toBe(
      '3 speakers',
    );
  });

  it('does not read a place with no speakers as a fault', () => {
    expect(speakerLine([])).toBe('No speakers yet');
    expect(protectionMode(place({ speakers: [] }))).toBe('manual');
  });

  it('takes only the two words the account is allowed to say', () => {
    expect(fleetStatus('online')).toBe('online');
    expect(fleetStatus('offline')).toBe('offline');
    expect(fleetStatus('anything else')).toBe('unknown');
    expect(fleetStatus(null)).toBe('unknown');
    expect(Object.values(FLEET_STATUS_LABEL)).toEqual(['Online', 'Offline', 'Not known yet']);
  });
});

describe('what needs attention, added up', () => {
  it('says nothing at all when nothing is wrong', () => {
    expect(attentionLine(rollUp([place(), place({ id: 'l2' })]))).toBeNull();
  });

  it('counts across every place', () => {
    const line = attentionLine(
      rollUp([
        place({ speakers: [{ id: 's1', name: 'Roof Speaker', status: 'offline' }] }),
        place({
          id: 'l2',
          areas: [
            { id: 'a2', name: 'Dock', planName: null },
            { id: 'a3', name: 'Patio', planName: null },
          ],
        }),
      ]),
    );
    expect(line).toBe('1 speaker offline · 2 areas with no plan');
  });

  it('counts one of a thing in the singular', () => {
    expect(attentionLine({ speakersOffline: 1, areasWithoutPlan: 1 })).toBe(
      '1 speaker offline · 1 area with no plan',
    );
    expect(attentionLine({ speakersOffline: 2, areasWithoutPlan: 0 })).toBe('2 speakers offline');
  });

  it('never counts a speaker nobody has heard from as offline', () => {
    const quiet = place({ speakers: [{ id: 's1', name: 'Roof Speaker', status: 'unknown' }] });
    expect(attentionIn(quiet).speakersOffline).toBe(0);
    expect(attentionLine(rollUp([quiet]))).toBeNull();
  });

  it('counts areas in words', () => {
    expect(areaLine([])).toBe('No areas yet');
    expect(areaLine([{ id: 'a1', name: 'Roof', planName: null }])).toBe('1 area');
  });
});

describe('what each role may do', () => {
  it('lets everybody on the team press play', () => {
    expect(can('staff', 'play')).toBe(true);
    expect(can('manager', 'play')).toBe(true);
    expect(can('owner', 'play')).toBe(true);
  });

  it('keeps plans and schedules to managers and owners', () => {
    expect(can('staff', 'plans')).toBe(false);
    expect(can('staff', 'schedules')).toBe(false);
    expect(can('staff', 'places')).toBe(false);
    expect(can('manager', 'plans')).toBe(true);
    expect(can('owner', 'plans')).toBe(true);
  });

  it('keeps the team itself to the owner', () => {
    expect(can('manager', 'team')).toBe(false);
    expect(can('owner', 'team')).toBe(true);
  });

  it('allows nothing at all to somebody who is on no team', () => {
    for (const action of ['play', 'plans', 'schedules', 'places', 'team'] as const) {
      expect(can(null, action)).toBe(false);
    }
  });

  it('says who to ask instead of just refusing', () => {
    expect(whyNot('plans')).toBe('Managers can do this. Ask one of yours.');
    expect(whyNot('team')).toBe('Owners can do this. Ask one of yours.');
  });

  it('names the three roles the way the account does', () => {
    expect(ROLE_LABEL).toEqual({ owner: 'Owner', manager: 'Manager', staff: 'Staff' });
    expect(ROLE_POWERS.staff).toBe('Staff can start and stop sounds.');
    expect(ROLE_POWERS.manager).toBe('Managers can change plans and schedules.');
    expect(ROLE_POWERS.owner).toBe('Owners manage the team and billing.');
  });
});
