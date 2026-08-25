import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Building2,
  ChevronRight,
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
  dockClearance,
  EmptyState,
  Screen,
  Sheet,
  StatusPill,
  TextField,
  Touchable,
  useToast,
} from '../../src/components';
import {
  attentionLine,
  lastSessionLine,
  rollUp,
  speakerLine,
  statusLine,
  type PlaceState,
} from '../../src/core/businessPlaces';
import { liveLabel, liveTone, type Place } from '../../src/core/places';
import { SPEAKER_STATUS_LABEL } from '../../src/core/speakerStatus';
import { can } from '../../src/core/team';
import { refreshPlaceActivity } from '../../src/services/activity';
import { useAccount } from '../../src/state/useAccount';
import { useOrgPlans } from '../../src/state/useOrgPlans';
import { usePlaces } from '../../src/state/usePlaces';
import { useSchedules } from '../../src/state/useSchedules';
import { useSession } from '../../src/state/useSession';
import { icon, space, themed, useTheme, useThemedStyles } from '../../src/theme';

type Asking =
  | { kind: 'place' }
  | { kind: 'area'; placeId: string }
  | { kind: 'speaker'; placeId: string; areaId: string }
  | { kind: 'rename-place'; placeId: string; current: string }
  | { kind: 'rename-area'; placeId: string; areaId: string; current: string };

export default function PlacesScreen() {
  const mode = usePlaces((s) => s.mode);
  return mode === 'business' ? <BusinessPlaces /> : <PhonePlaces />;
}

/* ── the places a business looks after ────────────────────────────────────── */

/**
 * One card a building, read the way a person reads the lights in a house.
 *
 * The name, the birds it is protecting against and how, when it last ran, and
 * what the account says about its speakers. Four lines, all of them things the
 * account actually holds. Everything inside a building is one tap down.
 */
function BusinessPlaces() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const places = usePlaces((s) => s.places);
  const problem = usePlaces((s) => s.problem);
  const activity = usePlaces((s) => s.activity);
  const activityKnown = usePlaces((s) => s.activityKnown);
  const refresh = usePlaces((s) => s.refresh);

  const businessName = useAccount((s) => s.activeOrgName);
  const role = useAccount((s) => s.activeOrgRole);

  const plans = useOrgPlans((s) => s.plans);
  const plansKnown = useOrgPlans((s) => s.loaded);
  const refreshPlans = useOrgPlans((s) => s.refresh);
  const schedules = useSchedules((s) => s.schedules);

  const [asking, setAsking] = useState(false);

  useEffect(() => {
    void refresh();
    void refreshPlans();
    void refreshPlaceActivity();
  }, [refresh, refreshPlans]);

  const states: PlaceState[] = useMemo(
    () =>
      places.map((place) => ({
        id: place.id,
        name: place.name,
        target: place.target ?? null,
        areas: place.areas.map((area) => ({
          id: area.id,
          name: area.name,
          planName: plans.find((p) => p.zoneId === area.id)?.name ?? null,
        })),
        speakers: place.areas.flatMap((area) =>
          (area.speakers ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status ?? 'unknown',
          })),
        ),
        // A time counts only while it is switched on and pointed at an area
        // of this building. Anything else would put "Schedule active" on a
        // place that will do nothing on its own.
        scheduled: place.areas.some((area) =>
          schedules.some((s) => s.enabled && s.zoneId === area.id),
        ),
        lastSessionAt: activityKnown ? (activity[place.id] ?? null) : null,
        plansKnown,
      })),
    [activity, activityKnown, places, plans, plansKnown, schedules],
  );

  const attention = attentionLine(rollUp(states));
  const mayAdd = can(role, 'places');

  const addPlace = useCallback(
    async (name: string) => {
      const result = await usePlaces.getState().addPlace(name);
      setAsking(false);
      if (result.message) toast.show(result.message, result.ok ? 'success' : 'danger');
    },
    [toast],
  );

  return (
    <Screen
      title="Places"
      subtitle={businessName ?? 'Every building your team looks after.'}
      scroll={false}
      header={
        <View style={styles.head}>
          {attention ? <Text style={styles.attention}>{attention}</Text> : null}
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
        </View>
      }
      dock={
        places.length > 0 && mayAdd ? (
          <Button label="Add a place" size="lg" onPress={() => setAsking(true)} icon={Plus} />
        ) : undefined
      }
    >
      {problem ? (
        <View style={styles.problem}>
          <Banner tone="warning" title="Not everything loaded" body={problem} />
        </View>
      ) : null}

      {places.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No places yet"
            body={
              mayAdd
                ? 'Add a building. Then add the areas inside it, like a roof or a patio.'
                : 'Once a manager adds a building, it shows up here.'
            }
            actionLabel={mayAdd ? 'Add a place' : undefined}
            onAction={mayAdd ? () => setAsking(true) : undefined}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: dockClearance(insets.bottom) },
          ]}
        >
          {states.map((place) => (
            <Card
              key={place.id}
              onPress={() =>
                router.push({ pathname: '/location', params: { id: place.id } })
              }
              accessibilityLabel={place.name}
            >
              <View style={styles.cardHead}>
                <Building2 size={icon.md} color={c.ink} strokeWidth={icon.stroke} />
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.name}
                </Text>
                <ChevronRight size={icon.md} color={c.muted} strokeWidth={icon.stroke} />
              </View>

              <Text style={styles.status}>{statusLine(place)}</Text>
              {activityKnown ? (
                <Text style={styles.meta}>{lastSessionLine(place.lastSessionAt)}</Text>
              ) : null}
              <Text style={styles.meta}>{speakerLine(place.speakers)}</Text>
            </Card>
          ))}
        </ScrollView>
      )}

      <NameSheet
        asking={asking ? { kind: 'place' } : null}
        onClose={() => setAsking(false)}
        onSubmit={(name) => void addPlace(name)}
      />
    </Screen>
  );
}

