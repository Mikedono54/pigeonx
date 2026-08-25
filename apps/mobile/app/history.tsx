import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { Chip, EmptyState, Screen, SectionHeader, Touchable } from '../src/components';
import { SESSION_RESULTS, SESSION_RESULT_LINE, NO_RESULT_LINE } from '../src/core/personalization';
import { SPEAKER_LABEL, type OutputKind } from '../src/core/profiles';
import {
  durationLabel,
  filterTimeline,
  groupTimeline,
  itemName,
  itemTime,
  itemWhere,
  resultLabel,
  type ResultFilter,
} from '../src/core/timeline';
import { useEntitlement } from '../src/hooks/useEntitlement';
import { fetchRemoteHistory, mergeHistory } from '../src/services/sync';
import { useHistory, type SessionEntry } from '../src/state/useHistory';
import { usePlaces } from '../src/state/usePlaces';
import { usePlacesHome } from '../src/state/usePlacesHome';
import { font, icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

/**
 * What played, when, where, and what happened after.
 *
 * A timeline rather than a tally: one line a session, in the order they
 * happened, so a person can see their own week. The result on the right is the
 * only thing on this screen the app did not observe itself, and it says so by
 * being the thing that reads "No result reported" when nobody answered.
 */
export default function HistoryScreen() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const ent = useEntitlement();
  const entries = useHistory((s) => s.entries);
  const places = usePlacesHome((s) => s.places);
  // A business looks after buildings, and every run in any of them belongs on
  // this screen. The chips are those buildings; a person with no business
  // filters by their own places instead.
  const business = usePlaces((s) => s.mode) === 'business';
  const locations = usePlaces((s) => s.places);
  const historyDays = ent.limit('historyDays');
  const [elsewhere, setElsewhere] = useState<SessionEntry[]>([]);
  const [placeFilter, setPlaceFilter] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter | null>(null);

  // What played on other phones and in your places, if you are signed in.
  useEffect(() => {
    let alive = true;
    const to = new Date();
    const from = new Date(to.getTime() - (historyDays ?? 365) * 24 * 60 * 60 * 1000);
    void fetchRemoteHistory({ from, to }).then((rows) => {
      if (alive) setElsewhere(rows);
    });
    return () => {
      alive = false;
    };
  }, [historyDays]);

  const visible = useMemo(() => {
    const all = mergeHistory(entries, elsewhere);
    if (historyDays == null) return all;
    const cutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;
    return all.filter((e) => e.startedAt >= cutoff);
  }, [elsewhere, entries, historyDays]);

  const shown = useMemo(
    () =>
      filterTimeline(visible, {
        placeId: business ? null : placeFilter,
        locationId: business ? placeFilter : null,
        result: resultFilter,
      }),
    [business, placeFilter, resultFilter, visible],
  );

  const days = useMemo(() => groupTimeline(shown), [shown]);

  // A filter row nobody can use is noise. Places show up once there is more
  // than one, results once anybody has answered the question.
  const chips = business ? locations : places;
  const showPlaces = business ? locations.length > 0 : places.length > 1;
  const showResults = visible.some((e) => e.result !== null);
  const filtered = placeFilter !== null || resultFilter !== null;

  return (
    <Screen
      scroll={false}
      header={
        <View style={styles.headRow}>
          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
          </Touchable>
          <Text style={styles.headTitle}>What played and when</Text>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
      >
        {showPlaces ? (
          <View style={styles.filters}>
            <Text style={styles.filterLabel}>Place</Text>
            <View style={styles.chipRow}>
              <Chip
                label="Everywhere"
                compact
                selected={placeFilter === null}
                onPress={() => setPlaceFilter(null)}
              />
              {chips.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  compact
                  selected={placeFilter === p.id}
                  onPress={() => setPlaceFilter(placeFilter === p.id ? null : p.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {showResults ? (
          <View style={styles.filters}>
            <Text style={styles.filterLabel}>What happened</Text>
            <View style={styles.chipRow}>
              <Chip
                label="Everything"
                compact
                selected={resultFilter === null}
                onPress={() => setResultFilter(null)}
              />
              {SESSION_RESULTS.map((r) => (
                <Chip
                  key={r}
                  label={SESSION_RESULT_LINE[r]}
                  compact
                  selected={resultFilter === r}
                  onPress={() => setResultFilter(resultFilter === r ? null : r)}
                />
              ))}
              <Chip
                label={NO_RESULT_LINE}
                compact
                selected={resultFilter === 'none'}
                onPress={() => setResultFilter(resultFilter === 'none' ? null : 'none')}
              />
            </View>
          </View>
        ) : null}

        <SectionHeader
          title={
            historyDays == null
              ? `${shown.length} session${shown.length === 1 ? '' : 's'}`
              : `Free keeps the last ${historyDays} days`
          }
        />

        {days.length === 0 ? (
          <EmptyState
            title={filtered ? 'Nothing matches' : 'Nothing has played yet'}
            body={
              filtered
                ? 'Try a wider filter.'
                : 'Every session shows up here the moment it ends.'
            }
            actionLabel={filtered ? 'Show everything' : 'Go play one'}
            onAction={() => {
              if (!filtered) {
                router.navigate('/');
                return;
              }
              setPlaceFilter(null);
              setResultFilter(null);
            }}
          />
        ) : (
          <View style={styles.days}>
            {days.map((day) => (
              <View key={day.key}>
                <View style={styles.dayHead}>
                  <View style={styles.dayMark} />
                  <Text style={styles.dayLabel}>{day.heading}</Text>
                </View>

                <View style={styles.list}>
                  {day.items.map((item) => (
                    <View key={item.id} style={styles.entry}>
                      <Text style={styles.time}>{itemTime(item)}</Text>
                      <View style={styles.entryText}>
                        <Text style={styles.name} numberOfLines={1}>
                          {itemName(item)}
                        </Text>
                        <Text style={styles.where} numberOfLines={1}>
                          {[
                            itemWhere(item),
                            SPEAKER_LABEL[item.outputKind as OutputKind] ?? item.outputKind,
                            durationLabel(item),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Text
                          style={[
                            styles.result,
                            item.result === null ? styles.resultQuiet : null,
                          ]}
                          numberOfLines={1}
                        >
                          {resultLabel(item)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headTitle: { ...t.title, flex: 1 },
  scroll: { flex: 1 },

  filters: { marginBottom: space.md, gap: space.sm },
  filterLabel: { ...t.overline },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },

  days: { gap: space.lg },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  dayMark: { width: 10, height: 3, backgroundColor: c.accent },
  dayLabel: { ...t.overline, color: c.text },

  list: { borderWidth: 1, borderColor: c.border },
  entry: {
    flexDirection: 'row',
    gap: space.sm + 4,
    paddingHorizontal: space.sm + 4,
    paddingVertical: space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.card,
    marginTop: -1,
  },
  time: {
    width: 68,
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: -0.3,
    color: c.ink,
    paddingTop: 2,
  },
  entryText: { flex: 1, gap: 3 },
  name: { ...t.subheading },
  where: { ...t.caption },
  result: { ...t.label, fontSize: 14, color: c.text },
  resultQuiet: { color: c.muted },
}));
