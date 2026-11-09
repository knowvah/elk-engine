// SPDX-License-Identifier: EPL-2.0
// Anchored cases of DotDebugUtil (mission 7f2, T17b): the segment-graph overload (`DotDebugUtil.java:128-157`, row
// `sites/JsonDebugUtil/segmentGraph`, Sc1) and the hypernode overload (`:159-233`, the `phase5 - <i>-full` graph of a
// logged scenario), replayed through T2's `logging` op with the real enums. The strings are copied from the rows
// (`// oracle: <row id>; <Java file:line>`): the segment graph prints ids that are not identity hashes and is compared
// exactly; the hypernode graph prints identity hashes and is compared under G3a's normaliser, both sides alike.
// L4: no hand-written output.
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../test/helpers/layered-labels-replay-dump.js';
import { normalizeIdentityHashes } from '../../../test/helpers/layered-labels-replay-logged.js';
import { runLabelsRow } from '../../../test/helpers/layered-labels-replay-ops.js';
import { loadLabelsRows } from '../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from './components/ComponentsProcessor.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from './options/CycleBreakingStrategy.js';
import { LayeringStrategy } from './options/LayeringStrategy.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

const factories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
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
        expect(phase).toBe('P5_EDGE_ROUTING');
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

interface Logged {
  readonly tags: readonly string[];
  readonly dot: readonly string[];
  readonly json: readonly string[];
}

/** Replays the logging row with the real enums; `diffs` is the whole-row comparison with the oracle (G3, G3a). */
function replay(id: string): { logged: Logged; diffs: unknown[] } {
  const row = loadLabelsRows().find((candidate) => candidate.id === id);
  if (row === undefined || !isStopRow(row)) {
    throw new Error(`no stop row ${id}`);
  }
  const result = runLabelsRow(row, { factories, components: new ComponentsProcessor() });
  return { logged: result.logged as Logged, diffs: compareLabels(labelsDump(result, row.expected), row.expected) };
}

/** The logged DOT or JSON string(s) under a tag, in log order. */
const underTag = (logged: Logged, tag: string, strings: readonly string[]): string[] =>
  logged.tags.flatMap((t, i) => (t === tag ? [strings[i] as string] : []));

const SEGMENT_ROW = 'sites/JsonDebugUtil/segmentGraph';
const HYPERNODE_ROW = 'scenarios/Layout/logging/comments-free/DOWN';

describe('DotDebugUtil, segment graph overload', () => {
  // oracle: sites/JsonDebugUtil/segmentGraph; DotDebugUtil.java:128-157 (one `->` line per successor, none for the single segment)
  it('prints the segments of both components, the successor arrow only where a segment has one', () => {
    const { logged, diffs } = replay(SEGMENT_ROW);
    expect(underTag(logged, 'segment graph', logged.dot)).toEqual([
      'digraph {\n  0[label="ls[n_root.a]"]\n  1[label="ls[n(long_edge)_0]"]\n  1->2\n  2[label="ls[n_root.b]"]\n  3[label="ls[n_root.c]"]\n}\n',
      'digraph {\n  0[label="ls[n_root.d]"]\n}\n',
    ]);
    expect(diffs).toEqual([]);
  });
});

describe('DotDebugUtil, hypernode overload', () => {
  // oracle: scenarios/Layout/logging/comments-free/DOWN; DotDebugUtil.java:159-233 (the `phase5 - 0-full` and `phase5 - 1-full` graphs)
  it('prints one label per hypernode with its two port names, in the DOT of the orthogonal router', () => {
    const { logged, diffs } = replay(HYPERNODE_ROW);
    const normalized = (tag: string): string[] =>
      underTag(logged, tag, logged.dot).map((text) => normalizeIdentityHashes(text));
    expect(normalized('phase5 - 0-full')).toEqual([normalizeIdentityHashes('digraph {\n  0[label="{A,B}"]\n}\n')]);
    expect(normalized('phase5 - 1-full')).toEqual([normalizeIdentityHashes('digraph {\n  0[label="{B,root.c}"]\n}\n')]);
    expect(diffs).toEqual([]);
  });
});
