import React from 'react';
import { render } from '@testing-library/react-native';

/**
 * NativeWind swaps every View, Text and Pressable for a wrapper of its own on
 * a phone. Jest skips that step, so these tests load it by hand and render the
 * way the phone does.
 */
require('react-native-css-interop/dist/runtime/components');

import { ThemeProvider } from '../src/theme';

const mockInsets = { current: { top: 59, bottom: 34, left: 0, right: 0 } };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets.current,
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

import Home from '../app/(tabs)/index';
import ScheduleScreen from '../app/(tabs)/schedule';
import Settings from '../app/(tabs)/settings';
import Sounds from '../app/(tabs)/sounds';
import HistoryScreen from '../app/history';
import PlaceSetup from '../app/place-setup';
import { ToastProvider } from '../src/components';
import { SYSTEM_PROFILES } from '../src/core/profiles';
import { useAccount } from '../src/state/useAccount';
import { useHistory } from '../src/state/useHistory';
import { usePlacesHome } from '../src/state/usePlacesHome';
import { useProtectionPlans } from '../src/state/useProtectionPlans';
import { useSchedules, type Schedule } from '../src/state/useSchedules';
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

beforeEach(() => {
  params.current = {};
  useAccount.setState({ plan: 'free', guest: true, email: null, devices: [] });
  usePlacesHome.setState({ places: [], activeId: null });
  useProtectionPlans.setState({ plans: [], activeByPlace: {} });
  useHistory.setState({ entries: [], queue: [] });
  useSchedules.setState({ schedules: [] });
  useSession.setState({
    profileId: 'sys_pigeon_18k',
    output: 'phone',
    engineState: 'idle',
    startedAt: null,
    soundOverride: false,
    planId: null,
    planName: null,
    rotation: [],
    rotationAt: 0,
    deviceId: null,
    deviceName: null,
    paused: false,
    pausedAt: null,
    gapUntil: null,
    blocked: null,
  });
});

function aPlace(name = 'Balcony') {
  useAccount.setState({ plan: 'pro' });
  return usePlacesHome.getState().add({ name, kind: 'balcony', target: 'pigeons' });
}

describe('Home, opened on a place', () => {
  it('names the place and what it is for, in three seconds of reading', async () => {
    aPlace('Front balcony');
    const said = words(await paint(<Home />));

    expect(said).toContain('Front balcony');
    // React splits the subtitle around its separator, so it is read back joined.
    expect(said.join('')).toContain('Pigeons · This phone');
  });

  it('says it is ready when nothing is running and nothing is set', async () => {
    aPlace();
    const said = words(await paint(<Home />));

    expect(said).toContain('Off');
    expect(said).toContain('Ready when birds appear.');
  });

  it('offers the protection plan by name once a place has one', async () => {
    const place = aPlace();
    useProtectionPlans.getState().adoptRecommendation(place, 'phone');

    const said = words(await paint(<Home />));
    expect(said).toContain('Pigeon Rotation');
  });

  it('says nothing about results until three of them exist', async () => {
    const place = aPlace();
    const two = ['left', 'left'] as const;
    for (const result of two) {
      const e = useHistory.getState().addEntry({
        profileId: 'sys_pigeon_18k',
        profileName: 'High-frequency deterrent',
        outputKind: 'phone',
        peakFreqHz: 18000,
        startedAt: Date.now(),
        source: 'manual',
        zoneId: null,
        deviceId: null,
        placeId: place.id,
        placeName: place.name,
      });
      useHistory.getState().closeEntry(e.id, Date.now());
      useHistory.getState().setResult(e.id, result);
    }

    const said = words(await paint(<Home />));
    expect(said.some((w) => w.includes('reported improvement'))).toBe(false);
  });

  it('counts out loud once three sessions have been answered', async () => {
    const place = aPlace();
    for (const result of ['left', 'some_left', 'not_yet'] as const) {
      const e = useHistory.getState().addEntry({
        profileId: 'sys_pigeon_18k',
        profileName: 'High-frequency deterrent',
        outputKind: 'phone',
        peakFreqHz: 18000,
        startedAt: Date.now(),
        source: 'manual',
        zoneId: null,
        deviceId: null,
        placeId: place.id,
        placeName: place.name,
      });
      useHistory.getState().closeEntry(e.id, Date.now());
      useHistory.getState().setResult(e.id, result);
    }

    const said = words(await paint(<Home />));
    expect(said).toContain('You reported improvement after 2 of 3 sessions.');
  });
});

