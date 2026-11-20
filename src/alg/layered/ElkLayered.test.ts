// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { repoRoot } from '../../../test/corpus/corpus.js';
import { registerLayered } from '../../../test/helpers/layered-framework-replay.js';
import {
  isFullRow,
  loadPipelineRows,
  registerPipelineEnums,
} from '../../../test/helpers/layered-pipeline-replay-rows.js';
import { isCompoundFullRow, loadCompoundRowsIfPresent } from '../../../test/helpers/layered-compound-replay-rows.js';
import { replayFull } from '../../../test/helpers/layered-compound-replay-stops.js';
import { addNode } from '../../../test/helpers/lgraph-builders.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import { HierarchyHandling } from '../../core/options/HierarchyHandling.js';
import { TestController } from '../../core/testing/TestController.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import { Pair } from '../../core/util/Pair.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { ElkLayered } from './ElkLayered.js';
import { ElkLayeredTestExecutionState } from './ElkLayeredTestExecutionState.js';
import { LGraph } from './graph/LGraph.js';
import { CommentPreprocessor } from './intermediate/CommentPreprocessor.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { HIERARCHY_AWARE, isHierarchyAwareLayoutProcessor } from './IHierarchyAwareLayoutProcessor.js';
import { GraphProperties } from './options/GraphProperties.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LayeredOptions } from './options/LayeredOptions.js';

const PIPELINE_REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const FINISHED_MESSAGE = 'Current layout test run has finished.';

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const compoundFullRows = loadCompoundRowsIfPresent().filter(isCompoundFullRow);
/** The `full` rows of the large Ptolemy models are left to the full-run sweeps (T9); every other `full` row is small. */
const LARGE_COMPOUND_FULL_PREFIX = 'full/ptolemy-include/';

const fullRows = loadPipelineRows(PIPELINE_REF).filter(isFullRow);

describe('ElkLayered.doLayout on the full rows (F4, oracle)', () => {
  it('finds the 199 full rows', () => {
    expect(fullRows).toHaveLength(199);
  });
});

/** A graph with one node, the smallest input `doLayout` accepts without a staged processor. */
function oneNodeGraph(): LGraph {
  const graph = new LGraph();
  addNode(graph);
  return graph;
}

function countingController(): { controller: TestController; ready: string[]; finished: string[] } {
  const controller = new TestController('org.eclipse.elk.layered');
  const ready: string[] = [];
  const finished: string[] = [];
  controller.addLayoutExecutionListener({
    layoutProcessorReady: (processor) => ready.push(processor.constructor.name),
    layoutProcessorFinished: (processor) => finished.push(processor.constructor.name),
  });
  return { controller, ready, finished };
}

describe('ElkLayered.doLayout (structure)', () => {
  it('creates its own monitor for a null monitor and runs the plan', () => {
    const layered = new ElkLayered();
    const { controller, ready, finished } = countingController();
    layered.setTestController(controller);
    const graph = oneNodeGraph();
    layered.doLayout(graph, null);
    const plan = graph.getProperty(InternalProperties.PROCESSORS);
    expect(ready).toEqual(plan.map((p) => p.constructor.name));
    expect(finished).toEqual(ready);
  });

  it('returns before the first processor when the monitor is cancelled', () => {
    const layered = new ElkLayered();
    const { controller, ready } = countingController();
    layered.setTestController(controller);
    const monitor = new BasicProgressMonitor();
    vi.spyOn(monitor, 'isCanceled').mockReturnValue(true);
    layered.doLayout(oneNodeGraph(), monitor);
    expect(ready).toEqual([]);
  });

  it('stops after the processors that ran when the monitor is cancelled mid-plan', () => {
    const layered = new ElkLayered();
    const { controller, ready } = countingController();
    layered.setTestController(controller);
    const monitor = new BasicProgressMonitor();
    const RUN_BEFORE_CANCEL = 3;
    let calls = 0;
    vi.spyOn(monitor, 'isCanceled').mockImplementation(() => ++calls > RUN_BEFORE_CANCEL);
    layered.doLayout(oneNodeGraph(), monitor);
    expect(ready).toHaveLength(RUN_BEFORE_CANCEL);
  });

  it('notifies the root notification of the controller for a root graph', () => {
    const layered = new ElkLayered();
    const controller = new TestController('org.eclipse.elk.layered');
    const rootReady = vi.spyOn(controller, 'notifyRootProcessorReady');
    const rootFinished = vi.spyOn(controller, 'notifyRootProcessorFinished');
    const nested = vi.spyOn(controller, 'notifyProcessorReady');
    layered.setTestController(controller);
    const graph = oneNodeGraph();
    layered.doLayout(graph, new NullElkProgressMonitor());
    const planLength = graph.getProperty(InternalProperties.PROCESSORS).length;
    expect(rootReady).toHaveBeenCalledTimes(planLength);
    expect(rootFinished).toHaveBeenCalledTimes(planLength);
    expect(nested).not.toHaveBeenCalled();
  });

  it('lays out a comment-box graph with the CommentPreprocessor ported in the plan (F1, 7f2)', () => {
    const graph = oneNodeGraph();
    graph.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.COMMENTS);
    new ElkLayered().doLayout(graph, new NullElkProgressMonitor());
    const plan = graph.getProperty(InternalProperties.PROCESSORS);
    expect(plan[0]).toBeInstanceOf(CommentPreprocessor);
    expect(plan.map((processor) => processor.constructor.name)).toContain('CommentPostprocessor');
  });
});

