// SPDX-License-Identifier: EPL-2.0
// Proof of EndLabelPreprocessor and EndLabelPostprocessor (mission 7f2, T6): every `layered-labels.json` row whose plan holds
// `END_LABEL_PREPROCESSOR` or `END_LABEL_POSTPROCESSOR` (the `models` stops and the `scenarios`, FX2's parallel-edge ones
// included) replayed with the classes injected (the 12 enum arms stay staged until T11) and the rest of the plan from the real
// enums. Expectations come only from the rows (L4, AD-13). G4: `END_LABELS` is an insertion-ordered Map, so the reversal twin
// runs `EndLabelPostprocessor` over each map in reverse order and must dump what the forward order dumps.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { compareLabels, labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow, type LabelsStepsResult } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { loadLabelsRows, rowsByGroup } from '../../../../test/helpers/layered-labels-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { isStopRow, type PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { runRoutingPrefix } from '../../../../test/helpers/layered-routing-replay-ops.js';
import type { RoutingRow } from '../../../../test/helpers/layered-routing-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LabelCell } from '../../common/nodespacing/cellsystem/LabelCell.js';
import type { LPort } from '../graph/LPort.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { EndLabelPostprocessor } from './EndLabelPostprocessor.js';
import { EndLabelPreprocessor } from './EndLabelPreprocessor.js';
import { EndLabelSorter } from './EndLabelSorter.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { LabelDummyInserter } from './LabelDummyInserter.js';
import { LabelDummyRemover } from './LabelDummyRemover.js';
import { LabelDummySwitcher } from './LabelDummySwitcher.js';
import { LabelSideSelector } from './LabelSideSelector.js';

const PRE = 'END_LABEL_PREPROCESSOR';
const POST = 'END_LABEL_POSTPROCESSOR';
const SWITCHER = 'LABEL_DUMMY_SWITCHER';
const PHASE_SEPARATOR = '/';
const STAGED_MESSAGE = 'is ported in mission 7f2';
const FX2_PARALLEL = 'fx2';
const SPAWN_TIMEOUT_MS = 60_000;

/** The member names of a row's plan: the `runProcessor` steps of a step row, the plain entries of a model row's prefix. */
function planMembers(row: PipelineStopRow): readonly string[] {
  if (row.steps !== null) {
    return row.steps.filter((step) => step[0] === 'runProcessor').map((step) => String(step[1]));
  }
  return (row.prefix ?? []).filter((entry) => !entry.includes(PHASE_SEPARATOR));
}

const INJECTED: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  [PRE]: () => new EndLabelPreprocessor(),
  [POST]: () => new EndLabelPostprocessor(),
  END_LABEL_SORTER: () => new EndLabelSorter(),
  LABEL_SIDE_SELECTOR: () => new LabelSideSelector(),
  LABEL_DUMMY_INSERTER: () => new LabelDummyInserter(),
  LABEL_DUMMY_REMOVER: () => new LabelDummyRemover(),
  [SWITCHER]: () => new LabelDummySwitcher() as unknown as ILayoutProcessor<LGraph>,
};

/** Makes `EndLabelPostprocessor` visit each node's label cells in reverse order (G4's twin): the maps are rebuilt reversed. */
class ReversedEndLabelPostprocessor implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, monitor: BasicProgressMonitor): void {
    for (const layer of graph.getLayers()) {
      for (const node of layer.getNodes()) {
        if (node.hasProperty(InternalProperties.END_LABELS)) {
          const entries = [...node.getProperty(InternalProperties.END_LABELS).entries()].reverse();
          node.setProperty(InternalProperties.END_LABELS, new Map<LPort, LabelCell>(entries));
        }
      }
    }
    new EndLabelPostprocessor().process(graph, monitor);
  }
}

function factoriesWith(post: () => ILayoutProcessor<LGraph>): Factories {
  return {
    createProcessor: (name) =>
      name === POST ? post() : (INJECTED[name]?.() ?? IntermediateProcessorStrategy.valueOf(name).create()),
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
        case 'P5_EDGE_ROUTING':
          return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
        default:
          throw new Error(`unknown phase ${phase}`);
      }
    },
  };
}

