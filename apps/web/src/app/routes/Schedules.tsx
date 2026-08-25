import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useNow } from '../lib/useNow';
import {
  createSchedule,
  deleteSchedule,
  listAreasForPlaces,
  listPlaces,
  listPlans,
  listSchedules,
  listSounds,
  updateSchedule,
  type ScheduleInput,
} from '../lib/db';
import {
  DEMO_AREAS,
  DEMO_PLACES,
  DEMO_PLANS,
  DEMO_SCHEDULES,
  DEMO_SOUNDS,
  demoWriteBlocked,
  isDemo,
} from '../lib/demo';
import {
  formatDays,
  formatTime,
  nextRunLine,
  outputLabel,
  quietHoursLabel,
  runningNow,
  scheduleWindow,
  timeline,
  triggerLabel,
} from '../lib/derive';
import {
  SCHEDULE_TRIGGERS,
  SCHEDULE_TRIGGER_LABELS,
  type ScheduleTrigger,
} from '../lib/labels';
import type { Area, Executor, Place, ProtectionPlan, ScheduleRow, Sound } from '../lib/types';
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
} from '../components/ui';
import { Dialog } from '../components/Dialog';

type SchedulesData = {
  places: Place[];
  areas: Area[];
  sounds: Sound[];
  plans: ProtectionPlan[];
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
  trigger: ScheduleTrigger;
  offset_minutes: number;
  plan_id: string | null;
  quiet_start: string | null;
  quiet_end: string | null;
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
  trigger: 'time',
  offset_minutes: 0,
  plan_id: null,
  quiet_start: null,
  quiet_end: null,
};

/** `18:30:00` and `18:30` both arrive here; the input wants `18:30`. */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

/* ── one line on the timeline ──────────────────────────────────────────── */

