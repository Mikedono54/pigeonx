import { Building2, Hotel, UtensilsCrossed, Warehouse, Sun } from 'lucide-react';
import { Container } from '../ui/Container';
import { Reveal } from '../ui/Reveal';

const AUDIENCES = [
  { label: 'Restaurants', icon: UtensilsCrossed },
  { label: 'Hotels', icon: Hotel },
  { label: 'Rooftops & patios', icon: Sun },
  { label: 'Property managers', icon: Building2 },
  { label: 'Warehouses', icon: Warehouse },
];

export function TrustStrip() {
  return (
    <section aria-label="Who PigeonX is designed for" className="border-y border-border-line bg-surface/50">
      <Container className="py-8 sm:py-10">
        <Reveal className="flex flex-col items-center gap-6 lg:flex-row lg:gap-10">
          <span className="shrink-0 text-[11px] font-semibold tracking-[0.18em] text-fg-muted uppercase">
            Designed for
          </span>
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:flex lg:flex-1 lg:items-center lg:justify-between lg:gap-6">
            {AUDIENCES.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border-line bg-white/[0.03] text-teal">
                  <Icon size={15} aria-hidden />
                </span>
                <span className="text-[13px] font-medium text-fg-muted sm:text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