describe('ElkLayered test API', () => {
  function prepared(): { layered: ElkLayered; state: ElkLayeredTestExecutionState; plan: ILayoutProcessor<LGraph>[] } {
    const layered = new ElkLayered();
    const state = layered.prepareLayoutTest(oneNodeGraph());
    return { layered, state, plan: layered.getLayoutTestConfiguration(state) };
  }

  it('prepares the components of the graph at step 0 with the plan on the first one', () => {
    const { layered, state, plan } = prepared();
    expect(state.getGraphs()).toHaveLength(1);
    expect(state.getStep()).toBe(0);
    expect(plan).toBe(state.getGraphs()![0]!.getProperty(InternalProperties.PROCESSORS));
    expect(layered.isLayoutTestFinished(state)).toBe(false);
  });

  it('runs one processor per step and finishes after the last one', () => {
    const { layered, state, plan } = prepared();
    const { controller, ready } = countingController();
    layered.setTestController(controller);
    plan.forEach((_processor, index) => {
      expect(layered.isLayoutTestFinished(state)).toBe(false);
      layered.runLayoutTestStep(state);
      expect(state.getStep()).toBe(index + 1);
    });
    expect(layered.isLayoutTestFinished(state)).toBe(true);
    expect(ready).toEqual(plan.map((p) => p.constructor.name));
  });

  it('throws IllegalStateException for a step after the run has finished', () => {
    const { layered, state, plan } = prepared();
    plan.forEach(() => layered.runLayoutTestStep(state));
    expect(() => layered.runLayoutTestStep(state)).toThrow(new IllegalStateException(FINISHED_MESSAGE));
    expect(state.getStep()).toBe(plan.length);
  });

  it('runs until a processor class, inclusive by default and exclusive on request', () => {
    const { layered, state, plan } = prepared();
    const target = plan[4]!.constructor;
    const index = plan.findIndex((p) => p.constructor === target);
    layered.runLayoutTestUntil(target, false, state);
    expect(state.getStep()).toBe(index);
    layered.runLayoutTestUntil(target, state);
    expect(state.getStep()).toBe(index + 1);
  });

  it('reports a processor class that is not among the remaining ones on the error stream and runs nothing', () => {
    const { layered, state } = prepared();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined as never);
    class NotInThePlan {}
    layered.runLayoutTestUntil(NotInThePlan, state);
    expect(error).toHaveBeenCalledWith('Given processor NotInThePlan not part of the remaining algorithm.');
    expect(state.getStep()).toBe(state.getGraphs()![0]!.getProperty(InternalProperties.PROCESSORS).length);
  });

  it('answers an unprepared graph as not finished', () => {
    const state = new ElkLayeredTestExecutionState();
    state.graphs = [new LGraph()];
    expect(new ElkLayered().isLayoutTestFinished(state)).toBe(false);
  });
});

describe('ElkLayered.runHierarchyLevel (the hierarchical loop of ElkLayered.java:242-287)', () => {
  /** A processor that records its run; `aware` brands it hierarchy aware. */
  function recorder(name: string, log: string[], aware = false): ILayoutProcessor<LGraph> {
    const processor = {
      process: () => {
        log.push(name);
      },
    } as ILayoutProcessor<LGraph>;
    if (aware) {
      Object.defineProperty(processor, HIERARCHY_AWARE, { value: true });
    }
    return processor;
  }

  function cursor(processors: ILayoutProcessor<LGraph>[]): { hasNext(): boolean; next(): ILayoutProcessor<LGraph> } {
    let position = 0;
    return { hasNext: () => position < processors.length, next: () => processors[position++]! };
  }

  function runLevel(graph: LGraph, processors: ILayoutProcessor<LGraph>[], slot: number): number {
    const level = new ElkLayered() as unknown as {
      runHierarchyLevel(pair: Pair<LGraph, unknown>, monitor: BasicProgressMonitor, slot: number): number;
    };
    return level.runHierarchyLevel(Pair.of(graph, cursor(processors)), new BasicProgressMonitor(), slot);
  }

  it('runs every plain processor and the aware one on the root, then pauses', () => {
    const log: string[] = [];
    const slot = runLevel(new LGraph(), [recorder('a', log), recorder('b', log, true), recorder('c', log)], 0);
    expect(log).toEqual(['a', 'b']);
    expect(slot).toBe(2);
  });

  it('pauses before an aware processor on a nested graph without running it', () => {
    const log: string[] = [];
    const nested = new LGraph();
    nested.setParentNode(addNode(new LGraph()));
    const slot = runLevel(nested, [recorder('a', log), recorder('b', log, true), recorder('c', log)], 5);
    expect(log).toEqual(['a']);
    expect(slot).toBe(6);
  });
});

