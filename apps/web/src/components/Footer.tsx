import { Link } from 'react-router';
import { Logo } from './Logo';
import { Container } from './ui/Container';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Platform pillars', href: '/#platform' },
      { label: 'What actually works', href: '/#honest' },
      { label: 'Hardware', href: '/#hardware' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Pilots', href: '/#pilots' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Contact', href: '/#contact' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Get the app', href: '/#download' },
      { label: 'Business dashboard', href: '/app' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border-line bg-surface/60">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col gap-4">
            <Logo size={34} />
            <p className="max-w-xs text-sm leading-relaxed text-fg-muted">
              Turning bird control from an analog nuisance into a connected technology platform.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
              <h3 className="font-sans text-[11px] font-semibold tracking-[0.16em] text-fg-muted uppercase">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) =>
                  l.href.startsWith('/#') || l.href.startsWith('#') ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-sm text-fg-muted transition-colors duration-200 hover:text-teal"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        to={l.href}
                        className="text-sm text-fg-muted transition-colors duration-200 hover:text-teal"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-fg-muted">© 2026 PigeonX. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-[13px] text-fg-muted transition-colors hover:text-fg">
              Privacy
            </Link>
            <Link to="/terms" className="text-[13px] text-fg-muted transition-colors hover:text-fg">
              Terms
            </Link>
            <a
              href="mailto:hello@pigeonx.org"
              className="text-[13px] text-fg-muted transition-colors hover:text-fg"
            >
              hello@pigeonx.org
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
