import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { listBusinesses } from './lib/db';
import { DEMO_BUSINESSES, DEMO_EMAIL, isDemo } from './lib/demo';
import type { Membership } from './lib/types';

const ORG_KEY = 'pigeonx-business';

type AuthValue = {
  ready: boolean;
  demo: boolean;
  session: Session | null;
  email: string | null;
  userId: string | null;
  businesses: Membership[];
  businessesError: unknown;
  business: Membership | null;
  chooseBusiness: (orgId: string) => void;
  reloadBusinesses: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth used outside the dashboard');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = isDemo();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [businesses, setBusinesses] = useState<Membership[]>(demo ? DEMO_BUSINESSES : []);
  const [businessesError, setBusinessesError] = useState<unknown>(null);
  const [orgId, setOrgId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ORG_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (demo) {
      setReady(true);
      return;
    }
    const client = supabase();
    if (!client) {
      setReady(true);
      return;
    }
    let alive = true;
    client.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [demo]);

  const reloadBusinesses = useCallback(async () => {
    if (demo) {
      setBusinesses(DEMO_BUSINESSES);
      return;
    }
    try {
      const rows = await listBusinesses();
      setBusinesses(rows);
      setBusinessesError(null);
    } catch (err) {
      setBusinessesError(err);
    }
  }, [demo]);

  useEffect(() => {
    if (demo) {
      setBusinesses(DEMO_BUSINESSES);
      return;
    }
    if (!session) {
      setBusinesses([]);
      return;
    }
    void reloadBusinesses();
  }, [demo, session, reloadBusinesses]);

  const business = useMemo(() => {
    if (businesses.length === 0) return null;
    return businesses.find((b) => b.org_id === orgId) ?? businesses[0];
  }, [businesses, orgId]);

  const chooseBusiness = useCallback((next: string) => {
    setOrgId(next);
    try {
      localStorage.setItem(ORG_KEY, next);
    } catch {
      /* a private window is fine, the choice just does not stick */
    }
  }, []);

  const signOut = useCallback(async () => {
    const client = supabase();
    if (client) await client.auth.signOut();
    try {
      localStorage.removeItem(ORG_KEY);
    } catch {
      /* nothing to clean up */
    }
    setSession(null);
    setBusinesses([]);
  }, []);

  const value: AuthValue = {
    ready,
    demo,
    session,
    email: demo ? DEMO_EMAIL : (session?.user.email ?? null),
    userId: demo ? 'me' : (session?.user.id ?? null),
    businesses,
    businessesError,
    business,
    chooseBusiness,
    reloadBusinesses,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
