// SPDX-License-Identifier: EPL-2.0
// Proof of AlternatingLayerUnzipper (mission 7f2, T8): every `layered-labels.json` row that stops on, or runs, the processor
// (`models` rows whose prefix ends on ALTERNATING_LAYER_UNZIPPER, the `scenarios/AlternatingLayerUnzipper/*` chains), replayed
// with the class injected for the staged enum arm (T11 wires it) and the 7f2 siblings its plans need (LabelDummyInserter,
// CommentPreprocessor) injected the same way. Expectations come only from the rows (L4, AD-13).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  compareLabels,
  labelsDump,
  type LabelsExpected,
} from '../../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../../test/helpers/layered-labels-replay-ops.js';
import {
  isStopRow,
  loadLabelsRows,
  rowsByClass,
  rowsByLastPrefixEntry,
  type PipelineStopRow,
} from '../../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../../test/helpers/layered-phase-replay-ops.js';
import type { ComponentsHandler } from '../../../../../test/helpers/layered-pipeline-replay-ops.js';
import { runRoutingPrefix } from '../../../../../test/helpers/layered-routing-replay-ops.js';
import type { RoutingRow } from '../../../../../test/helpers/layered-routing-replay-rows.js';
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { LGraph } from '../../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from '../../p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../../p5edges/PolylineEdgeRouter.js';
import { SplineEdgeRouter } from '../../p5edges/splines/SplineEdgeRouter.js';
import { CommentPreprocessor } from '../CommentPreprocessor.js';
import { IntermediateProcessorStrategy } from '../IntermediateProcessorStrategy.js';
import { LabelDummyInserter } from '../LabelDummyInserter.js';
import { AlternatingLayerUnzipper } from './AlternatingLayerUnzipper.js';

const PROCESSOR = 'ALTERNATING_LAYER_UNZIPPER';
const SCENARIOS = 'scenarios/AlternatingLayerUnzipper';

// the class under test and the 7f2 siblings its plans run; every enum arm is wired by T11
const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  [PROCESSOR]: () => new AlternatingLayerUnzipper(),
  LABEL_DUMMY_INSERTER: () => new LabelDummyInserter(),
  COMMENT_PREPROCESSOR: () => new CommentPreprocessor(),
};

const ROUTERS: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  POLYLINE: () => new PolylineEdgeRouter(),
  ORTHOGONAL: () => new OrthogonalEdgeRouter(),
  SPLINES: () => new SplineEdgeRouter(),
};

function createPhase(phase: string, strategy: string): ILayoutProcessor<LGraph> {
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
      // P5_EDGE_ROUTING: the EdgeRouterFactory arm is not under test here; the routers are injected
      expect(phase).toBe('P5_EDGE_ROUTING');
      return (ROUTERS[strategy] as () => ILayoutProcessor<LGraph>)();
  }
}

const factories: Factories = {
  createProcessor: (name) => INJECTED[name]?.() ?? IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase,
};

/** The scenarios never split components; a call is a defect of the row, not of the class. */
const noComponents: ComponentsHandler = {
  split(): never {
    throw new Error('a scenario of this class holds no componentsSplit step');
  },
  combine(): never {
    throw new Error('a scenario of this class holds no componentsCombine step');
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const scenarioRows = rowsByClass(SCENARIOS).filter(isStopRow);
const modelRows = rowsByLastPrefixEntry(PROCESSOR).filter(isStopRow);

function replay(row: PipelineStopRow): ReturnType<typeof compareLabels> {
  const expected = row.expected as unknown as LabelsExpected;
  const result =
    row.steps === null
      ? { graph: runRoutingPrefix(row as unknown as RoutingRow, factories), components: null, terminal: null }
      : runLabelsRow(row, { factories, components: noComponents });
  return compareLabels(labelsDump(result, expected), expected);
}

describe('AlternatingLayerUnzipper (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect(scenarioRows.length).toBe(15);
    expect(modelRows.length).toBe(224);
  });

  it('covers the id families of the scenarios', () => {
    const families = new Set(scenarioRows.map((row) => row.id.split('/')[2]));
    expect([...families].sort()).toEqual(['fan4-long-noreset', 'fan5-long-split3', 'fan5-split2']);
  });

  for (const row of [...scenarioRows, ...modelRows]) {
    it(`replays ${row.id}`, () => {
      expect(replay(row)).toEqual([]);
    });
  }
});

describe('AlternatingLayerUnzipper (module)', () => {
  it('imports in a fresh module graph without a ReferenceError and constructs a processor', async () => {
    vi.resetModules();
    const fresh = await import('./AlternatingLayerUnzipper.js');
    expect(typeof new fresh.AlternatingLayerUnzipper().process).toBe('function');
    expect(loadLabelsRows().length).toBeGreaterThan(0);
  });
});
