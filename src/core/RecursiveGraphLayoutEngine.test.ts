// SPDX-License-Identifier: EPL-2.0
/*
 * Port of org.elk.core.test RecursiveGraphLayoutEngineTest.
 *
 * NOT PORTED (decision M6, deferred to mission 7a unchanged): `testEmptyAlgorithmId`. It lays out a graph without an
 * algorithm and asserts that the default resolves to `org.eclipse.elk.layered`, which is not registered before
 * mission 7a.
 *
 * `PlainJavaInitialization.initializePlainJavaLayout()` becomes `LayoutMetaDataService.getInstance()`, which registers
 * the core algorithms (fixed, box, random). The tests below the ported ones cover the Java branches the JUnit test does
 * not reach; their expected values are traced by hand from RecursiveGraphLayoutEngine.java with the Core.melk defaults.
 * The topdown branch tests are in RecursiveGraphLayoutEngineTopdown.test.ts (M17); the stubs are in
 * test/helpers/layout-provider-stubs.ts.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/RecursiveGraphLayoutEngineTest.java
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from './options/CoreOptions.js';
import type { ElkEdge } from '../graph/ElkEdge.js';
import type { ElkNode } from '../graph/ElkNode.js';
import { ElkGraphUtil } from '../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import { LayoutMetaDataService } from './data/LayoutMetaDataService.js';
import { KVector } from './math/KVector.js';
import { KVectorChain } from './math/KVectorChain.js';
import { HierarchyHandling } from './options/HierarchyHandling.js';
import { PortLabelPlacement } from './options/PortLabelPlacement.js';
import { RecursiveGraphLayoutEngine } from './RecursiveGraphLayoutEngine.js';
import { TestController } from './testing/TestController.js';
import { UnsupportedConfigurationException } from './UnsupportedConfigurationException.js';
import { BasicProgressMonitor } from './util/BasicProgressMonitor.js';
import {
  CLUSTERS,
  COMPOUND,
  LOOPS,
  ExposedEngine,
  PLAIN,
  POOLED,
  RecordingMonitor,
  WHITEBOX,
  calledNodes,
  calls,
  caught,
  created,
  graph,
  leaves,
  node,
  registerEngineStubs,
  resetStubs,
  run,
  scripts,
} from '../../test/helpers/layout-provider-stubs.js';
import type { WhiteBoxStubProvider } from '../../test/helpers/layout-provider-stubs.js';

class Graph {
  readonly root: ElkNode;
  private readonly n1: ElkNode;
  private readonly n2: ElkNode;
  constructor() {
    this.root = ElkGraphUtil.createGraph();
    this.n1 = ElkGraphUtil.createNode(this.root);
    this.n1.setDimensions(10, 10);
    this.n2 = ElkGraphUtil.createNode(this.root);
    this.n2.setDimensions(10, 10);
  }
}

describe('RecursiveGraphLayoutEngineTest', () => {
  beforeAll(() => {
    LayoutMetaDataService.getInstance();
  });

  it('testUnresolvedGraph', () => {
    const graph = new Graph();
    graph.root.setProperty(CoreOptions.ALGORITHM, 'org.eclipse.elk.box');
    const engine = new RecursiveGraphLayoutEngine();
    engine.layout(graph.root, new BasicProgressMonitor());

    expect(graph.root.getWidth() > 0).toBe(true);
    expect(graph.root.getHeight() > 0).toBe(true);
  });

  it('testResolvedGraph', () => {
    const graph = new Graph();
    const algorithmData = LayoutMetaDataService.getInstance().getAlgorithmData('org.eclipse.elk.box');
    graph.root.setProperty(CoreOptions.RESOLVED_ALGORITHM, algorithmData!);
    const engine = new RecursiveGraphLayoutEngine();
    engine.layout(graph.root, new BasicProgressMonitor());

    expect(graph.root.getWidth() > 0).toBe(true);
    expect(graph.root.getHeight() > 0).toBe(true);
  });

  it('testUnknownAlgorithmId', () => {
    const graph = new Graph();
    graph.root.setProperty(CoreOptions.ALGORITHM, 'foo.Bar');
    const engine = new RecursiveGraphLayoutEngine();
    expect(() => engine.layout(graph.root, new BasicProgressMonitor())).toThrow(UnsupportedConfigurationException);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Branch tests

beforeAll(() => {
  LayoutMetaDataService.getInstance();
  registerEngineStubs();
});

beforeEach(() => {
  resetStubs();
});

describe('layout', () => {
  it('begins the monitor with the recursive node count and gives each level a sub-task of its child count', () => {
    const root = graph(PLAIN);
    const a = node(root, PLAIN);
    leaves(a, 3);
    node(root);
    const monitor = new RecordingMonitor();

    run(root, monitor);

    expect(monitor.begins).toEqual([['Recursive Graph Layout', 5]]);
    expect(monitor.works).toEqual([3, 2]);
    expect(calledNodes()).toEqual([a, root]);
    expect(calls.map((call) => call.monitor.getParentMonitor())).toEqual([monitor, monitor]);
    expect(monitor.isRunning()).toBe(false);
    expect(monitor.getTaskName()).toBe('Recursive Graph Layout');
  });

  it('counts the ancestors path only when asked', () => {
    const root = graph(PLAIN);
    const a = node(root);
    node(root);
    const a1 = node(a);
    node(a);
    node(a1);
    const engine = new ExposedEngine();

    expect(engine.countNodes(a, false)).toBe(3);
    expect(engine.countNodes(a, true)).toBe(5);
    expect(engine.countNodes(root, true)).toBe(5);
  });

  it('skips the resolver when the root is resolved, so an unresolved hierarchical child fails', () => {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(CoreOptions.RESOLVED_ALGORITHM, LayoutMetaDataService.getInstance().getAlgorithmData(PLAIN)!);
    const child = node(root, PLAIN);
    node(child);

    expect(() => run(root)).toThrow(
      new UnsupportedConfigurationException(
        'Resolved algorithm is not set; apply a LayoutAlgorithmResolver before computing layout.',
      ),
    );
    expect(calls).toEqual([]);
  });

  it('replaces deprecated options before the layout runs', () => {
    const root = graph(PLAIN);
    leaves(root, 1);
    root.setProperty(CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE, true);
    let placementAtLayout = false;
    scripts.set(root, (n) => {
      placementAtLayout = n
        .getProperty(CoreOptions.PORT_LABELS_PLACEMENT)
        .contains(PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE);
    });

    run(root);

    expect(placementAtLayout).toBe(true);
  });

  it('passes the test controller to the recursion (three-argument overload)', () => {
    const root = graph(WHITEBOX);
    leaves(root, 1);
    const controller = new TestController(WHITEBOX);

    new RecursiveGraphLayoutEngine().layout(root, controller, new BasicProgressMonitor());

    expect((calls[0]!.provider as WhiteBoxStubProvider).controllers.slice(-2)).toEqual([controller, null]);
  });
});

describe('layoutRecursively guards', () => {
  it('does nothing for a node with NO_LAYOUT', () => {
    const root = graph(PLAIN);
    leaves(root, 1);
    root.setProperty(CoreOptions.NO_LAYOUT, true);

    run(root);

    expect(calls).toEqual([]);
    expect(root.hasProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(false);
  });

  it('does nothing when the monitor is canceled', () => {
    const root = graph(PLAIN);
    leaves(root, 1);
    const monitor = new RecordingMonitor();
    monitor.canceled = true;

    run(root, monitor);

    expect(calls).toEqual([]);
  });

  it('skips the own layout when the monitor is canceled while the children are laid out', () => {
    const root = graph(PLAIN);
    const child = node(root, PLAIN);
    leaves(child, 1);
    const monitor = new RecordingMonitor();
    scripts.set(child, () => {
      monitor.canceled = true;
    });

    run(root, monitor);

    expect(calledNodes()).toEqual([child]);
  });

  it('returns no self loops and lays out nothing for a leaf', () => {
    const root = graph(PLAIN);

    expect(new ExposedEngine().recurse(root)).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe('separate children', () => {
  it('lays out children first, applies their scale factor and persists SEPARATE_CHILDREN downwards', () => {
    const root = graph(PLAIN);
    const child = node(root, PLAIN);
    leaves(child, 1);
    child.setProperty(CoreOptions.SCALE_FACTOR, 2);
    scripts.set(child, (n) => n.setDimensions(10, 20));
    let childSizeAtRootLayout: number[] = [];
    scripts.set(root, () => {
      childSizeAtRootLayout = [child.getWidth(), child.getHeight()];
    });

    run(root);

    expect(calledNodes()).toEqual([child, root]);
    expect(childSizeAtRootLayout).toEqual([20, 40]);
    expect(root.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.SEPARATE_CHILDREN);
    expect(child.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.SEPARATE_CHILDREN);
  });

  it('inherits the hierarchy handling of the parent of the node the layout starts at', () => {
    const outer = graph(PLAIN);
    outer.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    const sub = node(outer, PLAIN);
    leaves(sub, 1);

    run(sub);

    expect(sub.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.INCLUDE_CHILDREN);
    expect(calledNodes()).toEqual([sub]);
  });
});

describe('INCLUDE_CHILDREN', () => {
  it('lays out the included hierarchy in one call and recurses only where the hierarchy stops', () => {
    const root = graph(COMPOUND);
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    const a = node(root, COMPOUND);
    const a1 = node(a, COMPOUND);
    const a1x = node(a1);
    const b = node(root, COMPOUND);
    b.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.SEPARATE_CHILDREN);
    node(b);
    const c = node(root, PLAIN);
    node(c);
    const monitor = new RecordingMonitor();

    run(root, monitor);

    expect(calledNodes()).toEqual([b, c, root]);
    expect(monitor.works).toEqual([1, 1, 5]);
    expect([a, a1, a1x].map((n) => n.getProperty(CoreOptions.HIERARCHY_HANDLING))).toEqual([
      HierarchyHandling.INCLUDE_CHILDREN,
      HierarchyHandling.INCLUDE_CHILDREN,
      HierarchyHandling.INCLUDE_CHILDREN,
    ]);
    expect(b.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.SEPARATE_CHILDREN);
    expect(c.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.SEPARATE_CHILDREN);
  });

  it('applies the scale factor of a child where the hierarchy stops', () => {
    const root = graph(COMPOUND);
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    const c = node(root, PLAIN);
    leaves(c, 1);
    c.setDimensions(5, 6);
    c.setProperty(CoreOptions.SCALE_FACTOR, 3);

    run(root);

    expect([c.getWidth(), c.getHeight()]).toEqual([15, 18]);
  });

  it('counts an algorithm supporting CLUSTERS as hierarchy-aware', () => {
    const root = graph(CLUSTERS);
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    const k = node(root, CLUSTERS);
    node(k);
    const monitor = new RecordingMonitor();

    run(root, monitor);

    expect(calledNodes()).toEqual([root]);
    expect(monitor.works).toEqual([2]);
  });

  it('falls back to separate layouts when the algorithm supports neither COMPOUND nor CLUSTERS', () => {
    const root = graph(PLAIN);
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    const k = node(root, PLAIN);
    node(k);

    run(root);

    expect(calledNodes()).toEqual([k, root]);
    expect(k.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.INCLUDE_CHILDREN);
  });

  it('rejects topdown layout', () => {
    const root = graph(COMPOUND);
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    root.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    leaves(root, 1);

    expect(() => run(root)).toThrow(
      new UnsupportedConfigurationException('Topdown layout cannot be used together with hierarchy handling.'),
    );
  });
});

describe('inside self loops', () => {
  /** A node with inside self loop activation, one inside self loop, one plain self loop and one other edge. */
  function loopNode(parent: ElkNode, algorithm: string): { n: ElkNode; inside: ElkEdge; plain: ElkEdge } {
    const n = node(parent, algorithm);
    n.setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, true);
    const inside = ElkGraphUtil.createSimpleEdge(n, n);
    inside.setProperty(CoreOptions.INSIDE_SELF_LOOPS_YO, true);
    const plain = ElkGraphUtil.createSimpleEdge(n, n);
    const other = ElkGraphUtil.createSimpleEdge(n, node(parent));
    other.setProperty(CoreOptions.INSIDE_SELF_LOOPS_YO, true);
    scripts.set(n, () => {
      const section = ElkGraphUtil.createEdgeSection(inside);
      section.setStartLocation(1, 2);
      section.setEndLocation(3, 4);
      ElkGraphUtil.createBendPoint(section, 5, 6);
      inside.setProperty(CoreOptions.JUNCTION_POINTS, new KVectorChain(new KVector(7, 8)));
    });
    return { n, inside, plain };
  }

  function sectionPoints(edge: ElkEdge): number[] {
    const section = edge.getSections().get(0);
    const bend = section.getBendPoints().get(0);
    const junction = edge.getProperty(CoreOptions.JUNCTION_POINTS).getFirst();
    return [
      section.getStartX(),
      section.getStartY(),
      section.getEndX(),
      section.getEndY(),
      bend.getX(),
      bend.getY(),
      junction.x,
      junction.y,
    ];
  }

  it('gathers only the outgoing self loops marked inside, and only when activated', () => {
    const root = graph(PLAIN);
    const { n, inside } = loopNode(root, LOOPS);
    const engine = new ExposedEngine();

    expect(engine.gather(n)).toEqual([inside]);
    n.setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, false);
    expect(engine.gather(n)).toEqual([]);
  });

  it('excludes a child inside self loop from the parent layout and offsets it by the child position', () => {
    const root = graph(PLAIN);
    const { n, inside, plain } = loopNode(root, LOOPS);
    let noLayoutAtRoot: boolean[] = [];
    scripts.set(root, () => {
      noLayoutAtRoot = [inside.getProperty(CoreOptions.NO_LAYOUT), plain.getProperty(CoreOptions.NO_LAYOUT)];
      n.setLocation(10, 20);
    });

    run(root);

    expect(calledNodes()).toEqual([n, root]);
    expect(noLayoutAtRoot).toEqual([true, false]);
    expect(sectionPoints(inside)).toEqual([11, 22, 13, 24, 15, 26, 17, 28]);
  });

  it('collects inside self loops where an included hierarchy stops', () => {
    const root = graph(COMPOUND);
    root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
    const { n, inside } = loopNode(root, LOOPS);
    scripts.set(root, () => n.setLocation(100, 200));

    run(root);

    expect(calledNodes()).toEqual([n, root]);
    expect(sectionPoints(inside)).toEqual([101, 202, 103, 204, 105, 206, 107, 208]);
  });

  it('skips a childless node whose algorithm does not support inside self loops', () => {
    const root = graph(PLAIN);
    const { n, inside } = loopNode(root, PLAIN);

    run(root);

    expect(calledNodes()).toEqual([root]);
    expect(n.getProperty(CoreOptions.HIERARCHY_HANDLING)).toBe(HierarchyHandling.SEPARATE_CHILDREN);
    expect(inside.hasProperty(CoreOptions.NO_LAYOUT)).toBe(false);
  });

  it('lays out a node with children but returns no loops when its algorithm does not support them', () => {
    const root = graph(PLAIN);
    const { n, inside } = loopNode(root, PLAIN);
    leaves(n, 1);
    scripts.set(root, () => n.setLocation(10, 20));

    run(root);

    expect(calledNodes()).toEqual([n, root]);
    expect(inside.hasProperty(CoreOptions.NO_LAYOUT)).toBe(false);
    expect(sectionPoints(inside)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('executeAlgorithm', () => {
  it('disposes a failing provider instead of releasing it, uninstalls the controller and rethrows', () => {
    const root = graph(WHITEBOX);
    leaves(root, 1);
    const failure = new Error('provider failed');
    scripts.set(root, () => {
      throw failure;
    });
    const controller = new TestController(WHITEBOX);

    const error = caught(() => new RecursiveGraphLayoutEngine().layout(root, controller, new BasicProgressMonitor()));

    const failed = calls[0]!.provider as WhiteBoxStubProvider;
    expect(error).toBe(failure);
    expect(failed.disposed).toBe(true);
    expect(failed.controllers.slice(-2)).toEqual([controller, null]);
    scripts.clear();
    run(root);
    expect(calls[1]!.provider).not.toBe(failed);
  });

  it('releases a successful provider to the pool', () => {
    const root = graph(POOLED);
    leaves(root, 1);

    run(root);
    run(root);

    expect(created.get(POOLED)).toHaveLength(1);
    expect(calls[1]!.provider).toBe(calls[0]!.provider);
    expect(calls[0]!.provider.disposed).toBe(false);
  });

  it('installs a controller only on the algorithm it targets', () => {
    const root = graph(WHITEBOX);
    leaves(root, 1);

    const controller = new TestController(PLAIN);

    new RecursiveGraphLayoutEngine().layout(root, controller, new BasicProgressMonitor());

    expect((calls[0]!.provider as WhiteBoxStubProvider).controllers).not.toContain(controller);
  });

  it('lets a non-white-box provider reject a targeting controller before layout', () => {
    const root = graph(PLAIN);
    leaves(root, 1);

    expect(() =>
      new RecursiveGraphLayoutEngine().layout(root, new TestController(PLAIN), new BasicProgressMonitor()),
    ).toThrow(IllegalArgumentException);
    expect(calls).toEqual([]);
  });
});
