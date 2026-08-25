import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, LayoutGrid, Pencil, Plus, Speaker } from 'lucide-react-native';

import {
  Banner,
  BlockButton,
  Button,
  Card,
  Chip,
  EmptyState,
  ListRow,
  Screen,
  Sheet,
  StatusPill,
  TextField,
  Touchable,
  useToast,
} from '../src/components';
import { lastSessionLine, speakerLine, statusLine } from '../src/core/businessPlaces';
import { liveLabel, liveTone } from '../src/core/places';
import { BIRD_TARGET_LABELS, type BirdTarget } from '../src/core/personalization';
import {
  AUDIBLE_LABEL,
  SYSTEM_PROFILES,
  audibleState,
  pitchLabel,
} from '../src/core/profiles';
import { describePlan } from '../src/state/useProtectionPlans';
import { FLEET_STATUS_LABEL } from '../src/core/speakerStatus';
import { can, whyNot } from '../src/core/team';
import { watchLive } from '../src/services/live';
import { useAccount } from '../src/state/useAccount';
import {
  asProtectionPlan,
  useOrgPlans,
  type OrgPlan,
  type OrgPlanDraft,
} from '../src/state/useOrgPlans';
import { usePlaces } from '../src/state/usePlaces';
import { useSchedules } from '../src/state/useSchedules';
import { useSession } from '../src/state/useSession';
import { icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

/** The session lengths a plan can hold, in minutes. Same four as everywhere. */
const LENGTHS = [5, 15, 30, 60];

/** The silences a plan can leave between two sounds, in seconds. */
const GAPS = [0, 10, 20, 30, 60];

/**
 * One building, opened up.
 *
 * Every area inside it, what is playing in each one right now, the plan
 * looking after it, and the speakers that are meant to be there. Anybody on
 * the team can press Start on an area from their phone. Only a manager can
 * change what Start will play.
 */
export default function LocationScreen() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const places = usePlaces((s) => s.places);
  const live = usePlaces((s) => s.live);
  const setLive = usePlaces((s) => s.setLive);
  const activity = usePlaces((s) => s.activity);
  const activityKnown = usePlaces((s) => s.activityKnown);

  const role = useAccount((s) => s.activeOrgRole);
  const plans = useOrgPlans((s) => s.plans);
  const plansKnown = useOrgPlans((s) => s.loaded);
  const planProblem = useOrgPlans((s) => s.problem);

  const schedules = useSchedules((s) => s.schedules);

  const playingArea = useSession((s) => s.zoneId);
  const engineState = useSession((s) => s.engineState);

  const [now, setNow] = useState(() => Date.now());
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<OrgPlanDraft | null>(null);
  const [addingArea, setAddingArea] = useState(false);
  const [addingSpeakerIn, setAddingSpeakerIn] = useState<string | null>(null);

  const place = useMemo(() => places.find((p) => p.id === id), [id, places]);

  const mayEdit = can(role, 'plans');
  const mayAdd = can(role, 'places');

  // One person starting a sound on a roof shows up on everyone else's phone.
  useEffect(() => {
    if (!place) return;
    return watchLive([place.id], setLive);
  }, [place, setLive]);

  const anyPlaying = Object.values(live).some((l) => l.playing);
  useEffect(() => {
    if (!anyPlaying) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [anyPlaying]);

  const runHere = useCallback(
    async (areaId: string, areaName: string) => {
      if (!place) return;
      const session = useSession.getState();
      if (session.zoneId === areaId && session.isRunning()) {
        await session.stop();
        return;
      }
      session.setArea(areaId, areaName, { id: place.id, name: place.name });
      const plan = useOrgPlans.getState().forArea(areaId);
      await session.start({ plan: plan ? asProtectionPlan(plan) : null });
    },
    [place],
  );

  const attach = useCallback(
    async (plan: OrgPlan, areaId: string) => {
      const result = await useOrgPlans.getState().attach(plan.id, areaId);
      setChoosingFor(null);
      toast.show(result.message, result.ok ? 'success' : 'danger');
    },
    [toast],
  );

  const save = useCallback(
    async (draft: OrgPlanDraft) => {
      const result = await useOrgPlans.getState().save(draft);
      setEditing(null);
      setChoosingFor(null);
      toast.show(result.message, result.ok ? 'success' : 'danger');
    },
    [toast],
  );

  const addArea = useCallback(
    async (name: string) => {
      if (!place) return;
      const result = await usePlaces.getState().addArea(place.id, name);
      setAddingArea(false);
      toast.show(result.message, result.ok ? 'success' : 'danger');
    },
    [place, toast],
  );

  const addSpeaker = useCallback(
    async (name: string) => {
      if (!place || !addingSpeakerIn) return;
      const result = await usePlaces.getState().addSpeaker(place.id, addingSpeakerIn, name);
      setAddingSpeakerIn(null);
      toast.show(result.message, result.ok ? 'success' : 'danger');
    },
    [addingSpeakerIn, place, toast],
  );

  const head = (
    <View style={styles.headRow}>
      <Button
        label="Back"
        variant="ghost"
        size="sm"
        full={false}
        onPress={() => router.back()}
        icon={ChevronLeft}
      />
    </View>
  );

  if (!place) {
    return (
      <Screen header={head}>
        <EmptyState
          title="That place is gone"
          body="Somebody on your team may have deleted it."
          actionLabel="Back to your places"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const speakers = place.areas.flatMap((area) =>
    (area.speakers ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status ?? ('unknown' as const),
    })),
  );

  const state = {
    id: place.id,
    name: place.name,
    target: place.target ?? null,
    areas: place.areas.map((area) => ({
      id: area.id,
      name: area.name,
      planName: plans.find((p) => p.zoneId === area.id)?.name ?? null,
    })),
    speakers,
    scheduled: place.areas.some((area) =>
      schedules.some((s) => s.enabled && s.zoneId === area.id),
    ),
    lastSessionAt: activityKnown ? (activity[place.id] ?? null) : null,
    plansKnown,
  };

  return (
    <Screen title={place.name} subtitle={statusLine(state)} header={head}>
      {activityKnown ? (
        <Text style={styles.meta}>{lastSessionLine(state.lastSessionAt)}</Text>
      ) : null}
      <Text style={styles.meta}>{speakerLine(speakers)}</Text>

      {planProblem ? (
        <View style={styles.problem}>
          <Banner tone="warning" title="Not everything loaded" body={planProblem} />
        </View>
      ) : null}

      {place.areas.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No areas yet"
            body={
              mayAdd
                ? 'An area is one part of this building, like a roof or a patio.'
                : 'Once a manager adds an area, it shows up here.'
            }
            actionLabel={mayAdd ? 'Add an area' : undefined}
            onAction={mayAdd ? () => setAddingArea(true) : undefined}
          />
        </View>
      ) : (
        <View style={styles.areas}>
          {place.areas.map((area) => {
            const info = live[area.id];
            const mine = playingArea === area.id && engineState === 'running';
            const plan = plans.find((p) => p.zoneId === area.id);
            const areaSpeakers = area.speakers ?? [];

            return (
              <Card key={area.id} active={info?.playing === true}>
                <View style={styles.areaHead}>
                  <LayoutGrid size={icon.sm} color={c.muted} strokeWidth={icon.stroke} />
                  <Text style={styles.areaName} numberOfLines={1}>
                    {area.name}
                  </Text>
                  <StatusPill label={liveLabel(info, now)} tone={liveTone(info)} />
                </View>

                <Text style={styles.plan}>
                  {plan ? `${plan.name} · ${describePlan(asProtectionPlan(plan))}` : 'No plan yet'}
                </Text>

                {areaSpeakers.length === 0 ? (
                  <Text style={styles.meta}>No speakers yet</Text>
                ) : (
                  areaSpeakers.map((s) => (
                    <View key={s.id} style={styles.speakerRow}>
                      <Speaker size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
                      <Text style={styles.speakerName} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <StatusPill
                        label={FLEET_STATUS_LABEL[s.status ?? 'unknown']}
                        tone={s.status === 'offline' ? 'warning' : 'idle'}
                      />
                    </View>
                  ))
                )}

                <View style={styles.actions}>
                  <Button
                    label={mine ? 'Stop' : 'Start'}
                    variant={mine ? 'danger' : 'primary'}
                    size="sm"
                    full={false}
                    onPress={() => void runHere(area.id, area.name)}
                  />
                  <Button
                    label={plan ? 'Change plan' : 'Choose a plan'}
                    variant="secondary"
                    size="sm"
                    full={false}
                    onPress={() =>
                      mayEdit ? setChoosingFor(area.id) : toast.show(whyNot('plans'), 'danger')
                    }
                  />
                  {mayAdd ? (
                    <Button
                      label="Add a speaker"
                      variant="ghost"
                      size="sm"
                      full={false}
                      onPress={() => setAddingSpeakerIn(area.id)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}

          {mayAdd ? (
            <Button
              label="Add an area"
              variant="secondary"
              onPress={() => setAddingArea(true)}
              icon={Plus}
            />
          ) : null}
        </View>
      )}

      <PlanPicker
        open={choosingFor !== null}
        areaId={choosingFor}
        plans={plans}
        target={place.target ?? 'unsure'}
        limitAudible={place.limitAudible === true}
        onClose={() => setChoosingFor(null)}
        onPick={(plan) => {
          if (choosingFor) void attach(plan, choosingFor);
        }}
        onEdit={(draft) => setEditing(draft)}
      />

      {editing ? (
        <PlanEditor draft={editing} onClose={() => setEditing(null)} onSave={save} />
      ) : null}

      <AskName
        open={addingArea}
        title="Add an area"
        hint="The name of one part of this building. Like Roof or Patio."
        placeholder="Roof"
        action="Add an area"
        onClose={() => setAddingArea(false)}
        onSubmit={(name) => void addArea(name)}
      />

      <AskName
        open={addingSpeakerIn !== null}
        title="Add a speaker"
        hint="Name it after where it sits. Like Roof corner."
        placeholder="Roof corner"
        action="Add a speaker"
        onClose={() => setAddingSpeakerIn(null)}
        onSubmit={(name) => void addSpeaker(name)}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

/** Which plan looks after this area: one of the ones you have, or a new one. */
function PlanPicker({
  open,
  areaId,
  plans,
  target,
  limitAudible,
  onClose,
  onPick,
  onEdit,
}: {
  open: boolean;
  areaId: string | null;
  plans: OrgPlan[];
  target: BirdTarget;
  limitAudible: boolean;
  onClose: () => void;
  onPick: (plan: OrgPlan) => void;
  onEdit: (draft: OrgPlanDraft) => void;
}) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const output = useSession((s) => s.output);

  return (
    <Sheet
      open={open}
      title="The plan for this area"
      onClose={onClose}
      footer={
        <Button
          label="Write a new plan"
          size="lg"
          onPress={() => {
            if (!areaId) return;
            onEdit(useOrgPlans.getState().draftFor(areaId, target, output, limitAudible));
          }}
        />
      }
    >
      <Text style={styles.hint}>
        Whoever presses Start on this area plays this. {BIRD_TARGET_LABELS[target]} is what this
        building answered for.
      </Text>

      {plans.length === 0 ? (
        <Text style={styles.hint}>Your business has no plans yet.</Text>
      ) : (
        <View style={styles.list}>
          {plans.map((plan) => (
            <ListRow
              key={plan.id}
              title={plan.name}
              meta={describePlan(asProtectionPlan(plan))}
              selected={plan.zoneId === areaId}
              chevron={false}
              onPress={() => onPick(plan)}
              right={
                <Touchable
                  onPress={() => onEdit(plan)}
                  accessibilityLabel={`Edit ${plan.name}`}
                  style={styles.pencil}
                >
                  <Pencil size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
                </Touchable>
              }
            />
          ))}
        </View>
      )}

      {plans.length > 0 ? (
        <Text style={styles.hint}>Tap one to put it in charge of this area.</Text>
      ) : null}
    </Sheet>
  );
}

/** The sounds a plan rotates, how long for, and how long it waits between. */
function PlanEditor({
  draft,
  onClose,
  onSave,
}: {
  draft: OrgPlanDraft;
  onClose: () => void;
  onSave: (draft: OrgPlanDraft) => void;
}) {
  const styles = useThemedStyles(sheet);
  const output = useSession((s) => s.output);

  const [name, setName] = useState(draft.name);
  const [soundIds, setSoundIds] = useState(draft.soundIds);
  const [randomize, setRandomize] = useState(draft.randomizeOrder);
  const [minutes, setMinutes] = useState(draft.sessionMinutes);
  const [gap, setGap] = useState(draft.intervalSeconds);

  const toggle = useCallback((id: string) => {
    setSoundIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }, []);

  return (
    <Sheet
      open
      title={draft.id ? draft.name : 'A new plan'}
      onClose={onClose}
      footer={
        <BlockButton
          label="Save"
          disabled={name.trim().length === 0 || soundIds.length === 0}
          onPress={() =>
            onSave({
              ...draft,
              name: name.trim(),
              soundIds,
              randomizeOrder: randomize,
              sessionMinutes: minutes,
              intervalSeconds: gap,
            })
          }
        />
      }
    >
      <TextField label="Name" value={name} onChangeText={setName} maxLength={60} />

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Sounds in rotation</Text>
        <View style={styles.list}>
          {SYSTEM_PROFILES.map((p) => (
            <ListRow
              key={p.id}
              title={p.name}
              meta={`${pitchLabel(p)}. ${AUDIBLE_LABEL[audibleState(p, output)]}`}
              selected={soundIds.includes(p.id)}
              chevron={false}
              onPress={() => toggle(p.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Order</Text>
        <View style={styles.chipRow}>
          <Chip
            label="Shuffle each session"
            selected={randomize}
            onPress={() => setRandomize(true)}
          />
          <Chip
            label="Always this order"
            selected={!randomize}
            onPress={() => setRandomize(false)}
          />
        </View>
        <Text style={styles.hint}>Shuffling makes the pattern harder to predict.</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Session length</Text>
        <View style={styles.chipRow}>
          {LENGTHS.map((m) => (
            <Chip
              key={m}
              label={m === 60 ? '1 hour' : `${m} min`}
              selected={minutes === m}
              onPress={() => setMinutes(m)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Gap between sounds</Text>
        <View style={styles.chipRow}>
          {GAPS.map((g) => (
            <Chip
              key={g}
              label={g === 0 ? 'No gap' : `${g} seconds`}
              selected={gap === g}
              onPress={() => setGap(g)}
            />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

/** One name, one button. The same sheet the Places tab asks with. */
function AskName({
  open,
  title,
  hint,
  placeholder,
  action,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  hint: string;
  placeholder: string;
  action: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <Button
          label={action}
          size="lg"
          disabled={name.trim().length === 0}
          onPress={() => onSubmit(name.trim())}
        />
      }
    >
      <TextField
        label="Name"
        hint={hint}
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        accessibilityLabel="Name"
      />
    </Sheet>
  );
}

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { ...t.bodySmall },
  problem: { marginTop: space.md },
  emptyWrap: { marginTop: space.lg },
  areas: { marginTop: space.md, gap: space.sm },
  areaHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  areaName: { ...t.subheading, flex: 1 },
  plan: { ...t.label, fontSize: 15, color: c.text, marginTop: space.sm },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  speakerName: { ...t.label, flex: 1, fontSize: 15 },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.md },
  list: { borderWidth: 1, borderColor: c.border },
  field: { gap: space.sm },
  fieldLabel: { ...t.overline },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hint: { ...t.caption },
  pencil: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
}));
