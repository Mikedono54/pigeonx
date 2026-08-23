import {
  AUTH_REDIRECT,
  completeSignInFromUrl,
  describeLinkProblem,
  looksLikeEmail,
  parseAuthUrl,
  sendSignInLink,
  deleteMyAccount,
} from '../src/services/auth';
import { __setSupabase } from '../src/services/supabase';

afterEach(() => {
  __setSupabase(null);
});

describe('parseAuthUrl()', () => {
  it('finds the one-time code the email link carries', () => {
    expect(parseAuthUrl('pigeonx://auth?code=abc123')).toEqual({
      kind: 'code',
      code: 'abc123',
    });
  });

  it('finds a pair of tokens behind the hash', () => {
    expect(
      parseAuthUrl(
        'pigeonx://auth#access_token=aaa&refresh_token=bbb&token_type=bearer'
      )
    ).toEqual({ kind: 'tokens', accessToken: 'aaa', refreshToken: 'bbb' });
  });

  it('reads a problem before it reads anything else', () => {
    const link = parseAuthUrl(
      'pigeonx://auth#error=access_denied&error_description=Email+link+is+invalid+or+has+expired&code=zzz'
    );
    expect(link).toEqual({
      kind: 'error',
      message: 'That link ran out. Ask for a new one.',
    });
  });

  it('ignores a link that has nothing to do with signing in', () => {
    expect(parseAuthUrl('pigeonx://sounds')).toBeNull();
    expect(parseAuthUrl(null)).toBeNull();
    expect(parseAuthUrl('')).toBeNull();
  });
});

describe('describeLinkProblem()', () => {
  it('says what happened in words', () => {
    expect(describeLinkProblem('Token has expired')).toBe(
      'That link ran out. Ask for a new one.'
    );
    expect(describeLinkProblem('Link was already used')).toBe(
      'That link was already used. Ask for a new one.'
    );
    expect(describeLinkProblem('boom')).toBe(
      "That didn't work. Ask for a new link."
    );
  });
});

describe('looksLikeEmail()', () => {
  it('keeps a person from sending a link to nothing', () => {
    expect(looksLikeEmail('you@example.com')).toBe(true);
    expect(looksLikeEmail('  you@example.com ')).toBe(true);
    expect(looksLikeEmail('you@example')).toBe(false);
    expect(looksLikeEmail('nope')).toBe(false);
    expect(looksLikeEmail('')).toBe(false);
  });
});

describe('completeSignInFromUrl()', () => {
  it('trades the code for a way in', async () => {
    const exchangeCodeForSession = jest.fn(async () => ({ error: null }));
    __setSupabase({ auth: { exchangeCodeForSession } } as never);

    const result = await completeSignInFromUrl('pigeonx://auth?code=abc');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(result).toEqual({ ok: true, message: 'You are signed in.' });
  });

  it('sets the pair of tokens when that is what came back', async () => {
    const setSession = jest.fn(async () => ({ error: null }));
    __setSupabase({ auth: { setSession } } as never);

    const result = await completeSignInFromUrl(
      'pigeonx://auth#access_token=aaa&refresh_token=bbb'
    );
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'aaa',
      refresh_token: 'bbb',
    });
    expect(result?.ok).toBe(true);
  });

  it('says nothing about a link that is not a sign-in', async () => {
    expect(await completeSignInFromUrl('pigeonx://home')).toBeNull();
  });

  it('turns a server problem into one short line', async () => {
    const exchangeCodeForSession = jest.fn(async () => ({
      error: { message: 'Code verifier expired' },
    }));
    __setSupabase({ auth: { exchangeCodeForSession } } as never);

    const result = await completeSignInFromUrl('pigeonx://auth?code=abc');
    expect(result).toEqual({
      ok: false,
      message: 'That link ran out. Ask for a new one.',
    });
  });
});

describe('sendSignInLink()', () => {
  it('sends people back to the app', async () => {
    const signInWithOtp = jest.fn(async () => ({ error: null }));
    __setSupabase({ auth: { signInWithOtp } } as never);

    const result = await sendSignInLink(' you@example.com ');
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'you@example.com',
      options: { shouldCreateUser: true, emailRedirectTo: AUTH_REDIRECT },
    });
    expect(result.ok).toBe(true);
  });

  it('stops before it sends when the address is wrong', async () => {
    const signInWithOtp = jest.fn();
    __setSupabase({ auth: { signInWithOtp } } as never);

    const result = await sendSignInLink('nope');
    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('works even with no backend at all', async () => {
    const result = await sendSignInLink('you@example.com');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('This phone still works');
  });
});

describe('deleteMyAccount()', () => {
  it('asks the server, then signs out', async () => {
    const rpc = jest.fn(async () => ({ error: null }));
    const signOut = jest.fn(async () => ({ error: null }));
    __setSupabase({ rpc, auth: { signOut } } as never);

    const result = await deleteMyAccount();
    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(signOut).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('still signs out when the server has no such thing yet', async () => {
    const rpc = jest.fn(async () => ({
      error: { code: 'PGRST202', message: 'Could not find the function' },
    }));
    const signOut = jest.fn(async () => ({ error: null }));
    __setSupabase({ rpc, auth: { signOut } } as never);

    const result = await deleteMyAccount();
    expect(signOut).toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('hello@pigeonx.org');
  });
});
