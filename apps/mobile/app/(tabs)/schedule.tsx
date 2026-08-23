import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarClock, Plus, Trash2 } from 'lucide-react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  Segmented,
  Sheet,
  Touchable,
  useToast,
} from '../../src/components';
import { overlappingPairs } from '../../src/core/scheduler';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useProfiles } from '../../src/state/useProfiles';
import {
  DAY_LABELS,
  DAY_NAMES,
  describeDays,
  describeSchedule,
  EXECUTOR_LABEL,
  formatMinutes,
  useSchedules,
  type Executor,
  type Schedule,
} from '../../src/state/useSchedules';
import { useSession } from '../../src/state/useSession';
import { color, font, space } from '../../src/theme/tokens';

export default function ScheduleScreen() {
  const ent = useEntitlement();
  const schedules = useSchedules((s) => s.schedules);
  const clashes = useMemo(() => overlappingPairs(schedules), [schedules]);
  const toggle = useSchedules((s) => s.toggle);
  const remove = useSchedules((s) => s.remove);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = useCallback(() => {
    if (!ent.guard('schedules.reminder')) return;
    setEditing(null);
    setOpen(true);
  }, [ent]);

  return (
    <Screen
      title="Schedule"
      subtitle="Pick the days and times you want the sound to play."
      scroll={false}
    >
      {schedules.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<CalendarClock size={20} color={color.fgMuted} strokeWidth={1.75} />}
            title="Nothing set yet"
            body="Add a schedule. Your phone reminds you, or a PigeonX speaker starts it for you."
            actionLabel="Add a schedule"
            onAction={openNew}
          />
        </Card>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {schedules.map((s) => (
            <Card key={s.id}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.line}>{describeSchedule(s)}</Text>
                  <Text style={styles.meta}>{EXECUTOR_LABEL[s.executor]}</Text>
                </View>
                <Switch
                  value={s.enabled}
                  onValueChange={() => void toggle(s.id)}
                  trackColor={{ false: color.border, true: color.accent }}
                  thumbColor={color.background}
                  ios_backgroundColor={color.border}
                  accessibilityLabel={`${describeSchedule(s)}. ${s.enabled ? 'On' : 'Off'}`}
                />
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.state}>{s.enabled ? 'On' : 'Off'}</Text>
                <View style={styles.grow} />
                <Touchable
                  onPress={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                  accessibilityLabel={`Change ${describeSchedule(s)}`}
                  style={styles.footerAction}
                >
                  <Text style={styles.footerActionText}>Change</Text>
                </Touchable>
                <Touchable
                  onPress={() => void remove(s.id)}
                  accessibilityLabel={`Delete ${describeSchedule(s)}`}
                  style={styles.footerAction}
                >
                  <Trash2 size={16} color={color.danger} strokeWidth={1.75} />
                </Touchable>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {clashes.length > 0 ? (
        <Text style={styles.clash}>
          Two of your times cover the same minutes. The one that starts later takes over.
        </Text>
      ) : null}

      <View style={styles.spacer} />

      <Button
        label="Add a schedule"
        size="lg"
        onPress={openNew}
        icon={<Plus size={16} color={color.onAccent} strokeWidth={1.75} />}
      />

      <ScheduleForm open={open} schedule={editing} onClose={() => setOpen(false)} />
    </Screen>
  );
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
  const ent = useEntitlement();
  const toast = useToast();
  const upsert = useSchedules((s) => s.upsert);
  const sounds = useProfiles((s) => s.all)();
  const homeSoundId = useSession((s) => s.profileId);

  const [days, setDays] = useState<number[]>(schedule?.days ?? [1, 2, 3, 4, 5]);
  const [startMinutes, setStartMinutes] = useState(schedule?.startMinutes ?? 6 * 60);
  const [endMinutes, setEndMinutes] = useState(schedule?.endMinutes ?? 8 * 60);
  const [soundId, setSoundId] = useState(schedule?.profileId ?? homeSoundId);
  const [executor, setExecutor] = useState<Executor>(schedule?.executor ?? 'reminder');
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);

  // reload the form whenever a different schedule is opened
  const key = `${schedule?.id ?? 'new'}:${open}`;
  useEffect(() => {
    if (!open) return;
    setDays(schedule?.days ?? [1, 2, 3, 4, 5]);
    setStartMinutes(schedule?.startMinutes ?? 6 * 60);
    setEndMinutes(schedule?.endMinutes ?? 8 * 60);
    setSoundId(schedule?.profileId ?? homeSoundId);
    setExecutor(schedule?.executor ?? 'reminder');
    setPicking(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const sound = sounds.find((p) => p.id === soundId) ?? sounds[0];

  const toggleDay = useCallback((d: number) => {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }, []);

  const pickWhoRuns = useCallback(
    (next: Executor) => {
      if (next === 'device' && !ent.guard('schedules.device')) return;
      setExecutor(next);
    },
    [ent],
  );

  const save = useCallback(async () => {
    if (days.length === 0) {
      toast.show('Pick at least one day.', 'danger');
      return;
    }
    setSaving(true);
    try {
      await upsert({
        id: schedule?.id,
        name: `${describeDays(days)}, ${sound.name}`,
        profileId: sound.id,
        profileName: sound.name,
        days,
        startMinutes,
        endMinutes,
        executor,
        zoneId: null,
        deviceId: null,
      });
      toast.show(executor === 'reminder' ? 'Your phone will remind you.' : 'Saved.', 'success');
      onClose();
    } finally {
      setSaving(false);
    }
  }, [days, endMinutes, executor, onClose, schedule?.id, sound, startMinutes, toast, upsert]);

  const pickerDate = useMemo(() => {
    const d = new Date();
    const mins = picking === 'end' ? endMinutes : startMinutes;
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d;
  }, [endMinutes, picking, startMinutes]);

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

      <View style={styles.field}>
        <View style={styles.timeRow}>
          <TimeButton
            label="Starts"
            value={formatMinutes(startMinutes)}
            onPress={() => setPicking(picking === 'start' ? null : 'start')}
          />
          <TimeButton
            label="Ends"
            value={formatMinutes(endMinutes)}
            onPress={() => setPicking(picking === 'end' ? null : 'end')}
          />
        </View>
        {picking ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={pickerDate}
              mode="time"
              themeVariant="light"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS !== 'ios') setPicking(null);
                if (!date) return;
                const mins = date.getHours() * 60 + date.getMinutes();
                if (picking === 'start') setStartMinutes(mins);
                else setEndMinutes(mins);
              }}
            />
            {Platform.OS === 'ios' ? (
              <Button label="Done" variant="secondary" size="sm" onPress={() => setPicking(null)} />
            ) : null}
          </View>
        ) : null}
      </View>

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
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Touchable onPress={onPress} accessibilityLabel={`${label} at ${value}`} style={styles.grow}>
      <View style={styles.timeButton}>
        <Text style={styles.timeLabel}>{label}</Text>
        <Text style={styles.timeValue}>{value}</Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0 },
  listContent: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 4 },
  grow: { flex: 1 },
  line: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    color: color.ink,
  },
  meta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 17,
    color: color.fgMuted,
  },
  state: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm + 4,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  footerAction: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  footerActionText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.accent,
  },
  spacer: { flex: 1, minHeight: space.md },
  clash: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.warning,
    marginTop: space.sm,
  },
  field: { gap: space.sm },
  fieldLabel: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  dayRow: { flexDirection: 'row' },
  dayPress: { flex: 1, minHeight: 44, marginLeft: -1 },
  day: {
    flex: 1,
    minHeight: 44,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { borderColor: color.ink, backgroundColor: color.ink },
  dayText: {
    fontFamily: font.mono.medium,
    fontSize: 12,
    letterSpacing: 0.5,
    color: color.fgMuted,
  },
  dayTextSelected: { color: color.onAccent },
  timeRow: { flexDirection: 'row', gap: space.sm },
  timeButton: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm + 4,
    gap: 2,
  },
  timeLabel: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  timeValue: {
    fontFamily: font.mono.medium,
    fontSize: 17,
    letterSpacing: -0.5,
    color: color.ink,
  },
  chipRail: { gap: space.xs + 2 },
  hint: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
  pickerWrap: { gap: space.sm },
});
