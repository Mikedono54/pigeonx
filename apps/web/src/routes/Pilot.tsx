import { useState, type FormEvent, type ReactNode } from 'react';
import { Container } from '../components/ui/Container';
import { Button } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { submitNetlifyForm } from '../lib/netlifyForm';

const inputClass =
  'h-11 w-full border border-line bg-bg px-3 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none';

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="px-label block text-muted">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

type Status = 'idle' | 'sending' | 'done' | 'error';

function Note({ status, done, fail }: { status: Status; done: string; fail: string }) {
  if (status !== 'done' && status !== 'error') return null;
  return (
    <p
      role="status"
      className={`mt-4 border px-3 py-2.5 text-[14px] ${
        status === 'done' ? 'border-success text-success' : 'border-danger text-danger'
      }`}
    >
      {status === 'done' ? done : fail}
    </p>
  );
}

export default function Pilot() {
  const [pilotStatus, setPilotStatus] = useState<Status>('idle');
  const [waitStatus, setWaitStatus] = useState<Status>('idle');

  async function onPilot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPilotStatus('sending');
    const ok = await submitNetlifyForm('pilot', form);
    setPilotStatus(ok ? 'done' : 'error');
    if (ok) form.reset();
  }

  async function onWaitlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setWaitStatus('sending');
    const ok = await submitNetlifyForm('waitlist', form);
    setWaitStatus(ok ? 'done' : 'error');
    if (ok) form.reset();
  }

  return (
    <>
      <section className="border-b border-line">
        <Container className="py-12 lg:py-16">
          <p className="px-label text-muted">Pilot</p>
          <h1 className="mt-5 max-w-[16ch] text-[clamp(2.25rem,5vw,4rem)] leading-[1.0] font-bold tracking-[-0.03em]">
            Thirty days, one location, real numbers.
          </h1>
          <div className="mt-6 grid max-w-[62rem] gap-4 md:grid-cols-2 md:gap-8">
            <p className="text-[17px] text-body">
              A pilot runs for 30 days on a single property. We set up the app with you, pick the
              profiles that suit the site, and put a schedule around your service hours.
            </p>
            <p className="text-[17px] text-body">
              We count bird activity per service, cleaning minutes and guest complaints for two
              weeks before and for the 30 days after. You get the numbers either way.
            </p>
          </div>
        </Container>
      </section>

      <Section num="01" label="Request a pilot" title="Tell us about the property.">
        <form
          name="pilot"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={onPilot}
          className="grid max-w-[52rem] gap-5 md:grid-cols-2"
        >
          <input type="hidden" name="form-name" value="pilot" />
          <p hidden>
            <label>
              Leave this field empty
              <input name="bot-field" tabIndex={-1} autoComplete="off" />
            </label>
          </p>

          <Field label="Name" htmlFor="pilot-name">
            <input id="pilot-name" name="name" required autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Business" htmlFor="pilot-business">
            <input
              id="pilot-business"
              name="business"
              required
              autoComplete="organization"
              className={inputClass}
            />
          </Field>
          <Field label="Email" htmlFor="pilot-email">
            <input
              id="pilot-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field label="City" htmlFor="pilot-city">
            <input
              id="pilot-city"
              name="city"
              required
              autoComplete="address-level2"
              className={inputClass}
            />
          </Field>
          <Field label="Property type" htmlFor="pilot-type" className="md:col-span-2">
            <select id="pilot-type" name="property-type" required className={inputClass}>
              <option value="">Choose one</option>
              <option>Restaurant or bar</option>
              <option>Hotel</option>
              <option>Rooftop or patio</option>
              <option>Property management</option>
              <option>Warehouse or logistics</option>
              <option>Something else</option>
            </select>
          </Field>
          <Field label="What is happening on site" htmlFor="pilot-message" className="md:col-span-2">
            <textarea
              id="pilot-message"
              name="message"
              rows={4}
              className="w-full border border-line bg-bg p-3 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="About how many birds, which area, and what you have tried."
            />
          </Field>

          <div className="md:col-span-2">
            <Button type="submit" disabled={pilotStatus === 'sending'}>
              {pilotStatus === 'sending' ? 'Sending' : 'Send the request'}
            </Button>
            <Note
              status={pilotStatus}
              done="Got it. We reply within two business days."
              fail="That did not send. Email hello@pigeonx.org and we will pick it up."
            />
          </div>
        </form>
      </Section>

      <Section
        id="download"
        num="02"
        label="Get the app"
        title="The app is in build."
        intro="Leave an email and we will send the TestFlight and Play Store links the day they open."
        alt
      >
        <form
          name="waitlist"
          method="POST"
          data-netlify="true"
          data-netlify-honeypot="bot-field"
          onSubmit={onWaitlist}
          className="max-w-[30rem]"
        >
          <input type="hidden" name="form-name" value="waitlist" />
          <p hidden>
            <label>
              Leave this field empty
              <input name="bot-field" tabIndex={-1} autoComplete="off" />
            </label>
          </p>
          <Field label="Email" htmlFor="wait-email">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="wait-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@restaurant.com"
                className={inputClass}
              />
              <Button type="submit" disabled={waitStatus === 'sending'} className="sm:shrink-0">
                {waitStatus === 'sending' ? 'Sending' : 'Get notified'}
              </Button>
            </div>
          </Field>
          <Note
            status={waitStatus}
            done="You are on the list. One email at launch, nothing else."
            fail="That did not send. Email hello@pigeonx.org and we will add you."
          />
        </form>
      </Section>
    </>
  );
}
