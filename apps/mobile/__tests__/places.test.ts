import {
  AREA_SIZE_HINT,
  AREA_SIZE_LABELS,
  BIRD_TARGET_LABELS,
  MIN_REPORTS_FOR_SUMMARY,
  NO_RESULT_LINE,
  PLACE_KIND_LABELS,
  SESSION_RESULT_LABELS,
  resultLine,
  summaryLine,
  tallyResults,
  type SessionResult,
} from '../src/core/personalization';
import {
  DEFAULT_SESSION_MINUTES,
  recommendPlan,
  rotationOrder,
  slotMs,
  soundAt,
} from '../src/core/protectionPlans';
import { SYSTEM_PROFILE_UUIDS, findSystemProfile } from '../src/core/profiles';
import { useAccount } from '../src/state/useAccount';
import { DEFAULT_PLACE_NAME, draftPlace, usePlacesHome } from '../src/state/usePlacesHome';
import { useProtectionPlans } from '../src/state/useProtectionPlans';

function reset(): void {
  usePlacesHome.setState({ places: [], activeId: null });
  useProtectionPlans.setState({ plans: [], activeByPlace: {} });
  useAccount.setState({ plan: 'free' });
}

beforeEach(reset);

describe('the place every phone starts with', () => {
  it('makes one the first time it is asked, and never a second', () => {
    const first = usePlacesHome.getState().ensureDefault();
    const again = usePlacesHome.getState().ensureDefault();

    expect(first.id).toBe(again.id);
    expect(usePlacesHome.getState().places).toHaveLength(1);
  });

  it('calls it My space, and admits it knows nothing else about it', () => {
    const place = usePlacesHome.getState().ensureDefault();

    expect(place.name).toBe(DEFAULT_PLACE_NAME);
    expect(place.kind).toBe('custom');
    expect(place.target).toBe('unsure');
    expect(place.areaSize).toBeNull();
    expect(place.birdsActive).toBeNull();
  });

  it('leaves somebody who already has a place exactly where they were', () => {
    const mine = usePlacesHome.getState().add({ name: 'Back roof', kind: 'roof' });
    usePlacesHome.getState().ensureDefault();

    expect(usePlacesHome.getState().places).toHaveLength(1);
    expect(usePlacesHome.getState().places[0].id).toBe(mine.id);
    expect(usePlacesHome.getState().active()?.name).toBe('Back roof');
  });

  it('points at the one place it made', () => {
    const place = usePlacesHome.getState().ensureDefault();
    expect(usePlacesHome.getState().active()?.id).toBe(place.id);
  });
});

describe('how many places a plan keeps', () => {
  it('stops Free at one', () => {
    usePlacesHome.getState().ensureDefault();
    expect(usePlacesHome.getState().canAdd()).toBe(false);
  });

  it('lets Pro keep as many as it likes', () => {
    useAccount.setState({ plan: 'pro' });
    usePlacesHome.getState().ensureDefault();
    expect(usePlacesHome.getState().canAdd()).toBe(true);

    usePlacesHome.getState().add({ name: 'Dock', kind: 'dock' });
    usePlacesHome.getState().add({ name: 'Shop', kind: 'storefront' });
    expect(usePlacesHome.getState().places).toHaveLength(3);
    expect(usePlacesHome.getState().canAdd()).toBe(true);
  });

  it('lets a Free account back in once it is down to none', () => {
    const place = usePlacesHome.getState().ensureDefault();
    usePlacesHome.getState().remove(place.id);
    expect(usePlacesHome.getState().canAdd()).toBe(true);
  });
});

