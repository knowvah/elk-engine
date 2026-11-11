// SPDX-License-Identifier: EPL-2.0
// Replays EVERY row of test/golden/refs/java/radial.json (mission 8a, T2/T13; recorded by tools/vectors/RadialVectors.java, whose header
// is the contract) through the real RadialLayoutProvider at the AD-4 bar (ids, counts and non-numeric values exact, doubles within
// 1e-6): `full` rows through RecursiveGraphLayoutEngine, `stops` rows step by step with the recorder's stop semantics, `throws` rows by
// class, message (not for a NullPointerException, whose text is the JVM's), first ELK frame and step. Per-step transitions of the
// five classes T13 ported run from the recorded "before" state so that a divergence localises.
import { describe, expect, it } from 'vitest';
import {
  buildStopState,
  compareStop,
  dumpRadial,
  formatDiffs,
  importRadialInput,
  registerRadial,
} from '../../../test/helpers/radial-replay-dump.js';
import { runEngine, runStops, throwDiffs, type RadialRun } from '../../../test/helpers/radial-replay-run.js';
import {
  fixedSectionsOf,
  loadRadialRows,
  rowsWithStepPair,
  stopIndex,
  stopsOf,
  type RadialFullRow,
  type RadialStep,
  type RadialStopsRow,
  type RadialThrowsRow,
} from '../../../test/helpers/radial-replay-rows.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { CalculateGraphSize } from './intermediate/CalculateGraphSize.js';
import { EdgeAngleCalculator } from './intermediate/EdgeAngleCalculator.js';
import { EadesRadial } from './p1position/EadesRadial.js';
import { StraightLineEdgeRouter } from './p2routing/StraightLineEdgeRouter.js';

const HEAVY = { timeout: 60_000 } as const;
const OVERLAP_STEP = 'RadiusExtensionOverlapRemoval';

registerRadial();

const fullRows = loadRadialRows('full') as readonly RadialFullRow[];
const stopsRows = loadRadialRows('stops') as readonly RadialStopsRow[];
const throwsRows = loadRadialRows('throws') as readonly RadialThrowsRow[];

/** A row that cannot match the oracle for a classified reason: the replay is asserted to equal it up to a step and differ after. */
export interface ClassifiedDivergence {
  /** The row ids (full and stops row of one scenario) the classification covers. */
  readonly ids: readonly string[];
  readonly reason: string;
  /** Where the journal records the classification. */
  readonly journal: string;
}

/**
 * The ONLY rows of the ref whose replay differs from the oracle (TR3, stop 14, "treeified bin"). Every other row, including the two
 * other treeified rows (`shapes/binary4-sym`, `i30/four-parents-big-12`), matches at the AD-4 bar. For each id the replay is asserted
 * to equal the recorded stops up to the step before RadiusExtensionOverlapRemoval and to differ from the recorded value after it, so
 * the list cannot hide a row that starts to match or an unrelated defect.
 */
export const TREEIFIED_DIVERGENCES: readonly ClassifiedDivergence[] = [
  {
    ids: ['stops/i30/rand-chain-big', 'full/i30/rand-chain-big'],
    reason:
      'TR3, treeified bin: its level-2 and level-3 next-level node sets of RadiusExtensionOverlapRemoval.extend hold 12 ' +
      'identity-hashed nodes that share one bin of the oracle HashSet under -XX:hashCode=2 and iterate in that bin tree order, which ' +
      'sets the cyclic neighbour pairs overlapLayer tests and so the number of extension steps; the port (AD-10) iterates in ' +
      'insertion order. 449 of 3,000 seeded permutations of the three sets reproduce the oracle stop (OverlapRemoval test).',
    journal: 'decision-journal.md rows "T10 divergence" and "T13" (stop 14, needs-ruling)',
  },
];

const classified = new Set(TREEIFIED_DIVERGENCES.flatMap((entry) => entry.ids));

