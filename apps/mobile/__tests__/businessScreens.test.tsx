import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * NativeWind swaps every View, Text and Pressable for a wrapper of its own on
 * a phone. Jest skips that step, so these tests load it by hand and render the
 * way the phone does.
 */
require('react-native-css-interop/dist/runtime/components');

import { ThemeProvider } from '../src/theme';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const params = { current: {} as Record<string, string> };

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => params.current,
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
}));

// Nothing here talks to an account. Every screen is handed the state it would
// have had after one did.
jest.mock('../src/services/activity', () => ({ refreshPlaceActivity: async () => {} }));
jest.mock('../src/services/live', () => ({ watchLive: () => () => {} }));

// What played somewhere else comes down the same pipe as everything else. The
// rows are put straight into the list instead.
jest.mock('../src/services/business', () => ({
  ...jest.requireActual('../src/services/business'),
  listTeam: async () => [
    { id: 'm1', userId: 'u1', role: 'owner', label: 'You', addedAt: null, you: true },
    {
      id: 'm2',
      userId: 'u2',
      role: 'manager',
      label: 'dana@example.com',
      addedAt: null,
      you: false,
    },
    { id: 'm3', userId: 'u3', role: 'staff', label: 'sam@example.com', addedAt: null, you: false },
  ],
}));

jest.mock('../src/services/sync', () => ({
  ...jest.requireActual('../src/services/sync'),
  fetchRemoteHistory: async () => [],
}));

import HistoryScreen from '../app/history';
import LocationScreen from '../app/location';
import TeamScreen from '../app/team';
import PlacesScreen from '../app/(tabs)/places';
import { ToastProvider } from '../src/components';
import type { OrgPlan } from '../src/state/useOrgPlans';
import { useAccount } from '../src/state/useAccount';
import { useOrgPlans } from '../src/state/useOrgPlans';
import { usePlaces } from '../src/state/usePlaces';
import { useHistory, type SessionEntry } from '../src/state/useHistory';
import { useSchedules } from '../src/state/useSchedules';
import { useSession } from '../src/state/useSession';

interface Node {
  type: string;
  props: Record<string, unknown>;
  children: (Node | string)[] | null;
}

/** Every word a person can read on this screen. */
function words(root: Node | string | null): string[] {
  if (!root) return [];
  if (typeof root === 'string') return [root];
  return (root.children ?? []).flatMap(words);
}

async function paint(node: React.ReactElement): Promise<Node> {
  const view = await render(
    <ThemeProvider>
      <ToastProvider>{node}</ToastProvider>
    </ThemeProvider>,
  );
  return view.toJSON() as unknown as Node;
}

const A_PLAN: OrgPlan = {
  id: 'plan_1',
  zoneId: 'zone_roof',
  name: 'Roof Rotation',
  target: 'pigeons',
  soundIds: ['sys_distress_pigeon', 'sys_predator_hawk'],
  randomizeOrder: true,
  intervalSeconds: 0,
  sessionMinutes: 15,
  output: 'phone',
  volume: 0.85,
  quietStart: null,
  quietEnd: null,
  days: [1, 2, 3, 4, 5, 6, 7],
  startsOn: null,
  endsOn: null,
};

function aBusiness(over: { role?: 'owner' | 'manager' | 'staff' } = {}) {
  useAccount.setState({
    plan: 'business',
    guest: false,
    userId: 'u1',
    activeOrgId: 'org_1',
    activeOrgName: 'Harbour Group',
    activeOrgRole: over.role ?? 'manager',
    devices: [],
  });

  usePlaces.setState({
    mode: 'business',
    orgId: 'org_1',
    problem: null,
    live: {},
    activity: { loc_1: new Date(2026, 7, 25, 8, 14).getTime() },
    activityKnown: true,
    places: [
      {
        id: 'loc_1',
        name: 'Main Street Hotel',
        target: 'pigeons',
        limitAudible: false,
        areas: [
          {
            id: 'zone_roof',
            name: 'Roof',
            speakerIds: [],
            speakers: [{ id: 'dev_1', name: 'Roof Speaker', status: 'online' }],
          },
        ],
      },
    ],
    // The screens ask the account for a fresh list on the way in. These tests
    // hand them the answer instead.
    refresh: async () => {},
  });

  useOrgPlans.setState({ plans: [A_PLAN], loaded: true, problem: null, refresh: async () => {} });
  useSchedules.setState({ schedules: [] });
  useSession.setState({ zoneId: null, engineState: 'idle', startedAt: null });
}

function aRun(over: Partial<SessionEntry> = {}): SessionEntry {
  return {
    id: `ses_${Math.random()}`,
    profileId: 'sys_pigeon_18k',
    profileName: 'High-frequency deterrent',
    outputKind: 'phone',
    peakFreqHz: 18000,
    startedAt: Date.now() - 60 * 60 * 1000,
    endedAt: Date.now() - 45 * 60 * 1000,
    source: 'manual',
    zoneId: 'zone_roof',
    deviceId: null,
    placeId: null,
    placeName: null,
    locationId: 'loc_1',
    locationName: 'Main Street Hotel',
    areaName: 'Roof',
    planId: null,
    planName: 'Roof Rotation',
    result: null,
    resultAsked: true,
    remoteId: 'r1',
    synced: true,
    ...over,
  };
}

beforeEach(() => {
  params.current = {};
  useHistory.setState({ entries: [], queue: [] });
  aBusiness();
});

