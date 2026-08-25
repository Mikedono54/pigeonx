import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';

import {
  Button,
  ConfirmSheet,
  ListRow,
  Screen,
  SectionHeader,
  Touchable,
  useToast,
} from '../src/components';
import {
  AREA_SIZE_LABELS,
  BIRD_TARGET_LABELS,
  PLACE_KIND_LABELS,
} from '../src/core/personalization';
import { useEntitlement } from '../src/hooks/useEntitlement';
import { usePlacesHome } from '../src/state/usePlacesHome';
import { useProtectionPlans } from '../src/state/useProtectionPlans';
import { icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

/**
 * Every place this person looks after.
 *
 * Tapping one runs the same eight questions that made it, with the answers
 * already filled in, because a place is only ever those answers. Nothing here
 * is a second way of editing them.
 */
export default function MyPlaces() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const ent = useEntitlement();
  const toast = useToast();

  const places = usePlacesHome((s) => s.places);
  const activeId = usePlacesHome((s) => s.activeId);
  const canAdd = usePlacesHome((s) => s.canAdd);
  const remove = usePlacesHome((s) => s.remove);
  const plans = useProtectionPlans((s) => s.plans);
  const activeByPlace = useProtectionPlans((s) => s.activeByPlace);

  const [removing, setRemoving] = useState<string | null>(null);
  const doomed = places.find((p) => p.id === removing);

  const add = useCallback(() => {
    if (!canAdd()) {
      ent.guard('places.multiple');
      return;
    }
    router.push('/place-setup');
  }, [canAdd, ent]);

  const confirmRemove = useCallback(() => {
    if (!doomed) return;
    // The plans that looked after it go with it. Nothing else refers to them.
    for (const plan of plans.filter((p) => p.placeId === doomed.id)) {
      useProtectionPlans.getState().remove(plan.id);
    }
    remove(doomed.id);
    setRemoving(null);
    toast.show(`${doomed.name} is gone.`);
  }, [doomed, plans, remove, toast]);

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
          </Touchable>
          <Text style={styles.headTitle}>My places</Text>
        </View>
      }
    >
      <SectionHeader title={canAdd() ? 'Tap one to change your answers' : 'Free keeps one place'} />

      <View style={styles.list}>
        {places.map((p) => {
          const planId = activeByPlace[p.id];
          const plan = planId ? plans.find((x) => x.id === planId) : undefined;
          const size = p.areaSize ? AREA_SIZE_LABELS[p.areaSize] : null;

          return (
            <ListRow
              key={p.id}
              title={p.name}
              meta={[PLACE_KIND_LABELS[p.kind], BIRD_TARGET_LABELS[p.target], size]
                .filter(Boolean)
                .join('. ')}
              onPress={() => router.push({ pathname: '/place-setup', params: { placeId: p.id } })}
              right={
                places.length > 1 ? (
                  <Touchable
                    onPress={() => setRemoving(p.id)}
                    accessibilityLabel={`Delete ${p.name}`}
                    style={styles.trash}
                  >
                    <Trash2 size={icon.md} color={c.danger} strokeWidth={icon.stroke} />
                  </Touchable>
                ) : undefined
              }
            >
              <Text style={styles.plan} numberOfLines={1}>
                {plan ? plan.name : 'No protection plan yet'}
                {p.id === activeId ? '. Showing on Home' : ''}
              </Text>
            </ListRow>
          );
        })}
      </View>

      <View style={styles.add}>
        <Button
          label="Add a place"
          variant="secondary"
          size="lg"
          icon={Plus}
          onPress={add}
          accessibilityHint={canAdd() ? undefined : 'Pro keeps more than one place'}
        />
      </View>

      <ConfirmSheet
        open={doomed !== undefined}
        title={`Delete ${doomed?.name ?? 'this place'}`}
        body="The place and its protection plans go. What already played stays in your history."
        confirmLabel="Yes, delete it"
        cancelLabel="Keep it"
        danger
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </Screen>
  );
}

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headTitle: { ...t.title, flex: 1 },
  list: { borderWidth: 1, borderColor: c.border },
  plan: { ...t.caption, marginTop: 2 },
  trash: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  add: { marginTop: space.md },
}));
