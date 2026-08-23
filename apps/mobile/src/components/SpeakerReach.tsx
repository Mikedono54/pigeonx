import React from 'react';
import { Text, View } from 'react-native';
import { CircleCheck, CircleSlash, TriangleAlert } from 'lucide-react-native';

import {
  EFFECTIVENESS_COPY,
  OUTPUT_CEILING_HZ,
  REACH_QUESTION,
  SPEAKER_LABEL,
  effectiveForOutput,
  formatHz,
  peakFreqHz,
  reachSentence,
  type AudioProfile,
  type OutputKind,
} from '../core/profiles';
import { font, icon, space, themed, useTheme, useThemedStyles } from '../theme';

const MAX_HZ = 25000;

export interface SpeakerReachProps {
  profile: AudioProfile;
  output: OutputKind;
}

/**
 * The honest widget. It answers one question: will this speaker play it?
 * The app never pretends a phone can play a 25 kHz sound.
 */
export function SpeakerReach({ profile, output }: SpeakerReachProps) {
  const styles = useThemedStyles(sheet);
  const { c } = useTheme();

  const level = effectiveForOutput(profile, output);
  const answer = EFFECTIVENESS_COPY[level].title;
  const why = reachSentence(profile, output);
  const ceiling = OUTPUT_CEILING_HZ[output];
  const peak = peakFreqHz(profile);

  const tint =
    level === 'full' ? c.success : level === 'partial' ? c.warning : c.danger;
  const Icon =
    level === 'full' ? CircleCheck : level === 'partial' ? TriangleAlert : CircleSlash;

  const ceilingPct = Math.min(1, ceiling / MAX_HZ);
  const peakPct = Math.min(1, peak / MAX_HZ);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Icon size={icon.md} color={tint} strokeWidth={icon.stroke} />
        <Text style={styles.question}>{REACH_QUESTION}</Text>
        <Text style={styles.answer}>{answer}</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`${REACH_QUESTION} ${answer}. ${why}`}
      >
        <View style={[styles.reach, { width: `${ceilingPct * 100}%` }]} />
        <View style={[styles.marker, { left: `${peakPct * 100}%`, backgroundColor: tint }]} />
      </View>

      <View style={styles.scale}>
        <Text style={styles.scaleText}>
          {SPEAKER_LABEL[output]} stops at {formatHz(ceiling)}
        </Text>
        <Text style={styles.scaleText}>{formatHz(peak)}</Text>
      </View>

      <Text style={styles.detail}>{why}</Text>
    </View>
  );
}

const sheet = themed((c, t) => ({
  wrap: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  question: { ...t.bodyStrong, flex: 1, fontSize: 15 },
  answer: {
    fontFamily: font.mono.bold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: c.ink,
  },
  track: {
    height: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'visible',
    justifyContent: 'center',
  },
  reach: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: c.accent,
    opacity: 0.3,
  },
  marker: {
    position: 'absolute',
    width: 3,
    height: 22,
    marginLeft: -1,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  scaleText: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    color: c.muted,
  },
  detail: { ...t.bodySmall },
}));
