import { Link } from 'react-router';
import { Logo } from './Logo';
import { Container } from './ui/Container';

const LINKS = [
  { label: 'Platform', to: '/platform' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Pilot', to: '/pilot' },
  { label: 'Privacy', to: '/privacy' },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-bg">
      <Container className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <Link to="/" aria-label="PigeonX home">
          <Logo size={26} />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-3">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[14px] text-muted transition-colors duration-150 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="px-label text-muted">© 2026 PigeonX</p>
      </Container>
    </footer>
  );
}
