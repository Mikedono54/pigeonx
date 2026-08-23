import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import Home from './routes/Home';
import Platform from './routes/Platform';
import PricingPage from './routes/PricingPage';
import Pilot from './routes/Pilot';
import { Privacy, Terms } from './routes/Legal';

const AppRoot = lazy(() => import('./app/AppRoot'));

const META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'PigeonX: bird control you run from your phone',
    description:
      'PigeonX turns a phone into the controller for sound based bird deterrence. Pick a profile, route it to your speakers or our emitters, schedule it around service, and see what changed.',
  },
  '/platform': {
    title: 'Platform: PigeonX',
    description:
      'How PigeonX works: pick a profile, choose an output, set the window. Frequency control, Bluetooth, schedules, zones, a dashboard, and the output ceiling for each speaker.',
  },
  '/pricing': {
    title: 'Pricing: PigeonX',
    description:
      'Free to try. Pro at $4.99 a month. Business at $29 a month per location. Enterprise by agreement. Plus six straight answers on safety, audibility and results.',
  },
  '/pilot': {
    title: 'Start a pilot: PigeonX',
    description:
      'Thirty days on one location. We count bird activity per service, cleaning minutes and complaints before and after, then hand you the numbers.',
  },
  '/app': {
    title: 'Dashboard: PigeonX',
    description:
      'Sign in to the PigeonX Business dashboard: locations, live zone status and weekly reports for every property you run.',
  },
  '/privacy': {
    title: 'Privacy Policy: PigeonX',
    description: 'What PigeonX collects, why we collect it, and how long we keep it.',
  },
  '/terms': {
    title: 'Terms of Service: PigeonX',
    description: 'The terms covering the PigeonX website, app and hardware.',
  },
};

function RouteEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const meta = META[pathname];
    if (meta) {
      document.title = meta.title;
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', meta.description);
    }
  }, [pathname]);

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

const PAGES: Array<{ path: string; element: ReactNode }> = [
  { path: '/', element: <Home /> },
  { path: '/platform', element: <Platform /> },
  { path: '/pricing', element: <PricingPage /> },
  { path: '/pilot', element: <Pilot /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  { path: '*', element: <Home /> },
];

export default function App() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-on-accent"
      >
        Skip to content
      </a>
      <Routes>
        <Route
          path="/app/*"
          element={
            <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
              <AppRoot />
            </Suspense>
          }
        />
        {PAGES.map((p) => (
          <Route key={p.path} path={p.path} element={<SiteChrome>{p.element}</SiteChrome>} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