describe('the places a business looks after', () => {
  it('reads each building as a card: what it is for, when it ran, its speakers', async () => {
    const said = words(await paint(<PlacesScreen />)).join('|');

    expect(said).toContain('Main Street Hotel');
    expect(said).toContain('Pigeons · Protected manually');
    expect(said).toContain('Last session: Today at 8:14 AM');
    expect(said).toContain('Roof Speaker · Online');
  });

  it('says a schedule is on when one points at an area of it', async () => {
    useSchedules.setState({
      schedules: [
        {
          id: 'sch_1',
          name: 'Mornings',
          profileId: 'sys_pigeon_18k',
          profileName: 'High-frequency deterrent',
          days: [1, 2, 3, 4, 5],
          startMinutes: 6 * 60,
          endMinutes: 9 * 60,
          enabled: true,
          executor: 'reminder',
          trigger: 'time',
          offsetMinutes: 0,
          placeId: null,
          placeName: null,
          planId: null,
          planName: null,
          quietStart: null,
          quietEnd: null,
          scope: 'org',
          zoneId: 'zone_roof',
          deviceId: null,
          notificationIds: [],
          updatedAt: 0,
          remoteId: 'row_1',
        },
      ],
    });

    expect(words(await paint(<PlacesScreen />)).join('|')).toContain(
      'Pigeons · Schedule active',
    );
  });

  it('counts what needs attention at the top, in one plain line', async () => {
    usePlaces.setState({
      places: [
        {
          id: 'loc_1',
          name: 'Main Street Hotel',
          target: 'pigeons',
          areas: [
            {
              id: 'zone_roof',
              name: 'Roof',
              speakerIds: [],
              speakers: [{ id: 'dev_1', name: 'Roof Speaker', status: 'offline' }],
            },
            { id: 'zone_dock', name: 'Dock', speakerIds: [], speakers: [] },
          ],
        },
      ],
    });

    const said = words(await paint(<PlacesScreen />));
    expect(said).toContain('1 speaker offline · 1 area with no plan');
    expect(said.join('|')).toContain('Pigeons · Needs attention');
  });

  it('says nothing at the top when nothing is wrong', async () => {
    const said = words(await paint(<PlacesScreen />)).join('|');
    expect(said).not.toContain('offline');
    expect(said).not.toContain('with no plan');
  });

  it('offers Add a place to a manager and not to a teammate', async () => {
    expect(words(await paint(<PlacesScreen />))).toContain('Add a place');

    useAccount.setState({ activeOrgRole: 'staff' });
    expect(words(await paint(<PlacesScreen />))).not.toContain('Add a place');
  });
});

describe('one building, opened up', () => {
  beforeEach(() => {
    params.current = { id: 'loc_1' };
  });

  it('names each area, its plan and its speakers', async () => {
    const said = words(await paint(<LocationScreen />)).join('|');

    expect(said).toContain('Roof');
    expect(said).toContain('Roof Rotation');
    expect(said).toContain('2 sounds, 15 minutes');
    expect(said).toContain('Roof Speaker');
    expect(said).toContain('Online');
  });

  it('says an area has no plan rather than leaving the line blank', async () => {
    useOrgPlans.setState({ plans: [], loaded: true });
    expect(words(await paint(<LocationScreen />))).toContain('No plan yet');
  });

  it('lets anybody on the team start a session on an area', async () => {
    useAccount.setState({ activeOrgRole: 'staff' });
    expect(words(await paint(<LocationScreen />))).toContain('Start');
  });

  it('shows a teammate the plan and does not offer them the area buttons', async () => {
    useAccount.setState({ activeOrgRole: 'staff' });
    const said = words(await paint(<LocationScreen />));

    expect(said.join('|')).toContain('Roof Rotation');
    expect(said).not.toContain('Add a speaker');
    expect(said).not.toContain('Add an area');
  });

  it('says so plainly when the place is not there any more', async () => {
    params.current = { id: 'gone' };
    expect(words(await paint(<LocationScreen />))).toContain('That place is gone');
  });
});

describe('what played, everywhere the team looks after', () => {
  it('names the building and the area on every line', async () => {
    useHistory.setState({ entries: [aRun()], queue: [] });

    const said = words(await paint(<HistoryScreen />)).join('|');
    expect(said).toContain('Roof Rotation');
    expect(said).toContain('Main Street Hotel · Roof');
  });

  it('offers one chip a building, and Everywhere', async () => {
    usePlaces.setState({
      places: [
        ...usePlaces.getState().places,
        { id: 'loc_2', name: 'Harbour Dock', areas: [] },
      ],
    });
    useHistory.setState({ entries: [aRun()], queue: [] });

    const said = words(await paint(<HistoryScreen />));
    expect(said).toContain('Everywhere');
    expect(said).toContain('Main Street Hotel');
    expect(said).toContain('Harbour Dock');
  });

  it('says which run it could not place rather than leaving a gap', async () => {
    useHistory.setState({
      entries: [aRun({ locationId: null, locationName: null, areaName: null })],
      queue: [],
    });

    const said = words(await paint(<HistoryScreen />)).join('|');
    expect(said).toContain('Roof Rotation');
    expect(said).not.toContain('· ·');
  });
});

describe('the team, and what each of them may do', () => {
  it('names every role the way the account does', async () => {
    const said = words(await paint(<TeamScreen />));

    expect(said).toContain('Owner');
    expect(said).toContain('Manager');
    expect(said).toContain('Staff');
    expect(said).not.toContain('Teammate');
  });

  it('puts who can do what one tap away', async () => {
    expect(words(await paint(<TeamScreen />))).toContain('Who can do what');
  });

  it('still invites by email', async () => {
    expect(words(await paint(<TeamScreen />))).toContain('Invite by email');
  });
});