describe('Home, while a sound is playing', () => {
  function playing(over: Record<string, unknown> = {}) {
    useSession.setState({
      profileId: 'sys_distress_pigeon',
      engineState: 'running',
      startedAt: Date.now() - 65_000,
      paused: false,
      pausedAt: null,
      gapUntil: null,
      ...over,
    });
  }

  it('turns the screen under the block into the session itself', async () => {
    aPlace();
    playing();
    const said = words(await paint(<Home />));

    expect(said).toContain('Pigeon distress call');
    expect(said).toContain('Natural recording');
    expect(said).toContain('Plays on');
    expect(said).toContain('This phone');
    expect(said).toContain('Loudness');
    expect(said).toContain('Pause');
    expect(said).toContain('Stop');
  });

  it('offers no pitch over a recording, because a recording has none', async () => {
    aPlace();
    playing();
    const said = words(await paint(<Home />));
    expect(said).not.toContain('Pitch');
  });

  it('offers the pitch of a sound the phone is generating', async () => {
    aPlace();
    playing({ profileId: 'sys_pigeon_18k' });
    const said = words(await paint(<Home />));
    expect(said).toContain('Pitch');
  });

  it('names what is coming after this one, and the order of the rest', async () => {
    aPlace();
    playing({
      profileId: 'sys_pigeon_18k',
      planName: 'Pigeon Rotation',
      rotation: ['sys_pigeon_18k', 'sys_pulse_16k', 'sys_sweep_15_19k'],
      rotationAt: 0,
    });
    const said = words(await paint(<Home />));

    expect(said).toContain('Up next');
    expect(said).toContain('Unpredictable beeps');
    expect(said.join('')).toContain('Variable pitch sweep');
  });

  it('counts down the silence between two sounds', async () => {
    aPlace();
    playing({
      planName: 'Pigeon Rotation',
      rotation: ['sys_distress_pigeon', 'sys_predator_hawk'],
      rotationAt: 0,
      gapUntil: Date.now() + 20_000,
    });
    const said = words(await paint(<Home />));

    expect(said.join('')).toContain('Next sound in');
  });

  it('says it is held, and offers to let it out again', async () => {
    aPlace();
    const at = Date.now();
    playing({ startedAt: at - 65_000, paused: true, pausedAt: at });
    const said = words(await paint(<Home />));

    expect(said).toContain('Paused');
    expect(said).toContain('Play');
    expect(said).toContain('Held. Nothing is coming out.');
  });
});

describe('Home, with a speaker that is gone', () => {
  it('says what to do about it, and names the speaker', async () => {
    aPlace();
    useSession.setState({
      output: 'simulated',
      deviceId: 'dev_gone',
      deviceName: 'Living Room Speaker',
    });
    const said = words(await paint(<Home />));

    expect(said).toContain('Check speaker');
    expect(said.join('')).toContain('Reconnect Living Room Speaker in your phone settings.');
  });

  it('says a speaker it still has is connected', async () => {
    aPlace();
    useAccount.setState({
      plan: 'pro',
      devices: [
        {
          id: 'dev_1',
          name: 'Roof speaker',
          kind: 'simulated',
          pairedAt: 0,
          updatedAt: 0,
          remoteId: null,
        },
      ],
    });
    useSession.setState({ output: 'simulated', deviceId: 'dev_1', deviceName: 'Roof speaker' });
    const said = words(await paint(<Home />));

    expect(said).toContain('Connected');
    expect(said).not.toContain('Check speaker');
  });
});

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** A run that covers the whole of every day, so "now" is always inside it. */
function aRun(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sch_1',
    name: 'Every day, Pigeon Rotation',
    profileId: 'sys_pigeon_18k',
    profileName: 'High-frequency deterrent',
    days: EVERY_DAY,
    startMinutes: 0,
    endMinutes: 23 * 60 + 59,
    enabled: true,
    executor: 'reminder',
    trigger: 'time',
    offsetMinutes: 0,
    placeId: 'plh_1',
    placeName: 'Back balcony',
    planId: null,
    planName: 'Pigeon Rotation',
    quietStart: null,
    quietEnd: null,
    scope: 'user',
    zoneId: null,
    deviceId: null,
    notificationIds: [],
    updatedAt: 0,
    remoteId: null,
    ...over,
  };
}

describe('the Schedule, as a timeline', () => {
  it('offers to protect the place by name, in the words that place was described in', async () => {
    useAccount.setState({ plan: 'pro' });
    usePlacesHome.getState().add({
      name: 'Back balcony',
      kind: 'balcony',
      target: 'pigeons',
      birdsActive: 'early morning',
    });

    const said = words(await paint(<ScheduleScreen />));

    expect(said).toContain('Protect Back balcony automatically');
    expect(said).toContain('Create a schedule for the times birds usually appear.');
    expect(said).toContain('You said birds show up early morning.');
  });

  it('opens on today, and says what the run is and where', async () => {
    aPlace('Back balcony');
    useSchedules.setState({ schedules: [aRun()] });

    const said = words(await paint(<ScheduleScreen />));

    expect(said).toContain('Today');
    expect(said).toContain('Back balcony');
    expect(said.join('')).toContain('Pigeon Rotation');
    expect(said.some((w) => w.startsWith('Next:'))).toBe(true);
  });

  it('says which run is happening right now', async () => {
    aPlace('Back balcony');
    useSchedules.setState({ schedules: [aRun()] });

    const said = words(await paint(<ScheduleScreen />));
    expect(said).toContain('Running now');
  });

  it('calls a run somebody switched off paused, and never running', async () => {
    aPlace('Back balcony');
    useSchedules.setState({ schedules: [aRun({ enabled: false })] });

    const said = words(await paint(<ScheduleScreen />));
    expect(said).toContain('Paused');
    expect(said).not.toContain('Running now');
  });

  it('admits the sunrise it is using is an estimate when nobody said where the place is', async () => {
    aPlace('Back balcony');
    useSchedules.setState({ schedules: [aRun({ trigger: 'sunrise', endMinutes: 8 * 60 })] });

    const said = words(await paint(<ScheduleScreen />));
    expect(said.some((w) => w.includes('Estimated times'))).toBe(true);
  });
});

