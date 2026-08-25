export type Plan = {
  name: string;
  price: string;
  unit: string;
  summary: string;
  featuresLead?: string;
  features: string[];
  cta: { label: string; href: string };
};

export const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    unit: 'forever',
    summary: 'The deterrent engine, three profiles, 15 minute sessions.',
    features: [
      'Deterrent engine',
      '3 system profiles',
      '15 minute sessions',
      '1 saved profile',
      '7 days of session history',
    ],
    cta: { label: 'Get the app', href: '/pilot#download' },
  },
  {
    name: 'Pro',
    price: '$4.99',
    unit: 'per month, or $29.99 a year',
    summary: 'Every profile, a builder for your own, schedules and full history.',
    features: [
      'All profiles, including audible calls',
      'Custom profile builder',
      'Saved profiles',
      'Schedules as phone reminders',
      'Sessions with no time cap',
      'Full session history',
    ],
    cta: { label: 'Get the app', href: '/pilot#download' },
  },
  {
    name: 'Business',
    price: '$29',
    unit: 'per month, per location',
    summary: 'Locations, areas, a team and the web dashboard.',
    featuresLead: 'Everything in Pro, plus:',
    features: [
      'Locations and areas',
      'Multiple speakers and emitters',
      'Protection plans per area',
      'Team members and roles',
      'Web dashboard',
      'One history across every location, with a weekly report',
    ],
    cta: { label: 'Start a pilot', href: '/pilot' },
  },
  {
    name: 'Enterprise',
    price: 'Talk to us',
    unit: 'annual agreement',
    summary: 'Every property in one view, with exports and monitoring.',
    features: [
      'Multi-location view',
      'Analytics and CSV export',
      'Roles across every property',
      'Remote monitoring',
      'Priority support',
    ],
    cta: { label: 'Contact us', href: 'mailto:hello@pigeonx.org' },
  },
];
