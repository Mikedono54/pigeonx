import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarClock, Plus, Trash2, X } from 'lucide-react-native';

import {
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  Segmented,
  StatusPill,
  Touchable,
  useToast,
} from '../../src/components';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { useProfiles } from '../../src/state/useProfiles';
import {
  DAY_LABELS,
  describeDays,
  formatMinutes,
  useSchedules,
  type Executor,
  type Schedule,
} from '../../src/state/useSchedules';
import { useSession } from '../../src/state/useSession';
import { color, font, radius, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function SchedulesScreen() {
  const ent = useEntitlement();
  const schedules = useSchedules((s) => s.schedules);
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
      title="Schedules"
      subtitle="Dawn and dusk are when birds settle in. Put the start one tap away."
      bottomInset={90}
    >
      <View style={{ marginBottom: space.lg }}>
        <Banner
          tone="info"
          title="Phone schedules are reminders"
          body="iOS will not run background timers, so a phone schedule sends a notification with a Start now button. PigeonX hardware runs windows unattended."
        />
      </View>

      {schedules.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<CalendarClock size={24} color={color.fgMuted} strokeWidth={2} />}
            title="No schedules yet"
            body="Pick the days and time you want a run, choose a profile, and we will remind you."
            actionLabel="Create a schedule"
            onAction={openNew}
          />
        </Card>
      ) : (
        <>
          <SectionHeader title="Your schedules" />
          <View style={{ gap: space.sm }}>
            {schedules.map((s) => (
              <Card key={s.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={type.subheading}>{s.name}</Text>
                    <Text style={styles.meta}>
                      {describeDays(s.days)} · {formatMinutes(s.startMinutes)} –{' '}
                      {formatMinutes(s.endMinutes)}
                    </Text>
                    <Text style={styles.meta}>
                      {s.profileName} ·{' '}
                      {s.executor === 'device'
                        ? 'Runs on device'
                        : 'Reminder on this phone'}
                    </Text>
                  </View>
                  <Switch
                    value={s.enabled}
                    onValueChange={() => void toggle(s.id)}
                    trackColor={{ false: color.border, true: 'rgba(45,212,191,0.5)' }}
                    thumbColor={s.enabled ? color.teal : color.fgSubtle}
                    accessibilityLabel={`${s.name} enabled`}
                  />
                </View>
                <View style={styles.cardFooter}>
                  <StatusPill
                    label={s.enabled ? 'Active' : 'Paused'}
                    tone={s.enabled ? 'scheduled' : 'idle'}
                  />
                  <View style={{ flex: 1 }} />
                  <Touchable
                    onPress={() => {
                      setEditing(s);
                      setOpen(true);
                    }}
                    accessibilityLabel={`Edit ${s.name}`}
                    style={styles.footerAction}
                  >
                    <Text style={styles.footerActionText}>Edit</Text>
                  </Touchable>
                  <Touchable
                    onPress={() => void remove(s.id)}
                    accessibilityLabel={`Delete ${s.name}`}
                    style={styles.footerAction}
                  >
                    <Trash2 size={16} color={color.danger} strokeWidth={2.2} />
                  </Touchable>
                </View>
              </Card>
            ))}
          </View>

          <View style={{ marginTop: space.lg }}>
            <Button
              label="New schedule"
              variant="gradient"
              size="lg"
              onPress={openNew}
              icon={<Plus size={18} color={color.onAccent} strokeWidth={2.5} />}
            />
          </View>
        </>
      )}

      <ScheduleEditor
        open={open}
        schedule={editing}
        onClose={() => setOpen(false)}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

function ScheduleEditor({
  open,
  schedule,
  onClose,
}: {
  open: boolean;
  schedule: Schedule | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const ent = useEntitlement();
  const toast = useToast();
  const upsert = useSchedules((s) => s.upsert);
  const profiles = useProfiles((s) => s.all)();
  const sessionProfileId = useSession((s) => s.profileId);

  const [name, setName] = useState(schedule?.name ?? 'Dawn patrol');
  const [days, setDays] = useState<number[]>(schedule?.days ?? [1, 2, 3, 4, 5]);
  const [startMinutes, setStartMinutes] = useState(
    schedule?.startMinutes ?? 6 * 60
  );
  const [endMinutes, setEndMinutes] = useState(schedule?.endMinutes ?? 8 * 60);
  const [profileId, setProfileId] = useState(
    schedule?.profileId ?? sessionProfileId
  );
  const [executor, setExecutor] = useState<Executor>(
    schedule?.executor ?? 'reminder'
  );
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const [saving, setSaving] = useState(false);

  // reload the form whenever a different schedule is opened
  const key = `${schedule?.id ?? 'new'}:${open}`;
  useEffect(() => {
    if (!open) return;
    setName(schedule?.name ?? 'Dawn patrol');
    setDays(schedule?.days ?? [1, 2, 3, 4, 5]);
    setStartMinutes(schedule?.startMinutes ?? 6 * 60);
    setEndMinutes(schedule?.endMinutes ?? 8 * 60);
    setProfileId(schedule?.profileId ?? sessionProfileId);
    setExecutor(schedule?.executor ?? 'reminder');
    setPicking(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];

  const toggleDay = useCallback((d: number) => {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }, []);

  const pickExecutor = useCallback(
    (next: Executor) => {
      if (next === 'device' && !ent.guard('schedules.device')) return;
      setExecutor(next);
    },
    [ent]
  );

  const save = useCallback(async () => {
    if (days.length === 0) {
      toast.show('Pick at least one day', 'danger');
      return;
    }
    setSaving(true);
    try {
      await upsert({
        id: schedule?.id,
        name: name.trim() || 'Schedule',
        profileId: profile.id,
        profileName: profile.name,
        days,
        startMinutes,
        endMinutes,
        executor,
        zoneId: null,
        deviceId: null,
      });
      toast.show(
        executor === 'reminder' ? 'Reminder scheduled' : 'Schedule saved',
        'success'
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }, [
    days,
    endMinutes,
    executor,
    name,
    onClose,
    profile,
    schedule?.id,
    startMinutes,
    toast,
    upsert,
  ]);

  const pickerDate = useMemo(() => {
    const d = new Date();
    const mins = picking === 'end' ? endMinutes : startMinutes;
    d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return d;
  }, [endMinutes, picking, startMinutes]);

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.sheetHead}>
            <Text style={type.heading}>
              {schedule ? 'Edit schedule' : 'New schedule'}
            </Text>
            <Touchable onPress={onClose} accessibilityLabel="Close" style={styles.close}>
              <X size={20} color={color.fgMuted} strokeWidth={2.2} />
            </Touchable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: space.lg, paddingBottom: space.md }}
          >
            <View style={{ gap: space.sm }}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Dawn patrol"
                placeholderTextColor={color.fgSubtle}
                style={styles.input}
                accessibilityLabel="Schedule name"
              />
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={styles.fieldLabel}>Days</Text>
              <View style={styles.dayRow}>
                {DAY_LABELS.map((label, i) => (
                  <Touchable
                    key={i}
                    onPress={() => toggleDay(i)}
                    haptic="selection"
                    accessibilityLabel={`Day ${i + 1}`}
                    accessibilityState={{ selected: days.includes(i) }}
                    style={styles.dayPress}
                  >
                    <View
                      style={[styles.day, days.includes(i) && styles.daySelected]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          days.includes(i) && styles.dayTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  </Touchable>
                ))}
              </View>
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={styles.fieldLabel}>Window</Text>
              <View style={styles.timeRow}>
                <TimeButton
                  label="Start"
                  value={formatMinutes(startMinutes)}
                  onPress={() => setPicking(picking === 'start' ? null : 'start')}
                />
                <TimeButton
                  label="End"
                  value={formatMinutes(endMinutes)}
                  onPress={() => setPicking(picking === 'end' ? null : 'end')}
                />
              </View>
              {picking ? (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={pickerDate}
                    mode="time"
                    themeVariant="dark"
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
                    <Button
                      label="Done"
                      variant="outline"
                      size="sm"
                      onPress={() => setPicking(null)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={styles.fieldLabel}>Profile</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: space.sm }}
              >
                {profiles.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={p.id === profile.id}
                    locked={p.minPlan !== 'free' && !ent.can('profiles.all')}
                    onPress={() => {
                      if (p.minPlan !== 'free' && !ent.guard('profiles.all')) return;
                      setProfileId(p.id);
                    }}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={styles.fieldLabel}>Who runs it</Text>
              <Segmented
                value={executor}
                onChange={pickExecutor}
                accessibilityLabel="Executor"
                options={[
                  { value: 'reminder', label: 'This phone' },
                  {
                    value: 'device',
                    label: 'Device',
                    locked: !ent.can('schedules.device'),
                  },
                ]}
              />
              <Text style={styles.hint}>
                {executor === 'reminder'
                  ? 'A notification arrives at the start time with a Start now button.'
                  : 'A paired device runs the whole window on its own — no phone needed.'}
              </Text>
            </View>
          </ScrollView>

          <Button
            label={schedule ? 'Save changes' : 'Create schedule'}
            variant="gradient"
            size="lg"
            loading={saving}
            onPress={save}
          />
        </View>
      </View>

    </Modal>
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
    <Touchable
      onPress={onPress}
      accessibilityLabel={`${label} time, ${value}`}
      style={{ flex: 1 }}
    >
      <View style={styles.timeButton}>
        <Text style={styles.timeLabel}>{label}</Text>
        <Text style={styles.timeValue}>{value}</Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
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
    fontFamily: font.body.semibold,
    fontSize: 13,
    color: color.accent,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(6,10,20,0.72)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    gap: space.md,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  close: { width: 44, alignItems: 'flex-end' },
  fieldLabel: {
    fontFamily: font.body.medium,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.fgSubtle,
  },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingHorizontal: space.md,
    color: color.fg,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayPress: { flex: 1, minHeight: 44 },
  day: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    borderColor: color.teal,
    backgroundColor: 'rgba(45,212,191,0.14)',
  },
  dayText: {
    fontFamily: font.body.semibold,
    fontSize: 13,
    color: color.fgMuted,
  },
  dayTextSelected: { color: color.fg },
  timeRow: { flexDirection: 'row', gap: space.sm },
  timeButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    gap: 2,
  },
  timeLabel: {
    fontFamily: font.body.regular,
    fontSize: 11,
    color: color.fgSubtle,
  },
  timeValue: {
    fontFamily: font.mono.medium,
    fontSize: 17,
    color: color.fg,
  },
  hint: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 19,
    color: color.fgMuted,
  },
  pickerWrap: { gap: space.sm },
});
