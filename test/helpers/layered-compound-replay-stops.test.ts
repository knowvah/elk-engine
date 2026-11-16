// SPDX-License-Identifier: EPL-2.0
// Structure tests of the compound replay: the stop selection and numbering of the run listener, the names it records, the diffs of
// runToStop / replayFull / replayScenario over stub runs, the `around` hook and the abort, and the option application on the real
// engine path. No layout literal (L4): every expectation is a count, a name the recorder's header defines, or a twin comparison.
import { describe, expect, it, vi } from 'vitest';
import { LayerSweepCrossingMinimizer } from '../../src/alg/layered/p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../src/alg/layered/p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { CompoundGraphPostprocessor } from '../../src/alg/layered/compound/CompoundGraphPostprocessor.js';
import { CompoundGraphPreprocessor } from '../../src/alg/layered/compound/CompoundGraphPreprocessor.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { GraphTransformer } from '../../src/alg/layered/intermediate/GraphTransformer.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { CompoundModelsRow, CompoundScenarioRow, FullRow } from './layered-compound-replay-rows.js';
import {
  COMPOUND_POSTPROCESSOR,
  COMPOUND_PREPROCESSOR,
  HIERARCHICAL_NODE_RESIZER,
  RunRecorder,
  applyCompoundOptions,
  nameOfProcessor,
  positionalNames,
  prepareRow,
  runRow,
  stopNameOf,
  type RowRun,
  type RunEnvironment,
  type StopRecord,
} from './layered-compound-replay-run.js';
import { replayFull, replayScenario, runToStop, stopDiffs } from './layered-compound-replay-stops.js';
import { exportLikeOracle } from './graph-json-oracle.js';
import { addNode } from './lgraph-builders.js';

/** A stand-in with the Java simple class name of the (not yet ported) resizer. */
class HierarchicalNodeResizingProcessor {
  process(): void {
    // a stub: only the class name matters
  }
}

const processor = (instance: unknown): ILayoutProcessor<unknown> => instance as ILayoutProcessor<unknown>;
const resizer = (): ILayoutProcessor<unknown> => processor(new HierarchicalNodeResizingProcessor());
const sweep = (type: CrossMinType): ILayoutProcessor<unknown> => processor(new LayerSweepCrossingMinimizer(type));

function elkNode(parent: ElkNode | null, id: string): ElkNode {
  const node = ElkGraphUtil.createNode(parent);
  node.setIdentifier(id);
  return node;
}

/** root { c }: a root graph with origin `root` and a nested graph under node `c` with origin `root/c`. */
function twoLevels(): { root: LGraph; nested: LGraph; holder: LNode } {
  const root = new LGraph();
  const nested = new LGraph();
  const elkRoot = elkNode(null, 'root');
  root.setProperty(InternalProperties.ORIGIN, elkRoot);
  nested.setProperty(InternalProperties.ORIGIN, elkNode(elkRoot, 'c'));
  const holder = addNode(root);
  holder.setNestedGraph(nested);
  nested.setParentNode(holder);
  return { root, nested, holder };
}

describe('stopNameOf (which finished notifications are stops)', () => {
  it('names the compound processors on any notification', () => {
    expect(stopNameOf(processor(new CompoundGraphPreprocessor()), true)).toBe(COMPOUND_PREPROCESSOR);
    expect(stopNameOf(processor(new CompoundGraphPostprocessor()), false)).toBe(COMPOUND_POSTPROCESSOR);
  });

  it('names a hierarchy aware processor only on the root, by its cross min type', () => {
    expect(stopNameOf(sweep(CrossMinType.BARYCENTER), true)).toBe('P3_NODE_ORDERING/LAYER_SWEEP');
    expect(stopNameOf(sweep(CrossMinType.MEDIAN), true)).toBe('P3_NODE_ORDERING/MEDIAN_LAYER_SWEEP');
    expect(stopNameOf(sweep(CrossMinType.ONE_SIDED_GREEDY_SWITCH), true)).toBe('ONE_SIDED_GREEDY_SWITCH');
    expect(stopNameOf(sweep(CrossMinType.TWO_SIDED_GREEDY_SWITCH), true)).toBe('TWO_SIDED_GREEDY_SWITCH');
    expect(stopNameOf(sweep(CrossMinType.BARYCENTER), false)).toBeNull();
  });

  it('names the node resizer on every graph and no other processor', () => {
    expect(stopNameOf(resizer(), false)).toBe(HIERARCHICAL_NODE_RESIZER);
    expect(stopNameOf(resizer(), true)).toBe(HIERARCHICAL_NODE_RESIZER);
    expect(stopNameOf(processor(new GraphTransformer(0 as never)), true)).toBeNull();
  });
});

