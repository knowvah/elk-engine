// SPDX-License-Identifier: EPL-2.0
// Proof of LabelSideSelector (mission 7f2, T5): every `scenarios/LabelSideSelector/*` row and every `models` row that stops at
// `LABEL_SIDE_SELECTOR` of `layered-labels.json`, replayed through 7f's step interpreter with the 7f2 processors injected (their
// enum arms stay staged until T11) and the rest of the plan built from the real enums. Expectations come only from the rows
// (L4, AD-13); numbers within 1e-6 (AD-4).
import { compareLabelsFullRow, runLabelsFullRow } from '../../../../test/helpers/layered-labels-replay-full.js';
import { EdgeLabelSideSelection } from '../options/EdgeLabelSideSelection.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { compareLabels, labelsDump } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow, type LabelsStepsResult } from '../../../../test/helpers/layered-labels-replay-ops.js';
import {
  rowsByClass,
  rowsByGroup,
  rowsByLastPrefixEntry,
} from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import {
  isFullRow,
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

const SCENARIOS = 'scenarios/LabelSideSelector';
const STOP = 'LABEL_SIDE_SELECTOR';

const scenarioRows = rowsByClass(SCENARIOS).filter(isStopRow);
const modelRows = rowsByLastPrefixEntry(STOP).filter(isStopRow);

describe('LabelSideSelector (oracle rows)', () => {
  it('finds the 25 scenario rows (five graphs x RIGHT, RIGHT/end, LEFT, DOWN, UP) and the 80 model rows', () => {
    expect(scenarioRows.length).toBe(25);
    expect(modelRows.length).toBe(80);
  });

  for (const row of [...scenarioRows, ...modelRows]) {
    it(`replays ${row.id}`, () => {
      replay(row);
    });
  }
});

/**
 * The six `EdgeLabelSideSelection` arms: no `scenarios` or `models` row sets a mode other than the default `SMART_DOWN` and
 * `SMART_UP`, so the `full/label-options/<model>/side-<mode>` rows (a whole layout per mode) are laid out with the 7f2
 * processors injected into the enum for the duration of the suite (`create` is patched, the arms stay staged until T11).
 */
describe('LabelSideSelector (full rows, one per EdgeLabelSideSelection value)', () => {
  const sideRows = rowsByGroup('full')
    .filter(isFullRow)
    .filter((row) => /^full\/label-options\/[^/]+\/side-/.test(row.id));
  const originalCreate = IntermediateProcessorStrategy.prototype.create;

  beforeAll(() => {
    IntermediateProcessorStrategy.prototype.create = function (this: IntermediateProcessorStrategy) {
      return INJECTED[this.name()]?.() ?? originalCreate.call(this);
    };
  });
  afterAll(() => {
    IntermediateProcessorStrategy.prototype.create = originalCreate;
  });

  it('finds the 36 recorded rows (six models x the six modes)', () => {
    expect(sideRows.length).toBe(36);
    expect(new Set(sideRows.map((row) => row.id.split('/side-')[1])).size).toBe(EdgeLabelSideSelection.values().length);
  });

  for (const row of sideRows) {
    it(`lays out ${row.id}`, () => {
      expect(compareLabelsFullRow(runLabelsFullRow(row), row)).toEqual([]);
    });
  }
});

describe('LabelSideSelector (module)', () => {
  it('imports first in a fresh module graph without reading an enum constant at import time (F10)', async () => {
    const { LabelSideSelector: Imported } = await import('./LabelSideSelector.js');
    expect(typeof Imported).toBe('function');
    expect(new Imported()).toBeInstanceOf(Imported);
  });
});
