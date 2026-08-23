/**
 * Every error a person sees comes through here, in plain words.
 *
 * Parts of the backend land one at a time. When a call fails because the piece
 * behind it is not live yet, we say so and keep the rest of the page working.
 */

export class ComingOnline extends Error {
  readonly comingOnline = true;
  constructor(what: string) {
    super(`${what} is coming online. Check back in a little while.`);
    this.name = 'ComingOnline';
  }
}

export function isComingOnline(err: unknown): boolean {
  return err instanceof ComingOnline;
}

type MaybePostgrestError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  status?: number;
};

/** True when the database has no function or table by that name yet. */
export function isMissingPiece(err: unknown): boolean {
  const e = (err ?? {}) as MaybePostgrestError;
  if (e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42883') return true;
  const text = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase();
  return text.includes('schema cache') || text.includes('does not exist');
}

/** One sentence a person can act on. */
export function errorMessage(err: unknown): string {
  if (err instanceof ComingOnline) return err.message;
  const e = (err ?? {}) as MaybePostgrestError;
  if (isMissingPiece(err)) {
    return 'This part of the dashboard is coming online. Check back in a little while.';
  }
  if (e.code === '42501' || e.status === 401 || e.status === 403) {
    return e.message && e.message.length < 120
      ? capitalize(e.message)
      : 'You do not have access to that.';
  }
  if (e.code === '23505') return capitalize(e.message ?? 'That already exists.');
  if (e.message === 'Failed to fetch' || e.message === 'Load failed') {
    return 'We could not reach PigeonX. Check your connection and try again.';
  }
  if (e.message && e.message.length > 0) return capitalize(e.message);
  return 'That did not work. Try again.';
}

function capitalize(text: string): string {
  const t = text.trim();
  if (t.length === 0) return t;
  return t[0].toUpperCase() + t.slice(1);
}

/** Throw the Supabase error if there is one, then hand back the data. */
export function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}
