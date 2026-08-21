import { Link } from 'react-router';
import { AppFrame } from '../components/AppFrame';
import { Container } from '../components/ui/Container';
import { ButtonLink } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { PLANS } from '../data/plans';

const MADE_FOR = [
  'Restaurants',
  'Hotels',
  'Rooftops and patios',
  'Property managers',
  'Warehouses',
];

const COLUMNS = [
  {
    num: '01',
    title: 'Control from your phone',
    body: 'Pick a profile, set a duration, press start. Frequency and volume stay under your thumb the whole time it runs.',
  },
  {
    num: '02',
    title: 'Runs on your speakers or our emitters',
    body: 'Send the audio to the phone, a paired Bluetooth speaker, or a PigeonX emitter. The app shows the top frequency each output can reach.',
  },
  {
    num: '03',
    title: 'Schedules and a dashboard for multi-location teams',
    body: 'Set the hours around service and let the emitters hold them. A manager sees every location and every session in one web view.',
  },
];

export default function Home() {
  return (
    <>
      {/* 1. Hero */}
      <section className="border-b border-line">
        <Container className="grid gap-12 py-12 lg:grid-cols-12 lg:gap-10 lg:py-20">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="px-label text-muted">Sound based bird deterrence</p>
            <h1 className="mt-5 text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.98] font-bold tracking-[-0.03em]">
              Bird control you run from your phone.
            </h1>
            <p className="mt-6 max-w-[52ch] text-[17px] text-body sm:text-[18px]">
              PigeonX turns a phone into the controller for sound based bird deterrence. Pick a
              profile, route it to your speakers or our emitters, schedule it around service, and
              see what changed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/pilot">Start a pilot</ButtonLink>
              <ButtonLink href="/pricing" variant="secondary">
                See pricing
              </ButtonLink>
            </div>
            <p className="px-label mt-8 text-muted">Pilots open in San Francisco</p>
          </div>

          <div className="flex items-start justify-start lg:col-span-5 lg:items-center lg:justify-end">
            <AppFrame id="app-frame" />
          </div>
        </Container>
      </section>

      {/* 2. Made for */}
      <section className="border-b border-line bg-alt">
        <Container className="flex flex-wrap items-center gap-x-8 gap-y-2 py-5">
          <span className="px-label text-ink">Made for</span>
          {MADE_FOR.map((m) => (
            <span key={m} className="px-label text-muted">
              {m}
            </span>
          ))}
        </Container>
      </section>

      {/* 3. What you get */}
      <Section label="What you get" title="Three parts, one system.">
        <ul className="grid gap-10 md:grid-cols-3 md:gap-0">
          {COLUMNS.map((c) => (
            <li
              key={c.num}
              className="md:border-l md:border-line md:px-7 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <p className="px-label text-accent">{c.num}</p>
              <h3 className="mt-4 max-w-[22ch] font-display text-[20px] leading-tight font-semibold">
                {c.title}
              </h3>
              <p className="mt-3 text-[16px] text-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. Pricing */}
      <Section
        num="01"
        label="Pricing"
        title="Start free. Pay when a location depends on it."
        alt
      >
        <div className="grid border-t border-line md:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="border-b border-line bg-bg p-5 md:border-b-0 md:border-l md:first:border-l-0"
            >
              <p className="px-label text-ink">{p.name}</p>
              <p className="px-num mt-3 text-[26px] leading-none text-ink">{p.price}</p>
              <p className="px-label mt-2 text-muted">{p.unit}</p>
              <p className="mt-4 text-[15px] text-muted">{p.summary}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[15px]">
          <Link
            to="/pricing"
            className="border-b border-accent pb-0.5 font-medium text-accent hover:border-ink hover:text-ink"
          >
            Full pricing
          </Link>
        </p>
      </Section>

      {/* 5. Pilot */}
      <section className="border-b border-line">
        <Container className="grid gap-8 py-12 md:grid-cols-12 md:items-end lg:py-16">
          <div className="md:col-span-8">
            <p className="px-label text-muted">
              <span className="text-accent">02</span> / Pilot
            </p>
            <h2 className="mt-4 max-w-[20ch] text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] font-semibold">
              Run PigeonX on one patio for 30 days.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[17px] text-muted">
              We count bird activity per service, cleaning minutes and guest complaints before and
              after, then hand you the numbers.
            </p>
          </div>
          <div className="md:col-span-4 md:justify-self-end">
            <ButtonLink href="/pilot">Start a pilot</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
