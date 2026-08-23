import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { listPlaces, openBillingPortal, startCheckout } from '../lib/db';
import { DEMO_PLACES, isDemo } from '../lib/demo';
import { monthlyTotal } from '../lib/derive';
import type { Place } from '../lib/types';
import { Card, ErrorNote, Label, PageHead, SkeletonRows, Stat } from '../components/ui';

const NOT_OPEN_YET = 'Billing opens soon. Your pilot is free.';

export default function Billing() {
  const { business } = useAuth();
  const demo = isDemo();
  const orgId = business?.org_id ?? null;
  const [params] = useSearchParams();
  const paid = params.get('paid') === '1';
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const state = useAsync<Place[]>(async () => {
    if (demo) return DEMO_PLACES;
    if (!orgId) return [];
    return listPlaces(orgId);
  }, [orgId, demo]);

  const places = state.data?.length ?? 0;

  async function subscribe() {
    if (!orgId) return;
    setBusy('checkout');
    setNote(null);
    try {
      if (demo) throw new Error('sample');
      const url = await startCheckout(orgId, places);
      window.location.href = url;
    } catch {
      setNote(NOT_OPEN_YET);
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    if (!orgId) return;
    setBusy('portal');
    setNote(null);
    try {
      if (demo) throw new Error('sample');
      const url = await openBillingPortal(orgId);
      window.location.href = url;
    } catch {
      setNote(NOT_OPEN_YET);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead
        title="Billing"
        intro="Business is $29 per place per month. You pay for the places you have."
      />

      {paid ? (
        <Card className="mt-6 border-accent">
          <Label className="text-accent">Thank you</Label>
          <p className="mt-3 text-[15px] text-ink">
            Your subscription is set up. It can take a minute to show here.
          </p>
        </Card>
      ) : null}

      {state.error ? (
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      ) : null}

      {state.loading && !state.data ? (
        <div className="mt-6">
          <SkeletonRows rows={2} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Plan" value="Business" note="Everything in the app, for a business" />
            <Stat
              label="Places"
              value={String(places)}
              note={places === 1 ? 'property' : 'properties'}
            />
            <Stat label="Every month" value={monthlyTotal(places)} note="$29 per place" />
          </div>

          <Card className="mt-6">
            <h2 className="text-[18px] font-semibold">What you get</h2>
            <ul className="mt-4 border-t border-line">
              {[
                'Every place, area and speaker in one dashboard.',
                'Schedules that run without anyone opening the app.',
                'What played, kept for every place, with a weekly summary.',
                'Your whole team on the same account, with roles.',
              ].map((line) => (
                <li key={line} className="border-b border-line py-3 text-[15px] text-ink">
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => void subscribe()} disabled={busy !== null}>
                {busy === 'checkout' ? 'Opening' : 'Start subscription'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void manage()}
                disabled={busy !== null}
              >
                {busy === 'portal' ? 'Opening' : 'Manage billing'}
              </Button>
            </div>

            {note ? (
              <p role="status" className="mt-4 border border-line bg-alt p-4 text-[15px] text-ink">
                {note}
              </p>
            ) : null}
          </Card>

          <Card className="mt-6">
            <h2 className="text-[18px] font-semibold">Invoices</h2>
            <p className="mt-3 max-w-[62ch] text-[15px] text-muted">
              Every invoice is emailed to the address on the account and kept in Manage billing,
              where you can also change the card or the billing address. During a pilot there is
              nothing to pay and no invoice to keep.
            </p>
          </Card>
        </>
      )}
    </>
  );
}
