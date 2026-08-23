import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import {
  createSchedule,
  deleteSchedule,
  listAreasForPlaces,
  listPlaces,
  listSchedules,
  listSounds,
  updateSchedule,
  type ScheduleInput,
} from '../lib/db';
import {
  DEMO_AREAS,
  DEMO_PLACES,
  DEMO_SCHEDULES,
  DEMO_SOUNDS,
  demoWriteBlocked,
  isDemo,
} from '../lib/demo';
import { executorLabel, formatDays, formatWindow } from '../lib/derive';
import type { Area, Executor, Place, ScheduleRow, Sound } from '../lib/types';
import {
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  Input,
  PageHead,
  Pill,
  Select,
  SkeletonRows,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import { Dialog } from '../components/Dialog';

type SchedulesData = {
  places: Place[];
  areas: Area[];
  sounds: Sound[];
  rows: ScheduleRow[];
};

const DAY_BOXES = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

type Draft = {
  id: string | null;
  place_id: string;
  zone_id: string;
  profile_id: string;
  days: number[];
  start_time: string;
  end_time: string;
  executor: Executor;
  enabled: boolean;
};

const BLANK: Draft = {
  id: null,
  place_id: '',
  zone_id: '',
  profile_id: '',
  days: [1, 2, 3, 4, 5],
  start_time: '11:00',
  end_time: '14:00',
  executor: 'device',
  enabled: true,
};

/** `18:30:00` and `18:30` both arrive here; the input wants `18:30`. */
function toInputTime(value: string): string {
  return value.slice(0, 5);
}

export default function Schedules() {
  const { business } = useAuth();
  const demo = isDemo();
  const orgId = business?.org_id ?? null;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<ScheduleRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const state = useAsync<SchedulesData>(async () => {
    if (demo) {
      return {
        places: DEMO_PLACES,
        areas: DEMO_AREAS,
        sounds: DEMO_SOUNDS,
        rows: DEMO_SCHEDULES,
      };
    }
    if (!orgId) return { places: [], areas: [], sounds: [], rows: [] };
    const places = await listPlaces(orgId);
    const ids = places.map((p) => p.id);
    const [areas, sounds, rows] = await Promise.all([
      listAreasForPlaces(ids),
      listSounds(orgId),
      listSchedules(ids),
    ]);
    return { places, areas, sounds, rows };
  }, [orgId, demo]);

  const areasForPlace = useMemo(
    () => (state.data?.areas ?? []).filter((a) => a.location_id === draft?.place_id),
    [state.data, draft?.place_id],
  );

  function openNew() {
    const places = state.data?.places ?? [];
    const firstPlace = places[0]?.id ?? '';
    const firstArea = (state.data?.areas ?? []).find((a) => a.location_id === firstPlace);
    setError(null);
    setDraft({
      ...BLANK,
      place_id: firstPlace,
      zone_id: firstArea?.id ?? '',
      profile_id: state.data?.sounds[0]?.id ?? '',
    });
  }

  function openEdit(row: ScheduleRow) {
    setError(null);
    setDraft({
      id: row.id,
      place_id: row.place_id,
      zone_id: row.zone_id,
      profile_id: row.profile_id,
      days: row.days,
      start_time: toInputTime(row.start_time),
      end_time: toInputTime(row.end_time),
      executor: row.executor,
      enabled: row.enabled,
    });
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

  async function save() {
    if (!draft) return;
    if (draft.days.length === 0) {
      setError(new Error('Pick at least one day.'));
      return;
    }
    if (draft.start_time === draft.end_time) {
      setError(new Error('The start and the end cannot be the same time.'));
      return;
    }
    const input: ScheduleInput = {
      zone_id: draft.zone_id,
      profile_id: draft.profile_id,
      days: [...draft.days].sort((a, b) => a - b),
      start_time: `${draft.start_time}:00`,
      end_time: `${draft.end_time}:00`,
      executor: draft.executor,
      enabled: draft.enabled,
    };
    await run(
      async () => {
        if (draft.id) await updateSchedule(draft.id, input);
        else await createSchedule(input);
      },
      () => setDraft(null),
    );
  }

  async function toggle(row: ScheduleRow) {
    await run(
      () => updateSchedule(row.id, { enabled: !row.enabled }),
      () => undefined,
    );
  }

  const rows = state.data?.rows ?? [];
  const hasAreas = (state.data?.areas.length ?? 0) > 0;

  return (
    <>
      <PageHead
        title="Schedules"
        intro="Days and times a sound plays on its own, across all of your places."
        action={
          <Button onClick={openNew} disabled={!hasAreas}>
            <Plus size={16} strokeWidth={2} aria-hidden />
            New schedule
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
        ) : !hasAreas ? (
          <Empty title="Add a place and an area first. A schedule needs somewhere to play." />
        ) : rows.length === 0 ? (
          <Empty
            title="No schedules yet. Set the hours you want a sound to play and it runs without you."
            action={<Button onClick={openNew}>New schedule</Button>}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Place</Th>
                <Th>Area</Th>
                <Th>Days</Th>
                <Th>Time</Th>
                <Th>Sound</Th>
                <Th>Who runs it</Th>
                <Th>On</Th>
                <Th className="text-right">{''}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td>{row.place_name}</Td>
                  <Td>{row.area_name}</Td>
                  <Td className="whitespace-nowrap">{formatDays(row.days)}</Td>
                  <Td className="px-num whitespace-nowrap">
                    {formatWindow(row.start_time, row.end_time)}
                  </Td>
                  <Td>{row.sound_name}</Td>
                  <Td>{executorLabel(row.executor)}</Td>
                  <Td>
                    <button
                      type="button"
                      onClick={() => void toggle(row)}
                      className="cursor-pointer"
                      aria-label={row.enabled ? 'Turn this schedule off' : 'Turn this schedule on'}
                    >
                      <Pill tone={row.enabled ? 'live' : 'off'}>{row.enabled ? 'On' : 'Off'}</Pill>
                    </button>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    <GhostButton onClick={() => openEdit(row)}>Edit</GhostButton>{' '}
                    <GhostButton danger onClick={() => setRemoving(row)}>
                      Delete
                    </GhostButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>

      <Dialog
        open={draft !== null}
        title={draft?.id ? 'Edit this schedule' : 'New schedule'}
        onClose={() => setDraft(null)}
        onSubmit={() => void save()}
        submitLabel={draft?.id ? 'Save the schedule' : 'Create the schedule'}
        busy={busy}
        error={error}
      >
        {draft ? (
          <>
            <Field label="Place" htmlFor="sched-place">
              <Select
                id="sched-place"
                value={draft.place_id}
                onChange={(e) => {
                  const place_id = e.target.value;
                  const first = (state.data?.areas ?? []).find((a) => a.location_id === place_id);
                  setDraft({ ...draft, place_id, zone_id: first?.id ?? '' });
                }}
              >
                {(state.data?.places ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Area" htmlFor="sched-area">
              <Select
                id="sched-area"
                value={draft.zone_id}
                onChange={(e) => setDraft({ ...draft, zone_id: e.target.value })}
              >
                {areasForPlace.length === 0 ? <option value="">No areas here yet</option> : null}
                {areasForPlace.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Sound" htmlFor="sched-sound">
              <Select
                id="sched-sound"
                value={draft.profile_id}
                onChange={(e) => setDraft({ ...draft, profile_id: e.target.value })}
              >
                {(state.data?.sounds ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Days">
              <div className="flex flex-wrap gap-2">
                {DAY_BOXES.map((day) => {
                  const on = draft.days.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          days: on
                            ? draft.days.filter((d) => d !== day.value)
                            : [...draft.days, day.value],
                        })
                      }
                      className={`h-10 w-14 cursor-pointer border text-[14px] font-medium ${
                        on
                          ? 'border-accent bg-accent text-on-accent'
                          : 'border-line text-muted hover:border-ink hover:text-ink'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start" htmlFor="sched-start">
                <Input
                  id="sched-start"
                  type="time"
                  value={draft.start_time}
                  onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                />
              </Field>
              <Field label="End" htmlFor="sched-end">
                <Input
                  id="sched-end"
                  type="time"
                  value={draft.end_time}
                  onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Who runs it" htmlFor="sched-exec">
              <Select
                id="sched-exec"
                value={draft.executor}
                onChange={(e) => setDraft({ ...draft, executor: e.target.value as Executor })}
              >
                <option value="device">A PigeonX speaker</option>
                <option value="reminder">This phone reminds you</option>
              </Select>
            </Field>

            <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                className="size-4 accent-[var(--px-accent)]"
              />
              Turn this schedule on now
            </label>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={removing !== null}
        title="Delete this schedule"
        onClose={() => setRemoving(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (removing) await deleteSchedule(removing.id);
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
          {removing ? `${removing.area_name} at ${removing.place_name}` : 'This schedule'} stops
          running on its own. Nothing else changes.
        </p>
      </Dialog>
    </>
  );
}
