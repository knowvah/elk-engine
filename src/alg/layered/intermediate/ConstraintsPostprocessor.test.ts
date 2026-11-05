// SPDX-License-Identifier: EPL-2.0
// Proof of ConstraintsPostprocessor (mission 7f, T7): every `layered-pipeline.json` row whose plan runs `CONSTRAINTS_POSTPROCESSOR` (the `models` stops and the
// `scenarios`) replayed with the class injected for `CONSTRAINTS_POSTPROCESSOR` (the enum arm stays staged until T8) and the rest of the plan
// built from the real enums, the edge routers injected for `P5_EDGE_ROUTING`. Expectations come only from the rows (L4, AD-13).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { isStopRow, loadPipelineRows } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import type { RoutingRow } from '../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { LGraph as LGraphClass } from '../graph/LGraph.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from '../p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../p5edges/PolylineEdgeRouter.js';
import { SplineEdgeRouter } from '../p5edges/splines/SplineEdgeRouter.js';
import { ConstraintsPostprocessor } from './ConstraintsPostprocessor.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';
import { HierarchicalPortOrthogonalEdgeRouter } from './HierarchicalPortOrthogonalEdgeRouter.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const ROWS_FILE = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const PROCESSOR = 'CONSTRAINTS_POSTPROCESSOR';

const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  [PROCESSOR]: () => new ConstraintsPostprocessor(),
  DIRECTION_PREPROCESSOR: () => new GraphTransformer(Mode.TO_INPUT_DIRECTION),
  DIRECTION_POSTPROCESSOR: () => new GraphTransformer(Mode.TO_INTERNAL_LTR),
  HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER: () => new HierarchicalPortOrthogonalEdgeRouter(),
};

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    // the class under test and the members of this mission whose enum arms are wired by T8
    return INJECTED[name]?.() ?? IntermediateProcessorStrategy.valueOf(name).create();
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
        expect(phase).toBe('P5_EDGE_ROUTING');
        expect(['POLYLINE', 'ORTHOGONAL', 'SPLINES']).toContain(strategy);
        if (strategy === 'SPLINES') {
          return new SplineEdgeRouter();
        }
        return strategy === 'POLYLINE' ? new PolylineEdgeRouter() : new OrthogonalEdgeRouter();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** The rows of this class: its own stop (the processor ends the prefix) and its \`scenarios/ConstraintsPostprocessor/*\` chains. */
function isOwnRow(row: RoutingRow): boolean {
  return row.group === 'models'
    ? row.prefix?.at(-1) === PROCESSOR
    : row.id.startsWith('scenarios/ConstraintsPostprocessor/');
}

const rows: RoutingRow[] = loadPipelineRows(ROWS_FILE).filter(isStopRow).filter(isOwnRow);

describe('ConstraintsPostprocessor (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(rows.length).toBe(191);
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      const graph = row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
      const actual = routingDump(graph, importRow(row).importDump);
      expect(compareRouting(actual, row.expected)).toEqual([]);
      if (row.expected.dump !== undefined) {
        expect(compareRoutingFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
      }
    });
  }
});

describe('ConstraintsPostprocessor (the rows are not vacuous)', () => {
  it('the state without the processor differs from the recorded state after it', () => {
    const row = rows.find((r) => r.id === 'scenarios/ConstraintsPostprocessor/position-ids/chain')!;
    const idle: Factories = {
      ...factories,
      createProcessor: (name) =>
        name === PROCESSOR ? { process: (): void => undefined } : factories.createProcessor(name),
    };
    const before = routingDump(runRoutingSteps(row, idle), importRow(row).importDump);
    expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
  });
});

/** A monitor with logging enabled: the Java `isLoggingEnabled()` branch reaches `DebugUtil`. */
class LoggingMonitor extends BasicProgressMonitor {
  override isLoggingEnabled(): boolean {
    return true;
  }
}

describe('ConstraintsPostprocessor (staged DebugUtil, mission 7f2)', () => {
  it('throws UnsupportedOperationException naming 7f2 when logging is enabled', () => {
    expect(() => new ConstraintsPostprocessor().process(new LGraphClass(), new LoggingMonitor())).toThrow(
      UnsupportedOperationException,
    );
  });
});
