import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useRealtime } from '../lib/useRealtime';
import { useNow } from '../lib/useNow';
import {
  createBusiness,
  createPlace,
  history,
  listAreasForPlaces,
  listPlaces,
  listPlans,
  listSchedules,
  listSpeakers,
  liveStatus,
} from '../lib/db';
import {
  DEMO_AREAS,
  DEMO_PLACES,
  DEMO_PLANS,
  DEMO_SCHEDULES,
  DEMO_SPEAKERS,
  demoLive,
  demoPlays,
  isDemo,
} from '../lib/demo';
import {
  areaStatus,
  attentionCountFor,
  attentionList,
  bucketByDay,
  placeStatus,
  summaryTiles,
  type Attention,
} from '../lib/derive';
import { BIRD_TARGET_LABELS, PLACE_KIND_LABELS } from '../lib/labels';
import type {
  Area,
  LiveArea,
  Place,
  Play,
  ProtectionPlan,
  ScheduleRow,
  Speaker,
} from '../lib/types';
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
  areas: Area[];
  speakers: Speaker[];
  plans: ProtectionPlan[];
  schedules: ScheduleRow[];
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
        intro="Name the business you run. Then add the first location you want covered."
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

/* ── a location card ───────────────────────────────────────────────────── */

/** What is protecting this location, counted from the plans attached to it. */
function protectionLine(areas: Area[], plans: ProtectionPlan[]): string {
  if (areas.length === 0) return 'No areas yet';
  const onPlan = areas.filter((a) => plans.some((p) => p.zone_id === a.id));
  if (onPlan.length === 0) return 'No protection plan yet';
  const names = [
    ...new Set(
      onPlan.map((a) => plans.find((p) => p.zone_id === a.id)?.name).filter(Boolean) as string[],
    ),
  ];
  const cover =
    onPlan.length === areas.length
      ? 'every area'
      : `${onPlan.length} of ${areas.length} areas`;
  return names.length === 1
    ? `${names[0]} on ${cover}`
    : `${names.length} plans on ${cover}`;
}