const fixedAware = (row: RadialStopsRow | RadialThrowsRow, index: number) => {
  const stops = stopsOf(row);
  return { ...stops[index], ...(index === 0 ? {} : fixedSectionsOf(stops)) };
};

/** The differences of one completed stop run to the recorded stops (empty when they are the recorded stops). */
function stopRunDiffs(row: RadialStopsRow | RadialThrowsRow, run: RadialRun): string[] {
  const expected = stopsOf(row);
  const out: string[] = [];
  if (run.stops.length !== expected.length) {
    out.push(`stop count ${String(run.stops.length)}, expected ${String(expected.length)}`);
  }
  for (let i = 0; i < Math.min(run.stops.length, expected.length); i++) {
    const diffs = compareStop(fixedAware(row, i) as never, run.stops[i] as never);
    if (diffs.length > 0) {
      out.push(`stop ${String(i)} (${String(expected[i]?.step)}):\n${formatDiffs(diffs)}`);
    }
  }
  return out;
}

describe('radial vectors: stops rows through the real RadialLayoutProvider', () => {
  it('has the recorded row counts', () => {
    expect([fullRows.length, stopsRows.length, throwsRows.length]).toEqual([148, 150, 11]);
  });

  it('replays every unclassified stops row stop by stop', HEAVY, () => {
    const failures: string[] = [];
    for (const row of stopsRows.filter((r) => !classified.has(r.id))) {
      const run = runStops(importRadialInput(row));
      if (run.error !== null) {
        failures.push(`${row.id}: threw ${String(run.error)}`);
      }
      failures.push(...stopRunDiffs(row, run).map((diff) => `${row.id}: ${diff}`));
    }
    expect(failures).toEqual([]);
  });

  it('names the recorded steps of every stops row from the assembled processors', HEAVY, () => {
    for (const row of stopsRows.filter((r) => !classified.has(r.id))) {
      const run = runStops(importRadialInput(row));
      expect(run.stops.map((s) => s.step)).toEqual(stopsOf(row).map((s) => s.step));
      expect(run.names.slice(0, run.stops.length)).toEqual(run.stops.map((s) => s.step));
    }
  });
});

