import { Check } from 'lucide-react';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { cn } from '../../lib/cn';

type Plan = {
  name: string;
  price: string;
  cadence?: string;
  altPrice?: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string; variant: 'primary' | 'secondary' };
  tag?: { label: string; tone: 'accent' | 'blue' };
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    blurb: 'Try the deterrent engine on one area, no account required.',
    features: [
      'Full deterrent engine',
      '3 system profiles',
      '15-minute sessions',
      'Phone speaker output',
      '7 days of session history',
    ],
    cta: { label: 'Get the app', href: '#download', variant: 'secondary' },
  },
  {
    name: 'Pro',
    price: '$4.99',
    cadence: '/mo',
    altPrice: 'or $29.99 / year',
    blurb: 'For an owner-operator running one property properly.',
    features: [
      'All profiles, including audible distress calls',
      'Custom profile builder',
      'Unlimited saved profiles',
      'Schedules with reminders',
      'Unlimited session length',
      'Full session history',
    ],
    cta: { label: 'Get the app', href: '#download', variant: 'primary' },
    tag: { label: 'Most popular', tone: 'accent' },
  },
  {
    name: 'Business',
    price: '$29',
    cadence: '/mo per location',
    blurb: 'For teams that need zones, devices and a record of what ran.',
    features: [
      'Everything in Pro',
      'Locations, zones and devices',
      'Multiple speakers per zone',
      'Team members and roles',
      'Web dashboard',
      'Activity log and weekly report',
    ],
    cta: { label: 'Start a pilot', href: '#contact', variant: 'secondary' },
    tag: { label: 'For operators', tone: 'blue' },
  },
  {
    name: 'Enterprise',
    price: 'Contact sales',
    blurb: 'For groups and portfolios running many properties.',
    features: [
      'Everything in Business',
      'Multi-location org view',
      'Analytics and CSV export',
      'Custom roles and SSO-ready access',
      'Remote monitoring',
      'Priority support',
    ],
    cta: { label: 'Contact sales', href: '#contact', variant: 'secondary' },
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      <Container size="wide">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Pay when it is running your property."
          description="Solo operators pay per phone. Businesses pay per location. Nobody pays for hardware before a pilot proves it out."
        />

        <ul className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan, i) => {
            const featured = plan.tag?.tone === 'accent';
            return (
              <Reveal as="li" key={plan.name} delay={i * 0.05} className="h-full">
                <div
                  className={cn(
                    'relative flex h-full flex-col rounded-[var(--radius-lg)] border p-6',
                    featured
                      ? 'border-teal/40 bg-[linear-gradient(165deg,#17243D_0%,#131D33_60%)] shadow-[0_0_0_1px_rgba(45,212,191,0.12),0_30px_70px_-40px_rgba(45,212,191,0.55)]'
                      : 'border-border-line bg-card shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)]',
                  )}
                >
                  {plan.tag ? (
                    <span
                      className={cn(
                        'absolute -top-3 left-6 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] uppercase',
                        plan.tag.tone === 'accent'
                          ? 'px-gradient-bg text-on-accent'
                          : 'border border-blue/40 bg-blue/15 text-blue',
                      )}
                    >
                      {plan.tag.label}
                    </span>
                  ) : null}

                  <h3 className="font-display text-[15px] font-semibold tracking-wide text-fg-muted uppercase">
                    {plan.name}
                  </h3>

                  <p className="mt-4 flex flex-wrap items-baseline gap-1.5">
                    <span
                      className={cn(
                        'font-display font-bold tracking-[-0.03em] text-fg',
                        plan.price.length > 8 ? 'text-[1.6rem]' : 'text-[2.35rem] leading-none',
                      )}
                    >
                      {plan.price}
                    </span>
                    {plan.cadence ? (
                      <span className="text-[13px] font-medium text-fg-muted">{plan.cadence}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 h-4 text-[12px] text-teal">{plan.altPrice ?? ''}</p>

                  <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">{plan.blurb}</p>

                  <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-border-line pt-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check size={15} className="mt-0.5 shrink-0 text-teal" aria-hidden />
                        <span className="text-[13.5px] leading-snug text-fg-muted">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <ButtonLink
                    href={plan.cta.href}
                    variant={plan.cta.variant}
                    className={cn('mt-7 w-full', plan.tag?.tone === 'blue' && 'border-blue/45 hover:border-blue/70')}
                  >
                    {plan.cta.label}
                  </ButtonLink>
                </div>
              </Reveal>
            );
          })}
        </ul>

        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-[13px] text-fg-muted">
            Prices shown in USD. PigeonX emitters are sold or leased separately — talk to us about
            the hardware pilot.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
