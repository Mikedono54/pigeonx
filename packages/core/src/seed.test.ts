import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SYSTEM_PROFILES, SYSTEM_PROFILE_UUIDS } from './profiles.js';

/**
 * supabase/seed.sql must stay a faithful copy of SYSTEM_PROFILES — the app
 * references system profiles by the seeded UUID, so drift here is a silent
 * "profile not found" in production.
 */
const seedPath = fileURLToPath(new URL('../../../supabase/seed.sql', import.meta.url));
const seed = readFileSync(seedPath, 'utf8');

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  params: unknown;
  minPlan: string;
};

/** Pull the `(…),(…)` tuples out of the VALUES list, honouring '' escapes. */
function parseRows(sql: string): Row[] {
  const body = sql.slice(
    sql.indexOf('from (values') + 'from (values'.length,
    sql.indexOf('\n) as v'),
  );
  const rows: Row[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim().replace(/,$/, '');
    if (!trimmed.startsWith('(')) continue;
    const fields: string[] = [];
    let i = trimmed.indexOf("'");
    while (i !== -1 && i < trimmed.length) {
      let out = '';
      i += 1;
      while (i < trimmed.length) {
        if (trimmed[i] === "'" && trimmed[i + 1] === "'") {
          out += "'";
          i += 2;
          continue;
        }
        if (trimmed[i] === "'") break;
        out += trimmed[i];
        i += 1;
      }
      fields.push(out);
      i = trimmed.indexOf("'", i + 1);
    }
    const [id, slug, name, description, kind, params, minPlan] = fields;
    rows.push({ id, slug, name, description, kind, params: JSON.parse(params), minPlan });
  }
  return rows;
}

const rows = parseRows(seed);

describe('supabase/seed.sql', () => {
  it('seeds one row per system profile', () => {
    expect(rows).toHaveLength(SYSTEM_PROFILES.length);
    expect(rows.map((r) => r.slug)).toEqual(SYSTEM_PROFILES.map((p) => p.id));
  });

  it('matches SYSTEM_PROFILES field for field', () => {
    for (const p of SYSTEM_PROFILES) {
      const row = rows.find((r) => r.slug === p.id);
      expect(row, p.id).toBeDefined();
      expect(row!.id, p.id).toBe(SYSTEM_PROFILE_UUIDS[p.id]);
      expect(row!.name, p.id).toBe(p.name);
      expect(row!.description, p.id).toBe(p.description);
      expect(row!.kind, p.id).toBe(p.kind);
      expect(row!.minPlan, p.id).toBe(p.minPlan);
      expect(row!.params, p.id).toEqual(p.params);
    }
  });

  it('marks every seeded row as a system profile and is re-runnable', () => {
    expect(seed).toContain('is_system');
    expect(seed).toContain('on conflict (id) do update set');
  });
});