describe('ElkLayered.doCompoundLayout', () => {
  /** A root graph holding one node with a nested graph of one node, both laid out with INCLUDE_CHILDREN. */
  function compoundGraph(): { root: LGraph; nested: LGraph } {
    const root = new LGraph();
    const nested = new LGraph();
    addNode(nested);
    const parent = addNode(root);
    parent.setNestedGraph(nested);
    nested.setParentNode(parent);
    for (const graph of [root, nested]) {
      graph.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    }
    return { root, nested };
  }

  it('completes a compound layout equal to its recorded full row (layered-compound.json, AD-4)', () => {
    // the first small `full` row: INCLUDE_CHILDREN on a vendored input; every expected value is the row's
    const row = compoundFullRows.find((candidate) => !candidate.id.startsWith(LARGE_COMPOUND_FULL_PREFIX))!;
    const doCompoundLayout = vi.spyOn(ElkLayered.prototype, 'doCompoundLayout');
    expect(replayFull(row).diffs).toEqual([]);
    expect(doCompoundLayout).toHaveBeenCalledTimes(1);
    expect(doCompoundLayout.mock.results[0]?.type).toBe('return');
  });

  it('runs the plan of every graph bottom up between the compound pre- and postprocessor', () => {
    const layered = new ElkLayered();
    const events: string[] = [];
    const controller = new TestController('org.eclipse.elk.layered');
    controller.addLayoutExecutionListener({
      layoutProcessorReady: (_processor, graph, isRoot) => events.push(`${isRoot ? 'root' : 'nested'}`),
      layoutProcessorFinished: () => undefined,
    });
    layered.setTestController(controller);
    const { root, nested } = compoundGraph();
    layered.doCompoundLayout(root, new NullElkProgressMonitor());

    const rootPlan = root.getProperty(InternalProperties.PROCESSORS);
    const nestedPlan = nested.getProperty(InternalProperties.PROCESSORS);
    // the pre- and postprocessor are announced for the root; every plan entry of the root and every non-aware one of the nested graph runs once
    expect(events.filter((e) => e === 'root')).toHaveLength(rootPlan.length + 2);
    // a hierarchy-aware entry is consumed without running on a nested graph
    const aware = nestedPlan.filter((processor) => isHierarchyAwareLayoutProcessor(processor));
    expect(aware).toHaveLength(1);
    expect(events.filter((e) => e === 'nested')).toHaveLength(nestedPlan.length - aware.length);
    // bottom up: the nested graph starts before the root's first plan entry (after the preprocessor notification)
    expect(events.slice(0, 3)).toEqual(['root', 'nested', 'nested']);
  });

  it('rejects a child whose crossing minimization differs from the root before preparing any graph', () => {
    const { root, nested } = compoundGraph();
    nested.setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.NONE);
    expect(() => new ElkLayered().doCompoundLayout(root, null)).toThrow(UnsupportedGraphException);
  });
});

describe('ElkLayered (test controller)', () => {
  it('accepts and clears a test controller', () => {
    const layered = new ElkLayered();
    expect(layered.setTestController(new TestController('org.eclipse.elk.layered'))).toBeUndefined();
    expect(layered.setTestController(null)).toBeUndefined();
  });
});

describe('ElkLayeredTestExecutionState', () => {
  it('starts without graphs at step 0', () => {
    const state = new ElkLayeredTestExecutionState();
    expect(state.getGraphs()).toBeNull();
    expect(state.getStep()).toBe(0);
  });

  it('reports the graphs and step the outer class stored', () => {
    const state = new ElkLayeredTestExecutionState();
    const graph = new LGraph();
    state.graphs = [graph];
    state.step = 3;
    expect(state.getGraphs()).toEqual([graph]);
    expect(state.getGraphs()?.[0]).toBe(graph);
    expect(state.getStep()).toBe(3);
  });
});
