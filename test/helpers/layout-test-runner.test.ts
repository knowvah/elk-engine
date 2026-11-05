// SPDX-License-Identifier: EPL-2.0
// Structural tests of the layout test runner against a fake engine: the processors it notifies are two stub classes,
// so nothing here depends on an ELK literal. The 7g failure test goes through the real provider.
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
  type LayoutTestDeps,
  type LayoutTestSpec,
} from './layout-test-runner.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';

class FirstProcessor implements ILayoutProcessor<object> {
  process(): void {}
}
class SecondProcessor implements ILayoutProcessor<object> {
  process(): void {}
}

const ALGORITHM = LayeredOptions.ALGORITHM_ID;
const FAKE_LGRAPH = { fake: 'lgraph' };
const VENDORED_TICKETS = 'tickets/layered/**';

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

  it('names SelfLoopPreProcessor and 7g when the real plan needs a later mission', () => {
    function selfLoopGraph(): ElkNode {
      const graph = newGraph();
      const node = ElkGraphUtil.createNode(graph);
      node.setDimensions(30, 30);
      const edge = ElkGraphUtil.createEdge(graph);
      edge.getSources().add(node);
      edge.getTargets().add(node);
      return graph;
    }
    const cases = buildLayoutTests({ name: 'real', graphs: [selfLoopGraph], afterLayout: { run: () => {} } });
    expect(() => cases[0]!.run()).toThrow(/SelfLoopPreProcessor[\s\S]*7g|7g[\s\S]*SelfLoopPreProcessor/);
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
