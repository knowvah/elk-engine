// SPDX-License-Identifier: EPL-2.0
// Proof of LabelDummySwitcher (mission 7f2, T4b): every `scenarios/LabelDummySwitcher/*` row and every `models` row that
// stops at `LABEL_DUMMY_SWITCHER` of `layered-labels.json`, replayed with the class injected (the enum arm stays staged
// until T11) and the rest of the plan built from the real enums or the sibling 7f2 classes. Expectations come only from
// the rows (L4, AD-13); a row whose plan still holds a member that is not ported is skipped and named in the journal.
import { beforeAll, describe, expect, it } from 'vitest';
import { compareLabels, labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow, type LabelsEnvironment } from '../../../../test/helpers/layered-labels-replay-ops.js';
import {
  isStopRow,
  rowsByClass,
  rowsByLastPrefixEntry,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { OrthogonalEdgeRouter } from '../p5edges/OrthogonalEdgeRouter.js';
import { PolylineEdgeRouter } from '../p5edges/PolylineEdgeRouter.js';
import { SplineEdgeRouter } from '../p5edges/splines/SplineEdgeRouter.js';
import { EndLabelPostprocessor } from './EndLabelPostprocessor.js';
import { EndLabelPreprocessor } from './EndLabelPreprocessor.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';
import { HierarchicalPortOrthogonalEdgeRouter } from './HierarchicalPortOrthogonalEdgeRouter.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { LabelDummyInserter } from './LabelDummyInserter.js';
import { LabelDummyRemover } from './LabelDummyRemover.js';
import { LabelDummySwitcher } from './LabelDummySwitcher.js';
import { LabelSideSelector } from './LabelSideSelector.js';

const PROCESSOR = 'LABEL_DUMMY_SWITCHER';
const PORTED_LATER = 'is ported in mission';
const PROCESSOR_STEP = 'runProcessor';
const PHASE_SEPARATOR = '/';
const INCLUDE_LABEL_ID = 'edgelabelcenterednessanalysis.includelabel'; // LabelDummySwitcher.java:60

/** The members whose enum arms are staged (or wired by a later task) and so are injected, by enum name. */
const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  [PROCESSOR]: () => new LabelDummySwitcher(),
  LABEL_DUMMY_INSERTER: () => new LabelDummyInserter(),
  LABEL_DUMMY_REMOVER: () => new LabelDummyRemover(),
  LABEL_SIDE_SELECTOR: () => new LabelSideSelector(),
  END_LABEL_PREPROCESSOR: () => new EndLabelPreprocessor(),
  END_LABEL_POSTPROCESSOR: () => new EndLabelPostprocessor(),
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

const factories: Factories = {
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
        // P5_EDGE_ROUTING: the EdgeRouterFactory arm is wired later; the routers are injected
        return routerOf(strategy);
    }
  },
};

const environment = (using: Factories): LabelsEnvironment => ({
  factories: using,
  components: {
    split: () => {
      throw new Error('a LabelDummySwitcher row has no components op');
    },
    combine: () => {
      throw new Error('a LabelDummySwitcher row has no components op');
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
function unportedMember(row: PipelineStopRow): string | null {
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

function replayedDump(row: PipelineStopRow, using: Factories): LabelsExpected {
  const expected = row.expected as unknown as LabelsExpected;
  const result =
    row.steps !== null
      ? runLabelsRow(row, environment(using))
      : { graph: runRoutingPrefix(row, using), components: null, terminal: null };
  return labelsDump(result, expected);
}

const differences = (row: PipelineStopRow, using: Factories): ReturnType<typeof compareLabels> =>
  compareLabels(replayedDump(row, using), row.expected as unknown as LabelsExpected);

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const rows: PipelineStopRow[] = [
  ...rowsByClass('scenarios/LabelDummySwitcher'),
  ...rowsByLastPrefixEntry(PROCESSOR).filter((row) => row.group === 'models'),
].filter(isStopRow);

describe('LabelDummySwitcher (oracle rows)', () => {
  it('finds the recorded rows: 17 scenarios and 68 models stops', () => {
    expect(rows.filter((row) => row.group === 'scenarios')).toHaveLength(17);
    expect(rows.filter((row) => row.group === 'models')).toHaveLength(68);
  });

  it('replays every models stop (their plans hold only ported members)', () => {
    const blocked = rows.filter((row) => row.group === 'models' && unportedMember(row) !== null);
    expect(blocked.map((row) => row.id)).toEqual([]);
  });

  for (const row of rows) {
    it.skipIf(unportedMember(row) !== null)(`replays ${row.id}`, () => {
      expect(differences(row, factories)).toEqual([]);
    });
  }
});

describe('LabelDummySwitcher (the rows are not vacuous)', () => {
  const idle = {
    ...factories,
    createProcessor: (n: string) =>
      n === PROCESSOR ? { process: (): void => undefined } : factories.createProcessor(n),
  } as Factories;

  it('the state with the processor idle differs from the recorded state after it', () => {
    const chosen = rows.filter((row) => unportedMember(row) === null);
    expect(chosen.length).toBeGreaterThan(0);
    const changed = chosen.filter((row) => differences(row, idle).length > 0);
    expect(changed.length).toBeGreaterThan(0);
  });
});

describe('LabelDummySwitcher.INCLUDE_LABEL', () => {
  it('keeps the Java id and default false (LabelDummySwitcher.java:59-60)', () => {
    expect(LabelDummySwitcher.INCLUDE_LABEL.getId()).toBe(INCLUDE_LABEL_ID);
    expect(LabelDummySwitcher.INCLUDE_LABEL.getDefault()).toBe(false);
  });
});
