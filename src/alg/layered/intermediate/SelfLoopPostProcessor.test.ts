// SPDX-License-Identifier: EPL-2.0
// Proof of SelfLoopPostProcessor (mission 7g, T13): every `scenarios/SelfLoopPostProcessor/*` row and every
// `models/*/SELF_LOOP_POSTPROCESSOR/*` row of test/golden/refs/java/layered-loops.json, replayed with all nine pending 7g
// arms injected through `factoriesWith` (the enum arms keep throwing until the wiring task). A row passes when
// `replayLoopsRow` reports no mismatch (numbers within 1e-6, everything else exactly), `expected.selfLoops` included. W6
// twin: `SelfHyperLoop.getSLEdges()` (a Java `HashSet`) iterated in reverse inside the post-processor. Expectations come
// only from the rows (L4).
import { beforeAll, describe, expect, it } from 'vitest';
import {
  factoriesWith,
  registerTwinHook,
  unregisterTwinHook,
} from '../../../../test/helpers/layered-loops-replay-ops.js';
import {
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  type LoopsRow,
} from '../../../../test/helpers/layered-loops-replay-rows.js';
import { withListOptions } from '../../../../test/helpers/layered-loops-replay-wrapping.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { HorizontalGraphCompactor } from './compaction/HorizontalGraphCompactor.js';
import { SelfHyperLoop } from './loops/SelfHyperLoop.js';
import { SelfLoopPortRestorer } from './SelfLoopPortRestorer.js';
import { SelfLoopPostProcessor } from './SelfLoopPostProcessor.js';
import { SelfLoopPreProcessor } from './SelfLoopPreProcessor.js';
import { SelfLoopRouter } from './SelfLoopRouter.js';
import { BreakingPointInserter } from './wrapping/BreakingPointInserter.js';
import { BreakingPointProcessor } from './wrapping/BreakingPointProcessor.js';
import { BreakingPointRemover } from './wrapping/BreakingPointRemover.js';
import { SingleEdgeGraphWrapper } from './wrapping/SingleEdgeGraphWrapper.js';

const STOP = 'SELF_LOOP_POSTPROCESSOR';
const SCENARIO_PREFIX = 'scenarios/SelfLoopPostProcessor/';
const STOP_SEGMENT_FROM_END = 2;
const TWIN_SL_EDGES = 'T13-twin-slEdges-postprocessor';

const factories = factoriesWith({
  SELF_LOOP_PREPROCESSOR: () => new SelfLoopPreProcessor(),
  SELF_LOOP_PORT_RESTORER: () => new SelfLoopPortRestorer(),
  SELF_LOOP_ROUTER: () => new SelfLoopRouter(),
  SELF_LOOP_POSTPROCESSOR: () => new SelfLoopPostProcessor(),
  HORIZONTAL_COMPACTOR: () => new HorizontalGraphCompactor(),
  BREAKING_POINT_INSERTER: () => new BreakingPointInserter(),
  BREAKING_POINT_PROCESSOR: () => new BreakingPointProcessor(),
  BREAKING_POINT_REMOVER: () => new BreakingPointRemover(),
  SINGLE_EDGE_GRAPH_WRAPPER: () => new SingleEdgeGraphWrapper(),
});

/** The `models` rows end `.../<stop>/<variant>`. */
const isStopRow = (row: LoopsRow): boolean =>
  row.group === 'models' && row.id.split('/').at(-STOP_SEGMENT_FROM_END) === STOP;

const rows = loadLoopsRowsIfPresent();
const scenarios = rows.filter((row) => row.id.startsWith(SCENARIO_PREFIX));
const models = rows.filter(isStopRow);

type ProcessFn = (graph: LGraph, monitor: IElkProgressMonitor) => void;

/** `original` run with `getSLEdges()` returning a reversed copy of the loop's edge set. */
function withReversedSLEdges(original: ProcessFn): ProcessFn {
  return function (this: unknown, graph: LGraph, monitor: IElkProgressMonitor): void {
    const prototype = SelfHyperLoop.prototype as unknown as { getSLEdges: () => Set<unknown> };
    const getSLEdges = prototype.getSLEdges;
    prototype.getSLEdges = function (this: SelfHyperLoop): Set<unknown> {
      return new Set([...getSLEdges.call(this)].reverse());
    };
    try {
      original.call(this, graph, monitor);
    } finally {
      prototype.getSLEdges = getSLEdges;
    }
  };
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
  registerTwinHook({ name: TWIN_SL_EDGES, target: SelfLoopPostProcessor, wrap: withReversedSLEdges });
  return () => {
    unregisterTwinHook(TWIN_SL_EDGES);
  };
});

const replay = (row: LoopsRow, twins: readonly string[] = []) =>
  replayLoopsRow(withListOptions(row), { factories, twins });

describe('the rows of SelfLoopPostProcessor', () => {
  it('finds 83 scenario rows and 42 models rows', () => {
    expect(scenarios.length).toBe(83);
    expect(models.length).toBe(42);
  });

  describe('scenario rows', () => {
    it.each(scenarios.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replay(row)).toEqual([]);
    });
  });

  describe('models rows', () => {
    it.each(models.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replay(row)).toEqual([]);
    });
  });

  describe('W6 twin: getSLEdges() iterated in reverse', () => {
    it.each([...scenarios, ...models].map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replay(row, [TWIN_SL_EDGES])).toEqual([]);
    });
  });
});
