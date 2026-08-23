/**
 * A one-line way for a screen or a store to say "something changed".
 *
 * The part that talks to the account listens here. Keeping the two apart means
 * a store never has to know whether an account even exists.
 */

export type ChangeReason =
  'sound' | 'schedule' | 'speaker' | 'play' | 'place' | 'sign-in' | 'foreground' | 'manual';

type Handler = (reason: ChangeReason) => void;

let handler: Handler | null = null;

export function setChangeHandler(next: Handler | null): void {
  handler = next;
}

/** Something on this phone changed. Send it up when there is a moment. */
export function somethingChanged(reason: ChangeReason): void {
  handler?.(reason);
}