function TimelineRow({
  row,
  today,
  now,
  onEdit,
  onToggle,
  onDelete,
}: {
  row: ScheduleRow;
  today: boolean;
  now: Date;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const live = today && runningNow(row, now);
  const quiet = quietHoursLabel(row.quiet_start, row.quiet_end);

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="px-num w-full shrink-0 text-[15px] text-ink sm:w-[16rem]">
            {scheduleWindow(row)}
          </p>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-ink">
              {row.place_name} · {row.area_name}
            </p>
            <p className="text-[14px] text-muted">
              {row.plan_name ?? row.sound_name}
              {row.output ? ` · ${outputLabel(row.output)}` : ''}
              {quiet ? ` · ${quiet}` : ''}
              {row.days.length < 7 ? ` · ${formatDays(row.days)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {live ? <Pill tone="live">Running now</Pill> : null}
          <button
            type="button"
            onClick={onToggle}
            className="cursor-pointer"
            aria-label={row.enabled ? 'Pause this schedule' : 'Turn this schedule on'}
          >
            <Pill tone={row.enabled ? 'quiet' : 'off'}>{row.enabled ? 'Active' : 'Paused'}</Pill>
          </button>
          <GhostButton onClick={onEdit}>Edit</GhostButton>
          <GhostButton danger onClick={onDelete}>
            Delete
          </GhostButton>
        </div>
      </div>
    </li>
  );
}

/* ── the page ──────────────────────────────────────────────────────────── */

export default function Schedules() {
  const { business } = useAuth();
  const demo = isDemo();
  const orgId = business?.org_id ?? null;
  const now = useNow(30000);

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
        plans: DEMO_PLANS,
        rows: DEMO_SCHEDULES,
      };
    }
    if (!orgId) return { places: [], areas: [], sounds: [], plans: [], rows: [] };
    const places = await listPlaces(orgId);
    const ids = places.map((p) => p.id);
    const [areas, sounds, plans, rows] = await Promise.all([
      listAreasForPlaces(ids),
      listSounds(orgId),
      listPlans(orgId).catch(() => [] as ProtectionPlan[]),
      listSchedules(ids),
    ]);
    return { places, areas, sounds, plans, rows };
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
      trigger: row.trigger,
      offset_minutes: row.offset_minutes,
      plan_id: row.plan_id,
      quiet_start: row.quiet_start,
      quiet_end: row.quiet_end,
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
      trigger: draft.trigger,
      offset_minutes: draft.trigger === 'time' ? 0 : draft.offset_minutes,
      plan_id: draft.plan_id,
      quiet_start: draft.quiet_start,
      quiet_end: draft.quiet_end,
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
  const days = timeline(rows, 7, now);

  return (
    <>
      <PageHead
        title="Schedules"
        intro="What is set to run, across every location, today and the week ahead."
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

      {rows.length > 0 ? (
        <Card className="mt-6 border-accent">
          <Label className="text-accent">Next run</Label>
          <p className="mt-2 text-[16px] text-ink">{nextRunLine(rows, now)}</p>
        </Card>
      ) : null}

      <div className="mt-6">
        {state.loading && !state.data ? (
          <SkeletonRows rows={3} />
        ) : !hasAreas ? (
          <Empty title="Add a location and an area first. A schedule needs somewhere to play." />
        ) : rows.length === 0 ? (
          <Empty
            title="No schedules yet. Set the hours you want a sound to play and it runs without you."
            action={<Button onClick={openNew}>New schedule</Button>}
          />
        ) : (
          <div className="space-y-8">
            {days.map((day, index) => (
              <section key={day.key}>
                <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
                  <h2 className="text-[18px] font-semibold">{day.title}</h2>
                  <p className="px-label text-muted">
                    {day.rows.length === 1 ? '1 schedule' : `${day.rows.length} schedules`}
                  </p>
                </div>
                <ul className="mt-4 border border-line">
                  {day.rows.map((row) => (
                    <TimelineRow
                      key={`${day.key}-${row.id}`}
                      row={row}
                      today={index === 0}
                      now={now}
                      onEdit={() => openEdit(row)}
                      onToggle={() => void toggle(row)}
                      onDelete={() => setRemoving(row)}
                    />
                  ))}
                </ul>
              </section>
            ))}
            <p className="text-[14px] text-muted">
              Sunrise and sunset are worked out by the speaker, from where it stands. The times
              above are the intent.
            </p>
          </div>
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
            <Field label="Location" htmlFor="sched-place">
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

            <Field
              label="Protection plan"
              hint="A plan brings its own sounds, speaker and session length."
              htmlFor="sched-plan"
            >
              <Select
                id="sched-plan"
                value={draft.plan_id ?? ''}
                onChange={(e) => setDraft({ ...draft, plan_id: e.target.value || null })}
              >
                <option value="">No plan, just the sound below</option>
                {(state.data?.plans ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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

            <Field label="Starts" htmlFor="sched-trigger">
              <Select
                id="sched-trigger"
                value={draft.trigger}
                onChange={(e) =>
                  setDraft({ ...draft, trigger: e.target.value as ScheduleTrigger })
                }
              >
                {SCHEDULE_TRIGGERS.map((t) => (
                  <option key={t} value={t}>
                    {SCHEDULE_TRIGGER_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>

            {draft.trigger === 'time' ? null : (
              <Field
                label="Minutes either side"
                hint={`Negative is before. This one reads as "${triggerLabel(
                  draft.trigger,
                  draft.offset_minutes,
                  draft.start_time,
                )}". The speaker works out the real time where it stands.`}
                htmlFor="sched-offset"
              >
                <Input
                  id="sched-offset"
                  type="number"
                  min={-720}
                  max={720}
                  value={draft.offset_minutes}
                  onChange={(e) => setDraft({ ...draft, offset_minutes: Number(e.target.value) })}
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={draft.trigger === 'time' ? 'Start' : 'Fallback start'}
                hint={
                  draft.trigger === 'time'
                    ? undefined
                    : 'Used until the speaker knows where it is.'
                }
                htmlFor="sched-start"
              >
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quiet from" hint="Optional." htmlFor="sched-quiet-start">
                <Input
                  id="sched-quiet-start"
                  type="time"
                  value={toInputTime(draft.quiet_start)}
                  onChange={(e) => setDraft({ ...draft, quiet_start: e.target.value || null })}
                />
              </Field>
              <Field label="Quiet until" hint="Optional." htmlFor="sched-quiet-end">
                <Input
                  id="sched-quiet-end"
                  type="time"
                  value={toInputTime(draft.quiet_end)}
                  onChange={(e) => setDraft({ ...draft, quiet_end: e.target.value || null })}
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
          {removing
            ? `${removing.area_name} at ${removing.place_name}, ${formatTime(removing.start_time)}`
            : 'This schedule'}{' '}
          stops running on its own. Nothing else changes.
        </p>
      </Dialog>
    </>
  );
}
