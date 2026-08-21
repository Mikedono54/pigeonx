import { ClipboardList, LineChart, MessageSquareQuote, Quote } from 'lucide-react';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';

const METRICS = [
  {
    icon: LineChart,
    label: 'Bird activity per service',
    unit: 'landings / hour',
    method: 'Counted on the patio during the same two services, before and after.',
  },
  {
    icon: ClipboardList,
    label: 'Cleaning minutes per day',
    unit: 'minutes / day',
    method: 'Logged by the closing team on the same surfaces, before and after.',
  },
  {
    icon: MessageSquareQuote,
    label: 'Guest complaints per week',
    unit: 'complaints / week',
    method: 'Pulled from the same review and comment channels, before and after.',
  },
];

const QUOTES = [
  {
    role: 'Restaurant group, San Francisco',
    status: 'Pilot in progress',
    note: 'Two patios, one rooftop bar. Baseline measured across four weeks of service.',
  },
  {
    role: 'Boutique hotel, Pacific Northwest',
    status: 'Pilot in progress',
    note: 'Terrace and pool deck, running scheduled windows around breakfast and turndown.',
  },
];

export function Pilots() {
  return (
    <section id="pilots" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Proof, not promises"
          title="Start with one patio."
          description="We do not have a case study to hand you yet, and we are not going to invent one. Here is exactly what we measure on every pilot — before we turn anything on, and after."
        />

        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {METRICS.map(({ icon: Icon, label, unit, method }, i) => (
            <Reveal as="li" key={label} delay={i * 0.06} className="h-full">
              <Card className="flex h-full flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-border-line bg-elevated text-teal">
                    <Icon size={18} aria-hidden />
                  </span>
                  <Badge tone="outline">Pilot goal</Badge>
                </div>
                <div>
                  <p className="font-display text-[16px] font-semibold text-fg">{label}</p>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span aria-hidden className="font-mono text-[2rem] leading-none font-medium text-fg-subtle">
                      —
                    </span>
                    <span className="font-mono text-[12px] text-fg-muted">{unit}</span>
                  </p>
                </div>
                <p className="mt-auto border-t border-border-line pt-4 text-[12.5px] leading-relaxed text-fg-muted">
                  <span className="font-semibold text-teal">Measured before / after.</span> {method}
                </p>
              </Card>
            </Reveal>
          ))}
        </ul>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {QUOTES.map((q, i) => (
            <Reveal key={q.role} delay={i * 0.06}>
              <Card className="flex h-full flex-col gap-4 bg-[linear-gradient(160deg,#16203A_0%,#131D33_100%)]">
                <Quote size={22} className="text-teal/45" aria-hidden />
                <p className="text-[15px] leading-relaxed text-fg-muted italic">
                  Results published here once the pilot closes. No placeholder testimonials.
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-line pt-4">
                  <span className="text-[13px] font-semibold text-fg">{q.role}</span>
                  <Badge tone="teal">{q.status}</Badge>
                </div>
                <p className="-mt-1 text-[12.5px] text-fg-muted">{q.note}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