/* ── the places one phone keeps ───────────────────────────────────────────── */

/**
 * The same three words, on a phone with no business behind it: a place is a
 * building, an area is one part of it, a speaker sits in an area. Everything
 * here is kept on this phone, so everything here can be edited on it.
 */
function PhonePlaces() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const places = usePlaces((s) => s.places);
  const problem = usePlaces((s) => s.problem);
  const speakerCount = usePlaces((s) => s.speakerCount);

  const speakers = useAccount((s) => s.devices);

  const playingArea = useSession((s) => s.zoneId);
  const engineState = useSession((s) => s.engineState);
  const startedAt = useSession((s) => s.startedAt);
  const setArea = useSession((s) => s.setArea);

  const [asking, setAsking] = useState<Asking | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Nothing else can be playing in a list this phone keeps to itself, so the
  // clock only runs while this phone is the one playing.
  const anyPlaying = playingArea !== null && engineState === 'running';
  useEffect(() => {
    if (!anyPlaying) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyPlaying]);

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

  const empty = places.length === 0;

  return (
    // One way in, the same as Schedule: the empty state carries the button
    // until there is a list, and then the pinned one carries it.
    <Screen
      title="Places"
      subtitle="A place is a building. An area is one part of it."
      scroll={false}
      dock={
        empty ? undefined : (
          <Button
            label="Add a place"
            size="lg"
            onPress={() => setAsking({ kind: 'place' })}
            icon={Plus}
          />
        )
      }
    >
      {problem ? (
        <View style={styles.problem}>
          <Banner tone="warning" title="Not everything loaded" body={problem} />
        </View>
      ) : null}

      {empty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No places yet"
            body="Add a place. Then add the areas inside it, like a roof or a patio."
            actionLabel="Add a place"
            onAction={() => setAsking({ kind: 'place' })}
          />
        </View>
      ) : (
        <ScrollView
          // without this the list lays out at its full height inside a screen
          // that does not scroll, and the last place sits under the dock
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: dockClearance(insets.bottom) },
          ]}
        >
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
                const mine = playingArea === area.id && engineState === 'running';
                const info = { playing: mine, startedAt };
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

                    {area.speakerIds.map((id) => {
                      // The phone either still has a record of this speaker or
                      // it does not. That is the whole of what we know, so it
                      // is the whole of what the row says.
                      const here = speakers.some((d) => d.id === id);
                      return (
                      <View key={id} style={styles.speakerRow}>
                        <Speaker
                          size={icon.sm}
                          color={here ? c.ink : c.warning}
                          strokeWidth={icon.stroke}
                        />
                        <Text style={styles.speakerName} numberOfLines={1}>
                          {speakerName(id)}
                        </Text>
                        <StatusPill
                          label={SPEAKER_STATUS_LABEL[here ? 'connected' : 'offline']}
                          tone={here ? 'running' : 'warning'}
                        />
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
                      );
                    })}

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
  /** the list takes what the screen has left, and scrolls inside it */
  scroll: { flex: 1 },
  list: { gap: space.sm },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  grow: { flex: 1, gap: 2 },
  head: { gap: space.sm },
  attention: { ...t.bodySmall, color: c.ink },
  teamRow: { flexDirection: 'row', marginBottom: space.sm },
  problem: { marginBottom: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  placeHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4 },
  placeName: { ...t.heading, flex: 1 },
  status: { ...t.label, fontSize: 15, color: c.text, marginTop: space.sm },
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
}));
