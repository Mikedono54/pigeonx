import { lastSessionByPlace } from '../core/businessPlaces';
import { usePlaces } from '../state/usePlaces';
import { readRemoteHistory } from './sync';

/**
 * When each building last had a sound in it.
 *
 * There is no separate call for this: it is read off what played, which the
 * account already keeps for every place on the team. A month is enough for a
 * card that only ever says "Last session" or nothing at all.
 */

const DAYS = 30;

export async function refreshPlaceActivity(): Promise<void> {
  const to = new Date();
  const from = new Date(to.getTime() - DAYS * 24 * 60 * 60 * 1000);

  const { ok, entries } = await readRemoteHistory({ from, to });
  // An account that could not be reached says nothing, rather than saying
  // every building has been quiet for a month.
  if (!ok) return;

  usePlaces.getState().setActivity(lastSessionByPlace(entries));
}
