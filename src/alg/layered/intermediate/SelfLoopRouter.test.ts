// SPDX-License-Identifier: EPL-2.0
// Proof of SelfLoopRouter and the four routers (mission 7g, T13): every `scenarios/SelfLoopRouter/*` row and every
// `models/*/SELF_LOOP_ROUTER/*` row of test/golden/refs/java/layered-loops.json, replayed with all nine pending 7g arms
// injected through `factoriesWith` (the enum arms keep throwing until the wiring task). A row passes when `replayLoopsRow`
// reports no mismatch (numbers within 1e-6, everything else exactly), `expected.selfLoops` included. Also replayed here,
// now that every arm is injectable: the HorizontalGraphCompactor rows and the wrapping rows that earlier tasks had to skip.
// W6 twins: `SelfHyperLoop.getSLEdges()` (a Java `HashSet`) iterated in reverse inside the router, and the
// LGraphToCGraphTransformer maps iterated in reverse on the compaction rows. Expectations come only from the rows (L4).
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import {
  factoriesWith,
  registerTwinHook,
  unregisterTwinHook,
} from '../../../../test/helpers/layered-loops-replay-ops.js';
import {
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  rowsByClass,
  rowsByLastPrefixEntry,
  type LoopsRow,
} from '../../../../test/helpers/layered-loops-replay-rows.js';
import { withListOptions } from '../../../../test/helpers/layered-loops-replay-wrapping.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { HorizontalGraphCompactor } from './compaction/HorizontalGraphCompactor.js';
import { LGraphToCGraphTransformer } from './compaction/LGraphToCGraphTransformer.js';
import { SelfHyperLoop } from './loops/SelfHyperLoop.js';
import { SelfLoopPortRestorer } from './SelfLoopPortRestorer.js';
import { SelfLoopPostProcessor } from './SelfLoopPostProcessor.js';
import { SelfLoopPreProcessor } from './SelfLoopPreProcessor.js';
import { SelfLoopRouter } from './SelfLoopRouter.js';
import { BreakingPointInserter } from './wrapping/BreakingPointInserter.js';
import { BreakingPointProcessor } from './wrapping/BreakingPointProcessor.js';
import { BreakingPointRemover } from './wrapping/BreakingPointRemover.js';
import { SingleEdgeGraphWrapper } from './wrapping/SingleEdgeGraphWrapper.js';

const STOP = 'SELF_LOOP_ROUTER';
const SCENARIO_PREFIX = 'scenarios/SelfLoopRouter/';
const STOP_SEGMENT_FROM_END = 2;
const SPAWN_TIMEOUT_MS = 60_000;
const TWIN_SL_EDGES = 'T13-twin-slEdges-router';
const TWIN_TRANSFORMER_MAPS = 'T13-twin-transformer-maps';

/** The nine arms of 7g that are not wired yet, injected so that no row needs skipping. */
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

/** The processor and phase names a row's plan runs (a model row's `prefix`, a scenario row's `steps`). */
function planNames(row: LoopsRow): string[] {
  const fromPrefix = (row.prefix ?? []).map((entry) => entry.split('/')[0]!);
  const fromSteps = (row.steps ?? []).flatMap((step) => (step[0] === 'runProcessor' ? [String(step[1])] : []));
  return [...fromPrefix, ...fromSteps];
}

/** The `models` rows end `.../<stop>/<variant>`. */
const isStopRow = (row: LoopsRow, stop: string): boolean =>
  row.group === 'models' && row.id.split('/').at(-STOP_SEGMENT_FROM_END) === stop;

const allRows = (): readonly LoopsRow[] => loadLoopsRowsIfPresent();
const scenarios = allRows().filter((row) => row.id.startsWith(SCENARIO_PREFIX));
const models = allRows().filter((row) => isStopRow(row, STOP));

// Rows other tasks skipped: the filters are those of HorizontalGraphCompactor.test.ts (T7) and WrappingRows.test.ts (T11).
const COMPACTOR_SKIP_ARMS: ReadonlySet<string> = new Set([
  'SELF_LOOP_PREPROCESSOR',
  'SELF_LOOP_PORT_RESTORER',
  'SELF_LOOP_ROUTER',
  'SELF_LOOP_POSTPROCESSOR',
  'BREAKING_POINT_INSERTER',
  'BREAKING_POINT_PROCESSOR',
  'BREAKING_POINT_REMOVER',
  'SINGLE_EDGE_GRAPH_WRAPPER',
]);
const WRAPPING_SKIP_ARMS: ReadonlySet<string> = new Set([
  'SELF_LOOP_PORT_RESTORER',
  'SELF_LOOP_ROUTER',
  'SELF_LOOP_POSTPROCESSOR',
]);
const compactorRows = [
  ...rowsByClass('scenarios/HorizontalGraphCompactor', allRows()),
  ...rowsByLastPrefixEntry('HORIZONTAL_COMPACTOR', allRows()).filter((row) => row.id.startsWith('models/')),
];
const skippedCompactorRows = compactorRows.filter((row) => planNames(row).some((n) => COMPACTOR_SKIP_ARMS.has(n)));
const WRAPPING_STOPS = [
  ['BREAKING_POINT_INSERTER', 'BreakingPointInserter'],
  ['BREAKING_POINT_PROCESSOR', 'BreakingPointProcessor'],
  ['BREAKING_POINT_REMOVER', 'BreakingPointRemover'],
  ['SINGLE_EDGE_GRAPH_WRAPPER', 'SingleEdgeGraphWrapper'],
] as const;
const skippedWrappingRows = WRAPPING_STOPS.flatMap(([arm, cls]) => [
  ...rowsByClass(`scenarios/${cls}`, allRows()),
  ...rowsByLastPrefixEntry(arm, allRows()).filter((row) => row.id.startsWith('models/')),
]).filter((row) => planNames(row).some((n) => WRAPPING_SKIP_ARMS.has(n)));

