import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import Marketing from './routes/Marketing';
import AppShell from './routes/AppShell';
import { Privacy, Terms } from './routes/Legal';

const META: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'PigeonX — Smarter, humane bird deterrence',
    description:
      'PigeonX turns a smartphone into the control center for a smarter bird-deterrence system for restaurants, hotels, rooftops and patios. Profiles, scheduling, zones and a commercial dashboard.',
  },
  '/app': {
    title: 'Business dashboard — PigeonX',
    description:
      'Sign in to the PigeonX Business dashboard: locations, live zone status and weekly reports for every property you run.',
  },
  '/privacy': {
    title: 'Privacy Policy — PigeonX',
    description: 'How PigeonX collects, uses and retains your data.',
  },
  '/terms': {
    title: 'Terms of Service — PigeonX',
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
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to content
      </a>
      <Routes>
        <Route
          path="/"
          element={
            <SiteChrome>
              <div id="main-content">
                <Marketing />
              </div>
            </SiteChrome>
          }
        />
        <Route path="/app" element={<AppShell />} />
        <Route
          path="/privacy"
          element={
            <SiteChrome>
              <div id="main-content">
                <Privacy />
              </div>
            </SiteChrome>
          }
        />
        <Route
          path="/terms"
          element={
            <SiteChrome>
              <div id="main-content">
                <Terms />
              </div>
            </SiteChrome>
          }
        />
        <Route
          path="*"
          element={
            <SiteChrome>
              <div id="main-content">
                <Marketing />
              </div>
            </SiteChrome>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
