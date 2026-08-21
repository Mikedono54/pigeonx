import {
  AudioLines,
  BluetoothConnected,
  CalendarClock,
  LayoutGrid,
  MonitorSmartphone,
  ScanEye,
} from 'lucide-react';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const PILLARS = [
  {
    icon: AudioLines,
    title: 'Frequency control',
    body: 'Tone, sweep, pulse and sample profiles with live frequency, volume and randomisation. Build your own, save it, reuse it across every location.',
  },
  {
    icon: BluetoothConnected,
    title: 'Bluetooth connectivity',
    body: 'Route audio to the speaker that is already on the patio. PigeonX remembers your devices and reconnects to the right one for each zone.',
  },
  {
    icon: CalendarClock,
    title: 'Scheduling',
    body: 'Recurring windows tied to service hours. On a phone that means a prompt and one-tap start; on PigeonX hardware it runs unattended.',
  },
  {
    icon: LayoutGrid,
    title: 'Zone management',
    body: 'Locations, zones and devices in one tree. The rooftop, the front patio and the loading dock each get their own profile and schedule.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Commercial dashboard',
    body: 'A web view for operators: live zone status, activity log, team roles, and a weekly report per location you can forward to ownership.',
  },
  {
    icon: ScanEye,
    title: 'Smart detection',
    body: 'Camera and motion triggers so a zone only fires when birds are actually present — cutting run time and guest exposure.',
    badge: 'Roadmap',
  },
];

export function Platform() {
  return (
    <section id="platform" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="The platform"
          title="One system, from the phone in your pocket to the rooftop."
          description="PigeonX is not a gadget you plug in and forget. It is a connected system with a control app, a device layer, and an operator view."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body, badge }, i) => (
            <Reveal as="li" key={title} delay={i * 0.05} className="h-full">
              <Card interactive className="flex h-full flex-col gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-teal/20 bg-[linear-gradient(140deg,rgba(45,212,191,0.16),rgba(59,130,246,0.08))] text-teal">
                    <Icon size={19} aria-hidden />
                  </span>
                  {badge ? <Badge tone="accent">{badge}</Badge> : null}
                </div>
                <h3 className="font-display text-[17px] font-semibold text-fg">{title}</h3>
                <p className="text-[14px] leading-relaxed text-fg-muted">{body}</p>
              </Card>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
