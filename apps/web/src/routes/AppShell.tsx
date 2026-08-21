import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';

const PREVIEW = [
  {
    num: '01',
    title: 'Locations',
    body: 'Every property in one grid, with the zones that are covered and the ones that are not.',
  },
  {
    num: '02',
    title: 'Live zones',
    body: 'What is running right now, on which device, at which frequency, about a second behind the phone.',
  },
  {
    num: '03',
    title: 'Weekly report',
    body: 'Sessions, run time and coverage per location, in a summary you can forward to ownership.',
  },
];

/**
 * Business dashboard shell. The magic-link form stays inert until the Supabase
 * backend is live: wire `onSubmit` to `signInWithOtp` at that point.
 */
export default function AppShell() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNote('Dashboard access opens with Business pilots.');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(null), 4200);
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
              <p className="px-label text-muted">Business and Enterprise</p>
              <h1 className="mt-4 text-[clamp(1.9rem,4vw,2.75rem)] leading-[1.05] font-bold tracking-[-0.03em]">
                Sign in to your dashboard.
              </h1>
              <p className="mt-4 max-w-[42ch] text-[16px] text-muted">
                We email you a one time link. No password to remember, none to leak.
              </p>

              <form onSubmit={onSubmit} className="mt-8 max-w-[26rem]">
                <label htmlFor="dashboard-email" className="px-label block text-muted">
                  Work email
                </label>
                <input
                  id="dashboard-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@harbourhouse.com"
                  className="mt-2 h-11 w-full border border-line bg-bg px-3 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                />
                <Button type="submit" className="mt-4 w-full">
                  Send the link
                </Button>
              </form>

              <p role="status" aria-live="polite" className="mt-4 min-h-6 text-[14px] text-accent">
                {note ?? ''}
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
