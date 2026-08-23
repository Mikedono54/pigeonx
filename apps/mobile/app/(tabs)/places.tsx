import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Building2,
  LayoutGrid,
  Pencil,
  Plus,
  Speaker,
  Trash2,
  Users,
} from 'lucide-react-native';

import {
  Banner,
  Button,
  Card,
  EmptyState,
  Screen,
  Sheet,
  StatusPill,
  TextField,
  Touchable,
  useToast,
} from '../../src/components';
import { liveLabel, liveTone, type Place } from '../../src/core/places';
import { watchLive } from '../../src/services/live';
import { useAccount } from '../../src/state/useAccount';
import { usePlaces } from '../../src/state/usePlaces';
import { useSession } from '../../src/state/useSession';
import { icon, space, themed, useTheme, useThemedStyles } from '../../src/theme';

type Asking =
  | { kind: 'place' }
  | { kind: 'area'; placeId: string }
  | { kind: 'speaker'; placeId: string; areaId: string }
  | { kind: 'rename-place'; placeId: string; current: string }
  | { kind: 'rename-area'; placeId: string; areaId: string; current: string };

export default function PlacesScreen() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const toast = useToast();
  const places = usePlaces((s) => s.places);
  const mode = usePlaces((s) => s.mode);
  const problem = usePlaces((s) => s.problem);
  const live = usePlaces((s) => s.live);
  const setLive = usePlaces((s) => s.setLive);
  const refresh = usePlaces((s) => s.refresh);
  const speakerCount = usePlaces((s) => s.speakerCount);

  const businessName = useAccount((s) => s.activeOrgName);
  const speakers = useAccount((s) => s.devices);

  const playingArea = useSession((s) => s.zoneId);
  const engineState = useSession((s) => s.engineState);
  const setArea = useSession((s) => s.setArea);

  const [asking, setAsking] = useState<Asking | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const placeIds = useMemo(() => places.map((p) => p.id), [places]);

  // Listen for a sound starting anywhere in the business.
  useEffect(() => {
    if (mode !== 'business' || placeIds.length === 0) return;
    return watchLive(placeIds, setLive);
  }, [mode, placeIds, setLive]);

  // Keep the clock on a playing area moving.
  const anyPlaying = Object.values(live).some((l) => l.playing);
  useEffect(() => {
    if (!anyPlaying) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyPlaying]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const speakerName = useCallback(
    (id: string) => speakers.find((s) => s.id === id)?.name ?? 'Speaker',
    [speakers]
  );

  const submitName = useCallback(
    async (name: string) => {
      if (!asking) return;
      const store = usePlaces.getState();
      let result = { ok: true, message: '' };

      if (asking.kind === 'place') result = await store.addPlace(name);
      if (asking.kind === 'area') result = await store.addArea(asking.placeId, name);
      if (asking.kind === 'speaker') {
        result = await store.addSpeaker(asking.placeId, asking.areaId, name);
      }
      if (asking.kind === 'rename-place') {
        result = await store.renamePlace(asking.placeId, name);
      }
      if (asking.kind === 'rename-area') {
        result = await store.renameArea(asking.placeId, asking.areaId, name);
      }

      setAsking(null);
      if (result.message) toast.show(result.message, result.ok ? 'success' : 'danger');
    },
    [asking, toast]
  );

  const playHere = useCallback(
    async (areaId: string, areaName: string) => {
      const session = useSession.getState();
      if (session.zoneId === areaId && session.isRunning()) {
        await session.stop();
        return;
      }
      setArea(areaId, areaName);
      await session.start();
    },
    [setArea]
  );

  return (
    <Screen
      title="Places"
      subtitle={
        businessName
          ? `${businessName}. A place is a building. An area is one part of it.`
          : 'A place is a building. An area is one part of it.'
      }
      scroll={false}
    >
      {mode === 'business' ? (
        <View style={styles.teamRow}>
          <Button
            label="Your team"
            variant="secondary"
            size="sm"
            full={false}
            onPress={() => router.push('/team')}
            icon={Users}
          />
        </View>
      ) : null}

      {problem ? (
        <View style={styles.problem}>
          <Banner tone="warning" title="Not everything loaded" body={problem} />
        </View>
      ) : null}

      {places.length === 0 ? (
        <EmptyState
          title="No places yet"
          body="Add a place. Then add the areas inside it, like a roof or a patio."
          actionLabel="Add a place"
          onAction={() => setAsking({ kind: 'place' })}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {places.map((place: Place) => (
            <Card key={place.id}>
              <View style={styles.placeHead}>
                <Building2 size={icon.md} color={c.ink} strokeWidth={icon.stroke} />
                <View style={styles.grow}>
                  <Text style={styles.placeName} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.meta}>
                    {place.areas.length} area
                    {place.areas.length === 1 ? '' : 's'}, {speakerCount(place)} speaker
                    {speakerCount(place) === 1 ? '' : 's'}
                  </Text>
                </View>
                <Touchable
                  onPress={() =>
                    setAsking({
                      kind: 'rename-place',
                      placeId: place.id,
                      current: place.name,
                    })
                  }
                  accessibilityLabel={`Rename ${place.name}`}
                  style={styles.iconButton}
                >
                  <Pencil size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
                </Touchable>
                <Touchable
                  onPress={() => void usePlaces.getState().removePlace(place.id)}
                  accessibilityLabel={`Delete ${place.name}`}
                  style={styles.iconButton}
                >
                  <Trash2 size={icon.md} color={c.danger} strokeWidth={icon.stroke} />
                </Touchable>
              </View>

              {place.areas.map((area) => {
                const info = live[area.id];
                const mine = playingArea === area.id && engineState === 'running';
                return (
                  <View key={area.id} style={styles.area}>
                    <View style={styles.areaHead}>
                      <LayoutGrid size={icon.sm} color={c.muted} strokeWidth={icon.stroke} />
                      <Text style={styles.areaName} numberOfLines={1}>
                        {area.name}
                      </Text>
                      <StatusPill label={liveLabel(info, now)} tone={liveTone(info)} />
                      <Touchable
                        onPress={() =>
                          setAsking({
                            kind: 'rename-area',
                            placeId: place.id,
                            areaId: area.id,
                            current: area.name,
                          })
                        }
                        accessibilityLabel={`Rename ${area.name}`}
                        style={styles.iconButton}
                      >
                        <Pencil size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
                      </Touchable>
                      <Touchable
                        onPress={() => void usePlaces.getState().removeArea(place.id, area.id)}
                        accessibilityLabel={`Delete ${area.name}`}
                        style={styles.iconButton}
                      >
                        <Trash2 size={icon.sm} color={c.danger} strokeWidth={icon.stroke} />
                      </Touchable>
                    </View>

                    {(area.speakers ?? []).map((s) => (
                      <View key={s.id} style={styles.speakerRow}>
                        <Speaker size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
                        <Text style={styles.speakerName} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Touchable
                          onPress={() =>
                            void usePlaces.getState().removeSpeaker(place.id, area.id, s.id)
                          }
                          accessibilityLabel={`Remove ${s.name}`}
                          style={styles.iconButton}
                        >
                          <Trash2 size={icon.sm} color={c.danger} strokeWidth={icon.stroke} />
                        </Touchable>
                      </View>
                    ))}

                    {area.speakerIds.map((id) => (
                      <View key={id} style={styles.speakerRow}>
                        <Speaker size={icon.sm} color={c.ink} strokeWidth={icon.stroke} />
                        <Text style={styles.speakerName} numberOfLines={1}>
                          {speakerName(id)}
                        </Text>
                        <Touchable
                          onPress={() =>
                            void usePlaces.getState().removeSpeaker(place.id, area.id, id)
                          }
                          accessibilityLabel={`Remove ${speakerName(id)}`}
                          style={styles.iconButton}
                        >
                          <Trash2 size={icon.sm} color={c.danger} strokeWidth={icon.stroke} />
                        </Touchable>
                      </View>
                    ))}

                    <View style={styles.areaActions}>
                      <Button
                        label={mine ? 'Stop' : 'Play here'}
                        variant={mine ? 'danger' : 'secondary'}
                        size="sm"
                        full={false}
                        onPress={() => void playHere(area.id, area.name)}
                      />
                      <Button
                        label="Add a speaker"
                        variant="ghost"
                        size="sm"
                        full={false}
                        onPress={() =>
                          setAsking({
                            kind: 'speaker',
                            placeId: place.id,
                            areaId: area.id,
                          })
                        }
                      />
                    </View>
                  </View>
                );
              })}

              <View style={styles.placeFooter}>
                <Button
                  label="Add an area"
                  variant="secondary"
                  size="sm"
                  onPress={() => setAsking({ kind: 'area', placeId: place.id })}
                  icon={Plus}
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
        icon={Plus}
      />

      <NameSheet asking={asking} onClose={() => setAsking(null)} onSubmit={submitName} />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */

const SHEET_COPY: Record<
  Asking['kind'],
  { title: string; hint: string; placeholder: string; action: string; label: string }
> = {
  place: {
    title: 'Add a place',
    label: 'Name',
    hint: 'The name of the building. Like Main Street Hotel.',
    placeholder: 'Main Street Hotel',
    action: 'Add a place',
  },
  area: {
    title: 'Add an area',
    label: 'Name',
    hint: 'The name of one part of it. Like Roof or Patio.',
    placeholder: 'Roof',
    action: 'Add an area',
  },
  speaker: {
    title: 'Add a speaker',
    label: 'Name',
    hint: 'Name it after where it sits. Like Roof corner.',
    placeholder: 'Roof corner',
    action: 'Add a speaker',
  },
  'rename-place': {
    title: 'Rename this place',
    label: 'Name',
    hint: 'The name of the building.',
    placeholder: 'Main Street Hotel',
    action: 'Save',
  },
  'rename-area': {
    title: 'Rename this area',
    label: 'Name',
    hint: 'The name of one part of the building.',
    placeholder: 'Roof',
    action: 'Save',
  },
};

function NameSheet({
  asking,
  onClose,
  onSubmit,
}: {
  asking: Asking | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const kind = asking?.kind ?? 'place';
  const copy = SHEET_COPY[kind];

  useEffect(() => {
    if (!asking) return;
    setName(asking.kind === 'rename-place' || asking.kind === 'rename-area' ? asking.current : '');
  }, [asking]);

  return (
    <Sheet
      open={asking !== null}
      title={copy.title}
      onClose={() => {
        setName('');
        onClose();
      }}
      footer={
        <Button
          label={copy.action}
          size="lg"
          disabled={name.trim().length === 0}
          onPress={() => {
            onSubmit(name.trim());
            setName('');
          }}
        />
      }
    >
      <TextField
        label={copy.label}
        hint={copy.hint}
        value={name}
        onChangeText={setName}
        placeholder={copy.placeholder}
        accessibilityLabel="Name"
      />
    </Sheet>
  );
}

const sheet = themed((c, t) => ({
  list: { gap: space.sm, paddingBottom: space.sm },
  grow: { flex: 1, gap: 2 },
  teamRow: { flexDirection: 'row', marginBottom: space.sm },
  problem: { marginBottom: space.sm },
  placeHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  placeName: { ...t.heading },
  meta: { ...t.bodySmall },
  area: {
    marginTop: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingTop: space.sm + 4,
    gap: space.sm,
  },
  areaHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  areaName: { ...t.subheading, flex: 1 },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.md,
  },
  speakerName: { ...t.label, flex: 1, fontSize: 15 },
  areaActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  placeFooter: { marginTop: space.md },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1, minHeight: space.md },
}));
