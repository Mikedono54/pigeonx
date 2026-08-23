import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { Card, EmptyState, Screen, SectionHeader, Touchable } from '../src/components';
import { SPEAKER_LABEL } from '../src/core/profiles';
import { useEntitlement } from '../src/hooks/useEntitlement';
import { fetchRemoteHistory, mergeHistory } from '../src/services/sync';
import { groupByDay, useHistory, type SessionEntry } from '../src/state/useHistory';
import { font, icon, space, themed, useTheme, useThemedStyles } from '../src/theme';

export default function HistoryScreen() {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();
  const ent = useEntitlement();
  const entries = useHistory((s) => s.entries);
  const historyDays = ent.limit('historyDays');
  const [elsewhere, setElsewhere] = useState<SessionEntry[]>([]);

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

  const days = useMemo(() => groupByDay(visible), [visible]);

  return (
    <Screen
      header={
        <View style={styles.headRow}>
          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.back}>
            <ChevronLeft size={icon.lg} color={c.ink} strokeWidth={icon.stroke} />
          </Touchable>
          <Text style={styles.headTitle}>What played and when</Text>
        </View>
      }
    >
      <SectionHeader
        index="01"
        title={
          historyDays == null
            ? `${visible.length} time${visible.length === 1 ? '' : 's'} so far`
            : `Free keeps the last ${historyDays} days`
        }
      />

      {days.length === 0 ? (
        <EmptyState
          title="Nothing has played yet"
          body="Every time you press Start, it shows up here with the sound, the speaker and how long it played."
          actionLabel="Go play one"
          onAction={() => router.navigate('/')}
        />
      ) : (
        <View style={styles.list}>
          {days.map((d) => (
            <Card key={d.day}>
              <View style={styles.dayHead}>
                <Text style={styles.dayLabel}>{d.label}</Text>
                <Text style={styles.dayTotal}>
                  {d.count} time{d.count === 1 ? '' : 's'}, {Math.round(d.totalMs / 60000)} min
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
                      ? `${Math.max(1, Math.round((e.endedAt - e.startedAt) / 60000))} min`
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

const sheet = themed((c, t) => ({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  back: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headTitle: { ...t.title, flex: 1 },
  list: { gap: space.sm },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    gap: space.sm,
  },
  dayLabel: { ...t.subheading },
  dayTotal: { ...t.caption },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  entryText: { flex: 1, gap: 2 },
  entryName: { ...t.label, fontSize: 15, color: c.ink },
  entryMeta: { ...t.caption },
  entryDur: {
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: -0.3,
    color: c.ink,
  },
}));
