import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Building2, CalendarRange, Info, MapPin, Radio } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Container } from '../components/ui/Container';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { WaveBackdrop } from '../components/WaveBackdrop';

const PREVIEW = [
  {
    icon: MapPin,
    title: 'Locations',
    body: 'Every property in one grid, with the zones that are covered and the ones that are not.',
    rows: ['Harbour House · 3 zones', 'Pier 27 Rooftop · 2 zones', 'Grand Terrace · 4 zones'],
  },
  {
    icon: Radio,
    title: 'Live zones',
    body: 'What is running right now, on which device, at which frequency — updated in about a second.',
    rows: ['Front patio · Running 12:40', 'Rooftop bar · Scheduled 6:00 pm', 'Loading dock · Idle'],
  },
  {
    icon: CalendarRange,
    title: 'Weekly report',
    body: 'Sessions, run time and coverage per location, in a summary you can forward to ownership.',
    rows: ['42 sessions · 11h 20m', 'Coverage 86% of service hours', 'Sent Mondays, 7:00 am'],
  },
];

/**
 * Business dashboard shell. The magic-link form is intentionally inert for now —
 * wire `onSubmit` to Supabase `signInWithOtp` when the backend is live.
 */
export default function AppShell() {
  const [email, setEmail] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setToast('Dashboard access opens with Business pilots');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4200);
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-bg">
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_-10%,#16233D_0%,#0B1220_60%)]" />
        <div className="absolute inset-0 px-noise opacity-50" />
      </div>
      <WaveBackdrop className="-z-10 opacity-40 [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />

      <Container className="flex min-h-dvh flex-col py-8 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="PigeonX home">
            <Logo size={34} />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium text-fg-muted transition-colors duration-200 hover:bg-white/[0.05] hover:text-fg"
          >
            <ArrowLeft size={15} aria-hidden />
            Back to site
          </Link>
        </div>

        <main className="flex flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="mx-auto w-full max-w-md">
            <Card glow className="bg-[linear-gradient(160deg,#16203A_0%,#111A2E_100%)] p-7 sm:p-8">
              <Badge tone="teal">Business &amp; Enterprise</Badge>
              <h1 className="mt-4 font-display text-[26px] leading-tight font-bold text-fg">
                Sign in to your dashboard
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-fg-muted">
                We will email you a one-time link. No password to remember, none to leak.
              </p>

              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
                <label htmlFor="dashboard-email" className="text-[12.5px] font-medium text-fg-muted">
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
                  className="h-11 w-full rounded-[var(--radius-md)] border border-border-line bg-white/[0.035] px-3.5 text-[14px] text-fg placeholder:text-fg-muted transition-colors duration-200 focus:border-teal/50 focus:outline-none"
                />
                <Button type="submit" size="lg" className="mt-1 w-full">
                  Send magic link
                </Button>
              </form>

              <p
                role="status"
                aria-live="polite"
                className={`mt-4 flex items-start gap-2 rounded-[var(--radius-md)] border px-3.5 py-3 text-[13px] leading-snug transition-opacity duration-200 ${
                  toast
                    ? 'border-accent/30 bg-accent/10 text-accent opacity-100'
                    : 'pointer-events-none border-transparent opacity-0'
                }`}
              >
                <Info size={15} className="mt-px shrink-0" aria-hidden />
                <span>{toast ?? ''}</span>
              </p>

              <p className="mt-4 text-center text-[13px] text-fg-muted">
                Not on a Business plan yet?{' '}
                <Link to="/#contact" className="font-medium text-teal underline-offset-4 hover:underline">
                  Start a pilot
                </Link>
              </p>
            </Card>
          </div>

          <section aria-labelledby="dashboard-preview" className="mx-auto mt-16 w-full max-w-5xl">
            <div className="flex items-center justify-center gap-2.5">
              <Building2 size={16} className="text-teal" aria-hidden />
              <h2
                id="dashboard-preview"
                className="font-sans text-[11px] font-semibold tracking-[0.18em] text-fg-muted uppercase"
              >
                What the dashboard shows
              </h2>
            </div>

            <ul className="mt-7 grid gap-4 md:grid-cols-3">
              {PREVIEW.map(({ icon: Icon, title, body, rows }) => (
                <li key={title} className="h-full">
                  <Card className="flex h-full flex-col gap-3.5">
                    <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-border-line bg-elevated text-teal">
                      <Icon size={18} aria-hidden />
                    </span>
                    <h3 className="font-display text-[16px] font-semibold text-fg">{title}</h3>
                    <p className="text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
                    <ul className="mt-auto flex flex-col gap-2 border-t border-border-line pt-4">
                      {rows.map((r) => (
                        <li
                          key={r}
                          className="flex items-center gap-2 font-mono text-[11.5px] text-fg-muted"
                        >
                          <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-teal/60" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-[12.5px] text-fg-muted">
              Sample data. Your dashboard fills in from the sessions your team actually runs.
            </p>
          </section>
        </main>
      </Container>
    </div>
  );
}
