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

import LocationScreen from '../app/location';
import PlacesScreen from '../app/(tabs)/places';
import { ToastProvider } from '../src/components';
import type { OrgPlan } from '../src/state/useOrgPlans';
import { useAccount } from '../src/state/useAccount';
import { useOrgPlans } from '../src/state/useOrgPlans';
import { usePlaces } from '../src/state/usePlaces';
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

beforeEach(() => {
  params.current = {};
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
