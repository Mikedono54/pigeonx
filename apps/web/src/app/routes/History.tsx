import { useMemo, useState } from 'react';
import { useAuth } from '../AuthProvider';
import { useAsync } from '../lib/useAsync';
import { useRealtime } from '../lib/useRealtime';
import { history, listAreasForPlaces, listPlaces } from '../lib/db';
import { DEMO_AREAS, DEMO_PLACES, demoPlays, isDemo } from '../lib/demo';
import {
  dayKey,
  duration,
  filterPlays,
  outputLabel,
  playCountLine,
  resultLabel,
  whenLabel,
  NO_FILTERS,
  type HistoryFilters,
} from '../lib/derive';
import {
  SESSION_RESULTS,
  SESSION_RESULT_LABELS,
  type OutputKind,
} from '../lib/labels';
import type { Area, Place, Play } from '../lib/types';
import {
  Empty,
  ErrorNote,
  Field,
  GhostButton,
  Input,
  PageHead,
  Select,
  SkeletonRows,
  TableWrap,
  Td,
  Th,
} from '../components/ui';

type HistoryData = {
  places: Place[];
  areas: Area[];
  plays: Play[];
};

/** How far back the page reads before you narrow it down. */
const WINDOW_DAYS = 90;

export default function History() {
  const { business, userId } = useAuth();
  const demo = isDemo();
  const orgId = business?.org_id ?? null;
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS);

  const state = useAsync<HistoryData>(async () => {
    if (demo) {
      return { places: DEMO_PLACES, areas: DEMO_AREAS, plays: demoPlays() };
    }
    if (!orgId) return { places: [], areas: [], plays: [] };
    const places = await listPlaces(orgId);
    const from = new Date();
    from.setDate(from.getDate() - WINDOW_DAYS);
    from.setHours(0, 0, 0, 0);
    const [areas, plays] = await Promise.all([
      listAreasForPlaces(places.map((p) => p.id)),
      history(from, new Date(Date.now() + 60000)),
    ]);
    const mine = new Set(places.map((p) => p.id));
    return { places, areas, plays: plays.filter((p) => p.location_id && mine.has(p.location_id)) };
  }, [orgId, demo]);

  useRealtime(state.reload, 60000);

  const places = state.data?.places ?? [];
  const plays = state.data?.plays ?? [];

  const areasForPlace = useMemo(
    () =>
      (state.data?.areas ?? []).filter(
        (a) => !filters.placeId || a.location_id === filters.placeId,
      ),
    [state.data, filters.placeId],
  );

  const shown = useMemo(() => filterPlays(plays, filters), [plays, filters]);
  const narrowed = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);

  const set = (patch: Partial<HistoryFilters>) => setFilters({ ...filters, ...patch });

  return (
    <>
      <PageHead
        title="History"
        intro={`Every session at every location, back ${WINDOW_DAYS} days. Times are yours, not the server's.`}
      />

      {state.error ? (
        <div className="mt-6">
          <ErrorNote error={state.error} onRetry={state.reload} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 border border-line p-5 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Location" htmlFor="hist-place">
          <Select
            id="hist-place"
            value={filters.placeId}
            onChange={(e) => set({ placeId: e.target.value, areaId: '' })}
          >
            <option value="">Every location</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Area" htmlFor="hist-area">
          <Select
            id="hist-area"
            value={filters.areaId}
            onChange={(e) => set({ areaId: e.target.value })}
          >
            <option value="">Every area</option>
            {areasForPlace.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Result" htmlFor="hist-result">
          <Select
            id="hist-result"
            value={filters.result}
            onChange={(e) => set({ result: e.target.value })}
          >
            <option value="">Every result</option>
            {SESSION_RESULTS.map((r) => (
              <option key={r} value={r}>
                {SESSION_RESULT_LABELS[r]}
              </option>
            ))}
            <option value="none">Not reported</option>
          </Select>
        </Field>

        <Field label="From" htmlFor="hist-from">
          <Input
            id="hist-from"
            type="date"
            max={filters.to || dayKey(new Date())}
            value={filters.from}
            onChange={(e) => set({ from: e.target.value })}
          />
        </Field>

        <Field label="To" htmlFor="hist-to">
          <Input
            id="hist-to"
            type="date"
            min={filters.from || undefined}
            max={dayKey(new Date())}
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted">{playCountLine(shown.length, plays.length)}</p>
        {narrowed ? (
          <GhostButton onClick={() => setFilters(NO_FILTERS)}>Clear the filters</GhostButton>
        ) : null}
      </div>

      <div className="mt-4">
        {state.loading && !state.data ? (
          <SkeletonRows rows={5} />
        ) : plays.length === 0 ? (
          <Empty title="Nothing has played yet. Start a sound from the phone app and it shows up here right away." />
        ) : shown.length === 0 ? (
          <Empty
            title="No sessions match those filters."
            action={<GhostButton onClick={() => setFilters(NO_FILTERS)}>Clear them</GhostButton>}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Plan or sound</Th>
                <Th>Where</Th>
                <Th>How long</Th>
                <Th>Played on</Th>
                <Th>Who</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 300).map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap">{whenLabel(p.started_at)}</Td>
                  <Td>{p.plan_name ?? p.profile_name ?? 'Sound'}</Td>
                  <Td>
                    {p.location_name ?? 'Location'}
                    <span className="block text-[14px] text-muted">{p.zone_name ?? 'Area'}</span>
                  </Td>
                  <Td className="px-num whitespace-nowrap">
                    {p.ended_at ? duration(p.minutes) : 'Playing now'}
                  </Td>
                  <Td className="whitespace-nowrap">{outputLabel(p.output_kind as OutputKind)}</Td>
                  <Td>{p.user_id === userId ? 'You' : 'A teammate'}</Td>
                  <Td
                    className={`whitespace-nowrap ${p.result === null ? 'text-muted' : 'text-ink'}`}
                  >
                    {resultLabel(p.result)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>

      {shown.length > 300 ? (
        <p className="mt-4 text-[14px] text-muted">
          The 300 most recent are shown. Narrow the dates to see further back.
        </p>
      ) : null}
    </>
  );
}