describe('a place a person described', () => {
  it('names itself after what it is when nobody typed a name', () => {
    expect(draftPlace({ kind: 'balcony' }).name).toBe('Balcony');
    expect(draftPlace({ kind: 'farm' }).name).toBe('Field');
    expect(draftPlace({ kind: 'custom' }).name).toBe('My space');
  });

  it('never keeps a quiet answer once nobody is nearby', () => {
    const place = usePlacesHome
      .getState()
      .add({ name: 'Roof', kind: 'roof', peopleNearby: true, limitAudible: true });
    expect(place.limitAudible).toBe(true);

    usePlacesHome.getState().update(place.id, { peopleNearby: false });
    expect(usePlacesHome.getState().byId(place.id)?.limitAudible).toBe(false);
  });

  it('keeps the answers it was given', () => {
    const place = usePlacesHome.getState().add({
      name: '  Front balcony  ',
      kind: 'balcony',
      target: 'gulls',
      areaSize: 'small',
      birdsActive: ' early morning ',
    });

    expect(place.name).toBe('Front balcony');
    expect(place.target).toBe('gulls');
    expect(place.areaSize).toBe('small');
    expect(place.birdsActive).toBe('early morning');
  });

  it('falls back to the first place when the active one is gone', () => {
    useAccount.setState({ plan: 'pro' });
    const first = usePlacesHome.getState().add({ name: 'Roof', kind: 'roof' });
    const second = usePlacesHome.getState().add({ name: 'Dock', kind: 'dock' });

    expect(usePlacesHome.getState().active()?.id).toBe(second.id);
    usePlacesHome.getState().remove(second.id);
    expect(usePlacesHome.getState().active()?.id).toBe(first.id);
  });
});

