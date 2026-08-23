import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useRealtime } from '../lib/useRealtime';
import { useNow } from '../lib/useNow';
import {
  createArea,
  createSpeaker,
  deleteArea,
  deleteSpeaker,
  getPlace,
  history,
  listAreas,
  listSpeakers,
  liveStatus,
  placeReport,
  renameArea,
  updateSpeaker,
} from '../lib/db';
import {
  DEMO_AREAS,
  DEMO_PLACES,
  DEMO_SPEAKERS,
  demoLive,
  demoPlays,
  demoReport,
  demoWriteBlocked,
  isDemo,
} from '../lib/demo';
import {
  agoLabel,
  areaStatus,
  duration,
  formatReport,
  speakerKindLabel,
  weekStart,
  whenLabel,
} from '../lib/derive';
import type { Area, DeviceKind, LiveArea, Place, PlaceReport, Play, Speaker } from '../lib/types';
import {
  Card,
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  Input,
  Label,
  PageHead,
  Pill,
  Select,
  SkeletonRows,
  Stat,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import { Dialog } from '../components/Dialog';

type PlaceData = {
  place: Place | null;
  areas: Area[];
  live: LiveArea[];
  speakers: Speaker[];
  plays: Play[];
  report: PlaceReport | null;
  reportError: unknown;
};

const SPEAKER_KINDS: Array<{ value: DeviceKind; label: string }> = [
  { value: 'pigeonx_emitter', label: 'PigeonX speaker' },
  { value: 'bt_speaker', label: 'Bluetooth speaker' },
  { value: 'phone', label: 'This phone' },
  { value: 'simulated', label: 'Test speaker' },
];

export default function PlaceDetail() {
  const { id = '' } = useParams();
  const { userId } = useAuth();
  const demo = isDemo();
  const now = useNow(1000);

  const [addingArea, setAddingArea] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [removingArea, setRemovingArea] = useState<Area | null>(null);
  const [addingSpeaker, setAddingSpeaker] = useState<Area | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [removingSpeaker, setRemovingSpeaker] = useState<Speaker | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DeviceKind>('pigeonx_emitter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const state = useAsync<PlaceData>(async () => {
    if (demo) {
      const place = DEMO_PLACES.find((p) => p.id === id) ?? null;
      const areas = DEMO_AREAS.filter((a) => a.location_id === id);
      return {
        place,
        areas,
        live: demoLive(id),
        speakers: DEMO_SPEAKERS.filter((s) => areas.some((a) => a.id === s.zone_id)),
        plays: demoPlays().filter((p) => p.location_id === id),
        report: demoReport(id),
        reportError: null,
      };
    }
    const [place, areas, live] = await Promise.all([
      getPlace(id),
      listAreas(id),
      liveStatus(id).catch(() => [] as LiveArea[]),
    ]);
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const [speakers, plays] = await Promise.all([
      listSpeakers(areas.map((a) => a.id)),
      history(from, new Date(Date.now() + 60000)).catch(() => [] as Play[]),
    ]);
    let report: PlaceReport | null = null;
    let reportError: unknown = null;
    try {
      report = await placeReport(id, weekStart(new Date()));
    } catch (err) {
      reportError = err;
    }
    return {
      place,
      areas,
      live,
      speakers,
      plays: plays.filter((p) => p.location_id === id),
      report,
      reportError,
    };
  }, [id, demo]);

  useRealtime(state.reload);

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

  const data = state.data;
  const place = data?.place ?? null;
  const areas = data?.areas ?? [];
  const lines = formatReport(data?.report ?? null);

  if (state.loading && !data) {
    return (
      <>
        <PageHead title="Loading" />
        <div className="mt-6">
          <SkeletonRows rows={4} />
        </div>
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <PageHead title="Place" />
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      </>
    );
  }

  if (!place) {
    return (
      <>
        <PageHead title="Place not found" />
        <div className="mt-6">
          <Empty
            title="This place is gone, or it belongs to another business."
            action={
              <Link
                to="/app/places"
                className="inline-flex h-11 items-center border border-ink px-5 text-[15px] font-medium text-ink hover:bg-ink hover:text-bg"
              >
                Back to places
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Link
        to="/app/places"
        className="mb-4 inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
        All places
      </Link>

      <PageHead
        title={place.name}
        intro={place.address ?? undefined}
        action={
          <Button
            onClick={() => {
              setName('');
              setError(null);
              setAddingArea(true);
            }}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Add an area
          </Button>
        }
      />

      {/* This week */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Plays this week" value={lines.plays} />
        <Stat label="Sound played" value={lines.time} />
        <Stat label="Areas covered" value={lines.areas} />
        <Card>
          <Label>This week</Label>
          <p className="mt-3 text-[15px] text-ink">
            {data?.reportError
              ? 'The weekly report is coming online. Check back in a little while.'
              : lines.sentence}
          </p>
        </Card>
      </div>

      {/* Areas */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
          <h2 className="text-[18px] font-semibold">Areas</h2>
          <p className="px-label text-muted">Live</p>
        </div>

        {areas.length === 0 ? (
          <div className="mt-5">
            <Empty
              title="No areas yet. Add the first part of this place you want covered, like the patio or the roof."
              action={
                <Button
                  onClick={() => {
                    setName('');
                    setAddingArea(true);
                  }}
                >
                  Add an area
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {areas.map((area) => {
              const liveRow =
                data?.live.find((l) => l.zone_id === area.id) ??
                ({
                  zone_id: area.id,
                  zone_name: area.name,
                  running: false,
                  current_session_id: null,
                  started_at: null,
                  profile_name: null,
                } satisfies LiveArea);
              const status = areaStatus(liveRow, now);
              const speakers = (data?.speakers ?? []).filter((s) => s.zone_id === area.id);
              return (
                <li key={area.id} className="border border-line">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-semibold text-ink">{area.name}</h3>
                      <p className="mt-1 text-[15px] text-muted">{status.sound}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={status.playing ? 'live' : 'quiet'}>{status.label}</Pill>
                      <GhostButton
                        onClick={() => {
                          setName(area.name);
                          setError(null);
                          setEditingArea(area);
                        }}
                      >
                        Rename
                      </GhostButton>
                      <GhostButton danger onClick={() => setRemovingArea(area)}>
                        Delete
                      </GhostButton>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Speakers</Label>
                      <GhostButton
                        onClick={() => {
                          setName('');
                          setKind('pigeonx_emitter');
                          setError(null);
                          setAddingSpeaker(area);
                        }}
                      >
                        <Plus size={14} strokeWidth={2} aria-hidden />
                        Add a speaker
                      </GhostButton>
                    </div>
                    {speakers.length === 0 ? (
                      <p className="mt-3 text-[15px] text-muted">
                        No speakers here yet. Add the speaker this area plays on.
                      </p>
                    ) : (
                      <ul className="mt-3 border-t border-line">
                        {speakers.map((s) => (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[15px] text-ink">{s.name}</p>
                              <p className="text-[14px] text-muted">
                                {speakerKindLabel(s.kind)} · last seen {agoLabel(s.last_seen_at, now)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <GhostButton
                                onClick={() => {
                                  setName(s.name);
                                  setError(null);
                                  setEditingSpeaker(s);
                                }}
                              >
                                Rename
                              </GhostButton>
                              <GhostButton danger onClick={() => setRemovingSpeaker(s)}>
                                Delete
                              </GhostButton>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* What played */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
          <h2 className="text-[18px] font-semibold">What played</h2>
          <p className="px-label text-muted">Last 30 days</p>
        </div>
        <div className="mt-5">
          {(data?.plays.length ?? 0) === 0 ? (
            <Empty title="Nothing has played here yet. Start a sound from the phone app and it shows up in this table." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Sound</Th>
                  <Th>Area</Th>
                  <Th>Who</Th>
                  <Th>How long</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.plays ?? []).slice(0, 100).map((p) => (
                  <tr key={p.id}>
                    <Td className="whitespace-nowrap">{whenLabel(p.started_at)}</Td>
                    <Td>{p.profile_name ?? 'Sound'}</Td>
                    <Td>{p.zone_name ?? 'Area'}</Td>
                    <Td>{p.user_id === userId ? 'You' : 'A teammate'}</Td>
                    <Td className="px-num whitespace-nowrap">
                      {p.ended_at ? duration(p.minutes) : 'Playing now'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </section>

      {/* dialogs */}
      <Dialog
        open={addingArea}
        title="Add an area"
        onClose={() => setAddingArea(false)}
        onSubmit={() =>
          void run(
            () => createArea(id, name.trim()),
            () => setAddingArea(false),
          )
        }
        submitLabel="Add the area"
        busy={busy}
        error={error}
      >
        <Field label="Area name" hint="One part of this place, like Patio or Roof deck." htmlFor="area-name">
          <Input
            id="area-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder="Patio"
          />
        </Field>
      </Dialog>

      <Dialog
        open={editingArea !== null}
        title="Rename this area"
        onClose={() => setEditingArea(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (editingArea) await renameArea(editingArea.id, name.trim());
            },
            () => setEditingArea(null),
          )
        }
        busy={busy}
        error={error}
      >
        <Field label="Area name" htmlFor="edit-area-name">
          <Input
            id="edit-area-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </Dialog>

      <Dialog
        open={removingArea !== null}
        title="Delete this area"
        onClose={() => setRemovingArea(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (removingArea) await deleteArea(removingArea.id);
            },
            () => setRemovingArea(null),
          )
        }
        submitLabel="Delete it"
        danger
        busy={busy}
        error={error}
      >
        <p className="text-[16px] text-ink">
          {removingArea?.name} goes, along with its schedules. Its speakers stay, unassigned.
        </p>
      </Dialog>

      <Dialog
        open={addingSpeaker !== null}
        title={`Add a speaker to ${addingSpeaker?.name ?? 'this area'}`}
        onClose={() => setAddingSpeaker(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (addingSpeaker) await createSpeaker(addingSpeaker.id, name.trim(), kind);
            },
            () => setAddingSpeaker(null),
          )
        }
        submitLabel="Add the speaker"
        busy={busy}
        error={error}
      >
        <Field label="Speaker name" htmlFor="speaker-name">
          <Input
            id="speaker-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            placeholder="Patio east"
          />
        </Field>
        <Field label="Kind" htmlFor="speaker-kind">
          <Select
            id="speaker-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as DeviceKind)}
          >
            {SPEAKER_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>

      <Dialog
        open={editingSpeaker !== null}
        title="Rename this speaker"
        onClose={() => setEditingSpeaker(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (editingSpeaker) await updateSpeaker(editingSpeaker.id, { name: name.trim() });
            },
            () => setEditingSpeaker(null),
          )
        }
        busy={busy}
        error={error}
      >
        <Field label="Speaker name" htmlFor="edit-speaker-name">
          <Input
            id="edit-speaker-name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </Dialog>

      <Dialog
        open={removingSpeaker !== null}
        title="Delete this speaker"
        onClose={() => setRemovingSpeaker(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (removingSpeaker) await deleteSpeaker(removingSpeaker.id);
            },
            () => setRemovingSpeaker(null),
          )
        }
        submitLabel="Delete it"
        danger
        busy={busy}
        error={error}
      >
        <p className="text-[16px] text-ink">
          {removingSpeaker?.name} comes off this area. What already played stays in your history.
        </p>
      </Dialog>
    </>
  );
}
