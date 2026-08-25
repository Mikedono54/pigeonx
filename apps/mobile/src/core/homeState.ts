/**
 * What Home is saying, in one word.
 *
 * The spec asks for a three second read: open the app and know which place you
 * are protecting, whether anything is running, and what happens next. That is
 * four states and no more, and every one of them is derived from something
 * real. Nothing here invents a bird, a detection or a speaker.
 */

export type HomeState = 'off' | 'active' | 'scheduled' | 'attention';

export interface HomeInputs {
  /** a sound is coming out right now */
  playing: boolean;
  /**
   * The speaker this place plays through is not there any more.
   *
   * A place with no speaker of its own can never be in this state, because
   * there is nothing to be missing. We do not have live speaker health, so
   * this is the one honest version of it: you picked a speaker, and it is gone.
   */
  speakerMissing: boolean;
  /** when the next enabled schedule starts, or null when nothing is set */
  nextAt: Date | null;
}

/**
 * Playing wins, because a person can hear it and the screen must agree. A
 * missing speaker comes next: it is the one thing that stops the next session
 * happening, so a schedule underneath it would be a lie.
 */
export function homeState({ playing, speakerMissing, nextAt }: HomeInputs): HomeState {
  if (playing) return 'active';
  if (speakerMissing) return 'attention';
  if (nextAt) return 'scheduled';
  return 'off';
}

/** The headline for each state. Off says the whole product in four words. */
export const HOME_OFF_LINE = 'Ready when birds appear.';
export const HOME_ATTENTION_LINE = 'The speaker for this place is not connected.';

/** "7:00 AM", the way every time in the app reads. */
export function clockTime(at: Date): string {
  const h24 = at.getHours();
  const m = at.getMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** How many midnights sit between two moments. */
function daysApart(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * "Next session tomorrow at 7:00 AM."
 *
 * Today and tomorrow get their own words because that is how a person thinks
 * about them. Anything further off is named by its day, and anything past a
 * week by its date, because "next Thursday" means two different things to two
 * different people.
 */
export function nextSessionLine(at: Date, now: Date = new Date()): string {
  const days = daysApart(now, at);
  const time = clockTime(at);

  if (days <= 0) return `Next session at ${time}.`;
  if (days === 1) return `Next session tomorrow at ${time}.`;
  if (days < 7) {
    const day = at.toLocaleDateString(undefined, { weekday: 'long' });
    return `Next session ${day} at ${time}.`;
  }
  const date = at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Next session ${date} at ${time}.`;
}
