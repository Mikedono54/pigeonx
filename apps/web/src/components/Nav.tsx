import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { Container } from './ui/Container';
import { ButtonLink } from './ui/Button';
import { cn } from '../lib/cn';

const LINKS = [
  { label: 'Platform', to: '/platform' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Pilot', to: '/pilot' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link to="/" aria-label="PigeonX home" className="shrink-0">
          <Logo size={28} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'text-[15px] font-medium transition-colors duration-150 hover:text-ink',
                  isActive ? 'text-ink' : 'text-muted',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <ButtonLink href="/app" variant="secondary" className="h-10 px-4 text-[14px]">
            Dashboard
          </ButtonLink>
          <ButtonLink href="/pilot#download" className="h-10 px-4 text-[14px]">
            Get the app
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="grid h-11 w-11 cursor-pointer place-items-center border border-ink text-ink md:hidden"
        >
          {open ? <X size={18} strokeWidth={1.75} aria-hidden /> : <Menu size={18} strokeWidth={1.75} aria-hidden />}
        </button>
      </Container>

      <div id="mobile-nav" hidden={!open} className="border-t border-line bg-bg md:hidden">
        <ul className="flex flex-col">
          {LINKS.map((l) => (
            <li key={l.to} className="border-b border-line">
              <Link
                to={l.to}
                className="block px-5 py-4 text-[16px] font-medium text-ink sm:px-8"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="border-b border-line">
            <Link to="/app" className="block px-5 py-4 text-[16px] font-medium text-ink sm:px-8">
              Dashboard
            </Link>
          </li>
        </ul>
        <div className="p-5 sm:p-8">
          <ButtonLink href="/pilot#download" className="w-full">
            Get the app
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
