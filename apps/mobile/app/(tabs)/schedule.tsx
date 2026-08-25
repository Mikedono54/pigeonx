import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, Trash2 } from 'lucide-react-native';

import {
  Banner,
  Button,
  Card,
  Chip,
  dockClearance,
  EmptyState,
  Screen,
  SectionHeader,
  Segmented,
  Sheet,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { clockMinutes } from '../../src/core/homeState';
import { parseClock, toClock } from '../../src/core/planWindow';
import { SPEAKER_LABEL } from '../../src/core/profiles';
import { overlappingPairs } from '../../src/core/scheduler';
import {
  TRIGGER_LABEL,
  nextOccurrence,
  nextRunLine,
  occurrenceHours,
  runLength,
  scheduleTimeline,
  type Occurrence,
  type ScheduleTrigger,
} from '../../src/core/scheduleTimeline';
import { ESTIMATED_NOTE } from '../../src/core/sun';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useLocation } from '../../src/state/useLocation';
import { usePlacesHome } from '../../src/state/usePlacesHome';
import { useProfiles } from '../../src/state/useProfiles';
import { useProtectionPlans } from '../../src/state/useProtectionPlans';
import {
  DAY_LABELS,
  DAY_NAMES,
  describeDays,
  describeSchedule,
  formatMinutes,
  useSchedules,
  type Executor,
  type Schedule,
} from '../../src/state/useSchedules';
import { useSession } from '../../src/state/useSession';
import { font, icon, space, themed, useTheme, useThemedStyles } from '../../src/theme';

/** How often the timeline looks at the clock, so a card can flip in place. */
const TICK_MS = 20_000;

/** How far ahead the timeline lays the week out. */
const DAYS_AHEAD = 7;

const OFFSET_STEP = 15;
const OFFSET_LIMIT = 180;

export default function ScheduleScreen() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const ent = useEntitlement();
  const schedules = useSchedules((s) => s.schedules);
  const clashes = useMemo(() => overlappingPairs(schedules), [schedules]);
  const toggle = useSchedules((s) => s.toggle);
  const remove = useSchedules((s) => s.remove);
  const coords = useLocation((s) => s.coords);
  const place = usePlacesHome((s) => s.active());
  const plans = useProtectionPlans((s) => s.plans);
  const output = useSession((s) => s.output);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [open, setOpen] = useState(false);

  // The one clock on this screen. Every card and the line at the top read the
  // same moment, so nothing can say two different things at once.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (schedules.length === 0) return;
    const tick = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(tick);
  }, [schedules.length]);

  const timeline = useMemo(
    () => scheduleTimeline(schedules, now, { days: DAYS_AHEAD, coords }),
    [coords, now, schedules],
  );

  const next = useMemo(() => nextOccurrence(timeline, now), [now, timeline]);
  const nextLine = useMemo(
    () => nextRunLine(next, now, next?.schedule.placeName ?? place?.name ?? null),
    [next, now, place],
  );

  const estimating = useMemo(
    () => timeline.some((day) => day.items.some((i) => i.estimated)),
    [timeline],
  );

  // A run that plays a plan plays through the speaker that plan was given.
  // Everything else plays through whatever Home is pointed at.
  const outputFor = useCallback(
    (s: Schedule) => plans.find((p) => p.id === s.planId)?.output ?? output,
    [output, plans],
  );

  const openNew = useCallback(() => {
    if (!ent.guard('schedules.reminder')) return;
    setEditing(null);
    setOpen(true);
  }, [ent]);

  const empty = schedules.length === 0;

  return (
    // One way in. An empty screen offers the button in its own empty state,
    // and a screen with something on it offers the pinned one. Never both.
    <Screen
      title="Schedule"
      scroll={false}
      dock={
        empty ? undefined : (
          <Button label="Add a schedule" size="lg" onPress={openNew} icon={Plus} />
        )
      }
    >
      {nextLine ? <Text style={styles.next}>{nextLine}</Text> : null}

      {clashes.length > 0 ? (
        <View style={styles.clash}>
          <Banner
            tone="warning"
            title="Two times cover the same minutes"
            body="The one that starts later takes over."
          />
        </View>
      ) : null}

      {empty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            align="left"
            title={place ? `Protect ${place.name} automatically` : 'Protect this place automatically'}
            body="Create a schedule for the times birds usually appear."
            note={place?.birdsActive ? `You said birds show up ${place.birdsActive}.` : undefined}
            actionLabel="Add a schedule"
            onAction={openNew}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: dockClearance(insets.bottom) },
          ]}
        >
          {timeline.map((day) => (
            <View key={day.key} style={styles.dayGroup}>
              <SectionHeader title={day.heading} />
              {day.items.map((item) => (
                <RunCard
                  key={item.key}
                  item={item}
                  outputLabel={SPEAKER_LABEL[outputFor(item.schedule)]}
                  onToggle={() => void toggle(item.schedule.id)}
                  onChange={() => {
                    setEditing(item.schedule);
                    setOpen(true);
                  }}
                  onDelete={() => void remove(item.schedule.id)}
                />
              ))}
            </View>
          ))}

          {estimating ? <Text style={styles.estimate}>{ESTIMATED_NOTE}</Text> : null}
        </ScrollView>
      )}

      <ScheduleForm open={open} schedule={editing} onClose={() => setOpen(false)} />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

