// SPDX-License-Identifier: EPL-2.0
// Proof of LabelManagementProcessor (mission 7f2, T5): every `scenarios/LabelManagementProcessor/*` row of `layered-labels.json`
// replayed through 7f's step interpreter with the 7f2 processors injected (their enum arms stay staged until T11), the G6
// manager installed by the `labelManager <kind>` op and the rest of the plan built from the real enums. Expectations come only
// from the rows (L4, AD-13); numbers within 1e-6 (AD-4).
import { beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow, type LabelsStepsResult } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { rowsByClass } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import {
  isStopRow,
  registerPipelineEnums,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
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
import { EndLabelPostprocessor } from './EndLabelPostprocessor.js';
import { EndLabelPreprocessor } from './EndLabelPreprocessor.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { LabelDummyInserter } from './LabelDummyInserter.js';
import { LabelDummyRemover } from './LabelDummyRemover.js';
import { LabelDummySwitcher } from './LabelDummySwitcher.js';
import { LabelManagementProcessor } from './LabelManagementProcessor.js';
import { LabelSideSelector } from './LabelSideSelector.js';

const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  LABEL_DUMMY_INSERTER: () => new LabelDummyInserter(),
  LABEL_DUMMY_SWITCHER: () => new LabelDummySwitcher(),
  LABEL_DUMMY_REMOVER: () => new LabelDummyRemover(),
  END_LABEL_PREPROCESSOR: () => new EndLabelPreprocessor(),
  END_LABEL_POSTPROCESSOR: () => new EndLabelPostprocessor(),
  COMMENT_PREPROCESSOR: () => new CommentPreprocessor(),
  COMMENT_NODE_MARGIN_CALCULATOR: () => new CommentNodeMarginCalculator(),
  COMMENT_POSTPROCESSOR: () => new CommentPostprocessor(),
  LABEL_SIDE_SELECTOR: () => new LabelSideSelector(),
  CENTER_LABEL_MANAGEMENT_PROCESSOR: () => new LabelManagementProcessor(true),
  END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR: () => new LabelManagementProcessor(false),
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

/** Replays a row with the processors injected and compares with the recorded expectation (L4, AD-4). */
function replay(row: PipelineStopRow): LabelsStepsResult {
  // a `models` row replays its prefix, a `scenarios` row its steps
  const result: LabelsStepsResult =
    row.steps === null
      ? { graph: runRoutingPrefix(row, factories), components: null, terminal: null }
      : runLabelsRow(row, { factories, components: new ComponentsProcessor() });
  const actual = labelsDump(result, row.expected);
  expect(compareLabels(actual, row.expected)).toEqual([]);
  if (row.expected.dump !== undefined) {
    const dump = dumpWithPropertyValues(result.graph);
    expect(compareRoutingFullDump({ ...actual, dump }, row.expected)).toEqual([]);
  }
  return result;
}

const SCENARIOS = 'scenarios/LabelManagementProcessor';

const rows = rowsByClass(SCENARIOS).filter(isStopRow);

describe('LabelManagementProcessor (oracle rows)', () => {
  it('finds the 22 recorded rows (center and end-node-port x wide, wide-mixed; none x RIGHT, DOWN)', () => {
    expect(rows.length).toBe(22);
    expect(rows.filter((row) => row.id.startsWith(`${SCENARIOS}/none/`)).length).toBe(2);
  });

  for (const row of rows) {
    it(`replays ${row.id}`, () => {
      replay(row);
    });
  }
});

describe('LabelManagementProcessor (module)', () => {
  it('imports first in a fresh module graph without reading an enum constant at import time (F10)', async () => {
    const { LabelManagementProcessor: Imported } = await import('./LabelManagementProcessor.js');
    expect(Imported.MIN_WIDTH_EDGE_LABELS).toBe(60);
    expect(new Imported(true)).toBeInstanceOf(Imported);
  });
});
