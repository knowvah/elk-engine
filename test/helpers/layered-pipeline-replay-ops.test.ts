// SPDX-License-Identifier: EPL-2.0
// Structural tests of the pipeline replay, with a fake driver walking a fixed plan: nothing here is an ELK value. The
// tolerance probes perturb a synthetic layout by an offset and assert which side of the AD-4 bar it falls on.
import { beforeAll, describe, expect, it } from 'vitest';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { Factories } from './layered-phase-replay-ops.js';
import { planNames } from './layered-pipeline-replay-names.js';
import {
  compareFullRow,
  levelPathOf,
  levelsOf,
  runFullRow,
  runPipelineSteps,
  runStopRow,
  comparePipeline,
  pipelineDump,
  type ComponentsExpected,
  COMPONENTS_COMBINE_OP,
  COMPONENTS_SPLIT_OP,
  type ComponentsHandler,
  type DriverState,
  type PipelineDriver,
} from './layered-pipeline-replay-ops.js';
import type { FullRow, PipelineStopRow } from './layered-pipeline-replay-rows.js';
import { loadInput } from './layered-phase-replay-rows.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { repoRoot } from '../corpus/corpus.js';
import { knownPlanNames } from './layered-pipeline-replay-names.js';
import { PIPELINE_ROW_GROUPS, isFullRow, isStopRow, loadPipelineRows } from './layered-pipeline-replay-rows.js';

const ALGORITHM_KEY = 'org.eclipse.elk.algorithm';
const FIXED = 'org.eclipse.elk.fixed';
const NODE_SIZE = 10;
const BAR_FAIL = 2e-6;
const BAR_PASS = 5e-7;

const INPUT = {
  elk: {
    id: 'root',
    layoutOptions: { [ALGORITHM_KEY]: FIXED },
    children: [
      {
        id: 'inner',
        x: 5,
        y: 5,
        width: 40,
        height: 40,
        layoutOptions: { [ALGORITHM_KEY]: FIXED },
        children: [{ id: 'leaf', width: NODE_SIZE, height: NODE_SIZE }],
      },
      { id: 'other', width: NODE_SIZE, height: NODE_SIZE },
    ],
  },
};

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

const asSweep = (p: unknown): ILayoutProcessor<LGraph> => p as ILayoutProcessor<LGraph>;

function fakePlan(): ILayoutProcessor<LGraph>[] {
  return [
    IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER.create(),
    LayeringStrategy.NETWORK_SIMPLEX.create() as unknown as ILayoutProcessor<LGraph>,
    IntermediateProcessorStrategy.PARTITION_PREPROCESSOR.create(),
  ];
}

class FakeState implements DriverState {
  step = 0;
  constructor(readonly graphs: LGraph[]) {}
  getGraphs(): LGraph[] {
    return this.graphs;
  }
}

function fakeDriver(plan: ILayoutProcessor<LGraph>[], seen: LGraph[] = []): PipelineDriver<FakeState> {
  return {
    prepareLayoutTest: (graph) => {
      seen.push(graph);
      return new FakeState([graph]);
    },
    getLayoutTestConfiguration: () => plan,
    runLayoutTestStep: (state) => {
      state.step++;
    },
  };
}

function stopRow(prefix: readonly string[] | null, overrides: Partial<PipelineStopRow> = {}): PipelineStopRow {
  return {
    id: 'models/synthetic',
    group: 'models',
    input: INPUT,
    target: null,
    options: {},
    steps: null,
    prefix,
    expected: {} as PipelineStopRow['expected'],
    ...overrides,
  };
}

function fullRow(layout: unknown, plans: FullRow['expected']['plans']): FullRow {
  return {
    id: 'full/synthetic/model/default',
    group: 'full',
    input: INPUT,
    target: null,
    options: {},
    steps: null,
    prefix: null,
    expected: { layout, plans },
  };
}

