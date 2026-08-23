import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, History as HistoryIcon } from 'lucide-react-native';

import {
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  Touchable,
} from '../src/components';
import { SPEAKER_LABEL } from '../src/core/profiles';
import { useEntitlement } from '../src/hooks/useEntitlement';
import { fetchRemoteHistory, mergeHistory } from '../src/services/sync';
import {
  groupByDay,
  useHistory,
  type SessionEntry,
} from '../src/state/useHistory';
import { color, font, space } from '../src/theme/tokens';
import { type } from '../src/theme/typography';

export default function HistoryScreen() {
  const ent = useEntitlement();
  const entries = useHistory((s) => s.entries);
  const historyDays = ent.limit('historyDays');
  const [elsewhere, setElsewhere] = useState<SessionEntry[]>([]);

  // What played on other phones and in your places, if you are signed in.
  useEffect(() => {
    let alive = true;
    const to = new Date();
    const from = new Date(
      to.getTime() - (historyDays ?? 365) * 24 * 60 * 60 * 1000
    );
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

  const days = useMemo(() => groupByDay(visible), [visible]);

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <ChevronLeft size={22} color={color.ink} strokeWidth={1.75} />
          </Touchable>
          <Text style={type.title}>What played and when</Text>
        </View>
      }
    >
      <SectionHeader
        title={
          historyDays == null
            ? `${visible.length} time${visible.length === 1 ? '' : 's'} so far`
            : `Free keeps the last ${historyDays} days`
        }
      />

      {days.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={
              <HistoryIcon size={20} color={color.fgMuted} strokeWidth={1.75} />
            }
            title="Nothing has played yet"
            body="Every time you press Start, it shows up here with the sound, the speaker and how long it played."
            actionLabel="Go play one"
            onAction={() => router.navigate('/')}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {days.map((d) => (
            <Card key={d.day}>
              <View style={styles.dayHead}>
                <Text style={styles.dayLabel}>{d.label}</Text>
                <Text style={styles.dayTotal}>
                  {d.count} time{d.count === 1 ? '' : 's'},{' '}
                  {Math.round(d.totalMs / 60000)} min
                </Text>
              </View>
              {d.entries.map((e) => (
                <View key={e.id} style={styles.entryRow}>
                  <View style={styles.entryText}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {e.profileName}
                    </Text>
                    <Text style={styles.entryMeta} numberOfLines={1}>
                      {SPEAKER_LABEL[e.outputKind]} at{' '}
                      {new Date(e.startedAt).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.entryDur}>
                    {e.endedAt
                      ? `${Math.max(
                          1,
                          Math.round((e.endedAt - e.startedAt) / 60000)
                        )} min`
                      : 'Still going'}
                  </Text>
                </View>
              ))}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  list: { gap: space.sm },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    gap: space.sm,
  },
  dayLabel: {
    fontFamily: font.heading.semibold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: color.ink,
  },
  dayTotal: {
    fontFamily: font.body.regular,
    fontSize: 13,
    color: color.fgMuted,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  entryText: { flex: 1, gap: 2 },
  entryName: {
    fontFamily: font.body.medium,
    fontSize: 14,
    color: color.ink,
  },
  entryMeta: {
    fontFamily: font.body.regular,
    fontSize: 13,
    color: color.fgSubtle,
  },
  entryDur: {
    fontFamily: font.mono.medium,
    fontSize: 12,
    letterSpacing: -0.3,
    color: color.ink,
  },
});
