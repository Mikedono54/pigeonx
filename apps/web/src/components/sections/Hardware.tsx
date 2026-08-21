import { ArrowRight, Cpu, Radio, Wrench } from 'lucide-react';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { EmitterArt } from '../EmitterArt';

const SPECS = [
  {
    icon: Radio,
    title: 'Reaches where a phone cannot',
    body: 'A purpose-built tweeter carries clean output up to 25 kHz — the range a phone or a Bluetooth speaker simply cannot reproduce.',
  },
  {
    icon: Cpu,
    title: 'Runs schedules unattended',
    body: 'The emitter holds its own schedule, so the rooftop keeps working at 5am whether or not anyone has the app open.',
  },
  {
    icon: Wrench,
    title: 'Provisioned from the app',
    body: 'Pair over Bluetooth, assign it to a zone, push a profile. No installer visit, no controller box, no new wiring run.',
  },
];

export function Hardware() {
  return (
    <section
      id="hardware"
      className="relative overflow-hidden border-y border-border-line bg-surface/40 py-20 sm:py-28"
    >
      <div
        aria-hidden
        className="absolute top-0 right-0 h-[440px] w-[540px] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.14),transparent_70%)] blur-[70px]"
      />
      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal className="order-2 lg:order-1">
            <Card glow className="overflow-hidden bg-[linear-gradient(160deg,#16203A_0%,#101830_100%)] p-0">
              <div className="relative px-2 pt-8 pb-4 sm:px-5">
                <EmitterArt className="mx-auto h-auto w-full max-w-[460px]" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-line px-6 py-4">
                <span className="font-display text-[15px] font-semibold text-fg">
                  PigeonX Emitter&nbsp;01
                </span>
                <span className="font-mono text-[12px] text-fg-muted">
                  IP65 · PoE or 24V · ≤ 25 kHz
                </span>
              </div>
            </Card>
          </Reveal>

          <div className="order-1 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="Hardware"
              title={
                <>
                  PigeonX Emitters — the part of the system that never goes home at close.
                </>
              }
              description="Connected speakers built for the property, sold or leased alongside the platform. They are the difference between a phone that helps and a system that holds."
            />
            <Badge tone="teal" className="mt-6">
              Pilot units shipping to design partners
            </Badge>

            <ul className="mt-8 flex flex-col gap-5">
              {SPECS.map(({ icon: Icon, title, body }, i) => (
                <Reveal as="li" key={title} delay={i * 0.06} className="flex gap-4">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-border-line bg-card text-teal">
                    <Icon size={18} aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-[16px] font-semibold text-fg">{title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>

            <ButtonLink href="#contact" className="mt-9">
              Join the hardware pilot
              <ArrowRight
                size={16}
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
