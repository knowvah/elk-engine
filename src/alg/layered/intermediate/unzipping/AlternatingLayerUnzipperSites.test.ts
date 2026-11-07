// SPDX-License-Identifier: EPL-2.0
// Anchored case of AlternatingLayerUnzipper (mission 7f2, T17b) for the branch the oracle replay leaves unreached
// (plans/layered-labels/unreached.md, Sc15): the case replays the `sites/AlternatingLayerUnzipper/mixedSplit` row of
// `layered-labels.json` with the real enums and asserts the field the branch decides, with literals copied from the row
// (`// oracle: <row id>; <Java file:line>`). Expectations come only from the rows (L4, AD-13); layers and edges compare exactly.
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../../test/helpers/layered-labels-replay-ops.js';
import { loadLabelsRows } from '../../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../../../test/helpers/layered-pipeline-replay-rows.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from '../../components/ComponentsProcessor.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../../p5edges/EdgeRouterFactory.js';
import { IntermediateProcessorStrategy } from '../IntermediateProcessorStrategy.js';

const SITE_MIXED = 'sites/AlternatingLayerUnzipper/mixedSplit';

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

function replay(id: string): { actual: ReturnType<typeof labelsDump>; diffs: unknown[] } {
  const row = loadLabelsRows().find((candidate) => candidate.id === id);
  if (row === undefined || !isStopRow(row)) {
    throw new Error(`no stop row ${id}`);
  }
  const result = runLabelsRow(row, { factories, components: new ComponentsProcessor() });
  const actual = labelsDump(result, row.expected);
  return { actual, diffs: compareLabels(actual, row.expected) };
}

describe('AlternatingLayerUnzipper, mixed layer split (Sc15)', () => {
  // oracle: sites/AlternatingLayerUnzipper/mixedSplit; AlternatingLayerUnzipper.java:161-172 (the minimum split, 2, wins)
  it('splits the layer of x, y, z (splits 2, 3, 4) in two layers: y moves on, a long edge dummy takes its place', () => {
    const { actual, diffs } = replay(SITE_MIXED);
    expect(actual.layers).toEqual([['g0/n0'], ['g0/n1', 'new/n0', 'g0/n3'], ['g0/n2']]);
    expect(actual.edges.map((edge) => [edge.path, edge.src, edge.tgt])).toEqual([
      ['g0/e0', 'g0/n0/p0', 'g0/n1/p0'],
      ['g0/e1', 'g0/n0/p1', 'new/p0'],
      ['g0/e2', 'g0/n0/p2', 'g0/n3/p0'],
      ['new/e0', 'new/p1', 'g0/n2/p0'],
    ]);
    expect(diffs).toEqual([]);
  });
});
