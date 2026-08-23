import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { APPLE_WEB_AUTH, siteOrigin } from '../lib/env';
import { errorMessage } from '../lib/errors';

const PREVIEW = [
  {
    num: '01',
    title: 'Places',
    body: 'Every property in one grid, with the areas that are playing right now.',
  },
  {
    num: '02',
    title: 'What played',
    body: 'Every play, with the sound, the area, who ran it and how long it lasted.',
  },
  {
    num: '03',
    title: 'This week',
    body: 'Plays, run time and areas covered, in a summary you can forward to the owner.',
  },
];

export default function SignIn() {
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const redirectTo = `${siteOrigin()}/app/auth${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  async function send(e: FormEvent) {
    e.preventDefault();
    const client = supabase();
    if (!client) {
      setError(new Error('This dashboard is not connected yet. Try again in a moment.'));
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  }

  async function withApple() {
    const client = supabase();
    if (!client) return;
    setError(null);
    const { error: err } = await client.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo },
    });
    if (err) setError(err);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="PigeonX home">
            <Logo size={28} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink"
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
            Back to site
          </Link>
        </Container>
      </header>

      <main id="main-content" className="flex-1">
        <section className="border-b border-line">
          <Container className="grid gap-10 py-12 md:grid-cols-12 lg:py-16">
            <div className="md:col-span-6 lg:col-span-5">
              <p className="px-label text-muted">Business dashboard</p>
              <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.05] font-bold tracking-[-0.03em]">
                Sign in.
              </h1>
              <p className="mt-4 max-w-[42ch] text-[16px] text-muted">
                We email you a one time link. No password to remember, none to leak.
              </p>

              {sent ? (
                <div className="mt-8 max-w-[26rem] border border-line p-5">
                  <p className="px-label text-accent">Check your email</p>
                  <p className="mt-3 text-[16px] text-ink">
                    We sent a link to {email.trim()}. Open it on this device and you are in.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-4 cursor-pointer text-[15px] font-medium text-accent hover:text-ink"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={send} className="mt-8 max-w-[26rem] space-y-4">
                  <Field label="Work email" htmlFor="signin-email">
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@harbourhouse.com"
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Sending' : 'Send the link'}
                  </Button>
                  {APPLE_WEB_AUTH ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => void withApple()}
                    >
                      Sign in with Apple
                    </Button>
                  ) : null}
                </form>
              )}

              <p role="status" aria-live="polite" className="mt-4 min-h-6 text-[14px] text-ink">
                {error ? errorMessage(error) : ''}
              </p>

              <p className="mt-2 text-[15px] text-muted">
                Want to look first?{' '}
                <Link
                  to="/app?demo=1"
                  className="border-b border-accent pb-0.5 font-medium text-accent hover:border-ink hover:text-ink"
                >
                  Open the dashboard with sample data
                </Link>
              </p>
              <p className="mt-2 text-[15px] text-muted">
                No Business plan yet?{' '}
                <Link
                  to="/pilot"
                  className="border-b border-accent pb-0.5 font-medium text-accent hover:border-ink hover:text-ink"
                >
                  Start a pilot
                </Link>
              </p>
            </div>

            <div className="border-line md:col-span-6 md:border-l md:pl-8 lg:col-span-6 lg:col-start-7">
              <p className="px-label text-muted">What the dashboard shows</p>
              <ul className="mt-5 border-t border-line">
                {PREVIEW.map((p) => (
                  <li key={p.num} className="border-b border-line py-4">
                    <p className="px-label text-accent">{p.num}</p>
                    <h2 className="mt-2 font-display text-[17px] font-semibold">{p.title}</h2>
                    <p className="mt-1 max-w-[46ch] text-[15px] text-muted">{p.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      </main>

      <footer className="border-t border-line">
        <Container className="flex h-14 items-center justify-between">
          <p className="px-label text-muted">© 2026 PigeonX</p>
          <Link to="/privacy" className="px-label text-muted hover:text-ink">
            Privacy
          </Link>
        </Container>
      </footer>
    </div>
  );
}
