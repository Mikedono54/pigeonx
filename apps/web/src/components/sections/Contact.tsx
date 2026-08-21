import { useState, type FormEvent } from 'react';
import { Check, ChevronDown, Mail, MapPin, Timer } from 'lucide-react';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Button } from '../ui/Button';
import { submitNetlifyForm } from '../../lib/netlifyForm';

const PROPERTY_TYPES = [
  'Restaurant / bar',
  'Hotel / resort',
  'Rooftop or patio venue',
  'Property management',
  'Warehouse / logistics',
  'Other',
];

const fieldClass =
  'h-11 w-full rounded-[var(--radius-md)] border border-border-line bg-white/[0.035] px-3.5 text-[14px] text-fg placeholder:text-fg-muted transition-colors duration-200 focus:border-teal/50 focus:outline-none';

const labelClass = 'mb-1.5 block text-[12.5px] font-medium text-fg-muted';

const ASSURANCES = [
  { icon: Timer, text: 'We reply within one business day.' },
  { icon: MapPin, text: 'Pilots start with a single patio, deck or dock.' },
  { icon: Mail, text: 'No sales sequence. One person, one conversation.' },
];

export function Contact() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState('sending');
    const ok = await submitNetlifyForm('pilot', form);
    setState(ok ? 'done' : 'error');
    if (ok) form.reset();
  }

  return (
    <section id="contact" className="relative py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Talk to us"
              title="Start a pilot on one area."
              description="Tell us about the property and we will come back with a plan: which zones to cover, which profiles fit your hours, and what we measure before we turn anything on."
            />
            <ul className="mt-8 flex flex-col gap-4">
              {ASSURANCES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-border-line bg-card text-teal">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="text-[14px] text-fg-muted">{text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[13.5px] text-fg-muted">
              Prefer email?{' '}
              <a
                href="mailto:hello@pigeonx.org"
                className="font-medium text-teal underline-offset-4 hover:underline"
              >
                hello@pigeonx.org
              </a>
            </p>
          </div>

          <Reveal delay={0.08}>
            <Card glow className="bg-[linear-gradient(160deg,#16203A_0%,#111A2E_100%)] p-6 sm:p-8">
              {state === 'done' ? (
                <div className="flex min-h-70 flex-col items-center justify-center gap-4 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-success/30 bg-success/12 text-success">
                    <Check size={22} aria-hidden />
                  </span>
                  <h3 className="font-display text-[19px] font-semibold text-fg">
                    Thanks — that is with us.
                  </h3>
                  <p className="max-w-sm text-[14px] leading-relaxed text-fg-muted">
                    We will reply within one business day with a pilot plan for your property.
                  </p>
                </div>
              ) : (
                <form
                  name="pilot"
                  method="POST"
                  data-netlify="true"
                  data-netlify-honeypot="bot-field"
                  onSubmit={onSubmit}
                  className="flex flex-col gap-4"
                >
                  <input type="hidden" name="form-name" value="pilot" />
                  <p hidden>
                    <label>
                      Do not fill this out: <input name="bot-field" tabIndex={-1} />
                    </label>
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="pilot-name">
                        Name
                      </label>
                      <input
                        id="pilot-name"
                        name="name"
                        required
                        autoComplete="name"
                        placeholder="Alex Rivera"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="pilot-business">
                        Business
                      </label>
                      <input
                        id="pilot-business"
                        name="business"
                        required
                        autoComplete="organization"
                        placeholder="Harbour House"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="pilot-email">
                        Email
                      </label>
                      <input
                        id="pilot-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="alex@harbourhouse.com"
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="pilot-city">
                        City
                      </label>
                      <input
                        id="pilot-city"
                        name="city"
                        required
                        autoComplete="address-level2"
                        placeholder="San Francisco"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="pilot-property">
                      Property type
                    </label>
                    <div className="relative">
                      <select
                        id="pilot-property"
                        name="property-type"
                        required
                        defaultValue=""
                        className={`${fieldClass} cursor-pointer appearance-none pr-10`}
                      >
                        <option value="" disabled>
                          Select one
                        </option>
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={17}
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="pilot-message">
                      What are you dealing with?
                    </label>
                    <textarea
                      id="pilot-message"
                      name="message"
                      rows={4}
                      placeholder="Rooftop bar, about 40 covers, pigeons on the pergola every afternoon…"
                      className={`${fieldClass} h-auto resize-y py-3 leading-relaxed`}
                    />
                  </div>

                  <Button type="submit" size="lg" disabled={state === 'sending'} className="mt-1 w-full">
                    {state === 'sending' ? 'Sending…' : 'Request a pilot'}
                  </Button>

                  {state === 'error' ? (
                    <p className="text-[13px] text-danger">
                      That did not go through. Email{' '}
                      <a className="underline" href="mailto:hello@pigeonx.org">
                        hello@pigeonx.org
                      </a>{' '}
                      instead.
                    </p>
                  ) : null}

                  <p className="text-[12px] leading-relaxed text-fg-muted">
                    We use this only to reply to you about a PigeonX pilot.
                  </p>
                </form>
              )}
            </Card>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