describe('radial vectors: full rows through the RecursiveGraphLayoutEngine', () => {
  it('replays every unclassified full row', HEAVY, () => {
    const failures: string[] = [];
    for (const row of fullRows.filter((r) => !classified.has(r.id))) {
      const result = runEngine(importRadialInput(row));
      if (result.dump === null) {
        failures.push(`${row.id}: threw ${String(result.error)}`);
        continue;
      }
      const diffs = compareStop(row.expected, result.dump);
      if (diffs.length > 0) {
        failures.push(`${row.id}:\n${formatDiffs(diffs)}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

/** The throws rows the recorder ran no engine on (`.noEngine()`: the engine skips the provider on a childless root; the hierarchical edge makes layered of the inner level throw first). */
const RECORDER_RAN_NO_ENGINE: ReadonlySet<string> = new Set(['throws/empty', 'throws/hier-root-edge-angles']);

describe('radial vectors: throws rows', () => {
  it.each(throwsRows.map((row) => [row.id, row] as const))(
    '%s: class, message, first ELK frame, step, prior stops',
    (_id, row) => {
      const run = runStops(importRadialInput(row));
      expect(throwDiffs(row.expected.throws, run)).toEqual([]);
      expect(stopRunDiffs(row, run)).toEqual([]);
    },
  );

  it.each(throwsRows.filter((row) => !RECORDER_RAN_NO_ENGINE.has(row.id)).map((row) => [row.id, row] as const))(
    '%s: the engine throws the same class, message and frame',
    (_id, row) => {
      const result = runEngine(importRadialInput(row));
      expect(result.dump).toBeNull();
      expect(
        throwDiffs(
          { ...row.expected.throws, step: 'engine' },
          { stops: [], names: [], error: result.error, step: 'engine' },
        ),
      ).toEqual([]);
    },
  );

  it('throws/empty: the engine does not run the provider on a childless root', () => {
    const row = throwsRows.find((r) => r.id === 'throws/empty') as RadialThrowsRow;
    expect(runEngine(importRadialInput(row)).dump).not.toBeNull();
  });
});

describe('radial vectors: classified rows (TREEIFIED_DIVERGENCES)', () => {
  const scenarioOf = (id: string): string => id.slice(id.indexOf('/') + 1);

  it('lists rows that exist, with a reason and a journal reference', () => {
    const known = new Set(loadRadialRows().map((row) => row.id));
    for (const entry of TREEIFIED_DIVERGENCES) {
      expect(entry.ids.every((id) => known.has(id))).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(0);
      expect(entry.journal.length).toBeGreaterThan(0);
    }
  });

  it.each(stopsRows.filter((row) => classified.has(row.id)).map((row) => [row.id, row] as const))(
    '%s equals the oracle up to the step before the overlap removal and differs after it',
    (_id, row) => {
      const run = runStops(importRadialInput(row));
      const expected = stopsOf(row);
      const overlap = stopIndex(expected, OVERLAP_STEP);
      expect(overlap).toBeGreaterThan(0);
      expect(run.error).toBeNull();
      expect(run.stops.map((s) => s.step)).toEqual(expected.map((s) => s.step));
      for (let i = 0; i < overlap; i++) {
        expect(formatDiffs(compareStop(fixedAware(row, i) as never, run.stops[i] as never))).toBe('');
      }
      expect(compareStop(fixedAware(row, overlap) as never, run.stops[overlap] as never).length).toBeGreaterThan(0);
    },
  );

  it.each(fullRows.filter((row) => classified.has(row.id)).map((row) => [row.id, row] as const))(
    '%s differs from the oracle result, from the same input as its stops row',
    (id, row) => {
      const twin = stopsRows.find((r) => r.id === `stops/${scenarioOf(id)}`) as RadialStopsRow;
      expect(row.input).toEqual(twin.input);
      expect(classified.has(twin.id)).toBe(true);
      const result = runEngine(importRadialInput(row));
      expect(result.dump).not.toBeNull();
      expect(compareStop(row.expected, result.dump as never).length).toBeGreaterThan(0);
    },
  );
});

// ------------------------------------------------------------------------------------------------------------
// isolated per-step transitions (recorded "before" state -> the ported class -> the recorded "after" stop)

const TRANSITIONS: readonly (readonly [RadialStep, () => ILayoutProcessor<ElkNode>])[] = [
  ['EadesRadial', () => new EadesRadial()],
  ['CalculateGraphSize', () => new CalculateGraphSize()],
  ['StraightLineEdgeRouter', () => new StraightLineEdgeRouter()],
  ['EdgeAngleCalculator', () => new EdgeAngleCalculator()],
];

describe('radial vectors: isolated step transitions of the T13 classes', () => {
  it.each(TRANSITIONS)('%s: every recorded stop pair', HEAVY, (step, create) => {
    const pairs = rowsWithStepPair(step).filter(([row]) => !classified.has(row.id));
    expect(pairs.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const [row, pair] of pairs) {
      const graph = buildStopState(row, pair.beforeIndex);
      create().process(graph, new BasicProgressMonitor());
      const diffs = compareStop(pair.after, dumpRadial(graph));
      if (diffs.length > 0) {
        failures.push(`${row.id}:\n${formatDiffs(diffs)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('reaches every transition at least once for the rows that ran the step', () => {
    for (const [step] of TRANSITIONS) {
      const rows = [...stopsRows, ...throwsRows].filter((row) => stopIndex(stopsOf(row), step) > 0);
      expect(rowsWithStepPair(step)).toHaveLength(rows.length);
    }
  });
});