/**
 * One run on the timeline.
 *
 * The card knows when it is, where it is, what it will play and through what.
 * The one that is happening now takes the playing colour along its edge and
 * says so, and it changes there rather than jumping to another list.
 */
function RunCard({
  item,
  outputLabel,
  onToggle,
  onChange,
  onDelete,
}: {
  item: Occurrence<Schedule>;
  outputLabel: string;
  onToggle: () => void;
  onChange: () => void;
  onDelete: () => void;
}) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const s = item.schedule;

  const what = s.planName ?? s.profileName;
  const where = s.placeName ?? 'This place';
  const hours = occurrenceHours(item);
  const tag = item.running ? 'Running now' : s.enabled ? 'Active' : 'Paused';

  return (
    <Card
      active={item.running}
      style={item.running ? { borderColor: c.play } : undefined}
    >
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.hours}>{hours}</Text>
          <Text style={styles.line} numberOfLines={1}>
            {where}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {what} · {outputLabel}
          </Text>
          {s.trigger === 'time' ? null : (
            <Text style={styles.meta} numberOfLines={1}>
              {TRIGGER_LABEL[s.trigger]}
              {s.offsetMinutes === 0 ? '' : `, ${offsetWords(s.offsetMinutes)}`}
            </Text>
          )}
        </View>
        <View style={styles.rowRight}>
          <StatusPill label={tag} tone={item.running ? 'running' : s.enabled ? 'scheduled' : 'idle'} />
          <Switch
            value={s.enabled}
            onValueChange={onToggle}
            trackColor={{ false: c.border, true: c.accent }}
            thumbColor={c.bg}
            ios_backgroundColor={c.border}
            accessibilityLabel={`${describeSchedule(s)}. ${s.enabled ? 'On' : 'Off'}`}
          />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerDays} numberOfLines={1}>
          {describeDays(s.days)}
        </Text>
        <View style={styles.grow} />
        <Touchable
          onPress={onChange}
          accessibilityLabel={`Change ${describeSchedule(s)}`}
          style={styles.footerAction}
        >
          <Text style={styles.footerActionText}>Change</Text>
        </Touchable>
        <Touchable
          onPress={onDelete}
          accessibilityLabel={`Delete ${describeSchedule(s)}`}
          style={styles.footerIcon}
        >
          <Trash2 size={icon.md} color={c.danger} strokeWidth={icon.stroke} />
        </Touchable>
      </View>
    </Card>
  );
}

