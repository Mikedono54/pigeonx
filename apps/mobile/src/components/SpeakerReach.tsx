import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, TriangleAlert, CircleSlash } from 'lucide-react-native';
import {
  EFFECTIVENESS_COPY,
  OUTPUT_CEILING_HZ,
  SPEAKER_LABEL,
  REACH_QUESTION,
  effectiveForOutput,
  formatHz,
  peakFreqHz,
  reachSentence,
  type AudioProfile,
  type OutputKind,
} from '../core/profiles';
import { color, font, space } from '../theme/tokens';

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
  const level = effectiveForOutput(profile, output);
  const answer = EFFECTIVENESS_COPY[level].title;
  const why = reachSentence(profile, output);
  const ceiling = OUTPUT_CEILING_HZ[output];
  const peak = peakFreqHz(profile);

  const tint =
    level === 'full'
      ? color.success
      : level === 'partial'
        ? color.warning
        : color.danger;

  const Icon =
    level === 'full'
      ? CircleCheck
      : level === 'partial'
        ? TriangleAlert
        : CircleSlash;

  const ceilingPct = Math.min(1, ceiling / MAX_HZ);
  const peakPct = Math.min(1, peak / MAX_HZ);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Icon size={14} color={tint} strokeWidth={1.75} />
        <Text style={styles.question}>{REACH_QUESTION}</Text>
        <Text style={[styles.answer, { color: tint }]}>{answer}</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`${REACH_QUESTION} ${answer}. ${why}`}
      >
        <View style={[styles.reach, { width: `${ceilingPct * 100}%` }]} />
        <View
          style={[
            styles.marker,
            { left: `${peakPct * 100}%`, backgroundColor: tint },
          ]}
        />
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

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  question: {
    flex: 1,
    fontFamily: font.body.medium,
    fontSize: 14,
    color: color.ink,
  },
  answer: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  track: {
    height: 10,
    borderRadius: 0,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'visible',
    justifyContent: 'center',
  },
  reach: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 0,
    backgroundColor: color.accent,
    opacity: 0.25,
  },
  marker: {
    position: 'absolute',
    width: 2,
    height: 18,
    borderRadius: 0,
    marginLeft: -1,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  scaleText: {
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color: color.fgSubtle,
  },
  detail: {
    fontFamily: font.body.regular,
    fontSize: 13,
    lineHeight: 18,
    color: color.fgMuted,
  },
});
