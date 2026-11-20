// SPDX-License-Identifier: EPL-2.0
// Proof of LayerSizeAndGraphHeightCalculator (mission 7e, T5): every row that stops at `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` (97 model levels, 4 scenarios) replayed with the full plan built from the real enums
// (`IntermediateProcessorStrategy`, the phase strategies) and the routers injected for `P5_EDGE_ROUTING`
// (`PolylineEdgeRouter` for POLYLINE, `OrthogonalEdgeRouter` for ORTHOGONAL). Expectations come only from the rows and the Java (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../graph/LGraph.js';
import { INJECTED_ROUTER_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const STOP = 'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR';
const SCENARIO_PREFIX = 'scenarios/LayerSizeAndGraphHeightCalculator/';

/** The stop of a `models` row id `models/<model>/<level>/<stop>/<variant>`. */
const stopOf = (row: RoutingRow): string | undefined => row.id.split('/')[3];

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows that stop at the calculator: the `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` stop and its scenarios. */
const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE)
  .filter(isGeometryRow)
  .filter((row) => stopOf(row) === STOP || row.id.startsWith(SCENARIO_PREFIX));

function replay(row: RoutingRow): LGraph {
  return row.steps === null
    ? runRoutingPrefix(row, INJECTED_ROUTER_FACTORIES)
    : runRoutingSteps(row, INJECTED_ROUTER_FACTORIES);
}

/** The row's steps without the `runProcessor` steps of `name` and without the `dump` (the plan minus the class). */
function stepsWithout(row: RoutingRow, name: string): RoutingRow['steps'] {
  return row.steps!.filter(([op, arg]) => op !== 'dump' && !(op === 'runProcessor' && arg === name));
}

/** The rows by group, for the pinned inventory. */
function tally(selected: readonly RoutingRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of selected) {
    const key = row.group;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

describe('LayerSizeAndGraphHeightCalculator (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(tally(rows)).toEqual({ models: 97, scenarios: 4 });
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      const graph = replay(row);
      const actual = routingDump(graph, importRow(row).importDump);
      expect(compareRouting(actual, row.expected)).toEqual([]);
      if (row.expected.dump !== undefined) {
        expect(compareRoutingFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
      }
    });
  }
});

describe('LayerSizeAndGraphHeightCalculator (the rows are not vacuous)', () => {
  it('the state before the calculator differs from the recorded state after it', () => {
    const row = rows.find((r) => r.id === 'scenarios/LayerSizeAndGraphHeightCalculator/long-edges')!;
    const without = { ...row, steps: stepsWithout(row, 'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR') };
    const before = routingDump(runRoutingSteps(without, INJECTED_ROUTER_FACTORIES), importRow(row).importDump);
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});
