// SPDX-License-Identifier: EPL-2.0
// Proof of HierarchicalPortOrthogonalEdgeRouter (mission 7f, T6): every `models` row that stops at
// `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER` and every `scenarios/HierarchicalPortOrthogonalEdgeRouter/*` row of
// test/golden/refs/java/layered-pipeline.json, replayed with the full plan built from the real enums
// (`IntermediateProcessorStrategy`, the phase strategies), the class under test injected for its arm (still throwing
// until T8) and the routers injected for `P5_EDGE_ROUTING`. The members of other 7f tasks whose arms still throw
// (`GraphTransformer`, `EndLabelSorter`) are injected too, so the direction and `end` scenarios replay whole.
// Expectations come only from the rows and the Java (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { loadPipelineRows, isStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import type { RoutingRow } from '../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from '../p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../p5edges/PolylineEdgeRouter.js';
import { EndLabelSorter } from './EndLabelSorter.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';
import { HierarchicalPortOrthogonalEdgeRouter } from './HierarchicalPortOrthogonalEdgeRouter.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const PIPELINE_FILE = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const ROUTING_PHASE = 'P5_EDGE_ROUTING';
const STOP = 'HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER';
const SCENARIO_PREFIX = 'scenarios/HierarchicalPortOrthogonalEdgeRouter/';
const MODEL_PREFIX = 'models/';
const STOP_SEGMENT = 3;

/** The stop of a `models` row id `models/<model>/<level>/<stop>/<variant>`. */
const stopOf = (row: RoutingRow): string | undefined => row.id.split('/')[STOP_SEGMENT];

/** The arms of this brief that still throw: injected here until T8 wires them. */
const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  [STOP]: () => new HierarchicalPortOrthogonalEdgeRouter(),
  DIRECTION_PREPROCESSOR: () => new GraphTransformer(Mode.TO_INPUT_DIRECTION),
  DIRECTION_POSTPROCESSOR: () => new GraphTransformer(Mode.TO_INTERNAL_LTR),
  END_LABEL_SORTER: () => new EndLabelSorter(),
};

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    return Object.hasOwn(INJECTED, name) ? INJECTED[name]!() : IntermediateProcessorStrategy.valueOf(name).create();
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
        // P5_EDGE_ROUTING: the EdgeRouterFactory arm is T10's; the routers under test are injected
        expect(phase).toBe(ROUTING_PHASE);
        expect(['POLYLINE', 'ORTHOGONAL']).toContain(strategy);
        return strategy === 'POLYLINE' ? new PolylineEdgeRouter() : new OrthogonalEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows that stop at the processor (the `models` stop) and its scenarios. */
const rows: RoutingRow[] = loadPipelineRows(PIPELINE_FILE)
  .filter(isStopRow)
  .filter((row) => (row.id.startsWith(MODEL_PREFIX) && stopOf(row) === STOP) || row.id.startsWith(SCENARIO_PREFIX));

function replay(row: RoutingRow): LGraph {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

/** The rows by group, for the pinned inventory. */
function tally(selected: readonly RoutingRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of selected) {
    counts[row.group] = (counts[row.group] ?? 0) + 1;
  }
  return counts;
}

describe('HierarchicalPortOrthogonalEdgeRouter (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(tally(rows)).toEqual({ models: 15, scenarios: 32 });
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

describe('HierarchicalPortOrthogonalEdgeRouter (structure)', () => {
  it('throws IndexOutOfBoundsException on a graph without layers, as the unguarded layers.get(0) does', () => {
    // Java `fixCoordinates` reads `layers.get(0)` and `layers.get(layers.size() - 1)` with no guard
    expect(() =>
      new HierarchicalPortOrthogonalEdgeRouter().process(new LGraph(), new NullElkProgressMonitor()),
    ).toThrow(IndexOutOfBoundsException);
  });
});
