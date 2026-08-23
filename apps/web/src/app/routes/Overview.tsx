import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useRealtime } from '../lib/useRealtime';
import { useNow } from '../lib/useNow';
import { createBusiness, createPlace, history, listPlaces, liveStatus } from '../lib/db';
import { DEMO_PLACES, demoLive, demoPlays, isDemo } from '../lib/demo';
import { areaStatus, bucketByDay, countToday, placeStatus } from '../lib/derive';
import type { LiveArea, Place, Play } from '../lib/types';
import {
  Card,
  Empty,
  ErrorNote,
  Field,
  Input,
  Label,
  PageHead,
  Pill,
  SkeletonCards,
  Stat,
} from '../components/ui';
import { Dialog } from '../components/Dialog';
import { MiniBars } from '../components/MiniBars';

type OverviewData = {
  places: Place[];
  live: Record<string, LiveArea[]>;
  plays: Play[];
};

/* ── first run ─────────────────────────────────────────────────────────── */

function SetUpBusiness() {
  const { reloadBusinesses, chooseBusiness } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const orgId = await createBusiness(name.trim());
      chooseBusiness(orgId);
      await reloadBusinesses();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[34rem]">
      <PageHead
        title="Set up your business"
        intro="Name the business you run. Then add the first place you want covered."
      />
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Business name" htmlFor="business-name">
            <Input
              id="business-name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              placeholder="Harbour House Group"
            />
          </Field>
          <Button type="submit" disabled={busy || name.trim().length === 0}>
            {busy ? 'Setting up' : 'Create the business'}
          </Button>
        </form>
        {error ? (
          <div className="mt-4">
            <ErrorNote error={error} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/* ── a place card ──────────────────────────────────────────────────────── */

function PlaceCard({ place, areas, now }: { place: Place; areas: LiveArea[]; now: Date }) {
  const playing = areas.filter((a) => a.running).length;
  return (
    <Card as="li" className="flex flex-col">
      <div>
        <h3 className="text-[17px] font-semibold text-ink">{place.name}</h3>
        <p className="mt-1 truncate text-[14px] text-muted">{place.address ?? 'No address yet'}</p>
        <div className="mt-3">
          <Pill tone={playing > 0 ? 'live' : 'quiet'}>{placeStatus(areas)}</Pill>
        </div>
      </div>

      {areas.length === 0 ? (
        <p className="mt-5 text-[15px] text-muted">Add an area to start covering this place.</p>
      ) : (
        <ul className="mt-5 border-t border-line">
          {areas.slice(0, 4).map((area) => {
            const status = areaStatus(area, now);
            return (
              <li
                key={area.zone_id}
                className="flex items-center justify-between gap-3 border-b border-line py-2.5"
              >
                <span className="min-w-0 truncate text-[15px] text-ink">{area.zone_name}</span>
                <span
                  className={`px-num shrink-0 text-[13px] ${status.playing ? 'text-accent' : 'text-muted'}`}
                >
                  {status.label}
                </span>
              </li>
            );
          })}
          {areas.length > 4 ? (
            <li className="py-2.5 text-[14px] text-muted">
              and {areas.length - 4} more {areas.length - 4 === 1 ? 'area' : 'areas'}
            </li>
          ) : null}
        </ul>
      )}

      <Link
        to={`/app/places/${place.id}`}
        className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-accent hover:text-ink"
      >
        Open this place
        <ArrowRight size={15} strokeWidth={1.75} aria-hidden />
      </Link>
    </Card>
  );
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function Overview() {
  const { business, businesses, businessesError, reloadBusinesses } = useAuth();
  const demo = isDemo();
  const now = useNow(1000);
  const [adding, setAdding] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const orgId = business?.org_id ?? null;

  const state = useAsync<OverviewData>(async () => {
    if (demo) {
      const live: Record<string, LiveArea[]> = {};
      for (const p of DEMO_PLACES) live[p.id] = demoLive(p.id);
      return { places: DEMO_PLACES, live, plays: demoPlays() };
    }
    if (!orgId) return { places: [], live: {}, plays: [] };
    const places = await listPlaces(orgId);
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    const [liveLists, plays] = await Promise.all([
      Promise.all(places.map((p) => liveStatus(p.id).catch(() => [] as LiveArea[]))),
      history(from, new Date(Date.now() + 60000)).catch(() => [] as Play[]),
    ]);
    const live: Record<string, LiveArea[]> = {};
    places.forEach((p, i) => {
      live[p.id] = liveLists[i];
    });
    return { places, live, plays };
  }, [orgId, demo]);

  useRealtime(state.reload);

  if (businessesError && businesses.length === 0) {
    return (
      <>
        <PageHead title="Overview" />
        <div className="mt-6">
          <ErrorNote error={businessesError} onRetry={() => void reloadBusinesses()} />
        </div>
      </>
    );
  }

  if (!business) return <SetUpBusiness />;

  const data = state.data;
  const places = data?.places ?? [];
  const plays = data?.plays ?? [];
  const buckets = bucketByDay(
    plays.map((p) => p.started_at),
    7,
    now,
  );
  const today = countToday(
    plays.map((p) => p.started_at),
    now,
  );
  const areasPlaying = Object.values(data?.live ?? {}).flat().filter((a) => a.running).length;

  async function addPlace() {
    if (!orgId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createPlace(orgId, placeName.trim(), placeAddress.trim() || null);
      setAdding(false);
      setPlaceName('');
      setPlaceAddress('');
      state.reload();
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHead
        title={business.name}
        intro="What is playing right now, and what played this week."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Add a place
          </Button>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Plays today" value={String(today)} />
        <Stat label="Playing now" value={String(areasPlaying)} note="areas with sound going" />
        <Stat
          label="Places"
          value={String(places.length)}
          note={places.length === 1 ? 'property' : 'properties'}
        />
        <Card>
          <Label>Plays per day</Label>
          <div className="mt-3">
            <MiniBars buckets={buckets} />
          </div>
        </Card>
      </div>

      {state.error ? (
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      ) : null}

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
          <h2 className="text-[18px] font-semibold">Places</h2>
          <p className="px-label text-muted">Live</p>
        </div>

        <div className="mt-5">
          {state.loading && !data ? (
            <SkeletonCards count={3} />
          ) : places.length === 0 ? (
            <Empty
              title="No places yet. Add the first property you want covered."
              action={<Button onClick={() => setAdding(true)}>Add a place</Button>}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {places.map((p) => (
                <PlaceCard key={p.id} place={p} areas={data?.live[p.id] ?? []} now={now} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={adding}
        title="Add a place"
        onClose={() => setAdding(false)}
        onSubmit={() => void addPlace()}
        submitLabel="Add the place"
        busy={saving}
        error={saveError}
      >
        <Field label="Place name" htmlFor="place-name">
          <Input
            id="place-name"
            value={placeName}
            required
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Harbour House"
          />
        </Field>
        <Field label="Address" hint="Optional. It helps when you run several places." htmlFor="place-address">
          <Input
            id="place-address"
            value={placeAddress}
            onChange={(e) => setPlaceAddress(e.target.value)}
            placeholder="18 Dock Street"
          />
        </Field>
      </Dialog>
    </>
  );
}