describe('positional names', () => {
  it('turns the second GraphTransformer of a plan into the postprocessor and keeps the compound class names', () => {
    const plan = [
      processor(new CompoundGraphPreprocessor()),
      processor(new GraphTransformer(0 as never)),
      resizer(),
      processor(new GraphTransformer(0 as never)),
      processor(new CompoundGraphPostprocessor()),
    ];
    expect(positionalNames(plan)).toEqual([
      COMPOUND_PREPROCESSOR,
      'DIRECTION_PREPROCESSOR',
      HIERARCHICAL_NODE_RESIZER,
      'DIRECTION_POSTPROCESSOR',
      COMPOUND_POSTPROCESSOR,
    ]);
    expect(nameOfProcessor(resizer())).toBe(HIERARCHICAL_NODE_RESIZER);
  });
});

describe('RunRecorder', () => {
  /** Drives the listener as ElkLayered does around a compound run on `twoLevels()`. */
  function drive(env: RunEnvironment = {}): { recorder: RunRecorder; graphs: ReturnType<typeof twoLevels> } {
    const graphs = twoLevels();
    const recorder = new RunRecorder(env);
    const notify = (p: ILayoutProcessor<unknown>, graph: LGraph, isRoot: boolean): void => {
      recorder.layoutProcessorReady(p, graph, isRoot);
      recorder.layoutProcessorFinished(p, graph, isRoot);
    };
    notify(processor(new CompoundGraphPreprocessor()), graphs.root, true);
    notify(processor(new GraphTransformer(0 as never)), graphs.nested, false); // no stop
    notify(processor(new GraphTransformer(0 as never)), graphs.root, true); // no stop
    notify(sweep(CrossMinType.BARYCENTER), graphs.root, true);
    notify(resizer(), graphs.nested, false);
    notify(resizer(), graphs.root, true);
    notify(processor(new CompoundGraphPostprocessor()), graphs.root, true);
    return { recorder, graphs };
  }

  it('numbers only the hierarchical stops, from 0, with positional name, class name and level path', () => {
    const { recorder } = drive();
    expect(recorder.stops.map((s) => [s.index, s.processor, s.className, s.levelPath])).toEqual([
      [0, COMPOUND_PREPROCESSOR, 'CompoundGraphPreprocessor', 'root'],
      [1, 'P3_NODE_ORDERING/LAYER_SWEEP', 'LayerSweepCrossingMinimizer', 'root'],
      [2, HIERARCHICAL_NODE_RESIZER, 'HierarchicalNodeResizingProcessor', 'root/c'],
      [3, HIERARCHICAL_NODE_RESIZER, 'HierarchicalNodeResizingProcessor', 'root'],
      [4, COMPOUND_POSTPROCESSOR, 'CompoundGraphPostprocessor', 'root'],
    ]);
  });

  it('snapshots the whole tree from the root only at the wanted stops', () => {
    const roots: LGraph[] = [];
    const { recorder, graphs } = drive({
      wantTree: (stop) => stop.index === 2,
      snapshot: (root) => {
        roots.push(root);
        return 'tree';
      },
    });
    expect(recorder.stops.map((s) => s.tree)).toEqual([undefined, undefined, 'tree', undefined, undefined]);
    expect(roots).toEqual([graphs.root]); // taken at the nested graph's stop, found through getParentNode().getGraph()
  });

  it('keeps the plan of the first graph of each level, keyed by level path', () => {
    const { recorder } = drive();
    expect(recorder.plans()).toEqual({
      root: [
        COMPOUND_PREPROCESSOR,
        'DIRECTION_PREPROCESSOR',
        'P3_NODE_ORDERING/LAYER_SWEEP',
        HIERARCHICAL_NODE_RESIZER,
        COMPOUND_POSTPROCESSOR,
      ],
      'root/c': ['DIRECTION_PREPROCESSOR', HIERARCHICAL_NODE_RESIZER],
    });
  });

  it('records the transformer of the root once even when a second graph shares the level', () => {
    const { root } = twoLevels();
    const twin = new LGraph();
    twin.setProperty(InternalProperties.ORIGIN, root.getProperty(InternalProperties.ORIGIN));
    const recorder = new RunRecorder({});
    recorder.layoutProcessorReady(processor(new GraphTransformer(0 as never)), root, true);
    recorder.layoutProcessorReady(processor(new GraphTransformer(0 as never)), twin, true);
    expect(recorder.plans()).toEqual({ root: ['DIRECTION_PREPROCESSOR'] });
  });

  it('throws an internal signal right after the capture of abortAfter', () => {
    const graphs = twoLevels();
    const recorder = new RunRecorder({ abortAfter: 0 });
    const call = (): void => {
      recorder.layoutProcessorFinished(processor(new CompoundGraphPreprocessor()), graphs.root, true);
    };
    expect(call).toThrow();
    expect(recorder.stops).toHaveLength(1);
  });

  it('refuses a graph without an ElkNode origin', () => {
    const recorder = new RunRecorder({});
    expect(() => recorder.layoutProcessorReady(processor(new CompoundGraphPreprocessor()), new LGraph(), true)).toThrow(
      'a laid-out graph without an ElkNode origin',
    );
  });
});

