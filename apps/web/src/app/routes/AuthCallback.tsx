import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Container } from '../../components/ui/Container';
import { Logo } from '../../components/Logo';
import { supabase } from '../lib/supabase';
import { errorMessage } from '../lib/errors';

/**
 * Where the emailed link lands. Supabase reads the code out of the URL on its
 * own; if it has not by the time we look, we hand it the code ourselves.
 */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const next = params.get('next') ?? '/app';

  useEffect(() => {
    const client = supabase();
    if (!client) {
      setError(new Error('This dashboard is not connected yet. Try again in a moment.'));
      return;
    }

    const described =
      params.get('error_description') ??
      new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description');
    if (described) {
      setError(new Error(described));
      return;
    }

    let alive = true;
    const finish = () => {
      if (alive) navigate(next, { replace: true });
    };

    void (async () => {
      const { data } = await client.auth.getSession();
      if (data.session) {
        finish();
        return;
      }
      const code = params.get('code');
      if (code) {
        const { error: err } = await client.auth.exchangeCodeForSession(code);
        if (!alive) return;
        if (err) {
          setError(err);
          return;
        }
        finish();
        return;
      }
      // The hash form of the link: give the client a moment to read it.
      window.setTimeout(async () => {
        const again = await client.auth.getSession();
        if (!alive) return;
        if (again.data.session) finish();
        else setError(new Error('That link has run out. Ask for a new one.'));
      }, 1200);
    })();

    return () => {
      alive = false;
    };
  }, [navigate, next, params]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center">
          <Link to="/" aria-label="PigeonX home">
            <Logo size={28} />
          </Link>
        </Container>
      </header>
      <main id="main-content" className="flex-1">
        <Container className="max-w-[34rem] py-20">
          {error ? (
            <>
              <h1 className="text-[1.75rem] font-semibold">That link did not work.</h1>
              <p className="mt-3 text-[16px] text-muted">{errorMessage(error)}</p>
              <Link
                to="/app/sign-in"
                className="mt-6 inline-flex h-11 items-center border border-accent bg-accent px-5 text-[15px] font-medium text-on-accent hover:border-ink hover:bg-ink"
              >
                Send a new link
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-[1.75rem] font-semibold">Signing you in.</h1>
              <p className="mt-3 text-[16px] text-muted">One moment.</p>
            </>
          )}
        </Container>
      </main>
    </div>
  );
}
