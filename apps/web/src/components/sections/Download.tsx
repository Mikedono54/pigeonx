import { useState, type FormEvent } from 'react';
import { Bell, Check, Smartphone } from 'lucide-react';
import { Container } from '../ui/Container';
import { Reveal } from '../ui/Reveal';
import { Button } from '../ui/Button';
import { StoreButtons } from './Hero';
import { submitNetlifyForm } from '../../lib/netlifyForm';

export function Download() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState('sending');
    const ok = await submitNetlifyForm('waitlist', form);
    setState(ok ? 'done' : 'error');
    if (ok) form.reset();
  }

  return (
    <section id="download" className="relative overflow-hidden py-20 sm:py-24">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -z-10 h-[420px] -translate-y-1/2 bg-[radial-gradient(60%_100%_at_50%_50%,rgba(45,212,191,0.12),transparent_72%)] blur-[50px]"
      />
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border-line bg-[linear-gradient(150deg,#17233C_0%,#101830_58%)] px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">
                  <Smartphone size={13} aria-hidden />
                  Get the app
                </span>
                <h2 className="mt-5 max-w-lg text-[clamp(1.6rem,3.4vw,2.25rem)] leading-[1.15] font-bold text-fg">
                  The control center ships to iOS and Android.
                </h2>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-fg-muted">
                  Free to start on one area — full deterrent engine, three profiles, 15-minute
                  sessions. Store listings are in review.
                </p>
                <div className="mt-7">
                  <StoreButtons size="md" />
                </div>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-border-line bg-bg/60 p-6 backdrop-blur">
                <h3 className="flex items-center gap-2 font-display text-[16px] font-semibold text-fg">
                  <Bell size={16} className="text-teal" aria-hidden />
                  Get notified at launch
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
                  One email when the app goes live. Nothing else.
                </p>

                {state === 'done' ? (
                  <p className="mt-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-4 py-3 text-[14px] font-medium text-success">
                    <Check size={16} aria-hidden />
                    You are on the list. We will be in touch.
                  </p>
                ) : (
                  <form
                    name="waitlist"
                    method="POST"
                    data-netlify="true"
                    data-netlify-honeypot="bot-field"
                    onSubmit={onSubmit}
                    className="mt-5 flex flex-col gap-3 sm:flex-row"
                  >
                    <input type="hidden" name="form-name" value="waitlist" />
                    <p hidden>
                      <label>
                        Do not fill this out: <input name="bot-field" tabIndex={-1} />
                      </label>
                    </p>
                    <label htmlFor="waitlist-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      placeholder="you@yourvenue.com"
                      className="h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-border-line bg-white/[0.04] px-3.5 text-[14px] text-fg placeholder:text-fg-muted transition-colors duration-200 focus:border-teal/50 focus:outline-none"
                    />
                    <Button type="submit" disabled={state === 'sending'} className="shrink-0">
                      {state === 'sending' ? 'Sending…' : 'Notify me'}
                    </Button>
                  </form>
                )}
                {state === 'error' ? (
                  <p className="mt-3 text-[13px] text-danger">
                    That did not go through. Email{' '}
                    <a className="underline" href="mailto:hello@pigeonx.org">
                      hello@pigeonx.org
                    </a>{' '}
                    and we will add you.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
