import { z } from 'zod';
import { PLANS } from './entitlements.js';
import { AudioProfileSchema, OUTPUT_KINDS, PROFILE_KINDS } from './profiles.js';

/**
 * Shared zod validators for the shapes that cross the wire between the apps and
 * Supabase. Row types come from `db.types.ts` (generated); these validate input
 * before it is written and narrow anything read back from jsonb columns.
 */

export const Uuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Invalid UUID',
  );

export const PlanSchema = z.enum(PLANS);
export const OrgPlanSchema = z.enum(['business', 'enterprise']);
export const MemberRoleSchema = z.enum(['owner', 'manager', 'staff']);
export const DeviceKindSchema = z.enum(OUTPUT_KINDS);
export const ProfileKindSchema = z.enum(PROFILE_KINDS);
export const TriggerModeSchema = z.enum(['manual', 'schedule', 'motion']);
export const ScheduleExecutorSchema = z.enum(['device', 'reminder']);
export const SessionSourceSchema = z.enum(['manual', 'schedule', 'remote']);
export const OutputKindSchema = z.enum(OUTPUT_KINDS);
export const DeviceStatusSchema = z.enum(['online', 'offline', 'unknown']);

/** `HH:MM` or `HH:MM:SS`, matching Postgres `time`. */
export const TimeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Expected HH:MM');

/** 0 = Sunday … 6 = Saturday, matching Postgres `extract(dow)`. */
export const Weekday = z.number().int().min(0).max(6);

export const BusinessHours = z.record(
  z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']),
  z.object({ open: TimeOfDay, close: TimeOfDay }).nullable(),
);
export type BusinessHours = z.infer<typeof BusinessHours>;

export const ProfileRowSchema = z.object({
  id: Uuid,
  display_name: z.string().min(1).max(80).nullable(),
  plan: PlanSchema,
  rc_app_user_id: z.string().nullable(),
});

export const OrganizationInput = z.object({
  name: z.string().min(1).max(120),
  plan: OrgPlanSchema.default('business'),
  contact_email: z.email().nullish(),
});

export const LocationInput = z.object({
  org_id: Uuid,
  name: z.string().min(1).max(120),
  address: z.string().max(300).nullish(),
  timezone: z.string().min(1).default('America/Los_Angeles'),
  business_hours: BusinessHours.nullish(),
});

export const ZoneInput = z.object({
  location_id: Uuid,
  name: z.string().min(1).max(120),
  trigger_mode: TriggerModeSchema.default('manual'),
  active_profile_id: Uuid.nullish(),
});

export const DeviceInput = z.object({
  zone_id: Uuid.nullish(),
  kind: DeviceKindSchema,
  name: z.string().min(1).max(120),
  ble_id: z.string().max(120).nullish(),
  firmware: z.string().max(40).nullish(),
});

export const ScheduleInput = z
  .object({
    zone_id: Uuid,
    profile_id: Uuid,
    days: z.array(Weekday).min(1).max(7),
    start_time: TimeOfDay,
    end_time: TimeOfDay,
    enabled: z.boolean().default(true),
    executor: ScheduleExecutorSchema,
  })
  .refine((s) => s.start_time !== s.end_time, {
    message: 'A schedule must cover a non-empty window',
    path: ['end_time'],
  });

export const StartSessionInput = z.object({
  zone_id: Uuid.nullish(),
  device_id: Uuid.nullish(),
  profile_id: Uuid,
  output_kind: OutputKindSchema,
  source: SessionSourceSchema.default('manual'),
});

export const SubscriptionRowSchema = z.object({
  id: Uuid,
  user_id: Uuid.nullable(),
  org_id: Uuid.nullable(),
  provider: z.enum(['revenuecat', 'stripe']),
  product_id: z.string(),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'expired']),
  current_period_end: z.string().nullable(),
});

/** Parse an `audio_profiles` row (params arrives as jsonb) into an `AudioProfile`. */
export const AudioProfileRow = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullish(),
    kind: ProfileKindSchema,
    params: z.unknown(),
    min_plan: PlanSchema,
    is_system: z.boolean(),
    owner_user_id: Uuid.nullish(),
    owner_org_id: Uuid.nullish(),
  })
  .transform((row, ctx) => {
    const parsed = AudioProfileSchema.safeParse({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      kind: row.kind,
      params: row.params,
      minPlan: row.min_plan,
      isSystem: row.is_system,
      ownerUserId: row.owner_user_id ?? null,
      ownerOrgId: row.owner_org_id ?? null,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
      }
      return z.NEVER;
    }
    return parsed.data;
  });

export type OrganizationInput = z.infer<typeof OrganizationInput>;
export type LocationInput = z.infer<typeof LocationInput>;
export type ZoneInput = z.infer<typeof ZoneInput>;
export type DeviceInput = z.infer<typeof DeviceInput>;
export type ScheduleInput = z.infer<typeof ScheduleInput>;
export type StartSessionInput = z.infer<typeof StartSessionInput>;