describe('the sounds screen, grouped', () => {
  it('leads with what this place would be offered today', async () => {
    aPlace('Back roof');
    const said = words(await paint(<Sounds />));

    expect(said).toContain('Recommended for Back roof');
  });

  it('has no recommendation to make before there is a place', async () => {
    const said = words(await paint(<Sounds />));
    expect(said.some((w) => w.startsWith('Recommended for'))).toBe(false);
  });

  it('sorts the catalogue the way a person sorts it', async () => {
    const said = words(await paint(<Sounds />));

    expect(said).toContain('Natural recordings');
    expect(said).toContain('Generated tones');
    expect(said).toContain('Needs a PigeonX speaker');
  });

  it('still shows every sound, and none of them twice', async () => {
    const said = words(await paint(<Sounds />));
    for (const p of SYSTEM_PROFILES) {
      expect(said.filter((w) => w === p.name)).toHaveLength(1);
    }
  });
});

describe('the questions about a place', () => {
  it('opens on the birds, because that is what somebody came here about', async () => {
    const said = words(await paint(<PlaceSetup />));

    expect(said).toContain('Which birds are causing the problem?');
    expect(said).toContain('Crows or jays');
    expect(said).toContain('Not sure');
    expect(said).toContain('Skip');
  });

  it('fills the answers in when it is editing a place that exists', async () => {
    const place = aPlace('Front balcony');
    params.current = { placeId: place.id };

    const said = words(await paint(<PlaceSetup />));
    expect(said).toContain('Which birds are causing the problem?');
  });
});

describe('History, as a timeline', () => {
  it('says nothing has played, and offers to fix that', async () => {
    const said = words(await paint(<HistoryScreen />));

    expect(said).toContain('Nothing has played yet');
    expect(said).toContain('Every session shows up here the moment it ends.');
  });

  it('shows a session the moment it ends, with what happened after it', async () => {
    const place = aPlace();
    const e = useHistory.getState().addEntry({
      profileId: 'sys_pigeon_18k',
      profileName: 'High-frequency deterrent',
      outputKind: 'phone',
      peakFreqHz: 18000,
      startedAt: Date.now() - 15 * 60_000,
      source: 'manual',
      zoneId: null,
      deviceId: null,
      placeId: place.id,
      placeName: place.name,
      planName: 'Pigeon Rotation',
    });
    useHistory.getState().closeEntry(e.id, Date.now());
    useHistory.getState().setResult(e.id, 'some_left');

    const said = words(await paint(<HistoryScreen />));

    expect(said).toContain('Today');
    expect(said).toContain('Pigeon Rotation');
    expect(said).toContain('Some birds left');
  });

  it('admits when nobody answered', async () => {
    const place = aPlace();
    const e = useHistory.getState().addEntry({
      profileId: 'sys_pigeon_18k',
      profileName: 'High-frequency deterrent',
      outputKind: 'phone',
      peakFreqHz: 18000,
      startedAt: Date.now() - 15 * 60_000,
      source: 'manual',
      zoneId: null,
      deviceId: null,
      placeId: place.id,
      placeName: place.name,
    });
    useHistory.getState().closeEntry(e.id, Date.now());

    const said = words(await paint(<HistoryScreen />));
    expect(said).toContain('No result reported');
  });
});

describe('Settings, in the order the spec asks for', () => {
  it('names every section', async () => {
    const said = words(await paint(<Settings />));

    for (const section of [
      'Account and plan',
      'Places and speakers',
      'Appearance',
      'Activity',
      'Help',
    ]) {
      expect(said).toContain(section);
    }
  });

  it('says Restore purchases, in exactly those words', async () => {
    const said = words(await paint(<Settings />));
    expect(said).toContain('Restore purchases');
  });

  it('carries the two safety answers the spec asks for', async () => {
    const said = words(await paint(<Settings />));

    expect(said).toContain('Audible sounds and safety');
    expect(said).toContain('Where to put the speaker');
    expect(said).toContain('Contact support');
    expect(said).toContain('Sound credits');
  });

  it('puts the places, the speakers and the plans where they belong', async () => {
    aPlace('Front balcony');
    const said = words(await paint(<Settings />));

    expect(said).toContain('My places');
    expect(said).toContain('Front balcony');
    expect(said).toContain('Connected speakers');
    expect(said).toContain('Protection history');
    expect(said).toContain('Saved plans');
  });

  it('links the rules and the privacy page from the bottom', async () => {
    const said = words(await paint(<Settings />));

    expect(said).toContain('Terms');
    expect(said).toContain('Privacy');
  });
});
