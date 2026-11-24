// SPDX-License-Identifier: EPL-2.0
// Structural tests of the layout test runner against a fake engine: the processors it notifies are two stub classes,
// so nothing here depends on an ELK literal. The self-loop run test goes through the real provider.
import { describe, expect, it } from 'vitest';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import {
  applyDefaultConfiguration,
  buildLayoutTests,
  inputsRoot,
  layout,
  listGraphFiles,
  registerTestAlgorithms,
  type LayoutTestDeps,
  type LayoutTestSpec,
} from './layout-test-runner.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { StressOptions } from '../../src/alg/force/options/StressOptions.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { SelfLoopPortRestorer } from '../../src/alg/layered/intermediate/SelfLoopPortRestorer.js';
import { SelfLoopPostProcessor } from '../../src/alg/layered/intermediate/SelfLoopPostProcessor.js';
import { SelfLoopPreProcessor } from '../../src/alg/layered/intermediate/SelfLoopPreProcessor.js';
import { SelfLoopRouter } from '../../src/alg/layered/intermediate/SelfLoopRouter.js';

class FirstProcessor implements ILayoutProcessor<object> {
  process(): void {}
}
class SecondProcessor implements ILayoutProcessor<object> {
  process(): void {}
}

const ALGORITHM = LayeredOptions.ALGORITHM_ID;
const FAKE_LGRAPH = { fake: 'lgraph' };
const VENDORED_TICKETS = 'tickets/layered/**';
const FORCE_CATEGORY = 'org.eclipse.elk.force';
const FORCE_SUFFIX = 'force';
const STRESS_SUFFIX = 'stress';
const STRESS_EDGE_LENGTH = 70;
const CHILD_SIZE = 20;

function newGraph(): ElkNode {
  return ElkGraphUtil.createGraph();
}

/** A fake engine: notifies the processors given, in order, each as root or not, and records the graphs laid out. */
function fakeEngine(notifications: readonly [ILayoutProcessor<unknown>, boolean][]): LayoutTestDeps & {
  readonly laidOut: ElkNode[];
} {
  const laidOut: ElkNode[] = [];
  return {
    laidOut,
    layout(graph, controller): void {
      laidOut.push(graph);
      for (const [processor, isRoot] of notifications) {
        if (isRoot) {
          controller?.notifyRootProcessorReady(FAKE_LGRAPH, processor);
          controller?.notifyRootProcessorFinished(FAKE_LGRAPH, processor);
        } else {
          controller?.notifyProcessorReady(FAKE_LGRAPH, processor);
          controller?.notifyProcessorFinished(FAKE_LGRAPH, processor);
        }
      }
    },
  };
}

function spec(overrides: Partial<LayoutTestSpec>): LayoutTestSpec {
  return { name: 'fake', algorithm: ALGORITHM, graphs: [newGraphBuilder], ...overrides };
}

function newGraphBuilder(): ElkNode {
  return newGraph();
}

/** The ids the service resolves for force and stress, by id and by suffix; `null` where one does not resolve. */
function resolvedTestAlgorithms(): (string | null)[] {
  const service = LayoutMetaDataService.getInstance();
  return [
    service.getAlgorithmData(ForceOptions.ALGORITHM_ID),
    service.getAlgorithmData(StressOptions.ALGORITHM_ID),
    service.getAlgorithmDataBySuffix(FORCE_SUFFIX),
    service.getAlgorithmDataBySuffix(STRESS_SUFFIX),
  ].map((data) => data?.getId() ?? null);
}

const BOTH_BY_ID_AND_SUFFIX = [
  ForceOptions.ALGORITHM_ID,
  StressOptions.ALGORITHM_ID,
  ForceOptions.ALGORITHM_ID,
  StressOptions.ALGORITHM_ID,
];

/** A layered root with one child that names `elk.stress` and holds two connected nodes. */
function stressChildGraph(): ElkNode {
  const graph = newGraph();
  graph.setProperty(CoreOptions.ALGORITHM, ALGORITHM);
  const child = ElkGraphUtil.createNode(graph);
  child.setProperty(CoreOptions.ALGORITHM, `elk.${STRESS_SUFFIX}`);
  child.setProperty(StressOptions.DESIRED_EDGE_LENGTH, STRESS_EDGE_LENGTH);
  const first = ElkGraphUtil.createNode(child);
  const second = ElkGraphUtil.createNode(child);
  first.setDimensions(CHILD_SIZE, CHILD_SIZE);
  second.setDimensions(CHILD_SIZE, CHILD_SIZE);
  ElkGraphUtil.createSimpleEdge(first, second);
  return graph;
}