/** Whether a plan member can be built now: a staged enum arm (a class of another task not yet ported) cannot. */
function available(name: string): boolean {
  try {
    if (name === SWITCHER) {
      // T4b ports it in parallel: the staged class has a `process` that throws the staged message
      new LabelDummySwitcher().process(null as never, new BasicProgressMonitor());
      return true;
    }
    factoriesWith(() => new EndLabelPostprocessor()).createProcessor(name);
    return true;
  } catch (error) {
    return !String((error as Error).message).includes(STAGED_MESSAGE);
  }
}

const forward = factoriesWith(() => new EndLabelPostprocessor());
const reversed = factoriesWith(() => new ReversedEndLabelPostprocessor() as unknown as ILayoutProcessor<LGraph>);
const components = { split: () => [], combine: () => undefined };

function replay(row: PipelineStopRow, factories: Factories): LabelsStepsResult {
  if (row.steps === null) {
    return { graph: runRoutingPrefix(row as unknown as RoutingRow, factories), components: null, terminal: null };
  }
  return runLabelsRow(row, { factories, components });
}

function dumpOf(row: PipelineStopRow, factories: Factories): { dump: LabelsExpected; full: LabelsExpected } {
  const result = replay(row, factories);
  const dump = labelsDump(result, row.expected as unknown as LabelsExpected);
  const withValues = { ...dump, dump: dumpWithPropertyValues(result.graph) } as unknown as LabelsExpected;
  return { dump, full: withValues };
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const stopRows = (): PipelineStopRow[] =>
  (['models', 'scenarios'] as const).flatMap((group) => rowsByGroup(group, loadLabelsRows()).filter(isStopRow));
const members =
  (name: string) =>
  (row: PipelineStopRow): boolean =>
    planMembers(row).includes(name);
/** The members of the row's plan that are still staged (their classes belong to tasks that are not yet ported). */
const staged = (row: PipelineStopRow): string[] => [...new Set(planMembers(row))].filter((name) => !available(name));
const runnable = (row: PipelineStopRow): boolean => staged(row).length === 0;

const preRows = stopRows().filter(members(PRE));
const postRows = stopRows().filter(members(POST));

describe('the rows of EndLabelPreprocessor and EndLabelPostprocessor', () => {
  it('finds the recorded rows', () => {
    // 29 model stops at each arm plus the scenario rows; the scenarios also run each arm's plan to its own stop
    expect(preRows.length).toBeGreaterThan(0);
    expect(postRows.length).toBeGreaterThan(0);
    expect(postRows.some((row) => row.id.includes(`/${FX2_PARALLEL}/`))).toBe(true);
  });
});

describe('EndLabelPreprocessor (oracle rows)', () => {
  for (const row of preRows.filter(runnable)) {
    it(`replays ${row.id}`, () => {
      const { dump, full } = dumpOf(row, forward);
      expect(compareLabels(dump, row.expected as unknown as LabelsExpected)).toEqual([]);
      if (row.expected.dump !== undefined) {
        expect(compareRoutingFullDump(full as never, row.expected)).toEqual([]);
      }
    });
  }
});

describe('EndLabelPostprocessor (oracle rows, forward and reversed label cell order)', () => {
  for (const row of postRows.filter(runnable)) {
    it(`replays ${row.id} in both orders`, () => {
      const forwardDump = dumpOf(row, forward);
      expect(compareLabels(forwardDump.dump, row.expected as unknown as LabelsExpected)).toEqual([]);
      const reversedDump = dumpOf(row, reversed);
      expect(reversedDump.dump).toEqual(forwardDump.dump);
      expect(reversedDump.full).toEqual(forwardDump.full);
      if (row.expected.dump !== undefined) {
        expect(compareRoutingFullDump(forwardDump.full as never, row.expected)).toEqual([]);
      }
    });
  }
});

describe('the modules load in a fresh process (F10)', () => {
  it.each(['EndLabelPreprocessor', 'EndLabelPreprocessorPlacement', 'EndLabelPostprocessor'])(
    '%s',
    (name) => {
      const script = `import(${JSON.stringify(join(repoRoot(), 'src/alg/layered/intermediate', `${name}.ts`))})`;
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
