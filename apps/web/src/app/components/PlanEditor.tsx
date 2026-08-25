import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { Field, Input, Select } from './ui';
import { audibleTag } from '../lib/derive';
import {
  BIRD_TARGETS,
  BIRD_TARGET_LABELS,
  OUTPUT_KINDS,
  OUTPUT_LABELS,
  PLAN_DAY_BOXES,
  type BirdTarget,
  type OutputKind,
} from '../lib/labels';
import type { ProtectionPlan, Sound } from '../lib/types';
import type { PlanInput } from '../lib/db';

/**
 * A protection plan, edited in one sheet.
 *
 * The sound list is the heart of it, so every sound carries the tag that says
 * whether people nearby will hear it, worked out against the speaker this plan
 * is set to use. Change the speaker and the tags change with it, which is the
 * whole point: the same 22 kHz tone is silence out of a phone and a working
 * deterrent out of a PigeonX speaker.
 */

export type PlanDraft = PlanInput & { id: string | null };

/** A new plan, with the spec's defaults already filled in. */
export function blankPlan(zoneId: string | null, target: BirdTarget = 'unsure'): PlanDraft {
  return {
    id: null,
    name: '',
    target,
    sound_ids: [],
    randomize_order: true,
    interval_seconds: 900,
    session_minutes: 15,
    output: 'pigeonx_emitter',
    quiet_start: null,
    quiet_end: null,
    days: [1, 2, 3, 4, 5, 6, 7],
    starts_on: null,
    ends_on: null,
    zone_id: zoneId,
  };
}

export function planToDraft(plan: ProtectionPlan): PlanDraft {
  return {
    id: plan.id,
    name: plan.name,
    target: plan.target,
    sound_ids: [...plan.sound_ids],
    randomize_order: plan.randomize_order,
    interval_seconds: plan.interval_seconds,
    session_minutes: plan.session_minutes,
    output: plan.output,
    quiet_start: plan.quiet_start,
    quiet_end: plan.quiet_end,
    days: [...plan.days],
    starts_on: plan.starts_on,
    ends_on: plan.ends_on,
    zone_id: plan.zone_id,
  };
}

/** `18:30:00` and `18:30` both arrive here; the input wants `18:30`. */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