describe('runStopRow', () => {
  const dumped = { dumped: true };
  const walk = (
    row: PipelineStopRow,
    plan = fakePlan(),
    seen: LGraph[] = [],
  ): { diffs: readonly string[]; state: FakeState } => {
    let last: FakeState | null = null;
    const base = fakeDriver(plan, seen);
    const driver: PipelineDriver<FakeState> = {
      ...base,
      prepareLayoutTest: (graph) => (last = base.prepareLayoutTest(graph)),
    };
    const diffs = runStopRow(row, {
      driver,
      dump: () => dumped,
      compare: (actual, expected) => [JSON.stringify({ actual, expected })],
    });
    return { diffs, state: last! };
  };

  it('walks the prefix, dumps the graph under test and returns the comparator diffs', () => {
    const prefix = planNames(fakePlan()).slice(0, 2);
    const seen: LGraph[] = [];
    const row = stopRow(prefix, { expected: { tag: 'row' } as unknown as PipelineStopRow['expected'] });
    const { diffs, state } = walk(row, fakePlan(), seen);
    expect(state.step).toBe(2);
    expect(seen).toHaveLength(1);
    expect(state.getGraphs()[0]).toBe(seen[0]);
    expect(diffs).toEqual([JSON.stringify({ actual: dumped, expected: { tag: 'row' } })]);
  });

  it('rejects a plan entry that departs from the prefix, naming the row and the first differing entry', () => {
    const names = planNames(fakePlan());
    const prefix = [names[0]!, 'NODE_PROMOTION'];
    expect(() => walk(stopRow(prefix))).toThrow(
      `row models/synthetic: plan entry 1 is ${names[1]!}, the row's prefix has NODE_PROMOTION`,
    );
  });

  it('rejects a prefix naming MEDIAN_LAYER_SWEEP against a LAYER_SWEEP instance, naming the entry', () => {
    const { LAYER_SWEEP: layer, MEDIAN_LAYER_SWEEP: median } = CrossingMinimizationStrategy;
    const plan = [asSweep(layer.create())];
    const prefix = `P3_NODE_ORDERING/${median.name()}`;
    expect(() => walk(stopRow([prefix]), plan)).toThrow(
      `row models/synthetic: plan entry 0 is P3_NODE_ORDERING/${layer.name()}, the row's prefix has ${prefix}`,
    );
  });

  it('rejects a plan shorter than the prefix', () => {
    const names = planNames(fakePlan());
    expect(() => walk(stopRow([...names, names[0]!]))).toThrow(
      `row models/synthetic: plan entry 3 is (none), the row's prefix has ${names[0]!}`,
    );
  });

  it('rejects a row without a prefix', () => {
    expect(() => walk(stopRow(null, { steps: [] }))).toThrow('row models/synthetic has no prefix');
  });

  it('rejects a driver that holds no graph', () => {
    const driver: PipelineDriver<FakeState> = { ...fakeDriver(fakePlan()), prepareLayoutTest: () => new FakeState([]) };
    expect(() => runStopRow(stopRow([]), { driver, dump: () => 0, compare: () => [] })).toThrow(
      'row models/synthetic: the driver holds no graph after the prefix',
    );
  });
});

describe('runFullRow and compareFullRow', () => {
  const LAYOUT = { id: 'root', children: [{ id: 'n1', x: 10, y: 0 }] };

  it('lays the graph out and names each hierarchy level by its id path', () => {
    const plan = fakePlan();
    const result = runFullRow(fullRow(LAYOUT, {}), fakeDriver(plan));
    expect(Object.keys(result.plans)).toEqual(['root', 'root/inner']);
    expect(result.plans.root).toEqual(planNames(plan));
    expect(result.plans['root/inner']).toEqual(planNames(plan));
    const layout = result.layout as { id: string; children: { id: string }[] };
    expect(layout.id).toBe('root');
    expect(layout.children.map((c) => c.id)).toEqual(['inner', 'other']);
  });

  it('finds the levels and their paths', () => {
    const root = loadInput(INPUT);
    expect(levelsOf(root).map(levelPathOf)).toEqual(['root', 'root/inner']);
  });

  it('passes a layout and plans that match', () => {
    const plans = { root: ['A', 'B'] };
    expect(compareFullRow({ layout: LAYOUT, plans }, fullRow(LAYOUT, plans))).toEqual([]);
  });

  it('reports a 2e-6 coordinate difference at its path and passes a 5e-7 one', () => {
    const shifted = (by: number): unknown => ({ id: 'root', children: [{ id: 'n1', x: 10 + by, y: 0 }] });
    const row = fullRow(LAYOUT, {});
    const failing = compareFullRow({ layout: shifted(BAR_FAIL), plans: {} }, row);
    expect(failing).toHaveLength(1);
    expect(failing[0]).toMatchObject({ path: 'children[id=n1].x', kind: 'value', expected: 10 });
    expect(compareFullRow({ layout: shifted(BAR_PASS), plans: {} }, row)).toEqual([]);
  });

  it('reports the first differing plan entry per level, and missing and extra levels', () => {
    const row = fullRow(LAYOUT, { root: ['A', 'B', 'C'], gone: ['Z'] });
    const diffs = compareFullRow({ layout: LAYOUT, plans: { root: ['A', 'X', 'Y'], added: ['Q'] } }, row);
    expect(diffs).toEqual([
      { path: 'plans[root][1]', kind: 'value', expected: 'B', actual: 'X' },
      { path: 'plans[gone]', kind: 'missing', expected: ['Z'] },
      { path: 'plans[added]', kind: 'extra', actual: ['Q'] },
    ]);
  });

  it('reports a plan that is a strict prefix of the expected one at the first absent entry', () => {
    const diffs = compareFullRow({ layout: LAYOUT, plans: { root: ['A'] } }, fullRow(LAYOUT, { root: ['A', 'B'] }));
    expect(diffs).toEqual([{ path: 'plans[root][1]', kind: 'value', expected: 'B', actual: undefined }]);
  });
});

