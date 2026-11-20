// SPDX-License-Identifier: EPL-2.0
// Proof of LongEdgeJoiner (mission 7e, T5): every row whose plan runs `LONG_EDGE_JOINER` (the stop itself and the `NORTH_SOUTH_PORT_POSTPROCESSOR` stops after it) replayed with the full plan built from the real enums
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
import { addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LongEdgeJoiner } from './LongEdgeJoiner.js';
import { INJECTED_ROUTER_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const PROCESSOR = 'LONG_EDGE_JOINER';

/** Whether the row's plan (prefix entries or `runProcessor` steps) runs the processor. */
function runsProcessor(row: RoutingRow, name: string): boolean {
  return row.steps === null
    ? (row.prefix ?? []).includes(name)
    : row.steps.some(([op, arg]) => op === 'runProcessor' && arg === name);
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows whose plan runs the joiner: its own stop and scenarios, and the later `NORTH_SOUTH_PORT_POSTPROCESSOR` stops. */
const rows: RoutingRow[] = loadRoutingRows(MODELS_FILE, STEPS_FILE)
  .filter(isGeometryRow)
  .filter((row) => runsProcessor(row, PROCESSOR) && !runsProcessor(row, 'FINAL_SPLINE_BENDPOINTS_CALCULATOR'));

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

describe('LongEdgeJoiner (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(tally(rows)).toEqual({ models: 60, scenarios: 9, sites: 2 });
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

describe('LongEdgeJoiner (the rows are not vacuous)', () => {
  it('the state without the joiner differs from the recorded state after it', () => {
    const row = rows.find((r) => r.id === 'scenarios/NorthSouthPortPostprocessor/POLYLINE/north-south-ports')!;
    const without = { ...row, steps: stepsWithout(row, 'LONG_EDGE_JOINER') };
    const before = routingDump(runRoutingSteps(without, INJECTED_ROUTER_FACTORIES), importRow(row).importDump);
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});

describe('LongEdgeJoiner.joinAt (the Java NoSuchElementException)', () => {
  it('throws when the dummy has no port on the western side (`iterator().next()` of an empty iterable)', () => {
    const dummy = addNode(new LGraph(), NodeType.LONG_EDGE);
    addPort(dummy, PortSide.EAST);
    expect(() => LongEdgeJoiner.joinAt(dummy, false)).toThrow(NoSuchElementException);
  });
});
