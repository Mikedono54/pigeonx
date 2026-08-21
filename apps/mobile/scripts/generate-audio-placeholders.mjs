#!/usr/bin/env node
/**
 * Generates the synthesised placeholder bird calls shipped under
 * assets/audio/. These are NOT recordings — they are cheap synth stand-ins so
 * the `sample` profile kind is exercisable end to end. The UI labels every one
 * of them "synthesized placeholder". Replace with licensed/CC0 recordings
 * before launch (spec §8).
 *
 * Output: 16-bit mono PCM WAV @ 44.1 kHz, each <= 1 s.
 *
 * Usage: node scripts/generate-audio-placeholders.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'assets',
  'audio'
);

function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`wrote ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
}

const env = (t, attack, decay) =>
  t < attack ? t / attack : Math.exp(-(t - attack) / decay);

/** short rising chirp with a little noise, like a flock alarm note */
function chirp(dur, f0, f1, noise = 0.12) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f0 + (f1 - f0) * (t / dur);
    phase += (2 * Math.PI * f) / SR;
    const tone =
      Math.sin(phase) + 0.35 * Math.sin(2 * phase) + 0.15 * Math.sin(3 * phase);
    out[i] = (tone / 1.5 + noise * (Math.random() * 2 - 1)) * env(t, 0.006, 0.06);
  }
  return out;
}

/** longer descending screech with vibrato */
function screech(dur, f0, f1, vibHz, noise = 0.18) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const base = f0 + (f1 - f0) * Math.pow(t / dur, 0.7);
    const f = base * (1 + 0.05 * Math.sin(2 * Math.PI * vibHz * t));
    phase += (2 * Math.PI * f) / SR;
    const tone =
      Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.28 * Math.sin(3 * phase);
    out[i] = (tone / 1.8 + noise * (Math.random() * 2 - 1)) * env(t, 0.02, 0.35);
  }
  return out;
}

function place(total, parts) {
  const n = Math.floor(total * SR);
  const out = new Float32Array(n);
  for (const [at, buf] of parts) {
    const off = Math.floor(at * SR);
    for (let i = 0; i < buf.length && off + i < n; i++) out[off + i] += buf[i];
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] = (out[i] / peak) * 0.92;
  return out;
}

fs.mkdirSync(OUT, { recursive: true });

// Pigeon distress: four quick alarm notes, second pair tighter.
writeWav(
  'distress_pigeon.wav',
  place(0.95, [
    [0.0, chirp(0.11, 1500, 2600)],
    [0.16, chirp(0.1, 1450, 2500)],
    [0.42, chirp(0.09, 1600, 2800)],
    [0.55, chirp(0.09, 1550, 2700)],
    [0.74, chirp(0.13, 1400, 2300)],
  ])
);

// Hawk: one long descending scream.
writeWav('predator_hawk.wav', place(0.9, [[0.02, screech(0.8, 2600, 1250, 14)]]));

// Falcon: the classic rapid kek-kek-kek stutter.
writeWav(
  'predator_falcon.wav',
  place(0.8, [
    [0.0, chirp(0.07, 2200, 1500, 0.22)],
    [0.13, chirp(0.07, 2250, 1520, 0.22)],
    [0.26, chirp(0.07, 2300, 1560, 0.22)],
    [0.39, chirp(0.07, 2250, 1520, 0.22)],
    [0.52, chirp(0.08, 2150, 1450, 0.22)],
  ])
);

// Generic alarm: two-tone, used as a neutral fallback.
writeWav(
  'alarm_generic.wav',
  place(0.7, [
    [0.0, chirp(0.22, 2400, 2400, 0.02)],
    [0.3, chirp(0.22, 1800, 1800, 0.02)],
  ])
);
