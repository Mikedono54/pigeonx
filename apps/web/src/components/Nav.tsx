import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { Logo } from './Logo';
import { Container } from './ui/Container';
import { ButtonLink } from './ui/Button';
import { cn } from '../lib/cn';

const LINKS = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Platform', href: '/#platform' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Hardware', href: '/#hardware' },
  { label: 'FAQ', href: '/#faq' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open
          ? 'border-b border-border-line bg-bg/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-18">
        <Link
          to="/"
          className="rounded-md focus-visible:outline-2"
          aria-label="PigeonX home"
        >
          <Logo size={34} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-fg-muted transition-colors duration-200 hover:bg-white/[0.05] hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <ButtonLink href="/app" variant="secondary">
            <LayoutDashboard size={15} aria-hidden />
            Dashboard
          </ButtonLink>
          <ButtonLink href="/#download">
            Get the app
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-[var(--radius-sm)] border border-border-line bg-white/[0.03] text-fg transition-colors duration-200 hover:bg-white/[0.08] md:hidden"
        >
          {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
      </Container>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-border-line bg-bg/95 backdrop-blur-xl md:hidden"
      >
        <Container className="flex flex-col gap-1 py-4">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-sm)] px-3 py-3 text-[15px] font-medium text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2.5">
            <ButtonLink href="/app" variant="secondary">
              <LayoutDashboard size={16} aria-hidden />
              Dashboard
            </ButtonLink>
            <ButtonLink href="/#download">Get the app</ButtonLink>
          </div>
        </Container>
      </div>
    </header>
  );
}