// ------------------------------------------------------------------------------------------------------------
// W6 twins

type ProcessFn = (graph: LGraph, monitor: IElkProgressMonitor) => void;

/** A `Map` whose key and entry iteration runs in reverse insertion order (lookups are unchanged). */
class ReversedIterationMap<K, V> extends Map<K, V> {
  override keys(): MapIterator<K> {
    return [...super.keys()].reverse().values() as MapIterator<K>;
  }

  override entries(): MapIterator<[K, V]> {
    return [...super.entries()].reverse().values() as MapIterator<[K, V]>;
  }
}

type TransformerPrivates = {
  nodesMap: Map<unknown, unknown>;
  verticalSegmentsMap: Map<unknown, unknown>;
  commentOffsets: Map<unknown, unknown>;
};

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

/** `original` run with `LGraphToCGraphTransformer.transform` installing reverse-iterating maps. */
function withReversedTransformerMaps(original: ProcessFn): ProcessFn {
  return function (this: unknown, graph: LGraph, monitor: IElkProgressMonitor): void {
    const prototype = LGraphToCGraphTransformer.prototype as unknown as { transform: (...args: unknown[]) => unknown };
    const transform = prototype.transform;
    prototype.transform = function (this: TransformerPrivates, ...args: unknown[]): unknown {
      this.nodesMap = new ReversedIterationMap();
      this.verticalSegmentsMap = new ReversedIterationMap();
      this.commentOffsets = new ReversedIterationMap();
      return transform.apply(this, args);
    };
    try {
      original.call(this, graph, monitor);
    } finally {
      prototype.transform = transform;
    }
  };
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
  registerTwinHook({ name: TWIN_SL_EDGES, target: SelfLoopRouter, wrap: withReversedSLEdges });
  registerTwinHook({
    name: TWIN_TRANSFORMER_MAPS,
    target: HorizontalGraphCompactor,
    wrap: withReversedTransformerMaps,
  });
  return () => {
    unregisterTwinHook(TWIN_SL_EDGES);
    unregisterTwinHook(TWIN_TRANSFORMER_MAPS);
  };
});

const replay = (row: LoopsRow, twins: readonly string[] = []) =>
  replayLoopsRow(withListOptions(row), { factories, twins });

describe('the rows of SelfLoopRouter', () => {
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

describe('the rows earlier tasks skipped while arms were unported', () => {
  it('holds the 35 HorizontalGraphCompactor rows and the 8 chain-loop wrapping rows', () => {
    expect(skippedCompactorRows.length).toBe(35);
    expect(skippedWrappingRows.length).toBe(8);
  });

  describe('HorizontalGraphCompactor rows', () => {
    it.each(skippedCompactorRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replay(row)).toEqual([]);
    });
  });

  describe('HorizontalGraphCompactor rows with the transformer maps iterated in reverse', () => {
    it.each(skippedCompactorRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replay(row, [TWIN_TRANSFORMER_MAPS])).toEqual([]);
    });
  });

  describe('wrapping rows', () => {
    it.each(skippedWrappingRows.map((row) => [row.id, row] as const))('%s', (_id, row) => {
      expect(replay(row)).toEqual([]);
    });
  });
});

describe('the modules load in a fresh process (F10)', () => {
  it.each([
    'intermediate/SelfLoopRouter',
    'intermediate/SelfLoopPostProcessor',
    'intermediate/loops/routing/AbstractSelfLoopRouter',
    // Not `OrthogonalSelfLoopRouter` or `PolylineSelfLoopRouter`: once the enum creates `SelfLoopRouter`, a process
    // entering at the base class meets `SplineSelfLoopRouter extends OrthogonalSelfLoopRouter` before the base has
    // evaluated (7b decision E1, part 3; `test/architecture/layered-entry-points.fitness.test.ts`).
    'intermediate/loops/routing/SplineSelfLoopRouter',
  ])(
    '%s',
    (name) => {
      const script = `import(${JSON.stringify(join(repoRoot(), 'src/alg/layered', `${name}.ts`))})`;
      let stderr = '';
      try {
        execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
          cwd: repoRoot(),
          stdio: ['ignore', 'ignore', 'pipe'],
          timeout: SPAWN_TIMEOUT_MS,
        });
      } catch (error) {
        stderr = String((error as { stderr?: Buffer | string }).stderr ?? error);
      }
      expect(stderr).toBe('');
    },
    SPAWN_TIMEOUT_MS,
  );
});
