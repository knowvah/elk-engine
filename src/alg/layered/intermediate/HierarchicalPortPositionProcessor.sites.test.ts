// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the branches of HierarchicalPortPositionProcessor that only the T13 `sites/HierarchicalPortPosition/*`
// rows reach (mission 7e, T14a, unreached.md S9/S10). Each case replays one row with the processor injected and asserts
// the field the branch decides, the y coordinate of the dummies in the first and last layer (the field it writes,
// HierarchicalPortPositionProcessor.java:122), never the whole row (HierarchicalPortPositionProcessor.test.ts replays
// that). Literals are the row's `expected.geometry.nodes[path].pos[1]` (hex doubles decoded), within AD-4.
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { decodeHex } from '../../../../test/helpers/layered-framework-replay.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  isGeometryRow,
  loadRoutingRows,
  type RoutingExpected,
  type RoutingRow,
} from '../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LGraph } from '../graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { HierarchicalPortPositionProcessor } from './HierarchicalPortPositionProcessor.js';

const STEPS_FILE = `${repoRoot()}/test/golden/refs/java/layered-routing-steps.json`;
const COORDINATE_DIGITS = 6;

/** The row-replaying factories: the real enums, `HierarchicalPortPositionProcessor` injected for HIERARCHICAL_PORT_POSITION_PROCESSOR. */
const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return name === 'HIERARCHICAL_PORT_POSITION_PROCESSOR'
      ? new HierarchicalPortPositionProcessor()
      : IntermediateProcessorStrategy.valueOf(name).create();
  },
  createPhase(phase, strategy): ILayoutProcessor<LGraph> {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      default:
        throw new Error(`the plan of this row stops before ${phase}`);
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: RoutingRow[] = loadRoutingRows(STEPS_FILE).filter(isGeometryRow);

/** Replays the row with the class under test injected and dumps the resulting state (the recorder's shape). */
function replayed(id: string): RoutingExpected {
  const row = rows.find((candidate) => candidate.id === id)!;
  return routingDump(runRoutingSteps(row, factories), importRow(row).importDump);
}

/** The y coordinate of each requested node path as the processor left it (HierarchicalPortPositionProcessor.java:122). */
function placedY(id: string, paths: readonly string[]): Record<string, number> {
  const actual = replayed(id);
  return Object.fromEntries(paths.map((path) => [path, decodeHex(actual.geometry.nodes[path]!.pos[1])]));
}

function expectY(actual: Record<string, number>, expected: Record<string, number>): void {
  expect(Object.keys(actual)).toEqual(Object.keys(expected));
  for (const [path, y] of Object.entries(expected)) {
    expect(actual[path], path).toBeCloseTo(y, COORDINATE_DIGITS);
  }
}

describe('HierarchicalPortPositionProcessor site rows (T14a)', () => {
  it('S9: FIXED_POS places the west and east dummies at the port position minus the anchor', () => {
    // oracle: sites/HierarchicalPortPosition/fixedCoordinates/fixedPos; HierarchicalPortPositionProcessor.java:115-122
    expectY(placedY('sites/HierarchicalPortPosition/fixedCoordinates/fixedPos', ['g0/n0', 'g0/n1']), {
      'g0/n0': 48,
      'g0/n1': 128,
    });
  });

  it('S9: FIXED_RATIO multiplies the ratio with the graph height before applying it', () => {
    // oracle: sites/HierarchicalPortPosition/fixedCoordinates/fixedRatio; HierarchicalPortPositionProcessor.java:117-119
    expectY(placedY('sites/HierarchicalPortPosition/fixedCoordinates/fixedRatio', ['g0/n0', 'g0/n1']), {
      'g0/n0': 18.240000000000002,
      'g0/n1': 59.84,
    });
  });

  it('S9: north and south dummies and normal nodes in the first and last layer keep their y', () => {
    // oracle: sites/HierarchicalPortPosition/fixedCoordinates/northSouth; HierarchicalPortPositionProcessor.java:105
    // (not an external port dummy) and :111 (north or south side)
    expectY(
      placedY('sites/HierarchicalPortPosition/fixedCoordinates/northSouth', ['new/n0', 'g0/n6', 'g0/n7', 'new/n1']),
      {
        'new/n0': -10,
        'g0/n6': 0,
        'g0/n7': -15,
        'new/n1': 25,
      },
    );
  });

  it('S10: a graph without layers is left untouched', () => {
    // oracle: sites/HierarchicalPortPosition/emptyGraph; HierarchicalPortPositionProcessor.java:74,:78 (no layer to fix)
    const actual = replayed('sites/HierarchicalPortPosition/emptyGraph');
    expect(actual.layers).toEqual([]);
    expect(actual.changed).toEqual([]);
    expect(actual.geometry.layers).toEqual([]);
  });

  it('S10 (structural): an empty graph with fixed port positions is not indexed for a first or last layer', () => {
    // HierarchicalPortPositionProcessor.java:74,:78 guard layers.get(0) and layers.get(size - 1) by the layer count;
    // the rows of this class have free port constraints, which return before the layer is read
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    new HierarchicalPortPositionProcessor().process(graph, new NullElkProgressMonitor());
    expect(graph.getLayers()).toEqual([]);
    expect(graph.getSize().y).toBe(0);
  });
});
