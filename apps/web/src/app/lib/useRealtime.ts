import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { isDemo } from './demo';

/**
 * Nudge a page when areas, speakers or plays change. Realtime is on for those
 * three tables. Changes are bunched up so a burst is one reload, and a slow
 * timer keeps the running clocks honest even if a message is missed.
 */
export function useRealtime(onChange: () => void, everyMs = 20000): void {
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const tick = window.setInterval(() => handler.current(), everyMs);
    if (isDemo()) return () => window.clearInterval(tick);

    const client = supabase();
    if (!client) return () => window.clearInterval(tick);

    let pending: number | null = null;
    const bump = () => {
      if (pending) window.clearTimeout(pending);
      pending = window.setTimeout(() => handler.current(), 400);
    };

    const channel = client
      .channel('pigeonx-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, bump)
      .subscribe();

    return () => {
      window.clearInterval(tick);
      if (pending) window.clearTimeout(pending);
      void client.removeChannel(channel);
    };
  }, [everyMs]);
}
