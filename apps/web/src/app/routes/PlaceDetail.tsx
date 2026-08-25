import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useRealtime } from '../lib/useRealtime';
import { useNow } from '../lib/useNow';
import {
  areaFeedback,
  attachPlan,
  createArea,
  createPlan,
  createSpeaker,
  deleteArea,
  deletePlan,
  deleteSpeaker,
  getPlace,
  history,
  listAreas,
  listPlans,
  listSounds,
  listSpeakers,
  liveStatus,
  placeReport,
  renameArea,
  updatePlaceAnswers,
  updatePlan,
  updateSpeaker,
} from '../lib/db';
import {
  DEMO_AREAS,
  DEMO_PLACES,
  DEMO_PLANS,
  DEMO_SOUNDS,
  DEMO_SPEAKERS,
  demoFeedback,
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
  feedbackLine,
  formatPlanDays,
  formatReport,
  intervalLabel,
  placeLine,
  planDatesLabel,
  planLine,
  resultLabel,
  speakerKindLabel,
  weekStart,
  whenLabel,
} from '../lib/derive';
import {
  AREA_SIZES,
  AREA_SIZE_HINTS,
  AREA_SIZE_LABELS,
  BIRD_TARGETS,
  BIRD_TARGET_LABELS,
  PLACE_KINDS,
  PLACE_KIND_LABELS,
  SESSION_RESULTS,
  SESSION_RESULT_LABELS,
  type AreaSize,
  type BirdTarget,
  type PlaceKind,
} from '../lib/labels';
import type {
  Area,
  AreaFeedback,
  DeviceKind,
  DeviceStatus,
  LiveArea,
  Place,
  PlaceAnswers,
  PlaceReport,
  Play,
  ProtectionPlan,
  Sound,
  Speaker,
} from '../lib/types';
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
import { PlanEditor, blankPlan, planToDraft, type PlanDraft } from '../components/PlanEditor';

type PlaceData = {
  place: Place | null;
  areas: Area[];
  live: LiveArea[];
  speakers: Speaker[];
  plans: ProtectionPlan[];
  sounds: Sound[];
  plays: Play[];
  report: PlaceReport | null;
  reportError: unknown;
  feedback: AreaFeedback[];
};

const SPEAKER_KINDS: Array<{ value: DeviceKind; label: string }> = [
  { value: 'pigeonx_emitter', label: 'PigeonX speaker' },
  { value: 'bt_speaker', label: 'Bluetooth speaker' },
  { value: 'phone', label: 'This phone' },
  { value: 'simulated', label: 'Test speaker' },
];

/** A speaker either answered, stopped answering, or has never said. */
function speakerTone(status: DeviceStatus): 'live' | 'warn' | 'quiet' {
  if (status === 'online') return 'live';
  if (status === 'offline') return 'warn';
  return 'quiet';
}

function speakerWord(status: DeviceStatus): string {
  if (status === 'online') return 'Online';
  if (status === 'offline') return 'Offline';
  return 'Not heard from';
}

