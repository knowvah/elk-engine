// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the hierarchical arms of the driver (mission 7h, T15, H12/F12): `collectAllGraphsBottomUp`,
// `reviewAndCorrectHierarchicalProcessors` (ElkLayeredHierarchy.ts) and the pause and resume of `hierarchicalLayout`
// (ElkLayered.ts). Each case runs a recorded row of test/golden/refs/java/layered-compound.json through the real engine and compares
// the part the arm decides: the order of the stops (bottom-up), the plan of every level (a hierarchy aware processor runs on the
// root only), the exception of a child that disagrees with the root, the greedy-switch type copied to every graph. Every literal
// is the row's.
import { describe, it, expect } from 'vitest';
import {
  isCompoundModelsRow,
  loadCompoundRowsIfPresent,
  type CompoundModelsRow,
  type CompoundScenarioRow,
  type FullRow,
} from '../../../test/helpers/layered-compound-replay-rows.js';
import {
  actualStopTree,
  compoundRowById,
  enumName,
  expectedTree,
  perGraph,
  projectionDiffs,
} from '../../../test/helpers/layered-compound-anchored.js';
import { runRow } from '../../../test/helpers/layered-compound-replay-run.js';
import { stopDiffs } from '../../../test/helpers/layered-compound-replay-stops.js';
import type { JavaThrow } from '../../../test/helpers/layered-compound-replay-sites.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';

const ROW_TIMEOUT_MS = 120_000;
const HIERARCHICAL_GREEDY_TYPE = 'org.eclipse.elk.layered.crossingMinimization.greedySwitchHierarchical.type';
const hasRef = loadCompoundRowsIfPresent().length > 0;

const runInputOf = (id: string): Parameters<typeof runRow>[0] => compoundRowById(id) as Parameters<typeof runRow>[0];

describe.skipIf(!hasRef)('ElkLayered hierarchical arms, anchored cases', () => {
  it(
    'runs the nested graphs bottom-up, the root last (ElkLayered.java:308-334, :214-290)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/edge_label_placement-hierarchy01/<stop>/default (15 stops); ElkLayered.java:308-334 (collectAllGraphsBottomUp)
      const rows = loadCompoundRowsIfPresent()
        .filter(isCompoundModelsRow)
        .filter((row) => row.id.startsWith('models/edge_label_placement-hierarchy01/') && row.id.endsWith('/default'));
      expect(rows.length).toBeGreaterThan(1);
      const run = runRow(rows[0] as CompoundModelsRow);
      const diffs = rows.flatMap((row) => {
        const reached = run.stops[row.expected.stop.index];
        return reached === undefined
          ? [`stop ${String(row.expected.stop.index)} not reached`]
          : stopDiffs(row.expected.stop, reached);
      });
      expect(diffs).toEqual([]);
    },
  );

  it(
    'runs a hierarchy aware processor on the root only and every other processor on every level (ElkLayered.java:242-287)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: full/hierarchy-aware/deep3/sweepiness-0.1; ElkLayered.java:242-287 (the pause and resume of hierarchicalLayout)
      const row = compoundRowById('full/hierarchy-aware/deep3/sweepiness-0.1') as FullRow;
      const run = runRow(row as Parameters<typeof runRow>[0]);
      expect(Object.keys(row.expected.plans).length).toBeGreaterThan(1);
      expect(run.plans).toEqual(row.expected.plans);
    },
  );

  it(
    'makes as many stops as the oracle: one per hierarchical processor run (ElkLayered.java:242-287)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: scenarios/ElkLayered/inside-self-loop/RIGHT; ElkLayered.java:242-287
      const row = compoundRowById('scenarios/ElkLayered/inside-self-loop/RIGHT') as CompoundScenarioRow;
      expect(runRow(row as Parameters<typeof runRow>[0]).stops.length).toBe(row.expected.stops);
    },
  );

  it(
    'refuses a child whose hierarchy aware processor differs from the root, with the oracle message (ElkLayered.java:344)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: sites/ElkLayered/childStrategyThrow; ElkLayered.java:344
      const thrown = (compoundRowById('sites/ElkLayered/childStrategyThrow').expected as { throws: JavaThrow }).throws;
      let error: unknown = null;
      try {
        runRow(runInputOf('sites/ElkLayered/childStrategyThrow'));
      } catch (caught) {
        error = caught;
      }
      expect(thrown.class.endsWith(`.${UnsupportedGraphException.name}`)).toBe(true);
      expect(error).toBeInstanceOf(UnsupportedGraphException);
      expect((error as Error).message).toBe(thrown.message);
    },
  );

  it(
    'copies the hierarchical greedy-switch type of the root to every graph of the hierarchy (ElkLayered.java:350-353)',
    { timeout: ROW_TIMEOUT_MS },
    () => {
      // oracle: models/ticket-455_longHierarchicalEdges/3--LayerSweepCrossingMinimizer/greedy-hierarchical-one-sided; ElkLayered.java:350-353
      const id = 'models/ticket-455_longHierarchicalEdges/3--LayerSweepCrossingMinimizer/greedy-hierarchical-one-sided';
      const typeOf = (graph: { readonly properties: Readonly<Record<string, unknown>> }): string =>
        enumName(graph.properties[HIERARCHICAL_GREEDY_TYPE]);
      const expected = perGraph(expectedTree(id), typeOf);
      expect(expected.length).toBeGreaterThan(1);
      expect(projectionDiffs(perGraph(actualStopTree(id), typeOf), expected)).toEqual([]);
    },
  );
});
