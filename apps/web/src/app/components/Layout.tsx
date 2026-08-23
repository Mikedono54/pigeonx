import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import {
  Building2,
  CalendarClock,
  ChevronDown,
  CreditCard,
  LayoutGrid,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { cn } from '../../lib/cn';
import { useAuth } from '../AuthProvider';
import { leaveDemo } from '../lib/demo';

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/app/places', label: 'Places', icon: Building2, end: false },
  { to: '/app/schedules', label: 'Schedules', icon: CalendarClock, end: false },
  { to: '/app/team', label: 'Team', icon: Users, end: false },
  { to: '/app/billing', label: 'Billing', icon: CreditCard, end: false },
  { to: '/app/settings', label: 'Settings', icon: Settings, end: false },
];

function BusinessSwitcher() {
  const { businesses, business, chooseBusiness } = useAuth();
  const [open, setOpen] = useState(false);

  if (businesses.length < 2) {
    return business ? (
      <div className="border-b border-line px-4 py-4">
        <p className="px-label text-muted">Business</p>
        <p className="mt-1.5 truncate text-[15px] font-medium text-ink">{business.name}</p>
      </div>
    ) : null;
  }

  return (
    <div className="relative border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-4 text-left hover:bg-alt"
      >
        <span className="min-w-0">
          <span className="px-label block text-muted">Business</span>
          <span className="mt-1.5 block truncate text-[15px] font-medium text-ink">
            {business?.name}
          </span>
        </span>
        <ChevronDown size={16} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
      </button>
      {open ? (
        <ul className="absolute inset-x-0 top-full z-20 border-b border-line bg-bg">
          {businesses.map((b) => (
            <li key={b.org_id}>
              <button
                type="button"
                onClick={() => {
                  chooseBusiness(b.org_id);
                  setOpen(false);
                }}
                className={cn(
                  'block w-full cursor-pointer border-t border-line px-4 py-3 text-left text-[15px] hover:bg-alt',
                  b.org_id === business?.org_id ? 'text-accent' : 'text-ink',
                )}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Dashboard">
      <ul>
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 border-b border-line px-4 py-3 text-[15px] transition-colors duration-150',
                  isActive
                    ? 'bg-alt font-medium text-ink'
                    : 'text-muted hover:bg-alt hover:text-ink',
                )
              }
            >
              <item.icon size={16} strokeWidth={1.75} aria-hidden />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-alt px-4 py-2.5 lg:px-8">
      <p className="text-[14px] text-ink">
        <span className="px-label mr-2 border border-line px-2 py-1">Sample data</span>
        Nothing here is real. It shows what the dashboard looks like with a few places running.
      </p>
      <Link
        to="/app/sign-in"
        onClick={leaveDemo}
        className="text-[14px] font-medium text-accent underline underline-offset-4 hover:text-ink"
      >
        Sign in with your own
      </Link>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { email, signOut, demo } = useAuth();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-label={menu ? 'Close menu' : 'Open menu'}
              className="grid size-9 cursor-pointer place-items-center border border-line text-ink lg:hidden"
            >
              {menu ? (
                <X size={16} strokeWidth={1.75} aria-hidden />
              ) : (
                <Menu size={16} strokeWidth={1.75} aria-hidden />
              )}
            </button>
            <Link to="/app" aria-label="PigeonX dashboard">
              <Logo size={26} />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden max-w-[18rem] truncate text-[14px] text-muted sm:block">
              {email ?? 'Signed out'}
            </p>
            {demo ? null : (
              <button
                type="button"
                onClick={() => void signOut()}
                className="cursor-pointer text-[14px] font-medium text-ink hover:text-accent"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {demo ? <DemoBanner /> : null}

      <div className="lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="hidden border-r border-line lg:block">
          <div className="sticky top-14">
            <BusinessSwitcher />
            <NavList />
          </div>
        </aside>

        {menu ? (
          <div className="border-b border-line lg:hidden">
            <BusinessSwitcher />
            <NavList onNavigate={() => setMenu(false)} />
          </div>
        ) : null}

        <main id="main-content" className="min-w-0 px-4 py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