// ------------------------------------------------------------------------------------------------------------

const STOP = {
  index: 1,
  levelPath: 'root',
  processor: 'P3_NODE_ORDERING/LAYER_SWEEP',
  className: 'LayerSweepCrossingMinimizer',
};
const record = (index: number, over: Partial<StopRecord> = {}): StopRecord => ({
  index,
  levelPath: 'root',
  processor: 'P3_NODE_ORDERING/LAYER_SWEEP',
  className: 'LayerSweepCrossingMinimizer',
  ...over,
});
const modelsRow = (): CompoundModelsRow =>
  ({
    id: 'models/m/1-root-LayerSweepCrossingMinimizer/default',
    group: 'models',
    input: { elk: { id: 'root' } },
    target: null,
    options: {},
    steps: null,
    prefix: null,
    expected: { stop: STOP, tree: 'expected tree' },
  }) as CompoundModelsRow;
const stubRun =
  (stops: StopRecord[], root: ElkNode = elkNode(null, 'root'), plans = {}) =>
  (_row: unknown, _env: RunEnvironment): RowRun => ({ root, plans, stops, aborted: false });

describe('stopDiffs', () => {
  it('reports one diff per differing field, naming the index', () => {
    expect(stopDiffs(STOP, record(1))).toEqual([]);
    expect(stopDiffs(STOP, record(1, { processor: 'X', levelPath: 'root/c' }))).toEqual([
      'stop 1 processor: expected P3_NODE_ORDERING/LAYER_SWEEP, got X',
      'stop 1 levelPath: expected root, got root/c',
    ]);
    expect(stopDiffs(STOP, record(1, { className: 'Y' }))).toEqual([
      'stop 1 className: expected LayerSweepCrossingMinimizer, got Y',
    ]);
  });
});