describe('layout test runner: the algorithms of PlainJavaInitialization', () => {
  it('registers elk.force and elk.stress before an experiment provides its graph', () => {
    const atProvide: (string | null)[][] = [];
    const cases = buildLayoutTests(
      {
        name: 'registration',
        graphs: [
          function provided(): ElkNode {
            atProvide.push(resolvedTestAlgorithms());
            return newGraph();
          },
        ],
        afterLayout: { check: () => {} },
      },
      fakeEngine([]),
    );
    cases[0]!.run();
    expect(atProvide).toEqual([BOTH_BY_ID_AND_SUFFIX]);
  });

  it('registers each provider once: a second call leaves one force and one stress in the force category', () => {
    registerTestAlgorithms();
    registerTestAlgorithms();
    expect(resolvedTestAlgorithms()).toEqual(BOTH_BY_ID_AND_SUFFIX);
    const layouters = LayoutMetaDataService.getInstance().getCategoryData(FORCE_CATEGORY)!.getLayouters();
    expect(layouters.map((data) => data.getId())).toEqual([ForceOptions.ALGORITHM_ID, StressOptions.ALGORITHM_ID]);
  });

  it('lays a child that names elk.stress out with stress: its two nodes end the desired edge length apart', () => {
    let laidOut: ElkNode | null = null;
    const cases = buildLayoutTests({
      name: 'stress child',
      graphs: [stressChildGraph],
      afterLayout: {
        check: (graph) => {
          laidOut = graph;
        },
      },
    });
    cases[0]!.run();
    const [first, second] = [...laidOut!.getChildren().get(0).getChildren()];
    // stress majorization of two connected nodes of one size: the distance of their centres is the desired edge length
    expect(Math.hypot(first!.getX() - second!.getX(), first!.getY() - second!.getY())).toBeCloseTo(
      STRESS_EDGE_LENGTH,
      6,
    );
    expect([first!.getX(), first!.getY()]).not.toEqual([second!.getX(), second!.getY()]);
  });
});