describe('runPipelineSteps', () => {
  const REF = path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'layered-pipeline.json');
  const COMPONENTS_PREFIX = 'scenarios/ComponentsProcessor/';
  const rows = loadPipelineRows(REF).filter(isStopRow);
  const componentRows = rows.filter((row) => row.id.startsWith(COMPONENTS_PREFIX));
  const endsWith = (row: PipelineStopRow, op: string): boolean => row.steps!.at(-1)![0] === op;
  const splitRows = componentRows.filter((row) => endsWith(row, COMPONENTS_SPLIT_OP));
  const combineRows = componentRows.filter((row) => endsWith(row, COMPONENTS_COMBINE_OP));

  interface Log {
    readonly events: string[];
    readonly factories: Factories;
    readonly handler: ComponentsHandler;
    readonly parts: LGraph[];
  }

  function recorder(partCount: number, whole?: { graph?: LGraph }): Log {
    const events: string[] = [];
    const parts = Array.from({ length: partCount }, () => new LGraph());
    const process = (label: string) => ({
      process: (component: LGraph) => events.push(`${label} on ${String(parts.indexOf(component))}`),
    });
    return {
      events,
      parts,
      factories: {
        createProcessor: (name) => process(name) as unknown as ILayoutProcessor<LGraph>,
        createPhase: (phase, strategy) => process(`${phase}/${strategy}`) as unknown as ILayoutProcessor<LGraph>,
      },
      handler: {
        split: (graph) => {
          if (whole !== undefined) whole.graph = graph;
          events.push('split');
          return parts;
        },
        combine: (components, target) => {
          events.push(`combine ${String(components.length)} ${target === whole?.graph ? 'target' : 'other'}`);
        },
      },
    };
  }

  it('finds the 10 split and 10 combine rows of the ref', () => {
    expect([splitRows.length, combineRows.length]).toEqual([10, 10]);
  });

  it('ends every terminal split row on the component list and dumps it in the row shape', () => {
    for (const row of splitRows) {
      const log = recorder(1);
      const result = runPipelineSteps(row, log.factories, log.handler);
      expect(result.terminal).toBe('split');
      expect(log.events).toEqual(['split']);
      const dump = pipelineDump(result) as ComponentsExpected;
      expect(Object.keys(dump)).toEqual(Object.keys(row.expected));
      expect(Object.keys(dump.components[0]!)).toEqual(
        Object.keys((row.expected as unknown as ComponentsExpected).components[0]!),
      );
    }
  });

  it('runs every processor and phase step of a combine row on each component, then combines last', () => {
    for (const row of combineRows) {
      const whole: { graph?: LGraph } = {};
      const log = recorder(3, whole);
      const runs = row.steps!.filter(([op]) => op === 'runProcessor' || op === 'runPhase');
      const result = runPipelineSteps(row, log.factories, log.handler);
      expect(result.terminal).toBe('combine');
      expect(result.components).toBe(log.parts);
      expect(log.events).toHaveLength(runs.length * log.parts.length + 2);
      expect(log.events[0]).toBe('split');
      expect(log.events.at(-1)).toBe(`combine ${String(log.parts.length)} target`);
      const names = runs.map(([op, a, b]) => (op === 'runProcessor' ? (a as string) : `${a as string}/${b as string}`));
      expect(log.events.slice(1, 1 + log.parts.length * 2)).toEqual(
        [0, 1, 2]
          .flatMap((): string[] => [])
          .concat([0, 1, 2].map((i) => `${names[0]!} on ${String(i)}`))
          .concat([0, 1, 2].map((i) => `${names[1]!} on ${String(i)}`)),
      );
    }
  });

  it('un-layers every component before combine', () => {
    const [row] = combineRows;
    const component = new LGraph();
    const node = new LNode(component);
    const layer = new Layer(component);
    component.getLayers().push(layer);
    node.setLayer(layer);
    const seen: { layers: number; layerless: LNode[]; layer: Layer | null } = {
      layers: -1,
      layerless: [],
      layer: layer,
    };
    const log = recorder(0);
    const handler: ComponentsHandler = {
      split: () => [component],
      combine: () => {
        seen.layers = component.getLayers().length;
        seen.layerless = [...component.getLayerlessNodes()];
        seen.layer = node.getLayer();
      },
    };
    runPipelineSteps(row!, log.factories, handler);
    expect(seen).toEqual({ layers: 0, layerless: [node], layer: null });
  });

  it('dumps the target of a combine row in the 7e shape', () => {
    const log = recorder(0);
    const result = runPipelineSteps(combineRows[0]!, log.factories, log.handler);
    expect(Object.keys(pipelineDump(result)).sort()).toEqual(Object.keys(combineRows[0]!.expected).sort());
  });

  it('compares component lists exactly and refuses to compare a list with a target dump', () => {
    const sample: ComponentsExpected = {
      components: [{ nodes: ['a'], extPortConnections: null, padding: ['0', '1', '2', '3'] }],
    };
    expect(comparePipeline(sample, sample)).toEqual([]);
    const other: ComponentsExpected = { components: [{ ...sample.components[0]!, nodes: ['b'] }] };
    expect(comparePipeline(other, sample)).toHaveLength(1);
    const target = combineRows[0]!.expected;
    expect(comparePipeline(sample, target)).toEqual([
      { where: 'expected', message: 'a component list was compared with a target dump' },
    ]);
  });

  it('returns no components for a row without component ops', () => {
    const log = recorder(0);
    const row = stopRow(null, { steps: [['importGraph', null]] });
    const result = runPipelineSteps(row, log.factories, log.handler);
    expect([result.components, result.terminal]).toEqual([null, null]);
    expect(log.events).toEqual([]);
  });

  it.each([
    [
      [[COMPONENTS_COMBINE_OP]],
      `row models/synthetic: ${COMPONENTS_COMBINE_OP} needs a ${COMPONENTS_SPLIT_OP} before it`,
    ],
    [[[COMPONENTS_SPLIT_OP, 'x']], `row models/synthetic: op ${COMPONENTS_SPLIT_OP} takes 0 arguments, got 1`],
    [[[COMPONENTS_SPLIT_OP], ['normalise']], 'row models/synthetic: step normalise cannot follow componentsSplit'],
    [
      [[COMPONENTS_SPLIT_OP], [COMPONENTS_COMBINE_OP], ['dump']],
      'row models/synthetic: step componentsCombine cannot follow',
    ],
    [[[COMPONENTS_SPLIT_OP], ['runPhase', 'P9_NONE', 'X']], 'step runPhase names the unknown phase P9_NONE'],
  ])('rejects %j', (tail, message) => {
    const steps = [['importGraph', null], ...tail] as PipelineStopRow['steps'];
    expect(() => runPipelineSteps(stopRow(null, { steps }), recorder(1).factories, recorder(1).handler)).toThrow(
      message,
    );
  });

  it('rejects a row without steps', () => {
    const log = recorder(0);
    expect(() => runPipelineSteps(stopRow([]), log.factories, log.handler)).toThrow(
      'row models/synthetic has no steps',
    );
  });
});

