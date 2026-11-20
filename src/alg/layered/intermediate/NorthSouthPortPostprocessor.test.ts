// SPDX-License-Identifier: EPL-2.0
// Proof of NorthSouthPortPostprocessor (mission 7e, T5): every row that stops at `NORTH_SOUTH_PORT_POSTPROCESSOR` (74 model levels, 6 scenarios) replayed with the full plan built from the real enums
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
import { addLayer, addNode, addPort } from '../../../../test/helpers/lgraph-builders.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { NorthSouthPortPostprocessor } from './NorthSouthPortPostprocessor.js';
import { INJECTED_ROUTER_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const MODELS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing.json`;
const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const STOP = 'NORTH_SOUTH_PORT_POSTPROCESSOR';
const SCENARIO_PREFIX = 'scenarios/NorthSouthPortPostprocessor/';

/** The stop of a `models` row id `models/<model>/<level>/<stop>/<variant>`. */
const stopOf = (row: RoutingRow): string | undefined => row.id.split('/')[3];

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows that stop at the postprocessor: the `NORTH_SOUTH_PORT_POSTPROCESSOR` stop and its scenarios. */
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

describe('NorthSouthPortPostprocessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(tally(rows)).toEqual({ models: 74, scenarios: 6 });
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

describe('NorthSouthPortPostprocessor (the rows are not vacuous)', () => {
  it('the state before the postprocessor differs from the recorded state after it', () => {
    const row = rows.find((r) => r.id === 'scenarios/NorthSouthPortPostprocessor/POLYLINE/north-south-ports')!;
    const without = { ...row, steps: stepsWithout(row, 'NORTH_SOUTH_PORT_POSTPROCESSOR') };
    const before = routingDump(runRoutingSteps(without, INJECTED_ROUTER_FACTORIES), importRow(row).importDump);
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});

describe('NorthSouthPortPostprocessor.process (the Java NoSuchElementException)', () => {
  it('throws for a self loop dummy without a port on the western side (`getPorts(WEST).iterator().next()`)', () => {
    const graph = new LGraph();
    const dummy = addNode(graph, NodeType.NORTH_SOUTH_PORT);
    dummy.setLayer(addLayer(graph));
    dummy.setProperty(InternalProperties.ORIGIN, new LEdge());
    addPort(dummy, PortSide.EAST);
    expect(() => new NorthSouthPortPostprocessor().process(graph, new NullElkProgressMonitor())).toThrow(
      NoSuchElementException,
    );
  });
});
