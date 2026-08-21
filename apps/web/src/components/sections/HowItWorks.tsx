import { CalendarClock, Speaker, SlidersHorizontal } from 'lucide-react';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const STEPS = [
  {
    n: '01',
    icon: SlidersHorizontal,
    title: 'Open the app and pick a profile',
    body: 'Species-tuned presets for pigeons, gulls and starlings — ultrasonic sweeps, pulsed tones, and audible distress calls. Each one tells you what it does and who can hear it.',
  },
  {
    n: '02',
    icon: Speaker,
    title: 'Route it to your speakers',
    body: 'Play through the phone, a Bluetooth speaker you already own, or PigeonX emitters mounted where the birds actually land. The app shows the honest frequency ceiling for each.',
  },
  {
    n: '03',
    icon: CalendarClock,
    title: 'Schedule it around service',
    body: 'Run before doors, between seatings, or overnight on the rooftop. Every run is logged, so your dashboard shows what ran, where, and for how long.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-y border-border-line bg-surface/40 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, and the patio is covered."
          description="No installers, no rewiring, no contract before you have seen it work on one area."
        />

        <ol className="relative mt-14 grid gap-6 lg:grid-cols-3 lg:gap-8">
          <span
            aria-hidden
            className="absolute top-7 right-10 left-10 hidden h-px bg-gradient-to-r from-teal/0 via-teal/40 to-blue/0 lg:block"
          />
          {STEPS.map(({ n, icon: Icon, title, body }, i) => (
            <Reveal as="li" key={n} delay={i * 0.07} className="relative">
              <div className="flex flex-col gap-4">
                <span className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-[16px] border border-border-line bg-card text-teal shadow-[0_16px_36px_-20px_rgba(0,0,0,0.9)]">
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <span className="font-mono text-[12px] font-medium tracking-[0.12em] text-teal">
                    Step {n}
                  </span>
                  <h3 className="mt-2 font-display text-[19px] leading-snug font-semibold text-fg">
                    {title}
                  </h3>
                </div>
                <p className="text-[14.5px] leading-relaxed text-fg-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