export function PlanEditor({
  open,
  draft,
  areaName,
  sounds,
  busy,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: PlanDraft | null;
  areaName: string;
  sounds: Sound[];
  busy?: boolean;
  error?: unknown;
  onChange: (next: PlanDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [quietOn, setQuietOn] = useState(false);
  const [datesOn, setDatesOn] = useState(false);

  useEffect(() => {
    if (!open || !draft) return;
    setQuietOn(Boolean(draft.quiet_start && draft.quiet_end));
    setDatesOn(Boolean(draft.starts_on || draft.ends_on));
    // Only when the sheet opens on a different plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft?.id]);

  if (!draft) return null;
  const set = (patch: Partial<PlanDraft>) => onChange({ ...draft, ...patch });

  return (
    <Dialog
      open={open}
      title={draft.id ? 'Edit this protection plan' : `Protection plan for ${areaName}`}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={draft.id ? 'Save the plan' : 'Create the plan'}
      busy={busy}
      error={error}
    >
      <Field label="Plan name" htmlFor="plan-name">
        <Input
          id="plan-name"
          value={draft.name}
          required
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Gull Rotation"
        />
      </Field>

      <Field label="Birds you are targeting" htmlFor="plan-target">
        <Select
          id="plan-target"
          value={draft.target}
          onChange={(e) => set({ target: e.target.value })}
        >
          {BIRD_TARGETS.map((t) => (
            <option key={t} value={t}>
              {BIRD_TARGET_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Plays on" htmlFor="plan-output">
        <Select
          id="plan-output"
          value={draft.output}
          onChange={(e) => set({ output: e.target.value as OutputKind })}
        >
          {OUTPUT_KINDS.map((o) => (
            <option key={o} value={o}>
              {OUTPUT_LABELS[o]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Sounds in the rotation"
        hint="Tick the sounds this plan plays. The tag says whether people nearby will hear it out of the speaker you picked."
      >
        <ul className="border border-line">
          {sounds.length === 0 ? (
            <li className="px-3 py-3 text-[15px] text-muted">No sounds to pick from yet.</li>
          ) : null}
          {sounds.map((sound) => {
            const on = draft.sound_ids.includes(sound.id);
            const order = draft.sound_ids.indexOf(sound.id) + 1;
            return (
              <li key={sound.id} className="border-b border-line last:border-b-0">
                <label className="flex cursor-pointer items-start gap-3 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      set({
                        sound_ids: on
                          ? draft.sound_ids.filter((id) => id !== sound.id)
                          : [...draft.sound_ids, sound.id],
                      })
                    }
                    className="mt-1 size-4 shrink-0 accent-[var(--px-accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] text-ink">
                      {sound.name}
                      {on ? (
                        <span className="px-num ml-2 text-[13px] text-accent">#{order}</span>
                      ) : null}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {audibleTag(sound, draft.output)}
                      {sound.is_system ? '' : ' · Yours'}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Field>

      <label className="flex cursor-pointer items-start gap-3 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={draft.randomize_order}
          onChange={(e) => set({ randomize_order: e.target.checked })}
          className="mt-1 size-4 shrink-0 accent-[var(--px-accent)]"
        />
        <span>
          Mix up the order
          <span className="block text-[13px] text-muted">
            A rotation that changes is harder for birds to settle into. It is not a promise that
            they never will.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Session length" hint="Minutes" htmlFor="plan-minutes">
          <Input
            id="plan-minutes"
            type="number"
            min={1}
            max={1440}
            value={draft.session_minutes}
            onChange={(e) => set({ session_minutes: Number(e.target.value) })}
          />
        </Field>
        <Field label="Gap between sounds" hint="Seconds. Zero plays them back to back." htmlFor="plan-interval">
          <Input
            id="plan-interval"
            type="number"
            min={0}
            max={86400}
            value={draft.interval_seconds}
            onChange={(e) => set({ interval_seconds: Number(e.target.value) })}
          />
        </Field>
      </div>

      <Field label="Days this plan runs">
        <div className="flex flex-wrap gap-2">
          {PLAN_DAY_BOXES.map((day) => {
            const on = draft.days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set({
                    days: on
                      ? draft.days.filter((d) => d !== day.value)
                      : [...draft.days, day.value],
                  })
                }
                className={`h-10 w-14 cursor-pointer border text-[14px] font-medium ${
                  on
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-line text-muted hover:border-ink hover:text-ink'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </Field>

      <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={quietOn}
          onChange={(e) => {
            setQuietOn(e.target.checked);
            if (!e.target.checked) set({ quiet_start: null, quiet_end: null });
            else set({ quiet_start: '22:00', quiet_end: '06:00' });
          }}
          className="size-4 accent-[var(--px-accent)]"
        />
        Keep quiet hours
      </label>

      {quietOn ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quiet from" htmlFor="plan-quiet-start">
            <Input
              id="plan-quiet-start"
              type="time"
              value={toInputTime(draft.quiet_start)}
              onChange={(e) => set({ quiet_start: e.target.value || null })}
            />
          </Field>
          <Field label="Quiet until" htmlFor="plan-quiet-end">
            <Input
              id="plan-quiet-end"
              type="time"
              value={toInputTime(draft.quiet_end)}
              onChange={(e) => set({ quiet_end: e.target.value || null })}
            />
          </Field>
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={datesOn}
          onChange={(e) => {
            setDatesOn(e.target.checked);
            if (!e.target.checked) set({ starts_on: null, ends_on: null });
          }}
          className="size-4 accent-[var(--px-accent)]"
        />
        Run it between two dates
      </label>

      {datesOn ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts on" htmlFor="plan-starts">
            <Input
              id="plan-starts"
              type="date"
              value={draft.starts_on ?? ''}
              onChange={(e) => set({ starts_on: e.target.value || null })}
            />
          </Field>
          <Field label="Ends on" htmlFor="plan-ends">
            <Input
              id="plan-ends"
              type="date"
              value={draft.ends_on ?? ''}
              onChange={(e) => set({ ends_on: e.target.value || null })}
            />
          </Field>
        </div>
      ) : null}
    </Dialog>
  );
}
