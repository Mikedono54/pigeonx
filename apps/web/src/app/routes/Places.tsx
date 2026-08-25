import { useState } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useRealtime } from '../lib/useRealtime';
import { useNow } from '../lib/useNow';
import {
  createPlace,
  deletePlace,
  listAreasForPlaces,
  listPlaces,
  listPlans,
  listSpeakers,
  liveStatus,
  updatePlace,
} from '../lib/db';
import {
  DEMO_AREAS,
  DEMO_PLACES,
  DEMO_PLANS,
  DEMO_SPEAKERS,
  demoLive,
  demoWriteBlocked,
  isDemo,
} from '../lib/demo';
import { attentionCountFor, attentionList, placeStatus } from '../lib/derive';
import { BIRD_TARGET_LABELS, PLACE_KIND_LABELS } from '../lib/labels';
import type { Area, LiveArea, Place, ProtectionPlan, Speaker } from '../lib/types';
import {
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  Input,
  PageHead,
  Pill,
  SkeletonRows,
  Td,
  TableWrap,
  Th,
} from '../components/ui';
import { Dialog } from '../components/Dialog';

type PlacesData = {
  places: Place[];
  areas: Area[];
  speakers: Speaker[];
  plans: ProtectionPlan[];
  areaCount: Record<string, number>;
  live: Record<string, LiveArea[]>;
};

export default function Places() {
  const { business } = useAuth();
  const demo = isDemo();
  const orgId = business?.org_id ?? null;
  useNow(30000);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [removing, setRemoving] = useState<Place | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const state = useAsync<PlacesData>(async () => {
    if (demo) {
      const live: Record<string, LiveArea[]> = {};
      const areaCount: Record<string, number> = {};
      for (const p of DEMO_PLACES) {
        live[p.id] = demoLive(p.id);
        areaCount[p.id] = DEMO_AREAS.filter((a) => a.location_id === p.id).length;
      }
      return {
        places: DEMO_PLACES,
        areas: DEMO_AREAS,
        speakers: DEMO_SPEAKERS,
        plans: DEMO_PLANS,
        areaCount,
        live,
      };
    }
    if (!orgId) {
      return { places: [], areas: [], speakers: [], plans: [], areaCount: {}, live: {} };
    }
    const places = await listPlaces(orgId);
    const areas = await listAreasForPlaces(places.map((p) => p.id));
    const areaCount: Record<string, number> = {};
    for (const a of areas) areaCount[a.location_id] = (areaCount[a.location_id] ?? 0) + 1;
    const [speakers, plans, lists] = await Promise.all([
      listSpeakers(areas.map((a) => a.id)),
      listPlans(orgId).catch(() => [] as ProtectionPlan[]),
      Promise.all(places.map((p) => liveStatus(p.id).catch(() => [] as LiveArea[]))),
    ]);
    const live: Record<string, LiveArea[]> = {};
    places.forEach((p, i) => {
      live[p.id] = lists[i];
    });
    return { places, areas, speakers, plans, areaCount, live };
  }, [orgId, demo]);

  useRealtime(state.reload);

  function openAdd() {
    setName('');
    setAddress('');
    setError(null);
    setAdding(true);
  }

  function openEdit(place: Place) {
    setName(place.name);
    setAddress(place.address ?? '');
    setError(null);
    setEditing(place);
  }

  async function run(action: () => Promise<void>, close: () => void) {
    setBusy(true);
    setError(null);
    try {
      if (demo) demoWriteBlocked();
      await action();
      close();
      state.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const places = state.data?.places ?? [];
  const attention = state.data
    ? attentionList(state.data.places, state.data.areas, state.data.speakers, state.data.plans)
    : [];

  return (
    <>
      <PageHead
        title="Locations"
        intro="Every property you run. Open one to set up its areas, plans and speakers."
        action={
          <Button onClick={openAdd}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            Add a location
          </Button>
        }
      />

      {state.error ? (
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      ) : null}

      <div className="mt-6">
        {state.loading && !state.data ? (
          <SkeletonRows rows={3} />
        ) : places.length === 0 ? (
          <Empty
            title="No locations yet. Add the first property you want covered."
            action={<Button onClick={openAdd}>Add a location</Button>}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Location</Th>
                <Th>What you are protecting</Th>
                <Th>Areas</Th>
                <Th>Right now</Th>
                <Th className="text-right">{''}</Th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => {
                const areas = state.data?.live[place.id] ?? [];
                const playing = areas.some((a) => a.running);
                const needs = attentionCountFor(attention, place.id);
                return (
                  <tr key={place.id}>
                    <Td>
                      <Link
                        to={`/app/places/${place.id}`}
                        className="font-medium text-ink hover:text-accent"
                      >
                        {place.name}
                      </Link>
                      <span className="block text-[14px] text-muted">
                        {place.address ?? 'No address yet'}
                      </span>
                    </Td>
                    <Td>
                      {place.target ? BIRD_TARGET_LABELS[place.target] : 'No target bird yet'}
                      <span className="block text-[14px] text-muted">
                        {place.kind ? PLACE_KIND_LABELS[place.kind] : 'No kind set'}
                      </span>
                    </Td>
                    <Td className="px-num">{state.data?.areaCount[place.id] ?? areas.length}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Pill tone={playing ? 'live' : 'quiet'}>{placeStatus(areas)}</Pill>
                        {needs > 0 ? (
                          <Pill tone="warn">
                            {needs === 1 ? '1 area needs attention' : `${needs} need attention`}
                          </Pill>
                        ) : null}
                      </div>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <GhostButton onClick={() => openEdit(place)}>Rename</GhostButton>{' '}
                      <GhostButton danger onClick={() => setRemoving(place)}>
                        Delete
                      </GhostButton>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </div>

      <Dialog
        open={adding}
        title="Add a location"
        onClose={() => setAdding(false)}
        onSubmit={() =>
          void run(
            async () => {
              if (orgId) await createPlace(orgId, name.trim(), address.trim() || null);
            },
            () => setAdding(false),
          )
        }
        submitLabel="Add the location"
        busy={busy}
        error={error}
      >
        <Field label="Location name" htmlFor="new-place-name">
          <Input
            id="new-place-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder="Harbour House"
          />
        </Field>
        <Field label="Address" hint="Optional." htmlFor="new-place-address">
          <Input
            id="new-place-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="18 Dock Street"
          />
        </Field>
      </Dialog>

      <Dialog
        open={editing !== null}
        title="Rename this location"
        onClose={() => setEditing(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (editing)
                await updatePlace(editing.id, {
                  name: name.trim(),
                  address: address.trim() || null,
                });
            },
            () => setEditing(null),
          )
        }
        busy={busy}
        error={error}
      >
        <Field label="Location name" htmlFor="edit-place-name">
          <Input
            id="edit-place-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Address" htmlFor="edit-place-address">
          <Input
            id="edit-place-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>
      </Dialog>

      <Dialog
        open={removing !== null}
        title="Delete this location"
        onClose={() => setRemoving(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (removing) await deletePlace(removing.id);
            },
            () => setRemoving(null),
          )
        }
        submitLabel="Delete it"
        danger
        busy={busy}
        error={error}
      >
        <p className="text-[16px] text-ink">
          {removing?.name} goes, and so do its areas, speakers and schedules. What played stays in
          your history.
        </p>
      </Dialog>
    </>
  );
}