describe('the plan a place opens with', () => {
  it('gives every answer a rotation of two sounds, fifteen minutes long', () => {
    for (const target of ['pigeons', 'gulls', 'starlings', 'corvids', 'mixed_small', 'unsure'] as const) {
      for (const quiet of [true, false]) {
        const offer = recommendPlan(target, quiet, 'phone');
        expect(offer.soundIds).toHaveLength(2);
        expect(offer.sessionMinutes).toBe(DEFAULT_SESSION_MINUTES);
        expect(offer.randomizeOrder).toBe(true);
        for (const id of offer.soundIds) expect(findSystemProfile(id)).toBeDefined();
      }
    }
  });

  it('drops every recording when the sounds have to stay quiet for people', () => {
    for (const target of ['pigeons', 'gulls', 'starlings', 'corvids', 'mixed_small', 'unsure'] as const) {
      const quiet = recommendPlan(target, true, 'phone');
      for (const id of quiet.soundIds) {
        expect(findSystemProfile(id)!.kind).not.toBe('sample');
      }
    }
  });

  it('only offers 22 kHz to a speaker that can play it', () => {
    expect(recommendPlan('corvids', true, 'phone').soundIds).not.toContain('sys_max_22k');
    expect(recommendPlan('corvids', true, 'bt_speaker').soundIds).not.toContain('sys_max_22k');
    expect(recommendPlan('corvids', true, 'pigeonx_emitter').soundIds).toContain('sys_max_22k');
  });

  it('points every recommended sound at an id the account knows', () => {
    const offer = recommendPlan('pigeons', false, 'phone');
    for (const id of offer.soundIds) {
      expect(SYSTEM_PROFILE_UUIDS[id]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    }
  });

  it('saves the offer against the place and puts it in charge', () => {
    const place = usePlacesHome.getState().add({ name: 'Balcony', kind: 'balcony', target: 'pigeons' });
    const plan = useProtectionPlans.getState().adoptRecommendation(place, 'phone');

    expect(plan.name).toBe('Pigeon Rotation');
    expect(plan.placeId).toBe(place.id);
    expect(useProtectionPlans.getState().activeFor(place.id)?.id).toBe(plan.id);
    expect(useProtectionPlans.getState().forPlace(place.id)).toHaveLength(1);
  });

  it('forgets a plan that is in charge when the plan goes', () => {
    const place = usePlacesHome.getState().add({ name: 'Balcony', kind: 'balcony' });
    const plan = useProtectionPlans.getState().adoptRecommendation(place, 'phone');
    useProtectionPlans.getState().remove(plan.id);

    expect(useProtectionPlans.getState().activeFor(place.id)).toBeUndefined();
  });
});

describe('the order the sounds play in', () => {
  const fixed = ['a', 'b', 'c', 'd'];

  it('plays the list as written when the plan does not shuffle', () => {
    expect(rotationOrder(fixed, false, () => 0)).toEqual(fixed);
  });

  it('shuffles it when the plan does', () => {
    // A counter instead of a die, so the shuffle can be read off the page.
    let n = 0;
    const order = rotationOrder(fixed, true, () => (n++ % 4) / 4);
    expect(order).not.toEqual(fixed);
    expect([...order].sort()).toEqual([...fixed].sort());
  });

  it('never loses or repeats a sound', () => {
    for (let seed = 0; seed < 20; seed++) {
      const order = rotationOrder(fixed, true);
      expect(new Set(order).size).toBe(fixed.length);
    }
  });

  it('leaves one sound alone', () => {
    expect(rotationOrder(['only'], true, () => 0.99)).toEqual(['only']);
  });

  it('goes round and round for as long as the session lasts', () => {
    expect(soundAt(fixed, 0)).toBe('a');
    expect(soundAt(fixed, 4)).toBe('a');
    expect(soundAt(fixed, 6)).toBe('c');
    expect(soundAt([], 3)).toBeUndefined();
  });

  it('splits the session between the sounds, and never below half a minute', () => {
    expect(slotMs(15, 2)).toBe(450_000);
    expect(slotMs(1, 10)).toBe(30_000);
    expect(slotMs(15, 0)).toBe(900_000);
  });
});

describe('what the app says back about what a person reported', () => {
  const tally = (results: (SessionResult | null)[]) => tallyResults(results);

  it('counts only the sessions somebody answered', () => {
    const t = tally(['left', null, 'some_left', null, 'not_yet']);
    expect(t.withResult).toBe(3);
    expect(t.left).toBe(1);
    expect(t.someLeft).toBe(1);
    expect(t.notYet).toBe(1);
  });

  it('counts "I could not tell" as an answer, and toward nothing else', () => {
    const t = tally(['unknown', 'unknown', 'unknown']);
    expect(t.withResult).toBe(3);
    expect(summaryLine(t)).toBe('You reported improvement after 0 of 3 sessions.');
  });

  it('says nothing at all under three answers', () => {
    expect(summaryLine(tally(['left', 'left']))).toBeNull();
    expect(MIN_REPORTS_FOR_SUMMARY).toBe(3);
  });

  it('counts both kinds of leaving as improvement', () => {
    const t = tally(['left', 'left', 'left', 'some_left', 'some_left', 'not_yet', 'unknown']);
    expect(summaryLine(t)).toBe('You reported improvement after 5 of 7 sessions.');
  });

  it('never says a thing about a session nobody answered', () => {
    const t = tally([null, null, null, null, 'left', 'left', 'left']);
    expect(summaryLine(t)).toBe('You reported improvement after 3 of 3 sessions.');
  });
});

describe('the words on the answers', () => {
  it('answers the question the sheet asked', () => {
    expect(SESSION_RESULT_LABELS.left).toBe('Yes');
    expect(SESSION_RESULT_LABELS.some_left).toBe('Some left');
    expect(SESSION_RESULT_LABELS.not_yet).toBe('Not yet');
    expect(SESSION_RESULT_LABELS.unknown).toBe('I could not tell');
  });

  it('reads back as a sentence in History', () => {
    expect(resultLine('left')).toBe('Most birds left');
    expect(resultLine('some_left')).toBe('Some birds left');
    expect(resultLine('not_yet')).toBe('Birds stayed');
    expect(resultLine('unknown')).toBe('Could not tell');
    expect(resultLine(null)).toBe(NO_RESULT_LINE);
  });

  it('names every bird and every place in words a person uses', () => {
    expect(BIRD_TARGET_LABELS.corvids).toBe('Crows or jays');
    expect(BIRD_TARGET_LABELS.unsure).toBe('Not sure');
    expect(PLACE_KIND_LABELS.dock).toBe('Dock or marina');
    expect(PLACE_KIND_LABELS.farm).toBe('Farm or field');
  });

  it('says a size and shows you one, without a dash between them', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      expect(AREA_SIZE_LABELS[size]).not.toMatch(/[–—]/);
      expect(AREA_SIZE_HINT[size].length).toBeGreaterThan(0);
    }
    expect(AREA_SIZE_HINT.small).toBe('A balcony');
    expect(AREA_SIZE_HINT.medium).toBe('A patio');
    expect(AREA_SIZE_HINT.large).toBe('A roof or yard');
  });
});
