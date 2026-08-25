import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Check, ChevronLeft, Trash2 } from 'lucide-react-native';

import {
  AudibleChip,
  BlockButton,
  Button,
  Chip,
  ConfirmSheet,
  EmptyState,
  ListRow,
  Screen,
  SectionHeader,
  Sheet,
  TextField,
  Touchable,
  useToast,
} from '../src/components';
import {
  AUDIBLE_LABEL,
  SYSTEM_PROFILES,
  audibleState,
  findSystemProfile,
  pitchLabel,
} from '../src/core/profiles';
import { usePlacesHome } from '../src/state/usePlacesHome';
import {
  describePlan,
  useProtectionPlans,
  type ProtectionPlan,
} from '../src/state/useProtectionPlans';
import { useSession } from '../src/state/useSession';
import { icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

/** The session lengths a plan can hold, in minutes. */
const LENGTHS = [5, 15, 30, 60];

/**
 * Every protection plan, under the place it looks after.
 *
 * A plan is four decisions: what it is called, which sounds it rotates, whether
 * it shuffles them, and how long a session runs. Editing it never changes what
 * a plan claims to do, because a plan does not claim anything.
 */
export default function Plans() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const toast = useToast();

  const places = usePlacesHome((s) => s.places);
  const plans = useProtectionPlans((s) => s.plans);
  const activeByPlace = useProtectionPlans((s) => s.activeByPlace);
  const setActive = useProtectionPlans((s) => s.setActive);
  const removePlan = useProtectionPlans((s) => s.remove);
  const usePlanAgain = useSession((s) => s.usePlanAgain);

  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const doomed = plans.find((p) => p.id === removing);
  const open = plans.find((p) => p.id === editing);

  const grouped = useMemo(
    () => places.map((place) => ({ place, plans: plans.filter((p) => p.placeId === place.id) })),
    [places, plans],
  );

  const makeActive = useCallback(
    (plan: ProtectionPlan) => {
      setActive(plan.placeId, plan.id);
      usePlanAgain();
      toast.show(`${plan.name} is looking after this place.`);
    },
    [setActive, toast, usePlanAgain],
  );

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
          </Touchable>
          <Text style={styles.headTitle}>Saved plans</Text>
        </View>
      }
    >
      {plans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          body="Answer the questions about a place and it offers you one."
          actionLabel="Set up a place"
          onAction={() => router.push('/place-setup')}
        />
      ) : (
        <View style={styles.groups}>
          {grouped.map(({ place, plans: mine }) =>
            mine.length === 0 ? null : (
              <View key={place.id}>
                <SectionHeader title={place.name} />
                <View style={styles.list}>
                  {mine.map((plan) => (
                    <ListRow
                      key={plan.id}
                      title={plan.name}
                      meta={describePlan(plan)}
                      onPress={() => setEditing(plan.id)}
                      right={
                        <View style={styles.rowRight}>
                          {activeByPlace[place.id] === plan.id ? (
                            <Check size={icon.md} color={c.accent} strokeWidth={icon.stroke} />
                          ) : null}
                          <Touchable
                            onPress={() => setRemoving(plan.id)}
                            accessibilityLabel={`Delete ${plan.name}`}
                            style={styles.trash}
                          >
                            <Trash2 size={icon.md} color={c.danger} strokeWidth={icon.stroke} />
                          </Touchable>
                        </View>
                      }
                    />
                  ))}
                </View>
              </View>
            ),
          )}
        </View>
      )}

      {open ? (
        <PlanEditor
          plan={open}
          isActive={activeByPlace[open.placeId] === open.id}
          onUse={() => makeActive(open)}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <ConfirmSheet
        open={doomed !== undefined}
        title={`Delete ${doomed?.name ?? 'this plan'}`}
        body="The plan goes. What already played stays in your history."
        confirmLabel="Yes, delete it"
        cancelLabel="Keep it"
        danger
        onConfirm={() => {
          if (doomed) removePlan(doomed.id);
          setRemoving(null);
        }}
        onClose={() => setRemoving(null)}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

function PlanEditor({
  plan,
  isActive,
  onUse,
  onClose,
}: {
  plan: ProtectionPlan;
  isActive: boolean;
  onUse: () => void;
  onClose: () => void;
}) {
  const styles = useThemedStyles(sheet);
  const upsert = useProtectionPlans((s) => s.upsert);
  const output = useSession((s) => s.output);

  const [name, setName] = useState(plan.name);
  const [soundIds, setSoundIds] = useState(plan.soundIds);
  const [randomize, setRandomize] = useState(plan.randomizeOrder);
  const [minutes, setMinutes] = useState(plan.sessionMinutes);

  const toggle = useCallback((id: string) => {
    setSoundIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }, []);

  const save = useCallback(() => {
    upsert({
      ...plan,
      id: plan.id,
      name: name.trim() || plan.name,
      soundIds,
      randomizeOrder: randomize,
      sessionMinutes: minutes,
    });
    onClose();
  }, [minutes, name, onClose, plan, randomize, soundIds, upsert]);

  return (
    <Sheet
      open
      title={plan.name}
      onClose={onClose}
      footer={
        <View style={styles.footer}>
          <BlockButton label="Save" onPress={save} />
          {isActive ? null : (
            <Button label="Use this plan for this place" variant="ghost" onPress={onUse} />
          )}
        </View>
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
          <Chip label="Shuffle each session" selected={randomize} onPress={() => setRandomize(true)} />
          <Chip label="Always this order" selected={!randomize} onPress={() => setRandomize(false)} />
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

      {soundIds.length > 0 ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Who will hear it</Text>
          <View style={styles.tags}>
            {soundIds.map((id) => {
              const p = findSystemProfile(id);
              if (!p) return null;
              return <AudibleChip key={id} state={audibleState(p, output)} />;
            })}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headTitle: { ...t.title, flex: 1 },
  groups: { gap: space.lg },
  list: { borderWidth: 1, borderColor: c.border },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  field: { gap: space.sm },
  fieldLabel: { ...t.overline },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { ...t.caption },
  footer: { gap: space.sm },
}));
