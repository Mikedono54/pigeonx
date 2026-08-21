import { Banknote, Bird, ShieldAlert, SprayCan, Users } from 'lucide-react';
import { Container } from '../ui/Container';
import { Card } from '../ui/Card';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { cn } from '../../lib/cn';

const PROBLEMS = [
  {
    icon: Users,
    title: 'Outdoor dining gets interrupted',
    body: 'Birds work the patio between courses. Guests wave them off, servers reset tables, and the section turns slower than it should.',
  },
  {
    icon: SprayCan,
    title: 'Droppings on every surface',
    body: 'Tables, umbrellas, balconies, walkways and rooftop equipment. It is visible from the street and it is the first thing a review mentions.',
  },
  {
    icon: Banknote,
    title: 'Cleaning that never ends',
    body: 'Pressure washing, awning replacement, ledge repair. A recurring line item that grows quietly year over year.',
  },
  {
    icon: ShieldAlert,
    title: 'Food-safety exposure',
    body: 'Birds over open food, prep areas and waste zones create inspection risk that no amount of wiping down fully resolves.',
  },
  {
    icon: Bird,
    title: 'Existing deterrents disappoint',
    body: 'Spikes and netting look industrial on a hospitality property. Plug-in gadgets are inconsistent, and nobody can tell you whether they worked.',
  },
];

export function Problem() {
  return (
    <section id="problem" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="The problem"
          title="Birds are an operations problem dressed up as a nuisance."
          description="Every property that serves people outdoors is paying for this somewhere — in labour, in maintenance, or in the guest experience."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {PROBLEMS.map(({ icon: Icon, title, body }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 0.05}
              className={cn('h-full', i < 3 ? 'lg:col-span-2' : 'lg:col-span-3')}
            >
              <Card interactive className="flex h-full flex-col gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] border border-border-line bg-elevated text-teal">
                  <Icon size={18} aria-hidden />
                </span>
                <h3 className="text-[17px] leading-snug font-semibold text-fg">{title}</h3>
                <p className="text-[14px] leading-relaxed text-fg-muted">{body}</p>
              </Card>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