/** "30 minutes before", "1 hour after". */
export function offsetWords(minutes: number): string {
  const size = Math.abs(minutes);
  const when = minutes < 0 ? 'before' : 'after';
  if (size < 60) return `${size} minutes ${when}`;
  const hours = size / 60;
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${rounded} ${hours === 1 ? 'hour' : 'hours'} ${when}`;
}

/* ------------------------------------------------------------------ */

function ScheduleForm({
  open,
  schedule,
  onClose,
}: {
  open: boolean;
  schedule: Schedule | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(sheet);
  const { dark } = useTheme();
  const ent = useEntitlement();
  const toast = useToast();
  const upsert = useSchedules((s) => s.upsert);
  const sounds = useProfiles((s) => s.all)();
  const homeSoundId = useSession((s) => s.profileId);
  const place = usePlacesHome((s) => s.active());
  const plans = useProtectionPlans((s) => s.plans);
  const savePlan = useProtectionPlans((s) => s.upsert);
  const askLocation = useLocation((s) => s.ask);
  const coords = useLocation((s) => s.coords);

  const placePlans = useMemo(
    () => (place ? plans.filter((p) => p.placeId === place.id) : []),
    [place, plans],
  );

  const [days, setDays] = useState<number[]>(schedule?.days ?? [1, 2, 3, 4, 5]);
  const [startMinutes, setStartMinutes] = useState(schedule?.startMinutes ?? 6 * 60);
  const [endMinutes, setEndMinutes] = useState(schedule?.endMinutes ?? 8 * 60);
  const [trigger, setTrigger] = useState<ScheduleTrigger>(schedule?.trigger ?? 'time');
  const [offset, setOffset] = useState(schedule?.offsetMinutes ?? 0);
  const [soundId, setSoundId] = useState(schedule?.profileId ?? homeSoundId);
  const [planId, setPlanId] = useState<string | null>(schedule?.planId ?? null);
  const [executor, setExecutor] = useState<Executor>(schedule?.executor ?? 'reminder');
  const [picking, setPicking] = useState<'start' | 'end' | 'quietFrom' | 'quietTo' | null>(null);
  const [saving, setSaving] = useState(false);

  const plan = placePlans.find((p) => p.id === planId) ?? null;
  const [quietFrom, setQuietFrom] = useState<number | null>(null);
  const [quietTo, setQuietTo] = useState<number | null>(null);

  // reload the form whenever a different schedule is opened
  const key = `${schedule?.id ?? 'new'}:${open}`;
  useEffect(() => {
    if (!open) return;
    setDays(schedule?.days ?? [1, 2, 3, 4, 5]);
    setStartMinutes(schedule?.startMinutes ?? 6 * 60);
    setEndMinutes(schedule?.endMinutes ?? 8 * 60);
    setTrigger(schedule?.trigger ?? 'time');
    setOffset(schedule?.offsetMinutes ?? 0);
    setSoundId(schedule?.profileId ?? homeSoundId);
    setPlanId(schedule?.planId ?? placePlans[0]?.id ?? null);
    setExecutor(schedule?.executor ?? 'reminder');
    setPicking(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Quiet hours belong to the plan, not to one run of it, so the fields here
  // read and write the plan the run is about to play.
  useEffect(() => {
    setQuietFrom(parseClock(plan?.quietStart ?? null));
    setQuietTo(parseClock(plan?.quietEnd ?? null));
  }, [plan?.id, plan?.quietStart, plan?.quietEnd]);

  const sound = sounds.find((p) => p.id === soundId) ?? sounds[0];
  const length = runLength({
    id: 'draft',
    days,
    startMinutes,
    endMinutes,
    enabled: true,
    trigger,
    offsetMinutes: offset,
  });

  const toggleDay = useCallback((d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }, []);

  const pickTrigger = useCallback(
    async (next: ScheduleTrigger) => {
      setTrigger(next);
      // The sun is in a different place in Seattle and San Diego. Ask once,
      // and carry on with the plain fallback times if the answer is no.
      if (next !== 'time' && !coords) await askLocation();
    },
    [askLocation, coords],
  );

  const pickWhoRuns = useCallback(
    (next: Executor) => {
      if (next === 'device' && !ent.guard('schedules.device')) return;
      setExecutor(next);
    },
    [ent],
  );

  const setLength = useCallback(
    (minutes: number) => {
      const held = Math.max(15, Math.min(12 * 60, minutes));
      setEndMinutes((startMinutes + held) % 1440);
    },
    [startMinutes],
  );

  const save = useCallback(async () => {
    if (days.length === 0) {
      toast.show('Pick at least one day.', 'danger');
      return;
    }
    setSaving(true);
    try {
      if (plan) {
        savePlan({
          ...plan,
          quietStart: quietFrom === null ? null : toClock(quietFrom),
          quietEnd: quietTo === null ? null : toClock(quietTo),
        });
      }

      await upsert({
        id: schedule?.id,
        name: `${describeDays(days)}, ${plan?.name ?? sound.name}`,
        profileId: sound.id,
        profileName: sound.name,
        days,
        startMinutes,
        endMinutes,
        trigger,
        offsetMinutes: trigger === 'time' ? 0 : offset,
        placeId: place?.id ?? null,
        placeName: place?.name ?? null,
        planId: plan?.id ?? null,
        planName: plan?.name ?? null,
        executor,
        zoneId: null,
        deviceId: null,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(executor === 'reminder' ? 'Your phone will remind you.' : 'Saved.', 'success');
      onClose();
    } finally {
      setSaving(false);
    }
  }, [
    days,
    endMinutes,
    executor,
    offset,
    onClose,
    place,
    plan,
    quietFrom,
    quietTo,
    savePlan,
    schedule?.id,
    sound,
    startMinutes,
    toast,
    trigger,
    upsert,
  ]);

  const pickerDate = useMemo(() => {
    const d = new Date();
    const mins =
      picking === 'end'
        ? endMinutes
        : picking === 'quietFrom'
          ? (quietFrom ?? 22 * 60)
          : picking === 'quietTo'
            ? (quietTo ?? 7 * 60)
            : startMinutes;
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d;
  }, [endMinutes, picking, quietFrom, quietTo, startMinutes]);

  const takePicked = useCallback(
    (mins: number) => {
      if (picking === 'start') setStartMinutes(mins);
      if (picking === 'end') setEndMinutes(mins);
      if (picking === 'quietFrom') setQuietFrom(mins);
      if (picking === 'quietTo') setQuietTo(mins);
    },
    [picking],
  );

  return (
    <Sheet
      open={open}
      title={schedule ? 'Change this schedule' : 'Add a schedule'}
      onClose={onClose}
      footer={
        <Button label={schedule ? 'Save' : 'Add it'} size="lg" loading={saving} onPress={save} />
      }
    >
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Starts</Text>
        <Segmented
          value={trigger}
          onChange={(t) => void pickTrigger(t)}
          accessibilityLabel="What starts it"
          options={[
            { value: 'time', label: TRIGGER_LABEL.time },
            { value: 'sunrise', label: TRIGGER_LABEL.sunrise },
            { value: 'sunset', label: TRIGGER_LABEL.sunset },
          ]}
        />
      </View>

      {trigger === 'time' ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Times</Text>
          <View style={styles.timeRow}>
            <TimeButton
              label="Starts"
              value={formatMinutes(startMinutes)}
              open={picking === 'start'}
              onPress={() => setPicking(picking === 'start' ? null : 'start')}
            />
            <TimeButton
              label="Ends"
              value={formatMinutes(endMinutes)}
              open={picking === 'end'}
              onPress={() => setPicking(picking === 'end' ? null : 'end')}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>How far from {trigger}</Text>
            <Stepper
              label={offset === 0 ? `Right at ${trigger}` : offsetWords(offset)}
              onLess={() => setOffset(Math.max(-OFFSET_LIMIT, offset - OFFSET_STEP))}
              onMore={() => setOffset(Math.min(OFFSET_LIMIT, offset + OFFSET_STEP))}
            />
            {coords ? null : <Text style={styles.hint}>{ESTIMATED_NOTE}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Runs for</Text>
            <Stepper
              label={length < 60 ? `${length} minutes` : `${(length / 60).toFixed(1)} hours`}
              onLess={() => setLength(length - OFFSET_STEP)}
              onMore={() => setLength(length + OFFSET_STEP)}
            />
          </View>
        </>
      )}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Days</Text>
        <View style={styles.dayRow}>
          {DAY_LABELS.map((label, i) => (
            <Touchable
              key={i}
              onPress={() => toggleDay(i)}
              haptic="selection"
              accessibilityLabel={DAY_NAMES[i]}
              accessibilityState={{ selected: days.includes(i) }}
              style={styles.dayPress}
            >
              <View style={[styles.day, days.includes(i) ? styles.daySelected : null]}>
                <Text style={[styles.dayText, days.includes(i) ? styles.dayTextSelected : null]}>
                  {label}
                </Text>
              </View>
            </Touchable>
          ))}
        </View>
      </View>

      {placePlans.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>What it plays</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRail}
          >
            {placePlans.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={p.id === planId}
                onPress={() => setPlanId(p.id)}
              />
            ))}
            <Chip label="One sound" selected={planId === null} onPress={() => setPlanId(null)} />
          </ScrollView>
        </View>
      ) : null}

      {plan ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Quiet hours</Text>
          <View style={styles.timeRow}>
            <TimeButton
              label="Quiet from"
              value={quietFrom === null ? 'Not set' : clockMinutes(quietFrom)}
              open={picking === 'quietFrom'}
              onPress={() => setPicking(picking === 'quietFrom' ? null : 'quietFrom')}
            />
            <TimeButton
              label="Quiet until"
              value={quietTo === null ? 'Not set' : clockMinutes(quietTo)}
              open={picking === 'quietTo'}
              onPress={() => setPicking(picking === 'quietTo' ? null : 'quietTo')}
            />
          </View>
          <View style={styles.quietRow}>
            <Text style={styles.quietHint}>
              {plan.name} stays silent between these two times, wherever it runs.
            </Text>
            {quietFrom !== null || quietTo !== null ? (
              <Touchable
                onPress={() => {
                  setQuietFrom(null);
                  setQuietTo(null);
                }}
                accessibilityLabel="Clear quiet hours"
                style={styles.footerAction}
              >
                <Text style={styles.footerActionText}>Clear</Text>
              </Touchable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Which sound</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRail}
          >
            {sounds.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={p.id === sound.id}
                locked={p.minPlan !== 'free' && !ent.can('profiles.all')}
                onPress={() => {
                  if (p.minPlan !== 'free' && !ent.guard('profiles.all')) return;
                  setSoundId(p.id);
                }}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {picking ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            themeVariant={dark ? 'dark' : 'light'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              if (Platform.OS !== 'ios') setPicking(null);
              if (!date) return;
              takePicked(date.getHours() * 60 + date.getMinutes());
            }}
          />
          {Platform.OS === 'ios' ? (
            <Button label="Done" variant="secondary" size="sm" onPress={() => setPicking(null)} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Who runs it</Text>
        <Segmented
          value={executor}
          onChange={pickWhoRuns}
          accessibilityLabel="Who runs it"
          options={[
            { value: 'reminder', label: 'This phone' },
            {
              value: 'device',
              label: 'Speaker mode',
              locked: !ent.can('schedules.device'),
            },
          ]}
        />
        <Text style={styles.hint}>
          {executor === 'reminder'
            ? 'This phone reminds me. A reminder shows up with a Play now button.'
            : 'This phone in Speaker mode runs it on its own, and a PigeonX speaker will too. Turn Speaker mode on in Settings.'}
        </Text>
      </View>
    </Sheet>
  );
}

function TimeButton({
  label,
  value,
  open,
  onPress,
}: {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(sheet);
  return (
    <Touchable
      onPress={onPress}
      haptic="selection"
      feel="offset"
      accessibilityLabel={`${label} at ${value}`}
      accessibilityState={{ expanded: open }}
      style={styles.grow}
    >
      <View style={[styles.timeButton, open ? styles.timeButtonOpen : null]}>
        <Text style={styles.timeLabel}>{label}</Text>
        <Text style={styles.timeValue}>{value}</Text>
      </View>
    </Touchable>
  );
}

/** Less on the left, more on the right, and the answer in the middle. */
function Stepper({
  label,
  onLess,
  onMore,
}: {
  label: string;
  onLess: () => void;
  onMore: () => void;
}) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  return (
    <View style={styles.stepper}>
      <Touchable
        onPress={onLess}
        haptic="selection"
        accessibilityLabel="Less"
        style={styles.stepPress}
      >
        <View style={styles.step}>
          <Minus size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
        </View>
      </Touchable>
      <Text style={styles.stepValue} numberOfLines={1}>
        {label}
      </Text>
      <Touchable
        onPress={onMore}
        haptic="selection"
        accessibilityLabel="More"
        style={styles.stepPress}
      >
        <View style={styles.step}>
          <Plus size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
        </View>
      </Touchable>
    </View>
  );
}

const sheet = themed((c, t) => ({
  /** the one line over the whole timeline */
  next: {
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: 0.4,
    color: c.ink,
    marginBottom: space.sm,
  },
  /** the list starts right under the title and runs under the dock */
  list: { flex: 1 },
  listContent: { gap: space.md },
  dayGroup: { gap: space.sm },
  estimate: { ...t.bodySmall, marginTop: space.sm },
  /** nothing to show, so the bird sits in the middle of what is left */
  emptyWrap: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rowText: { flex: 1, gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: space.sm },
  grow: { flex: 1 },
  hours: {
    fontFamily: font.mono.bold,
    fontSize: 15,
    letterSpacing: 0.2,
    color: c.ink,
  },
  line: { ...t.subheading },
  meta: { ...t.bodySmall },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm + 4,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  footerDays: { ...t.bodySmall },
  footerAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  footerIcon: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionText: { ...t.bodyStrong, fontSize: 15, color: c.link },
  clash: { marginBottom: space.sm },
  field: { gap: space.sm },
  fieldLabel: { ...t.overline },
  dayRow: { flexDirection: 'row' },
  dayPress: { flex: 1, minHeight: 48, marginLeft: -1 },
  day: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.ink,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: c.ink },
  dayText: {
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: c.text,
  },
  dayTextSelected: { color: c.inkOn },
  timeRow: { flexDirection: 'row', gap: space.sm },
  timeButton: {
    borderWidth: 1,
    borderColor: c.ink,
    backgroundColor: c.bg,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.sm + 4,
    gap: 2,
  },
  timeButtonOpen: { backgroundColor: c.surface },
  timeLabel: { ...t.overline },
  timeValue: {
    fontFamily: font.mono.bold,
    fontSize: 22,
    letterSpacing: -1,
    color: c.ink,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepPress: { minHeight: 0 },
  step: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: c.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.mono.bold,
    fontSize: 15,
    letterSpacing: 0.2,
    color: c.ink,
  },
  quietRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chipRail: { gap: space.sm, paddingRight: space.md },
  hint: { ...t.bodySmall },
  quietHint: { ...t.bodySmall, flex: 1 },
  pickerWrap: { gap: space.sm },
}));
