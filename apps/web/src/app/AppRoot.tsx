import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './AuthProvider';
import { Layout } from './components/Layout';
import { SkeletonRows } from './components/ui';
import { syncDemoFlag } from './lib/demo';
import { HAS_BACKEND } from './lib/env';

const SignIn = lazy(() => import('./routes/SignIn'));
const AuthCallback = lazy(() => import('./routes/AuthCallback'));
const Join = lazy(() => import('./routes/Join'));
const Overview = lazy(() => import('./routes/Overview'));
const Places = lazy(() => import('./routes/Places'));
const PlaceDetail = lazy(() => import('./routes/PlaceDetail'));
const Schedules = lazy(() => import('./routes/Schedules'));
const History = lazy(() => import('./routes/History'));
const Team = lazy(() => import('./routes/Team'));
const Billing = lazy(() => import('./routes/Billing'));
const Settings = lazy(() => import('./routes/Settings'));

function Booting() {
  return (
    <div className="mx-auto max-w-[60rem] p-8">
      <SkeletonRows rows={4} />
    </div>
  );
}

/** Signed in, or looking at sample data. Otherwise back to the sign in page. */
function Guard({ children }: { children: ReactNode }) {
  const { ready, session, demo } = useAuth();
  const location = useLocation();

  if (!ready) return <Booting />;

  if (!demo && !session) {
    const next = `${location.pathname}${location.search}`;
    const to = next === '/app' ? '/app/sign-in' : `/app/sign-in?next=${encodeURIComponent(next)}`;
    return <Navigate to={to} replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<SkeletonRows rows={4} />}>{children}</Suspense>
    </Layout>
  );
}

function NotConnected() {
  return (
    <div className="mx-auto max-w-[34rem] p-8">
      <h1 className="text-[1.75rem] font-semibold">The dashboard is not connected yet.</h1>
      <p className="mt-3 text-[16px] text-muted">
        This copy of the site was built without its keys. Reload in a moment, or open the version
        at pigeonx.org.
      </p>
    </div>
  );
}

function Shell() {
  useEffect(() => {
    document.title = 'Dashboard: PigeonX';
  }, []);

  if (!HAS_BACKEND) return <NotConnected />;

  return (
    <Suspense fallback={<Booting />}>
      <Routes>
        <Route path="sign-in" element={<SignIn />} />
        <Route path="auth" element={<AuthCallback />} />
        <Route
          path="join"
          element={
            <Guard>
              <Join />
            </Guard>
          }
        />
        <Route
          index
          element={
            <Guard>
              <Overview />
            </Guard>
          }
        />
        <Route
          path="places"
          element={
            <Guard>
              <Places />
            </Guard>
          }
        />
        <Route
          path="places/:id"
          element={
            <Guard>
              <PlaceDetail />
            </Guard>
          }
        />
        <Route
          path="schedules"
          element={
            <Guard>
              <Schedules />
            </Guard>
          }
        />
        <Route
          path="history"
          element={
            <Guard>
              <History />
            </Guard>
          }
        />
        <Route
          path="team"
          element={
            <Guard>
              <Team />
            </Guard>
          }
        />
        <Route
          path="billing"
          element={
            <Guard>
              <Billing />
            </Guard>
          }
        />
        <Route
          path="settings"
          element={
            <Guard>
              <Settings />
            </Guard>
          }
        />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function AppRoot() {
  // Read `?demo=1` before anything asks whether we are on sample data.
  syncDemoFlag(typeof window === 'undefined' ? '' : window.location.search);
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
