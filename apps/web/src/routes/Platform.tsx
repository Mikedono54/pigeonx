import { Container } from '../components/ui/Container';
import { ButtonLink } from '../components/ui/Button';
import { Section } from '../components/ui/Section';
import { EmitterArt } from '../components/EmitterArt';

const STEPS = [
  {
    num: '01',
    title: 'Pick a profile',
    body: 'Open the app and choose what plays: a tone, a sweep, a pulse, or a recorded distress call. Every profile lists the frequency it uses.',
  },
  {
    num: '02',
    title: 'Choose an output',
    body: 'Phone speaker, a paired Bluetooth speaker, or a PigeonX emitter. The app shows the ceiling for that output before you press start.',
  },
  {
    num: '03',
    title: 'Set the window',
    body: 'Run it now for 15 minutes, or set the hours around service. Emitters hold the schedule and the phone sends a reminder.',
  },
];

const CAPABILITIES = [
  {
    title: 'Frequency control',
    body: 'Set the band, the sweep rate and the pulse timing. Each profile shows its peak in Hz.',
  },
  {
    title: 'Bluetooth',
    body: 'Route the output to a paired speaker. The app keeps the speakers you use most.',
  },
  {
    title: 'Scheduling',
    body: 'Days, start time and end time, per zone. Emitters run them. Phones remind you.',
  },
  {
    title: 'Zone management',
    body: 'Split a property into patio, rooftop and loading dock. Each zone keeps its own profile and device.',
  },
  {
    title: 'Commercial dashboard',
    body: 'Locations, live status and a weekly summary you can forward to ownership.',
  },
  {
    title: 'Smart detection',
    tag: 'Roadmap',
    body: 'Start a zone from a camera or a motion sensor instead of a clock. Not built yet.',
  },
];

const CEILINGS = [
  { name: 'Phone speaker', hz: 18, label: '18 kHz' },
  { name: 'Bluetooth speaker', hz: 19, label: '19 kHz' },
  { name: 'PigeonX emitter', hz: 25, label: '25 kHz' },
];

const MAX_HZ = 25;
const AUDIBLE_EDGE = (17 / MAX_HZ) * 100;

export default function Platform() {
  return (
    <>
      <section className="border-b border-line">
        <Container className="py-12 lg:py-16">
          <p className="px-label text-muted">Platform</p>
          <h1 className="mt-5 max-w-[18ch] text-[clamp(2.25rem,5vw,4rem)] leading-[1.0] font-bold tracking-[-0.03em]">
            What the app does, and what it will not do.
          </h1>
          <p className="mt-6 max-w-[58ch] text-[17px] text-body sm:text-[18px]">
            PigeonX is a control layer for sound. The app decides what plays, where it plays and
            when. The hardware exists for the cases a phone cannot cover.
          </p>
        </Container>
      </section>

      <Section num="01" label="How it works" title="Three steps, start to schedule.">
        <ol className="grid gap-10 md:grid-cols-3 md:gap-0">
          {STEPS.map((s) => (
            <li
              key={s.num}
              className="md:border-l md:border-line md:px-7 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <p className="px-label text-accent">{s.num}</p>
              <h3 className="mt-4 font-display text-[20px] leading-tight font-semibold">
                {s.title}
              </h3>
              <p className="mt-3 text-[16px] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section num="02" label="Capabilities" title="Six things the platform manages." alt>
        <ul className="grid border-t border-line md:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="border-b border-line bg-bg p-5 md:even:border-l lg:p-6">
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-[18px] font-semibold">{c.title}</h3>
                {c.tag ? (
                  <span className="px-label border border-warning px-2 py-0.5 text-warning">
                    {c.tag}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-[46ch] text-[15px] text-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        num="03"
        label="Output ceilings"
        title="How high each output goes."
        intro="Phone speakers and Bluetooth codecs roll off before the numbers on a spec sheet. These are the ceilings we design around."
      >
        <div className="border border-line">
          <ul>
            {CEILINGS.map((c) => (
              <li
                key={c.name}
                className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 border-b border-line px-4 py-4 sm:grid-cols-[12rem_1fr_5rem] sm:gap-5"
              >
                <span className="text-[14px] text-ink sm:text-[15px]">{c.name}</span>
                <span className="relative block h-4 bg-alt">
                  <span
                    className="absolute inset-y-0 left-0 block bg-accent"
                    style={{ width: `${(c.hz / MAX_HZ) * 100}%` }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-y-[-8px] block border-l border-ink"
                    style={{ left: `${AUDIBLE_EDGE}%` }}
                  />
                </span>
                <span className="px-num text-right text-[13px] text-ink">{c.label}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-[7rem_1fr] gap-3 bg-alt px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-5">
            <span className="px-label text-muted">Scale 0 to 25 kHz</span>
            <span className="px-label text-warning">
              Right of the line, above 17 kHz: guests may hear
            </span>
          </div>
        </div>
      </Section>

      <Section num="04" label="Hardware" title="PigeonX emitters." alt>
        <div className="grid gap-8 border border-line bg-bg md:grid-cols-12">
          <div className="p-6 md:col-span-7 lg:p-8">
            <p className="max-w-[52ch] text-[17px] text-body">
              A weatherproof housing on a wall or rail mount, with output up to 25 kHz. An emitter
              keeps its own schedule, so a zone runs when nobody is on site with a phone.
            </p>
            <p className="px-label mt-5 text-muted">Pilot units only. Not on sale yet.</p>
            <div className="mt-7">
              <ButtonLink href="/pilot">Join the hardware pilot</ButtonLink>
            </div>
          </div>
          <div className="flex items-center justify-center border-line p-6 md:col-span-5 md:border-l lg:p-8">
            <EmitterArt className="w-full max-w-[300px] text-ink" />
          </div>
        </div>
      </Section>
    </>
  );
}
