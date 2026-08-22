import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Building2, LayoutGrid, Plus, Speaker, Trash2 } from 'lucide-react-native';

import {
  Button,
  Card,
  EmptyState,
  Screen,
  Sheet,
  Touchable,
  useToast,
} from '../../src/components';
import { useAccount } from '../../src/state/useAccount';
import { usePlaces, type Place } from '../../src/state/usePlaces';
import { color, font, space } from '../../src/theme/tokens';
import { type } from '../../src/theme/typography';

export default function PlacesScreen() {
  const toast = useToast();
  const places = usePlaces((s) => s.places);
  const addPlace = usePlaces((s) => s.addPlace);
  const removePlace = usePlaces((s) => s.removePlace);
  const addArea = usePlaces((s) => s.addArea);
  const removeArea = usePlaces((s) => s.removeArea);
  const addSpeaker = usePlaces((s) => s.addSpeaker);
  const dropSpeaker = usePlaces((s) => s.removeSpeaker);
  const speakerCount = usePlaces((s) => s.speakerCount);

  const speakers = useAccount((s) => s.devices);
  const addTestSpeaker = useAccount((s) => s.addSimulatedDevice);
  const removeDevice = useAccount((s) => s.removeDevice);

  const [asking, setAsking] = useState<
    { kind: 'place' } | { kind: 'area'; placeId: string } | null
  >(null);

  const submitName = useCallback(
    (name: string) => {
      if (!asking) return;
      if (asking.kind === 'place') {
        addPlace(name);
        toast.show(`${name} added.`, 'success');
      } else {
        addArea(asking.placeId, name);
        toast.show(`${name} added.`, 'success');
      }
      setAsking(null);
    },
    [addArea, addPlace, asking, toast]
  );

  const onAddSpeaker = useCallback(() => {
    toast.show('PigeonX speakers are not out yet. Add a test speaker for now.');
  }, [toast]);

  const onAddTestSpeaker = useCallback(
    (placeId: string, areaId: string) => {
      const d = addTestSpeaker();
      addSpeaker(placeId, areaId, d.id);
      toast.show(`${d.name} added.`, 'success');
    },
    [addSpeaker, addTestSpeaker, toast]
  );

  const onRemoveSpeaker = useCallback(
    (speakerId: string) => {
      dropSpeaker(speakerId);
      removeDevice(speakerId);
    },
    [dropSpeaker, removeDevice]
  );

  const speakerName = useCallback(
    (id: string) => speakers.find((s) => s.id === id)?.name ?? 'Speaker',
    [speakers]
  );

  return (
    <Screen
      title="Places"
      subtitle="A place is a building. An area is one part of it."
      scroll={false}
    >
      {places.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={<Building2 size={20} color={color.fgMuted} strokeWidth={1.75} />}
            title="No places yet"
            body="Add a place. Then add the areas inside it, like a roof or a patio."
            actionLabel="Add a place"
            onAction={() => setAsking({ kind: 'place' })}
          />
        </Card>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {places.map((place: Place) => (
            <Card key={place.id}>
              <View style={styles.placeHead}>
                <Building2 size={20} color={color.ink} strokeWidth={1.75} />
                <View style={styles.grow}>
                  <Text style={type.subheading} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.meta}>
                    {place.areas.length} area
                    {place.areas.length === 1 ? '' : 's'},{' '}
                    {speakerCount(place)} speaker
                    {speakerCount(place) === 1 ? '' : 's'}
                  </Text>
                </View>
                <Touchable
                  onPress={() => removePlace(place.id)}
                  accessibilityLabel={`Delete ${place.name}`}
                  style={styles.iconButton}
                >
                  <Trash2 size={18} color={color.danger} strokeWidth={1.75} />
                </Touchable>
              </View>

              {place.areas.map((area) => (
                <View key={area.id} style={styles.area}>
                  <View style={styles.areaHead}>
                    <LayoutGrid
                      size={16}
                      color={color.fgMuted}
                      strokeWidth={1.75}
                    />
                    <Text style={styles.areaName} numberOfLines={1}>
                      {area.name}
                    </Text>
                    <Touchable
                      onPress={() => removeArea(place.id, area.id)}
                      accessibilityLabel={`Delete ${area.name}`}
                      style={styles.iconButton}
                    >
                      <Trash2 size={16} color={color.danger} strokeWidth={1.75} />
                    </Touchable>
                  </View>

                  {area.speakerIds.map((id) => (
                    <View key={id} style={styles.speakerRow}>
                      <Speaker size={16} color={color.ink} strokeWidth={1.75} />
                      <Text style={styles.speakerName} numberOfLines={1}>
                        {speakerName(id)}
                      </Text>
                      <Touchable
                        onPress={() => onRemoveSpeaker(id)}
                        accessibilityLabel={`Remove ${speakerName(id)}`}
                        style={styles.iconButton}
                      >
                        <Trash2
                          size={16}
                          color={color.danger}
                          strokeWidth={1.75}
                        />
                      </Touchable>
                    </View>
                  ))}

                  <View style={styles.areaActions}>
                    <Button
                      label="Add a speaker"
                      variant="ghost"
                      size="sm"
                      full={false}
                      onPress={onAddSpeaker}
                    />
                    <Button
                      label="Add a test speaker"
                      variant="ghost"
                      size="sm"
                      full={false}
                      onPress={() => onAddTestSpeaker(place.id, area.id)}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.placeFooter}>
                <Button
                  label="Add an area"
                  variant="secondary"
                  size="sm"
                  onPress={() => setAsking({ kind: 'area', placeId: place.id })}
                  icon={<Plus size={14} color={color.ink} strokeWidth={1.75} />}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      <View style={styles.spacer} />

      <Button
        label="Add a place"
        size="lg"
        onPress={() => setAsking({ kind: 'place' })}
        icon={<Plus size={16} color={color.onAccent} strokeWidth={1.75} />}
      />

      <NameSheet
        open={asking !== null}
        kind={asking?.kind ?? 'place'}
        onClose={() => setAsking(null)}
        onSubmit={submitName}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

function NameSheet({
  open,
  kind,
  onClose,
  onSubmit,
}: {
  open: boolean;
  kind: 'place' | 'area';
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const title = kind === 'place' ? 'Add a place' : 'Add an area';
  const hint =
    kind === 'place'
      ? 'The name of the building. Like Main Street Hotel.'
      : 'The name of one part of it. Like Roof or Patio.';

  return (
    <Sheet
      open={open}
      title={title}
      onClose={() => {
        setName('');
        onClose();
      }}
      footer={
        <Button
          label={title}
          size="lg"
          disabled={name.trim().length === 0}
          onPress={() => {
            onSubmit(name.trim());
            setName('');
          }}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.hint}>{hint}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'place' ? 'Main Street Hotel' : 'Roof'}
          placeholderTextColor={color.fgSubtle}
          style={styles.input}
          accessibilityLabel="Name"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm, paddingBottom: space.sm },
  grow: { flex: 1, gap: 2 },
  placeHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  meta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 17,
    color: color.fgMuted,
  },
  area: {
    marginTop: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingTop: space.sm + 4,
    gap: space.sm,
  },
  areaHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  areaName: {
    flex: 1,
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.md,
  },
  speakerName: {
    flex: 1,
    fontFamily: font.body.regular,
    fontSize: 14,
    color: color.fg,
  },
  areaActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  placeFooter: { marginTop: space.md },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1, minHeight: space.md },
  field: { gap: space.sm },
  hint: {
    fontFamily: font.body.regular,
    fontSize: 14,
    lineHeight: 19,
    color: color.fgMuted,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.background,
    paddingHorizontal: space.sm + 4,
    color: color.ink,
    fontFamily: font.body.medium,
    fontSize: 16,
  },
});