describe('the landed pipeline ref', () => {
  const REF = path.join(repoRoot(), 'test', 'golden', 'refs', 'java', 'layered-pipeline.json');
  const all = loadPipelineRows(REF);
  const full = all.filter(isFullRow);

  it('loads every row and agrees with rowCounts', () => {
    const counts = (JSON.parse(readFileSync(REF, 'utf8')) as { rowCounts: Record<string, number> }).rowCounts;
    const tally = Object.fromEntries(PIPELINE_ROW_GROUPS.map((g) => [g, all.filter((r) => r.group === g).length]));
    expect(tally).toEqual(counts);
    expect(all).toHaveLength(Object.values(counts).reduce((a, b) => a + b, 0));
  });

  it('names the level paths of every full row as its expected.plans keys do (the root included)', () => {
    for (const row of full) {
      const root = loadInput(row.input);
      expect({ id: row.id, levels: levelsOf(root).map(levelPathOf).sort() }).toEqual({
        id: row.id,
        levels: Object.keys(row.expected.plans).sort(),
      });
    }
  });

  it('spells every distinct plan member of the ref as planNames does', () => {
    const members = new Set(full.flatMap((row) => Object.values(row.expected.plans).flat()));
    const known = knownPlanNames();
    expect([...members].filter((name) => !known.has(name)).sort()).toEqual([]);
  });
});
