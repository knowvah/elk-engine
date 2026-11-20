// SPDX-License-Identifier: EPL-2.0
// Proof of HierarchicalPortPositionProcessor (mission 7e, T5): every row that stops at `HIERARCHICAL_PORT_POSITION_PROCESSOR` (16 model levels, 3 scenarios) replayed with the full plan built from the real enums
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
const STOP = 'HIERARCHICAL_PORT_POSITION_PROCESSOR';
const SCENARIO_PREFIX = 'scenarios/HierarchicalPortPositionProcessor/';

/** The stop of a `models` row id `models/<model>/<level>/<stop>/<variant>`. */
const stopOf = (row: RoutingRow): string | undefined => row.id.split('/')[3];

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows that stop at the processor: the `HIERARCHICAL_PORT_POSITION_PROCESSOR` stop and its scenarios. */
const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE)
  .filter(isGeometryRow)
  .filter((row) => stopOf(row) === STOP || row.id.startsWith(SCENARIO_PREFIX));

function replay(row: RoutingRow): LGraph {
  return row.steps === null
    ? runRoutingPrefix(row, INJECTED_ROUTER_FACTORIES)
    : runRoutingSteps(row, INJECTED_ROUTER_FACTORIES);
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

describe('HierarchicalPortPositionProcessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(tally(rows)).toEqual({ models: 16, scenarios: 3 });
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

// ---------------------------------------------------------------------------------------------------------------------
// What the rows cannot prove
//
// No recorded row runs `fixCoordinates` past its early return (`HierarchicalPortPositionProcessor.java:95-98`): in all
// 19 rows the graph's port constraints are free, so removing the processor from the plan changes nothing and the
// body (`:100-127`) stays unreached. It needs an oracle row with `FIXED_POS` or `FIXED_RATIO` port constraints on a
// graph with eastern or western external port dummies (a T11 site-row candidate); a hand-derived expectation is not an
// option (L4).