describe('runToStop', () => {
  it('asks the run for the tree at the numbered stop and compares only that snapshot', () => {
    let wanted: number[] = [];
    const run = (row: unknown, env: RunEnvironment): RowRun => {
      const stops = [0, 1, 2].map((i) => record(i, { tree: `tree ${String(i)}` }));
      wanted = stops.filter((s) => env.wantTree?.(s) === true).map((s) => s.index);
      return stubRun(stops)(row, env);
    };
    const compared: unknown[][] = [];
    const result = runToStop(modelsRow(), {
      run,
      compare: (expected, actual) => {
        compared.push([expected, actual]);
        return [];
      },
    });
    expect(wanted).toEqual([1]);
    expect(compared).toEqual([['expected tree', 'tree 1']]);
    expect(result.diffs).toEqual([]);
  });

  it('records a wrong processor name as one diff and keeps the tree comparison', () => {
    const run = stubRun([record(0), record(1, { processor: 'ONE_SIDED_GREEDY_SWITCH', tree: 'x' })]);
    const result = runToStop(modelsRow(), { run, compare: () => ['tree: differs'] });
    expect(result.diffs).toEqual([
      'stop 1 processor: expected P3_NODE_ORDERING/LAYER_SWEEP, got ONE_SIDED_GREEDY_SWITCH',
      'tree: differs',
    ]);
  });

  it('reports a stop that the run never reached as one diff', () => {
    expect(runToStop(modelsRow(), { run: stubRun([record(0)]) }).diffs).toEqual([
      'stop 1 was not reached: the run made 1 stops',
    ]);
  });

  it('passes around, snapshot and abortAtStop to the run', () => {
    const seen: RunEnvironment[] = [];
    const around = <T>(body: () => T): T => body();
    const snapshot = (): unknown => 'snap';
    const run = (row: unknown, env: RunEnvironment): RowRun => {
      seen.push(env);
      return stubRun([record(0), record(1, { tree: 't' })])(row, env);
    };
    runToStop(modelsRow(), { run, around, snapshot, abortAtStop: true, compare: () => [] });
    runToStop(modelsRow(), { run, compare: () => [] });
    expect(seen[0]!.around).toBe(around);
    expect(seen[0]!.snapshot).toBe(snapshot);
    expect(seen[0]!.abortAfter).toBe(1);
    expect(seen[1]!.abortAfter).toBeUndefined();
  });
});

describe('replayScenario and replayFull over stub runs', () => {
  const scenario = (stops: number): CompoundScenarioRow =>
    ({
      id: 'scenarios/s/RIGHT',
      group: 'scenarios',
      input: { elk: { id: 'root' } },
      target: null,
      options: {},
      steps: null,
      prefix: null,
      expected: { layout: {}, plans: { root: [] }, stops, tree: 'expected tree' },
    }) as CompoundScenarioRow;

  it('asks for the tree of the CompoundGraphPostprocessor stop and compares count, plans and tree', () => {
    const wanted: string[] = [];
    const run = (row: unknown, env: RunEnvironment): RowRun => {
      const stops = [record(0, { processor: COMPOUND_PREPROCESSOR }), record(1, { processor: COMPOUND_POSTPROCESSOR })];
      stops.forEach((s) => env.wantTree?.(s) === true && wanted.push(s.processor));
      return stubRun([stops[0]!, { ...stops[1]!, tree: 'actual tree' }], elkNode(null, 'root'), { root: ['X'] })(
        row,
        env,
      );
    };
    const result = replayScenario(scenario(3), { run, compare: (e, a) => [`tree ${String(e)} vs ${String(a)}`] });
    expect(wanted).toEqual([COMPOUND_POSTPROCESSOR]);
    expect(result.diffs.some((d) => d.includes('plans[root][0]'))).toBe(true);
    expect(result.diffs).toContain('stops: expected 3, got 2');
    expect(result.diffs).toContain('tree expected tree vs actual tree');
  });

  it('reports a last stop that is not the postprocessor', () => {
    const result = replayScenario(scenario(1), { run: stubRun([record(0)]) });
    expect(result.diffs).toContain(
      `tree: the last stop is P3_NODE_ORDERING/LAYER_SWEEP, not ${COMPOUND_POSTPROCESSOR}`,
    );
  });

  it('compares a full row with the landed layout and plan comparison and hands around to the run', () => {
    const row = {
      id: 'full/x/y/default',
      group: 'full',
      input: { elk: { id: 'root' } },
      target: null,
      options: {},
      steps: null,
      prefix: null,
      expected: { layout: JSON.parse(exportLikeOracle(elkNode(null, 'root'))), plans: { root: ['A'] } },
    } as unknown as FullRow;
    const around = <T>(body: () => T): T => body();
    let handed: RunEnvironment | null = null;
    const run = (_row: unknown, env: RunEnvironment): RowRun => {
      handed = env;
      const root = elkNode(null, 'root');
      return { root, plans: { root: ['A'] }, stops: [], aborted: false };
    };
    expect(replayFull(row, { run, around }).diffs).toEqual([]);
    expect(handed!.around).toBe(around);
    const other = replayFull(row, { run: stubRun([], elkNode(null, 'root'), { root: ['B'] }) });
    expect(other.diffs).toHaveLength(1);
    expect(other.diffs[0]).toContain('plans[root][0]');
  });
});

// ------------------------------------------------------------------------------------------------------------
// the real engine path