describe('layout test runner', () => {
  it('emits one case per graph x configurator x check, titled by all three', () => {
    const cases = buildLayoutTests(
      spec({
        graphs: [newGraphBuilder, newGraphBuilder],
        configurators: { first: () => {}, second: () => {} },
        afterLayout: { checkA: () => {}, checkB: () => {} },
      }),
      fakeEngine([]),
    );
    expect(cases.map((c) => c.title)).toEqual([
      'checkA [graphMethod(newGraphBuilder) configMethod(first)]',
      'checkB [graphMethod(newGraphBuilder) configMethod(first)]',
      'checkA [graphMethod(newGraphBuilder) configMethod(first)]',
      'checkB [graphMethod(newGraphBuilder) configMethod(first)]',
      'checkA [graphMethod(newGraphBuilder) configMethod(second)]',
      'checkB [graphMethod(newGraphBuilder) configMethod(second)]',
      'checkA [graphMethod(newGraphBuilder) configMethod(second)]',
      'checkB [graphMethod(newGraphBuilder) configMethod(second)]',
    ]);
  });

  it('lays an experiment out once for all its checks and runs the configurator first', () => {
    const engine = fakeEngine([]);
    const seen: string[] = [];
    const cases = buildLayoutTests(
      spec({
        configurators: { configure: () => seen.push('configurator') },
        afterLayout: { a: () => seen.push('a'), b: () => seen.push('b') },
      }),
      engine,
    );
    for (const testCase of cases) {
      testCase.run();
    }
    expect(engine.laidOut.length).toBe(1);
    expect(seen).toEqual(['configurator', 'a', 'b']);
  });

  it('fails a failIfNotExecuted check naming the class when the processor never ran', () => {
    const cases = buildLayoutTests(
      spec({
        afterProcessor: [{ cls: SecondProcessor, check: () => {}, failIfNotExecuted: true }],
      }),
      fakeEngine([[new FirstProcessor(), true]]),
    );
    expect(() => cases[0]!.run()).toThrow(/Test was not executed, but was supposed to\. \(SecondProcessor\)/);
  });

  it('passes a check that did not run when failIfNotExecuted is off', () => {
    const cases = buildLayoutTests(
      spec({ afterProcessor: [{ cls: SecondProcessor, check: () => {} }] }),
      fakeEngine([[new FirstProcessor(), true]]),
    );
    expect(() => cases[0]!.run()).not.toThrow();
  });

  it('hands the notified graph to before and after checks of the matching class only', () => {
    const calls: string[] = [];
    const cases = buildLayoutTests(
      spec({
        beforeProcessor: [{ cls: FirstProcessor, check: (g) => calls.push(`before:${JSON.stringify(g)}`) }],
        afterProcessor: [
          { cls: [FirstProcessor, SecondProcessor], check: (g) => calls.push(`after:${JSON.stringify(g)}`) },
          { cls: SecondProcessor, check: () => calls.push('never') },
        ],
      }),
      fakeEngine([[new FirstProcessor(), true]]),
    );
    cases[0]!.run();
    expect(calls).toEqual([`before:${JSON.stringify(FAKE_LGRAPH)}`, `after:${JSON.stringify(FAKE_LGRAPH)}`]);
  });

  it('skips non-root graphs for onlyOnRoot and fails the case when it never ran', () => {
    let runs = 0;
    const cases = buildLayoutTests(
      spec({
        afterProcessor: [
          { cls: FirstProcessor, check: () => (runs += 1), onlyOnRoot: true, failIfNotExecuted: true },
          { cls: FirstProcessor, check: () => (runs += 10) },
        ],
      }),
      fakeEngine([[new FirstProcessor(), false]]),
    );
    expect(() => cases[0]!.run()).toThrow(/not executed/);
    cases[1]!.run();
    expect(runs).toBe(10);
  });

  it('reports a failed whitebox check after the layout finished, as its own case failure', () => {
    const engine = fakeEngine([
      [new FirstProcessor(), true],
      [new FirstProcessor(), false],
    ]);
    const cases = buildLayoutTests(
      spec({
        afterProcessor: [
          {
            cls: FirstProcessor,
            check: () => {
              throw new Error('check failed');
            },
          },
        ],
      }),
      engine,
    );
    expect(() => cases[0]!.run()).toThrow('check failed');
    expect(engine.laidOut.length).toBe(1);
  });

  it('rethrows a layout error plainly in every check of the experiment', () => {
    const failure = new Error('SelfLoopPreProcessor is staged until 7g');
    const deps: LayoutTestDeps = {
      layout(): void {
        throw failure;
      },
    };
    const cases = buildLayoutTests(spec({ afterLayout: { a: () => {}, b: () => {} } }), deps);
    expect(() => cases[0]!.run()).toThrow(failure);
    expect(() => cases[1]!.run()).toThrow(failure);
  });

  it('completes a run of the self-loop graph through the real plan, which includes the four self-loop arms', () => {
    function selfLoopGraph(): ElkNode {
      const graph = newGraph();
      const node = ElkGraphUtil.createNode(graph);
      node.setDimensions(30, 30);
      const edge = ElkGraphUtil.createEdge(graph);
      edge.getSources().add(node);
      edge.getTargets().add(node);
      return graph;
    }
    const ran: string[] = [];
    const arms = [SelfLoopPreProcessor, SelfLoopPortRestorer, SelfLoopRouter, SelfLoopPostProcessor];
    const cases = buildLayoutTests({
      name: 'real',
      algorithm: ALGORITHM,
      graphs: [selfLoopGraph],
      afterLayout: { run: () => ran.push('layout') },
      afterProcessor: arms.map((cls) => ({ cls, check: () => ran.push(cls.name), failIfNotExecuted: true })),
    });
    for (const testCase of cases) testCase.run();
    expect(ran).toContain('layout');
    expect(new Set(ran)).toEqual(new Set(['layout', ...arms.map((cls) => cls.name)]));
  });

  it('rejects whitebox checks without an algorithm, graphs without sources and suites without checks', () => {
    const check = { cls: FirstProcessor, check: () => {} };
    expect(() => buildLayoutTests(spec({ algorithm: undefined, afterProcessor: [check] }))).toThrow(
      'Whitebox tests require explicit @Algorithm annotations.',
    );
    expect(() =>
      buildLayoutTests(spec({ graphs: [{ path: 'no/such/dir/**' }], afterLayout: { a: () => {} } })),
    ).toThrow('No test graphs specified.');
    expect(() => buildLayoutTests(spec({}))).toThrow('No runnable test methods specified.');
  });

  it('selects files by name: the filter must match the whole file name', () => {
    const root = inputsRoot({});
    const names = (filter: RegExp): string[] =>
      listGraphFiles({ path: VENDORED_TICKETS, filter }, root).map((file) => file.slice(file.lastIndexOf('/') + 1));
    expect(names(/587.+\.elkt/)).toEqual(['587_polylineSplinesNPE.elkt']);
    expect(names(/405.+NSWEInside\.elkt/)).toEqual(['405_differentPortLabelPositionsNSWEInside.elkt']);
    expect(names(/587/)).toEqual([]);
  });

  it('titles file cases by the model path and honours the extension filter and single files', () => {
    const root = inputsRoot({});
    const single = listGraphFiles({ path: 'tickets/layered/587_polylineSplinesNPE.elkt' }, root);
    expect(single.length).toBe(1);
    expect(listGraphFiles({ path: VENDORED_TICKETS, extensions: ['json'] }, root)).toEqual([]);
    const cases = buildLayoutTests(
      { name: 'files', graphs: [{ path: VENDORED_TICKETS, filter: /587.+\.elkt/ }], afterLayout: { t: () => {} } },
      fakeEngine([]),
    );
    expect(cases.map((c) => c.title)).toEqual([
      't [graphFile(tickets/layered/587_polylineSplinesNPE.elkt) noConfigurator]',
    ]);
  });

  it('reads the full models directory only under PIPELINE_SUITES_FULL=1 with ELK_MODELS_DIR set', () => {
    const vendored = inputsRoot({});
    expect(inputsRoot({ ELK_MODELS_DIR: '/models' })).toBe(vendored);
    expect(inputsRoot({ PIPELINE_SUITES_FULL: '1' })).toBe(vendored);
    expect(inputsRoot({ PIPELINE_SUITES_FULL: '1', ELK_MODELS_DIR: '/models' })).toBe('/models');
  });

  it('applies the algorithm to every node and the default configuration to children, ports and edges', () => {
    let seenAlgorithm: string | null = null;
    const cases = buildLayoutTests(
      spec({
        defaultConfiguration: { nodes: true, ports: true, edges: true, edgeLabels: true },
        graphs: [
          (): ElkNode => {
            const graph = newGraph();
            const a = ElkGraphUtil.createNode(graph);
            a.setIdentifier('a');
            const b = ElkGraphUtil.createNode(graph);
            ElkGraphUtil.createSimpleEdge(a, b).setIdentifier('e');
            return graph;
          },
        ],
        afterLayout: {
          check: (graph) => {
            seenAlgorithm = graph.getChildren().get(0)!.getProperty(CoreOptions.ALGORITHM);
            const edge = graph.getContainedEdges().get(0)!;
            expect(edge.getLabels().get(0)!.getText()).toBe('e');
            expect(graph.getChildren().get(0)!.getLabels().get(0)!.getText()).toBe('a');
          },
        },
      }),
      fakeEngine([]),
    );
    cases[0]!.run();
    expect(seenAlgorithm).toBe(ALGORITHM);
  });

  it('applyDefaultConfiguration leaves a graph alone when every switch is off', () => {
    const graph = newGraph();
    const node = ElkGraphUtil.createNode(graph);
    applyDefaultConfiguration(graph, {});
    expect(node.getLabels().size()).toBe(0);
    expect(node.getWidth()).toBe(0);
  });

  it('layout() runs the configurator, then the provider, and returns the graph', () => {
    const graph = newGraph();
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(10, 10);
    let configured: ElkNode | null = null;
    const returned = layout(graph, (g) => {
      configured = g;
    });
    expect(returned).toBe(graph);
    expect(configured).toBe(graph);
    expect(node.getX()).toBeGreaterThanOrEqual(0);
  });
});
