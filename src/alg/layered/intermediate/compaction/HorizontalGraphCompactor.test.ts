// SPDX-License-Identifier: EPL-2.0
// Oracle rows of HorizontalGraphCompactor (mission 7g, T7): every `scenarios/HorizontalGraphCompactor/*` row and every
// `models/*/HORIZONTAL_COMPACTOR/*` row whose plan names no other unported arm, replayed with the class injected through
// `factoriesWith` (the enum arm keeps throwing until a later task wires it), plus the W6 reversal twins of the identity
// hashed containers whose iteration order is observable.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../../test/corpus/corpus.js';
import {
  factoriesWith,
  registerTwinHook,
  unregisterTwinHook,
} from '../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  loadLoopsRowsIfPresent,
  replayLoopsRow,
  rowsByClass,
  rowsByLastPrefixEntry,
  type LoopsRow,
} from '../../../../../test/helpers/layered-loops-replay-rows.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { HorizontalGraphCompactor } from './HorizontalGraphCompactor.js';
import { LGraphToCGraphTransformer } from './LGraphToCGraphTransformer.js';

const SCENARIO_CLASS = 'scenarios/HorizontalGraphCompactor';
const COMPACTOR_ARM = 'HORIZONTAL_COMPACTOR';
const SPAWN_TIMEOUT_MS = 60_000;
/** The arms of 7g that are still unported: a row whose plan names one is replayed by the task that ports it. */
const OTHER_UNPORTED_ARMS: ReadonlySet<string> = new Set([
  'SELF_LOOP_PREPROCESSOR',
  'SELF_LOOP_PORT_RESTORER',
  'SELF_LOOP_ROUTER',
  'SELF_LOOP_POSTPROCESSOR',
  'BREAKING_POINT_INSERTER',
  'BREAKING_POINT_PROCESSOR',
  'BREAKING_POINT_REMOVER',
  'SINGLE_EDGE_GRAPH_WRAPPER',
]);
const TWIN_TRANSFORMER_MAPS = 'T7-twin-transformer-maps';

/** The processor and phase names a row's plan runs (a model row's `prefix`, a scenario row's `steps`). */
function planNames(row: LoopsRow): string[] {
  const fromPrefix = (row.prefix ?? []).map((entry) => entry.split('/')[0]!);
  const fromSteps = (row.steps ?? []).flatMap((step) => (step[0] === 'runProcessor' ? [String(step[1])] : []));
  return [...fromPrefix, ...fromSteps];
}

const needsOtherArm = (row: LoopsRow): boolean => planNames(row).some((name) => OTHER_UNPORTED_ARMS.has(name));

const allRows = (): readonly LoopsRow[] => loadLoopsRowsIfPresent();
const compactorRows = (): LoopsRow[] => [
  ...rowsByClass(SCENARIO_CLASS, allRows()),
  ...rowsByLastPrefixEntry(COMPACTOR_ARM, allRows()).filter((row) => row.id.startsWith('models/')),
];
const replayable = compactorRows().filter((row) => !needsOtherArm(row));
const skipped = compactorRows().filter(needsOtherArm);

const factories = factoriesWith({ [COMPACTOR_ARM]: () => new HorizontalGraphCompactor() });

// ------------------------------------------------------------------------------------------------------------
// W6 twins

/** A `Map` whose key and entry iteration runs in reverse insertion order (lookups are unchanged). */
class ReversedIterationMap<K, V> extends Map<K, V> {
  override keys(): MapIterator<K> {
    return [...super.keys()].reverse().values() as MapIterator<K>;
  }

  override entries(): MapIterator<[K, V]> {
    return [...super.entries()].reverse().values() as MapIterator<[K, V]>;
  }
}

type ProcessFn = (graph: LGraph, monitor: IElkProgressMonitor) => void;
type TransformerPrivates = {
  nodesMap: Map<unknown, unknown>;
  verticalSegmentsMap: Map<unknown, unknown>;
  commentOffsets: Map<unknown, unknown>;
};

/** Runs `original` with `LGraphToCGraphTransformer.transform` installing reverse-iterating maps (nodesMap, verticalSegmentsMap, commentOffsets). */
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
  registerTwinHook({
    name: TWIN_TRANSFORMER_MAPS,
    target: HorizontalGraphCompactor,
    wrap: withReversedTransformerMaps,
  });
  return () => {
    unregisterTwinHook(TWIN_TRANSFORMER_MAPS);
  };
});

describe('the rows of HorizontalGraphCompactor', () => {
  it('replays the 93 rows that name no other unported arm and skips the 35 that do', () => {
    expect(rowsByClass(SCENARIO_CLASS, allRows()).length).toBe(69);
    expect(compactorRows().length).toBe(128);
    expect(replayable.length).toBe(93);
    expect(skipped.length).toBe(35);
    expect(skipped.every((row) => planNames(row).some((name) => OTHER_UNPORTED_ARMS.has(name)))).toBe(true);
  });
});

describe('HorizontalGraphCompactor (oracle rows)', () => {
  for (const row of replayable) {
    it(`replays ${row.id}`, () => {
      expect(replayLoopsRow(row, { factories })).toEqual([]);
    });
  }
});

describe('HorizontalGraphCompactor (W6 reversal twins)', () => {
  for (const row of replayable) {
    it(`replays ${row.id} with the transformer maps iterated in reverse`, () => {
      expect(replayLoopsRow(row, { factories, twins: [TWIN_TRANSFORMER_MAPS] })).toEqual([]);
    });
  }
});

describe('the modules load in a fresh process (F10)', () => {
  it.each([
    'VerticalSegment',
    'CNodeOrigins',
    'EdgeAwareScanlineConstraintCalculation',
    'HorizontalGraphCompactor',
    'NetworkSimplexCompaction',
    'LGraphToCGraphTransformer',
    'LGraphToCGraphTransformerOrthogonal',
    'LGraphToCGraphTransformerSplines',
  ])(
    '%s',
    (name) => {
      const script = `import(${JSON.stringify(join(repoRoot(), 'src/alg/layered/intermediate/compaction', `${name}.ts`))})`;
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

describe('NetworkSimplexCompaction on a comment box under EDGE_LENGTH (Java NetworkSimplexCompaction.java:250)', () => {
  it('throws where the Java throws its NullPointerException: reading cGroup of the missing target CNode', () => {
    // The oracle could not record these graphs (the Java throws), so the row is a recorded comment-box graph with only the
    // strategy changed; the expectation is the Java statement `nNodes[target.cGroup.id]` with a null `target`.
    const row = rowsByClass(SCENARIO_CLASS, allRows()).find((candidate) => candidate.id.includes('/comments-'))!;
    const input = structuredClone(row.input) as unknown as { elk: { layoutOptions: Record<string, string> } };
    input.elk.layoutOptions['postCompaction.strategy'] = 'EDGE_LENGTH';
    let thrown: unknown = null;
    try {
      replayLoopsRow({ ...row, input: input as unknown as LoopsRow['input'] }, { factories });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect(String((thrown as TypeError).message)).toContain("reading 'cGroup'");
    expect(String((thrown as TypeError).stack).split('\n')[1]).toContain(
      'NetworkSimplexCompaction.addEdgeConstraintsOf',
    );
  });
});
