// SPDX-License-Identifier: EPL-2.0
// Test support shared by the LabelDummyInserter and LabelDummyRemover row proofs (mission 7f2, T4a): the factories with
// the two classes injected (their enum arms stay staged until T11) and the replay of one labels row. It is a `.test.ts`
// file because it imports test helpers (the bundle-boundary fitness test exempts only that suffix from the import rule).
import { describe, expect, it } from 'vitest';
import { compareLabels, labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import {
  runLabelsRow,
  type LabelsEnvironment,
  type LabelsStepsResult,
} from '../../../../test/helpers/layered-labels-replay-ops.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import type { PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from '../p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../p5edges/PolylineEdgeRouter.js';
import { SplineEdgeRouter } from '../p5edges/splines/SplineEdgeRouter.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';
import { HierarchicalPortOrthogonalEdgeRouter } from './HierarchicalPortOrthogonalEdgeRouter.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { LabelDummyInserter } from './LabelDummyInserter.js';
import { LabelDummyRemover } from './LabelDummyRemover.js';

const PORTED_LATER = 'is ported in mission';
const PROCESSOR_STEP = 'runProcessor';
const PHASE_SEPARATOR = '/';

/** The members whose enum arms are staged (or wired by a later task) and so are injected, by enum name. */
const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  LABEL_DUMMY_INSERTER: () => new LabelDummyInserter(),
  LABEL_DUMMY_REMOVER: () => new LabelDummyRemover(),
  DIRECTION_PREPROCESSOR: () => new GraphTransformer(Mode.TO_INPUT_DIRECTION),
  DIRECTION_POSTPROCESSOR: () => new GraphTransformer(Mode.TO_INTERNAL_LTR),
  HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER: () => new HierarchicalPortOrthogonalEdgeRouter(),
};

function routerOf(strategy: string): ILayoutProcessor<LGraph> {
  expect(['POLYLINE', 'ORTHOGONAL', 'SPLINES']).toContain(strategy);
  if (strategy === 'SPLINES') {
    return new SplineEdgeRouter();
  }
  return strategy === 'POLYLINE' ? new PolylineEdgeRouter() : new OrthogonalEdgeRouter();
}

/** The factories of a labels row: the injected members, the real enums for the rest, the routers for `P5_EDGE_ROUTING`. */
export const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
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
        // P5_EDGE_ROUTING: the EdgeRouterFactory arm is T10's of mission 7f; the routers are injected
        expect(phase).toBe('P5_EDGE_ROUTING');
        return routerOf(strategy);
    }
  },
};

const environmentOf = (using: Factories): LabelsEnvironment => ({
  factories: using,
  components: {
    split: () => {
      throw new Error('a LabelDummyInserter/LabelDummyRemover row has no components op');
    },
    combine: () => {
      throw new Error('a LabelDummyInserter/LabelDummyRemover row has no components op');
    },
  },
});

/** The processors a row's plan runs: its `runProcessor` steps, or the prefix entries that are not `Phase/strategy`. */
function processorsOf(row: PipelineStopRow): string[] {
  if (row.steps !== null) {
    return row.steps.filter(([op]) => op === PROCESSOR_STEP).map(([, name]) => String(name));
  }
  return (row.prefix ?? []).filter((entry) => !entry.includes(PHASE_SEPARATOR));
}

/** The first member of the row's plan whose enum arm still throws "ported in mission ...", or `null`. */
export function unportedMember(row: PipelineStopRow): string | null {
  for (const name of processorsOf(row)) {
    try {
      factories.createProcessor(name);
    } catch (error) {
      if (error instanceof UnsupportedOperationException && error.message.includes(PORTED_LATER)) {
        return name;
      }
      throw error;
    }
  }
  return null;
}

function resultOf(row: PipelineStopRow, using: Factories): LabelsStepsResult {
  if (row.steps !== null) {
    return runLabelsRow(row, environmentOf(using));
  }
  return { graph: runRoutingPrefix(row, using), components: null, terminal: null };
}

/** Replays one row (with the classes injected, or with `using` instead) and returns the labels dump of the result. */
export function replayedDump(row: PipelineStopRow, using: Factories = factories): LabelsExpected {
  return labelsDump(resultOf(row, using), row.expected as unknown as LabelsExpected);
}

/** `factories` with one processor member replaced (the non-vacuity checks run a plan with a member idle). */
export function withProcessor(name: string, replacement: ILayoutProcessor<LGraph>): Factories {
  return { ...factories, createProcessor: (n) => (n === name ? replacement : factories.createProcessor(n)) };
}

/** The differences between the replay of a row and its recorded expectations (`[]`: equal, AD-4). */
export function replayDifferences(
  row: PipelineStopRow,
  using: Factories = factories,
): ReturnType<typeof compareLabels> {
  return compareLabels(replayedDump(row, using), row.expected as unknown as LabelsExpected);
}

describe('LabelDummyInserterReplay (the injected factories)', () => {
  it('builds the two classes under test for their staged enum names', () => {
    expect(factories.createProcessor('LABEL_DUMMY_INSERTER')).toBeInstanceOf(LabelDummyInserter);
    expect(factories.createProcessor('LABEL_DUMMY_REMOVER')).toBeInstanceOf(LabelDummyRemover);
  });

  it('replaces one member and leaves the others to the enum', () => {
    const idle = { process: (): void => undefined };
    const using = withProcessor('LABEL_DUMMY_INSERTER', idle);
    expect(using.createProcessor('LABEL_DUMMY_INSERTER')).toBe(idle);
    expect(using.createProcessor('LABEL_DUMMY_REMOVER')).toBeInstanceOf(LabelDummyRemover);
  });
});
