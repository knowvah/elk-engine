// SPDX-License-Identifier: EPL-2.0
// Proof of CommentPostprocessor (mission 7f2, T7): every `scenarios/CommentPostprocessor/*` row of `layered-labels.json` replayed through 7f's
// step interpreter with the three comment processors injected (their enum arms stay staged until T11) and the rest of the
// plan built from the real enums. Expectations come only from the rows (L4, AD-13); numbers within 1e-6 (AD-4).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { rowsByClass } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, registerPipelineEnums } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { CommentNodeMarginCalculator } from './CommentNodeMarginCalculator.js';
import { CommentPostprocessor } from './CommentPostprocessor.js';
import { CommentPreprocessor } from './CommentPreprocessor.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const CLASS_PREFIX = 'scenarios/CommentPostprocessor';

const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  COMMENT_PREPROCESSOR: () => new CommentPreprocessor(),
  COMMENT_NODE_MARGIN_CALCULATOR: () => new CommentNodeMarginCalculator(),
  COMMENT_POSTPROCESSOR: () => new CommentPostprocessor(),
};

const factories: Factories = {
  createProcessor: (name) => INJECTED[name]?.() ?? IntermediateProcessorStrategy.valueOf(name).create(),
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

const rows = rowsByClass(CLASS_PREFIX).filter(isStopRow);

describe('CommentPostprocessor (oracle rows)', () => {
  it('finds the 10 recorded rows (free and fixed-side x RIGHT, RIGHT/end, LEFT, DOWN, UP)', () => {
    expect(rows.map((row) => row.id).sort()).toEqual(
      ['free', 'fixed-side']
        .flatMap((kind) => ['RIGHT', 'RIGHT/end', 'LEFT', 'DOWN', 'UP'].map((dir) => `${CLASS_PREFIX}/${kind}/${dir}`))
        .sort(),
    );
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      const result = runLabelsRow(row, { factories, components: new ComponentsProcessor() });
      const actual = labelsDump(result, row.expected);
      expect(compareLabels(actual, row.expected)).toEqual([]);
      if (row.expected.dump !== undefined) {
        const dump = dumpWithPropertyValues(result.graph);
        expect(compareRoutingFullDump({ ...actual, dump }, row.expected)).toEqual([]);
      }
    });
  }
});