function PlaceCard({
  place,
  areas,
  live,
  plans,
  attention,
  now,
}: {
  place: Place;
  areas: Area[];
  live: LiveArea[];
  plans: ProtectionPlan[];
  attention: Attention[];
  now: Date;
}) {
  const playing = live.filter((a) => a.running).length;
  const needs = attentionCountFor(attention, place.id);
  const target = place.target ? BIRD_TARGET_LABELS[place.target] : 'No target bird yet';
  const kind = place.kind ? PLACE_KIND_LABELS[place.kind] : null;

  return (
    <Card as="li" className="flex flex-col">
      <div>
        <h3 className="text-[17px] font-semibold text-ink">{place.name}</h3>
        <p className="mt-1 truncate text-[14px] text-muted">{place.address ?? 'No address yet'}</p>
        <p className="mt-2 text-[14px] text-ink">{kind ? `${kind} · ${target}` : target}</p>
        <p className="mt-1 text-[14px] text-muted">{protectionLine(areas, plans)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone={playing > 0 ? 'live' : 'quiet'}>{placeStatus(live)}</Pill>
          {needs > 0 ? (
            <Pill tone="warn">
              {needs === 1 ? '1 area needs attention' : `${needs} areas need attention`}
            </Pill>
          ) : null}
        </div>
      </div>

      {live.length === 0 ? (
        <p className="mt-5 text-[15px] text-muted">Add an area to start covering this location.</p>
      ) : (
        <ul className="mt-5 border-t border-line">
          {live.slice(0, 4).map((area) => {
            const status = areaStatus(area, now);
            const flagged = attention.find((a) => a.zone_id === area.zone_id);
            return (
              <li key={area.zone_id} className="border-b border-line py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] text-ink">{area.zone_name}</span>
                  <span
                    className={`px-num shrink-0 text-[13px] ${status.playing ? 'text-accent' : 'text-muted'}`}
                  >
                    {status.label}
                  </span>
                </div>
                {flagged ? (
                  <p className="mt-1 flex items-start gap-1.5 text-[13px] text-[color:var(--px-warning)]">
                    <AlertCircle size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
                    {flagged.reasons[0]}
                  </p>
                ) : null}
              </li>
            );
          })}
          {live.length > 4 ? (
            <li className="py-2.5 text-[14px] text-muted">
              and {live.length - 4} more {live.length - 4 === 1 ? 'area' : 'areas'}
            </li>
          ) : null}
        </ul>
      )}

      <Link
        to={`/app/places/${place.id}`}
        className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-accent hover:text-ink"
      >
        Open this location
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
      return {
        places: DEMO_PLACES,
        areas: DEMO_AREAS,
        speakers: DEMO_SPEAKERS,
        plans: DEMO_PLANS,
        schedules: DEMO_SCHEDULES,
        live,
        plays: demoPlays(),
      };
    }
    if (!orgId) {
      return { places: [], areas: [], speakers: [], plans: [], schedules: [], live: {}, plays: [] };
    }
    const places = await listPlaces(orgId);
    const ids = places.map((p) => p.id);
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    const areas = await listAreasForPlaces(ids);
    const [speakers, plans, schedules, liveLists, plays] = await Promise.all([
      listSpeakers(areas.map((a) => a.id)),
      listPlans(orgId).catch(() => [] as ProtectionPlan[]),
      listSchedules(ids).catch(() => [] as ScheduleRow[]),
      Promise.all(places.map((p) => liveStatus(p.id).catch(() => [] as LiveArea[]))),
      history(from, new Date(Date.now() + 60000)).catch(() => [] as Play[]),
    ]);
    const live: Record<string, LiveArea[]> = {};
    places.forEach((p, i) => {
      live[p.id] = liveLists[i];
    });
    return { places, areas, speakers, plans, schedules, live, plays };
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
  const attention = data
    ? attentionList(data.places, data.areas, data.speakers, data.plans)
    : null;

  // Nothing has arrived yet, so nothing is counted. Each tile appears the
  // moment its own answer does.
  const tiles = summaryTiles(
    {
      places: data?.places ?? null,
      speakers: data?.speakers ?? null,
      schedules: data?.schedules ?? null,
      plays: data?.plays ?? null,
      attention,
    },
    now,
  );

  const buckets = bucketByDay(
    plays.map((p) => p.started_at),
    7,
    now,
  );

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
        intro="What is protected right now, and what played this week."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Add a location
          </Button>
        }
      />

      {tiles.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => (
            <Stat key={tile.key} label={tile.label} value={tile.value} note={tile.note} />
          ))}
          <Card>
            <Label>Sessions per day</Label>
            <div className="mt-3">
              <MiniBars buckets={buckets} />
            </div>
          </Card>
        </div>
      ) : null}

      {state.error ? (
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      ) : null}

      {attention && attention.length > 0 ? (
        <section className="mt-10">
          <h2 className="border-b border-line pb-3 text-[18px] font-semibold">Needs attention</h2>
          <ul className="mt-5 border-t border-line">
            {attention.map((a) => (
              <li
                key={a.zone_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
              >
                <div className="min-w-0">
                  <p className="text-[15px] text-ink">
                    {a.zone_name} at {a.place_name}
                  </p>
                  <p className="text-[14px] text-muted">{a.reasons.join(' · ')}</p>
                </div>
                <Link
                  to={`/app/places/${a.place_id}`}
                  className="text-[14px] font-medium text-accent hover:text-ink"
                >
                  Open this location
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
          <h2 className="text-[18px] font-semibold">Locations</h2>
          <p className="px-label text-muted">Live</p>
        </div>

        <div className="mt-5">
          {state.loading && !data ? (
            <SkeletonCards count={3} />
          ) : places.length === 0 ? (
            <Empty
              title="No locations yet. Add the first property you want covered."
              action={<Button onClick={() => setAdding(true)}>Add a location</Button>}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {places.map((p) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  areas={(data?.areas ?? []).filter((a) => a.location_id === p.id)}
                  live={data?.live[p.id] ?? []}
                  plans={data?.plans ?? []}
                  attention={attention ?? []}
                  now={now}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog
        open={adding}
        title="Add a location"
        onClose={() => setAdding(false)}
        onSubmit={() => void addPlace()}
        submitLabel="Add the location"
        busy={saving}
        error={saveError}
      >
        <Field label="Location name" htmlFor="place-name">
          <Input
            id="place-name"
            value={placeName}
            required
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Harbour House"
          />
        </Field>
        <Field
          label="Address"
          hint="Optional. It helps when you run several locations."
          htmlFor="place-address"
        >
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
