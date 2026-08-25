import { Check } from 'lucide-react';
import { Container } from '../components/ui/Container';
import { ButtonLink } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { PLANS } from '../data/plans';

const FAQ = [
  {
    q: 'Is this safe for people and pets?',
    a: 'Yes. PigeonX plays sound through a speaker at normal listening levels. No spikes, no nets, no gel, no chemicals. Dogs and cats hear higher frequencies than we do, so keep the volume down in a room where a pet sleeps.',
  },
  {
    q: 'Will guests hear it?',
    a: 'Some of them will. Sound above 17 kHz sits at the edge of adult hearing, and most people under 30 still catch it. The app marks every profile with energy above that line, so you know before you press start.',
  },
  {
    q: 'Does ultrasonic sound work on pigeons?',
    a: 'The evidence for ultrasonic alone is weak. Pigeon hearing falls off above about 4 kHz, so we do not build the product on that claim. Profiles include audible distress and predator calls, which have better support, and every pilot measures results on your own property.',
  },
  {
    q: 'Do I need hardware?',
    a: 'No. Start with the phone in your pocket or a Bluetooth speaker you already own. Emitters matter when you want more output, a weatherproof box, or a schedule that runs with no phone in the room.',
  },
  {
    q: 'Does it run when my phone is locked?',
    a: 'A session keeps playing with the screen off, and you stop it from the lock screen. Long schedules are a different story: the phone sends you a reminder with a one tap start, and emitters run schedules on their own. We say this up front because iOS will not run open ended background timers.',
  },
  {
    q: 'Which speakers work?',
    a: 'Any Bluetooth speaker your phone can pair with, plus wired speakers through a phone or a small amp. Most Bluetooth codecs stop near 19 kHz, so the app caps the profile at what the speaker can send and tells you the ceiling.',
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-line">
        <Container className="py-12 lg:py-16">
          <p className="px-label text-muted">Pricing</p>
          <h1 className="mt-5 max-w-[16ch] text-[clamp(2.25rem,5vw,4rem)] leading-[1.0] font-bold tracking-[-0.03em]">
            Free to try. $29/month per location.
          </h1>
          <p className="mt-6 max-w-[58ch] text-[17px] text-body sm:text-[18px]">
            App plans are billed through the App Store and Google Play. Business and Enterprise are
            billed per location and start with a pilot.
          </p>
        </Container>
      </section>

      <Section num="01" label="Plans" title="Four plans.">
        <div className="grid border-t border-line lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="flex flex-col border-b border-line p-5 lg:border-b-0 lg:border-l lg:first:border-l-0 lg:p-6"
            >
              <p className="px-label text-ink">{p.name}</p>
              <p className="px-num mt-4 text-[30px] leading-none text-ink">{p.price}</p>
              <p className="px-label mt-2 text-muted">{p.unit}</p>
              <p className="mt-4 border-t border-line pt-4 text-[15px] text-muted">{p.summary}</p>

              {p.featuresLead ? (
                <p className="px-label mt-5 text-ink">{p.featuresLead}</p>
              ) : null}
              <ul className={p.featuresLead ? 'mt-3 flex flex-col gap-2' : 'mt-5 flex flex-col gap-2'}>
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[15px] text-body">
                    <Check size={16} strokeWidth={1.75} className="mt-1 shrink-0 text-accent" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 pt-2 lg:mt-auto">
                <ButtonLink
                  href={p.cta.href}
                  variant={p.name === 'Business' ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {p.cta.label}
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
        <p className="px-label mt-6 text-muted">
          Prices in USD. App plans renew until you cancel in the store that billed you. Business is
          $29/month per location.
        </p>
        <p className="mt-3 text-[15px] text-muted">
          Managing a larger portfolio? Contact us for custom pricing at{' '}
          <a
            href="mailto:hello@pigeonx.org"
            className="font-medium text-accent underline underline-offset-4 hover:text-ink"
          >
            hello@pigeonx.org
          </a>
          .
        </p>
      </Section>

      <Section num="02" label="Questions" title="Six answers before you ask." alt>
        <dl className="grid border-t border-line md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="border-b border-line bg-bg p-5 md:even:border-l lg:p-6">
              <dt className="font-display text-[18px] font-semibold text-ink">{f.q}</dt>
              <dd className="mt-2 max-w-[52ch] text-[15px] text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <section className="border-b border-line">
        <Container className="grid gap-8 py-12 md:grid-cols-12 md:items-end lg:py-16">
          <div className="md:col-span-8">
            <h2 className="max-w-[20ch] text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.05] font-semibold">
              Business plans start with a 30 day pilot.
            </h2>
            <p className="mt-4 max-w-[54ch] text-[17px] text-muted">
              One location, measured before and after. If the numbers do not move, you walk.
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