describe('option application and the engine route', () => {
  const hierarchical = {
    input: {
      elk: {
        id: 'root',
        layoutOptions: { 'org.eclipse.elk.algorithm': 'layered' },
        children: [{ id: 'a', width: 10, height: 10, children: [{ id: 'b', width: 5, height: 5 }] }],
      },
    },
  };
  const rowWith = (options: Record<string, unknown>): { id: string; input: never; options: never } =>
    ({ id: 'full/test', ...hierarchical, options }) as never;

  it('removes a property for a null option value and sets the others', () => {
    const root = prepareRow(rowWith({ 'org.eclipse.elk.padding': null }));
    const key = 'org.eclipse.elk.layered.crossingMinimization.greedySwitch.type';
    const before = [...root.getAllProperties()].map(([property]) => property.getId());
    expect(before).not.toContain('org.eclipse.elk.padding');
    applyCompoundOptions(root, { [key]: { t: 'enum', c: 'GreedySwitchType', n: 'TWO_SIDED' } });
    expect([...root.getAllProperties()].map(([property]) => property.getId())).toContain(key);
    applyCompoundOptions(root, { [key]: null });
    expect([...root.getAllProperties()].map(([property]) => property.getId())).not.toContain(key);
  });

  it('refuses a null option that no metadata knows', () => {
    const root = prepareRow(rowWith({}));
    expect(() => applyCompoundOptions(root, { 'no.such.option': null })).toThrow('no.such.option');
  });

  it('refuses a level with random seed 0', () => {
    const seed = LayeredOptions.RANDOM_SEED.getId();
    expect(() => prepareRow(rowWith({ [seed]: { t: 'int', v: 0 } }))).toThrow('random seed 0 (stop condition) at root');
  });

  it('runs a flat-path row through the engine and records its plan under the level path and its root stops', () => {
    const flat = {
      id: 'full/flat',
      input: { elk: { id: 'r', children: [{ id: 'n', width: 4, height: 4 }] } },
      options: {},
    };
    const run = runRow(flat as never);
    expect(Object.keys(run.plans)).toEqual(['r']);
    expect(run.plans.r).toContain('P5_EDGE_ROUTING/ORTHOGONAL');
    expect(run.plans.r).not.toContain(COMPOUND_PREPROCESSOR);
    // the recorder's rule is the same on a flat run: the hierarchy aware processors of the root are stops
    expect(run.stops.map((stop) => stop.processor)).toEqual([
      'P3_NODE_ORDERING/LAYER_SWEEP',
      'TWO_SIDED_GREEDY_SWITCH',
    ]);
    expect(run.stops.every((stop) => run.plans.r!.includes(stop.processor))).toBe(true);
  });

  it('lets a twin wrap the run (around) and captures + aborts at stop 0 with the preprocessor stubbed out', () => {
    const row = rowWith({
      'org.eclipse.elk.hierarchyHandling': { t: 'enum', c: 'HierarchyHandling', n: 'INCLUDE_CHILDREN' },
    });
    let wrapped = 0;
    const around = <T>(body: () => T): T => {
      wrapped++;
      const spy = vi.spyOn(CompoundGraphPreprocessor.prototype, 'process').mockImplementation(() => undefined as never);
      try {
        return body();
      } finally {
        spy.mockRestore();
      }
    };
    const run = runRow(row, { around, wantTree: () => true, abortAfter: 0 });
    expect(wrapped).toBe(1);
    expect(run.aborted).toBe(true);
    expect(run.stops.map((s) => [s.index, s.processor, s.levelPath])).toEqual([[0, COMPOUND_PREPROCESSOR, 'root']]);
    const tree = run.stops[0]!.tree as { graphs: { levelPath: string }[] };
    expect(tree.graphs.map((g) => g.levelPath)).toEqual(['root', 'root/a']);
  });

  it('reaches the staged preprocessor on a compound row and lets the error propagate', () => {
    const row = rowWith({
      'org.eclipse.elk.hierarchyHandling': { t: 'enum', c: 'HierarchyHandling', n: 'INCLUDE_CHILDREN' },
    });
    const staged = vi.spyOn(CompoundGraphPreprocessor.prototype, 'process').mockImplementation(() => {
      throw new Error('staged here');
    });
    try {
      expect(() => runRow(row)).toThrow('staged here');
    } finally {
      staged.mockRestore();
    }
  });
});