export default function PlaceDetail() {
  const { id = '' } = useParams();
  const { business, userId } = useAuth();
  const demo = isDemo();
  const now = useNow(1000);
  const orgId = business?.org_id ?? null;

  const [addingArea, setAddingArea] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [removingArea, setRemovingArea] = useState<Area | null>(null);
  const [addingSpeaker, setAddingSpeaker] = useState<Area | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [removingSpeaker, setRemovingSpeaker] = useState<Speaker | null>(null);
  const [answers, setAnswers] = useState<PlaceAnswers | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [planArea, setPlanArea] = useState<Area | null>(null);
  const [removingPlan, setRemovingPlan] = useState<ProtectionPlan | null>(null);
  const [attaching, setAttaching] = useState<Area | null>(null);
  const [attachId, setAttachId] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DeviceKind>('pigeonx_emitter');
  const [resultFilter, setResultFilter] = useState('');
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
        plans: DEMO_PLANS.filter((p) => areas.some((a) => a.id === p.zone_id)),
        sounds: DEMO_SOUNDS,
        plays: demoPlays().filter((p) => p.location_id === id),
        report: demoReport(id),
        reportError: null,
        feedback: areas.map((a) => demoFeedback(a.id)),
      };
    }
    const [place, areas, live] = await Promise.all([
      getPlace(id),
      listAreas(id),
      liveStatus(id).catch(() => [] as LiveArea[]),
    ]);
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const [speakers, plays, plans, sounds, feedback] = await Promise.all([
      listSpeakers(areas.map((a) => a.id)),
      history(from, new Date(Date.now() + 60000)).catch(() => [] as Play[]),
      orgId ? listPlans(orgId).catch(() => [] as ProtectionPlan[]) : Promise.resolve([]),
      orgId ? listSounds(orgId).catch(() => [] as Sound[]) : Promise.resolve([]),
      Promise.all(areas.map((a) => areaFeedback(a.id).catch(() => null))),
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
      plans,
      sounds,
      plays: plays.filter((p) => p.location_id === id),
      report,
      reportError,
      feedback: feedback.filter((f): f is AreaFeedback => f !== null),
    };
  }, [id, orgId, demo]);

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
  const plans = data?.plans ?? [];
  const lines = formatReport(data?.report ?? null);

  const shownPlays = useMemo(() => {
    const all = data?.plays ?? [];
    if (!resultFilter) return all;
    if (resultFilter === 'none') return all.filter((p) => p.result === null);
    return all.filter((p) => p.result === resultFilter);
  }, [data?.plays, resultFilter]);

  /** Plans this business owns that are not already on an area here. */
  const spare = plans.filter((p) => p.zone_id === null);

  function openPlan(area: Area, plan: ProtectionPlan | null) {
    setError(null);
    setPlanArea(area);
    setPlanDraft(plan ? planToDraft(plan) : blankPlan(area.id, place?.target ?? 'unsure'));
  }

  async function savePlan() {
    if (!planDraft) return;
    if (planDraft.sound_ids.length === 0) {
      setError(new Error('Pick at least one sound for the rotation.'));
      return;
    }
    if (planDraft.days.length === 0) {
      setError(new Error('Pick at least one day.'));
      return;
    }
    const { id: planId, ...input } = planDraft;
    await run(
      async () => {
        if (planId) await updatePlan(planId, input);
        else if (orgId) await createPlan(orgId, input);
      },
      () => setPlanDraft(null),
    );
  }

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
        <PageHead title="Location" />
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      </>
    );
  }

  if (!place) {
    return (
      <>
        <PageHead title="Location not found" />
        <div className="mt-6">
          <Empty
            title="This location is gone, or it belongs to another business."
            action={
              <Link
                to="/app/places"
                className="inline-flex h-11 items-center border border-ink px-5 text-[15px] font-medium text-ink hover:bg-ink hover:text-bg"
              >
                Back to locations
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
        All locations
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

      {/* What this location is, and which birds */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Label>What you are protecting</Label>
            <p className="mt-2 text-[16px] text-ink">{placeLine(place)}</p>
          </div>
          <GhostButton
            onClick={() => {
              setError(null);
              setAnswers({
                kind: place.kind,
                target: place.target,
                area_size: place.area_size,
                people_nearby: place.people_nearby,
                limit_audible: place.limit_audible,
                birds_active: place.birds_active,
              });
            }}
          >
            Change these answers
          </GhostButton>
        </div>
      </Card>

      {/* This week */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sessions this week" value={lines.plays} />
        <Stat label="Sound played" value={lines.time} />
        <Stat label="Areas covered" value={lines.areas} />
        <Card>
          <Label>What people reported</Label>
          <p className="mt-3 text-[15px] text-ink">
            {data?.reportError
              ? 'The weekly report is coming online. Check back in a little while.'
              : feedbackLine(data?.feedback ?? [])}
          </p>
          <p className="mt-2 text-[13px] text-muted">{lines.sentence}</p>
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
              title="No areas yet. Add the first part of this location you want covered, like the patio or the roof."
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
              const plan = plans.find((p) => p.zone_id === area.id) ?? null;
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

                  {/* The protection plan on this area */}
                  <div className="border-b border-line p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Label>Protection plan</Label>
                        <p className="mt-2 text-[15px] text-ink">{planLine(plan)}</p>
                        {plan ? (
                          <p className="mt-1 text-[14px] text-muted">
                            {BIRD_TARGET_LABELS[plan.target]} · {formatPlanDays(plan.days)} ·{' '}
                            {intervalLabel(plan.interval_seconds)}
                            {planDatesLabel(plan) ? ` · ${planDatesLabel(plan)}` : ''}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plan ? (
                          <>
                            <GhostButton onClick={() => openPlan(area, plan)}>
                              Edit the plan
                            </GhostButton>
                            <GhostButton danger onClick={() => setRemovingPlan(plan)}>
                              Delete the plan
                            </GhostButton>
                          </>
                        ) : (
                          <>
                            <GhostButton onClick={() => openPlan(area, null)}>
                              <Plus size={14} strokeWidth={2} aria-hidden />
                              Set up a plan
                            </GhostButton>
                            {spare.length > 0 ? (
                              <GhostButton
                                onClick={() => {
                                  setError(null);
                                  setAttachId(spare[0].id);
                                  setAttaching(area);
                                }}
                              >
                                Attach a plan
                              </GhostButton>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* The speakers in this area */}
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
                                {speakerKindLabel(s.kind)} · last seen{' '}
                                {agoLabel(s.last_seen_at, now)}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Pill tone={speakerTone(s.status)}>{speakerWord(s.status)}</Pill>
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
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3">
          <h2 className="text-[18px] font-semibold">What played</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="place-result" className="px-label text-muted">
              Result
            </label>
            <Select
              id="place-result"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="h-9 w-auto text-[14px]"
            >
              <option value="">Every result</option>
              {SESSION_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {SESSION_RESULT_LABELS[r]}
                </option>
              ))}
              <option value="none">Not reported</option>
            </Select>
            <p className="px-label text-muted">Last 30 days</p>
          </div>
        </div>
        <div className="mt-5">
          {(data?.plays.length ?? 0) === 0 ? (
            <Empty title="Nothing has played here yet. Start a sound from the phone app and it shows up in this table." />
          ) : shownPlays.length === 0 ? (
            <Empty title="No runs match that result. Pick another one." />
          ) : (
            <TableWrap min="48rem">
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Sound</Th>
                  <Th>Area</Th>
                  <Th>Who</Th>
                  <Th>How long</Th>
                  <Th>Result</Th>
                </tr>
              </thead>
              <tbody>
                {shownPlays.slice(0, 100).map((p) => (
                  <tr key={p.id}>
                    <Td className="whitespace-nowrap">{whenLabel(p.started_at)}</Td>
                    <Td>{p.plan_name ?? p.profile_name ?? 'Sound'}</Td>
                    <Td>{p.zone_name ?? 'Area'}</Td>
                    <Td>{p.user_id === userId ? 'You' : 'A teammate'}</Td>
                    <Td className="px-num whitespace-nowrap">
                      {p.ended_at ? duration(p.minutes) : 'Playing now'}
                    </Td>
                    <Td
                      className={`whitespace-nowrap ${p.result === null ? 'text-muted' : 'text-ink'}`}
                    >
                      {resultLabel(p.result)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </section>

      {/* the personalization sheet */}
      <Dialog
        open={answers !== null}
        title="What you are protecting"
        onClose={() => setAnswers(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (answers) await updatePlaceAnswers(id, answers);
            },
            () => setAnswers(null),
          )
        }
        submitLabel="Save the answers"
        busy={busy}
        error={error}
      >
        {answers ? (
          <>
            <Field label="What is this location" htmlFor="answer-kind">
              <Select
                id="answer-kind"
                value={answers.kind ?? ''}
                onChange={(e) =>
                  setAnswers({ ...answers, kind: (e.target.value || null) as PlaceKind | null })
                }
              >
                <option value="">Not set</option>
                {PLACE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PLACE_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Which birds are the problem" htmlFor="answer-target">
              <Select
                id="answer-target"
                value={answers.target ?? ''}
                onChange={(e) =>
                  setAnswers({ ...answers, target: (e.target.value || null) as BirdTarget | null })
                }
              >
                <option value="">Not set</option>
                {BIRD_TARGETS.map((t) => (
                  <option key={t} value={t}>
                    {BIRD_TARGET_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="How big is the area"
              hint={answers.area_size ? AREA_SIZE_HINTS[answers.area_size] : undefined}
              htmlFor="answer-size"
            >
              <Select
                id="answer-size"
                value={answers.area_size ?? ''}
                onChange={(e) =>
                  setAnswers({
                    ...answers,
                    area_size: (e.target.value || null) as AreaSize | null,
                  })
                }
              >
                <option value="">Not set</option>
                {AREA_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {AREA_SIZE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={answers.people_nearby}
                onChange={(e) => setAnswers({ ...answers, people_nearby: e.target.checked })}
                className="size-4 accent-[var(--px-accent)]"
              />
              People are usually nearby
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={answers.limit_audible}
                onChange={(e) => setAnswers({ ...answers, limit_audible: e.target.checked })}
                className="mt-1 size-4 shrink-0 accent-[var(--px-accent)]"
              />
              <span>
                Keep it quiet here
                <span className="block text-[13px] text-muted">
                  Plans built for this location leave out recorded calls and stay above 15 kHz.
                </span>
              </span>
            </label>

            <Field
              label="When do the birds show up"
              hint="In your own words. Early morning, after lunch, all day."
              htmlFor="answer-active"
            >
              <Input
                id="answer-active"
                value={answers.birds_active ?? ''}
                maxLength={120}
                onChange={(e) =>
                  setAnswers({ ...answers, birds_active: e.target.value || null })
                }
                placeholder="early morning"
              />
            </Field>
          </>
        ) : null}
      </Dialog>

      {/* the plan editor */}
      <PlanEditor
        open={planDraft !== null}
        draft={planDraft}
        areaName={planArea?.name ?? 'this area'}
        sounds={data?.sounds ?? []}
        busy={busy}
        error={error}
        onChange={setPlanDraft}
        onClose={() => setPlanDraft(null)}
        onSubmit={() => void savePlan()}
      />

      <Dialog
        open={attaching !== null}
        title={`Attach a plan to ${attaching?.name ?? 'this area'}`}
        onClose={() => setAttaching(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (attaching && attachId) await attachPlan(attachId, attaching.id);
            },
            () => setAttaching(null),
          )
        }
        submitLabel="Attach it"
        busy={busy}
        error={error}
      >
        <Field label="Plan" htmlFor="attach-plan">
          <Select id="attach-plan" value={attachId} onChange={(e) => setAttachId(e.target.value)}>
            {spare.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </Dialog>

      <Dialog
        open={removingPlan !== null}
        title="Delete this protection plan"
        onClose={() => setRemovingPlan(null)}
        onSubmit={() =>
          void run(
            async () => {
              if (removingPlan) await deletePlan(removingPlan.id);
            },
            () => setRemovingPlan(null),
          )
        }
        submitLabel="Delete it"
        danger
        busy={busy}
        error={error}
      >
        <p className="text-[16px] text-ink">
          {removingPlan?.name} goes, and this area stops running it. Schedules that pointed at it
          keep their sound. What already played stays in your history.
        </p>
      </Dialog>

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
        <Field
          label="Area name"
          hint="One part of this location, like Patio or Roof deck."
          htmlFor="area-name"
        >
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
