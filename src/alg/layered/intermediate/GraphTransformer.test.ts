// SPDX-License-Identifier: EPL-2.0
// Proof of GraphTransformer (mission 7f, T5): the `scenarios/GraphTransformer/*` rows and every `models/*/DIRECTION_*`
// row of test/golden/refs/java/layered-pipeline.json, replayed with the real enums building the plan and the class
// injected for `DIRECTION_PREPROCESSOR` (`TO_INPUT_DIRECTION`, sic) and `DIRECTION_POSTPROCESSOR` (`TO_INTERNAL_LTR`, sic), whose
// enum arm stays throwing until T8. Expectations come only from the rows and the Java (L4, AD-13, F16).
import { beforeAll, describe, expect, it } from 'vitest';
// the enum first: tests enter through it, never through the class (E1/F10, module cycle)
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { importRow } from '../../../../test/helpers/layered-phase-replay-rows.js';
import { compareRouting, compareRoutingFullDump } from '../../../../test/helpers/layered-routing-replay-compare.js';
import { routingDump } from '../../../../test/helpers/layered-routing-replay-dump.js';
import { runRoutingPrefix, runRoutingSteps } from '../../../../test/helpers/layered-routing-replay-ops.js';
import {
  loadPipelineRows,
  isStopRow,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { dumpWithPropertyValues } from '../../../../test/helpers/layered-site-replay-dump.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { EndLabelSorter } from './EndLabelSorter.js';
import { GraphTransformer } from './GraphTransformer.js';
import { Mode } from './GraphTransformerMode.js';

const PIPELINE_FILE = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const DIRECTION_PREPROCESSOR = 'DIRECTION_PREPROCESSOR';
const DIRECTION_POSTPROCESSOR = 'DIRECTION_POSTPROCESSOR';
const END_LABEL_SORTER = 'END_LABEL_SORTER';
/** An arm of another task of this batch (T6): not constructible until its class lands, so its rows wait for T8. */
const PORT_ROUTER = 'HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER';
const SCENARIO_PREFIX = 'scenarios/GraphTransformer/';
const MODEL_STOP = /\/DIRECTION_(PRE|POST)PROCESSOR\//;

/** The members of this batch whose enum arm still throws; their classes are injected (the arm is T8's). */
const injected: Readonly<Record<string, () => ILayoutProcessor<LGraph>>> = {
  // as the Java `IntermediateProcessorStrategy.create()` (`:211-215`) has them: the PRE processor gets
  // `TO_INPUT_DIRECTION` and the POST processor `TO_INTERNAL_LTR`
  [DIRECTION_PREPROCESSOR]: () => new GraphTransformer(Mode.TO_INPUT_DIRECTION),
  [DIRECTION_POSTPROCESSOR]: () => new GraphTransformer(Mode.TO_INTERNAL_LTR),
  [END_LABEL_SORTER]: () => new EndLabelSorter(),
};

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    const make = Object.hasOwn(injected, name) ? injected[name] : undefined;
    return make === undefined ? IntermediateProcessorStrategy.valueOf(name).create() : make();
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
        expect(phase).toBe('P5_EDGE_ROUTING');
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
    }
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const all: PipelineStopRow[] = loadPipelineRows(PIPELINE_FILE).filter(isStopRow);
const scenarios = all.filter((row) => row.id.startsWith(SCENARIO_PREFIX));
const modelRows = all.filter((row) => row.group === 'models' && MODEL_STOP.test(row.id));
const needsPortRouter = (row: PipelineStopRow): boolean => (row.prefix ?? []).includes(PORT_ROUTER);
const replayable = modelRows.filter((row) => !needsPortRouter(row));

function replay(row: PipelineStopRow): LGraph {
  return row.steps === null ? runRoutingPrefix(row, factories) : runRoutingSteps(row, factories);
}

function check(row: PipelineStopRow): void {
  const graph = replay(row);
  const actual = routingDump(graph, importRow(row).importDump);
  expect(compareRouting(actual, row.expected)).toEqual([]);
  if (row.expected.dump !== undefined) {
    expect(compareRoutingFullDump({ ...actual, dump: dumpWithPropertyValues(graph) }, row.expected)).toEqual([]);
  }
}

describe('GraphTransformer (oracle rows)', () => {
  it('finds the recorded rows', () => {
    expect({
      scenarios: scenarios.length,
      models: modelRows.length,
      waitingForT6: modelRows.length - replayable.length,
    }).toEqual({
      scenarios: 30,
      models: 606,
      waitingForT6: modelRows.length - replayable.length,
    });
  });

  for (const row of [...scenarios, ...replayable]) {
    it(`replays ${row.id}`, () => {
      check(row);
    });
  }
});

describe('GraphTransformer (the rows are not vacuous)', () => {
  it.each(['LEFT', 'DOWN', 'UP'])(
    'the %s state without the transformer differs from the recorded state after it',
    (side) => {
      const row = scenarios.find((r) => r.id === `${SCENARIO_PREFIX}${side}/long-edges/pre`)!;
      const steps = row.steps!.filter(
        ([op, arg]) => op !== 'dump' && !(op === 'runProcessor' && arg === DIRECTION_PREPROCESSOR),
      );
      const before = routingDump(runRoutingSteps({ ...row, steps }, factories), importRow(row).importDump);
      expect(compareRouting(before, row.expected).length).toBeGreaterThan(0);
    },
  );
});

describe('GraphTransformer.Mode (Java enum order, `GraphTransformer.java:52-57`)', () => {
  it('lists TO_INTERNAL_LTR then TO_INPUT_DIRECTION, and prints the name', () => {
    expect(Mode.values().map((m) => m.toString())).toEqual(['TO_INTERNAL_LTR', 'TO_INPUT_DIRECTION']);
    expect(Mode.valueOf('TO_INPUT_DIRECTION')).toBe(Mode.TO_INPUT_DIRECTION);
    expect(Mode.TO_INPUT_DIRECTION.ordinal()).toBe(1);
    expect(Mode.TO_INTERNAL_LTR.compareTo(Mode.TO_INPUT_DIRECTION)).toBeLessThan(0);
    expect(() => Mode.valueOf('NOPE')).toThrow('GraphTransformer.Mode.NOPE');
  });

  it('is still staged in the enum: the arm throws until T8', () => {
    expect(() => IntermediateProcessorStrategy.valueOf(DIRECTION_PREPROCESSOR).create()).toThrow(
      UnsupportedOperationException,
    );
  });
});
