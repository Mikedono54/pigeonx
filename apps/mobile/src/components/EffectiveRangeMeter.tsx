import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck, TriangleAlert, CircleSlash } from 'lucide-react-native';
import {
  EFFECTIVENESS_COPY,
  OUTPUT_CEILING_HZ,
  OUTPUT_LABEL,
  effectiveForOutput,
  formatHz,
  peakFreqHz,
  type AudioProfile,
  type OutputKind,
} from '../core/profiles';
import { color, font, space } from '../theme/tokens';

const MAX_HZ = 25000;

export interface EffectiveRangeMeterProps {
  profile: AudioProfile;
  output: OutputKind;
}

/**
 * The honesty widget. Shows where this profile's energy sits against what the
 * selected output can physically reproduce (spec section 3). The app never
 * pretends 25 kHz comes out of a phone.
 */
export function EffectiveRangeMeter({
  profile,
  output,
}: EffectiveRangeMeterProps) {
  const level = effectiveForOutput(profile, output);
  const copy = EFFECTIVENESS_COPY[level];
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
        <Text style={[styles.title, { color: tint }]}>{copy.title}</Text>
        <Text style={styles.output}>{OUTPUT_LABEL[output]}</Text>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`${copy.title}. ${OUTPUT_LABEL[output]} reaches ${formatHz(
          ceiling
        )}. This profile peaks at ${formatHz(peak)}.`}
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
        <Text style={styles.scaleText}>0</Text>
        <Text style={styles.scaleText}>
          {OUTPUT_LABEL[output]} reaches {formatHz(ceiling)}
        </Text>
        <Text style={styles.scaleText}>25 kHz</Text>
      </View>

      <Text style={styles.detail}>{copy.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: {
    fontFamily: font.mono.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  output: {
    marginLeft: 'auto',
    fontFamily: font.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color.fgSubtle,
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
