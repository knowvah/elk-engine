// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from './CoreOptions.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import { LayoutAlgorithmResolver } from '../data/LayoutAlgorithmResolver.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { NullElkProgressMonitor } from '../util/NullElkProgressMonitor.js';
import type { IElkProgressMonitor } from '../util/IElkProgressMonitor.js';
import type { IFactory } from '../util/IFactory.js';
import { FixedLayouterOptions } from './FixedLayouterOptions.js';
import { TopdownSizeApproximator } from './TopdownSizeApproximator.js';

// Expected values are traced by hand from TopdownSizeApproximator.java with the Core.melk defaults: node width 150,
// aspect ratio 1.414, padding 12, node-node spacing 20.
const STUB_ID = 'test.alg.stubtopdown';
const PRECISION = 9;
const BASE_WIDTH = 150;
const BASE_HEIGHT = 106.08203677510609; // 150 / 1.414
const SQRT2_WIDTH = 212.13203435596427; // 150 * sqrt(2)
const SQRT2_HEIGHT = 150.02265513151647; // 150 * sqrt(2) / 1.414
const DEFAULT_PADDING = 12;

interface Snapshot {
  nodeIsOriginal: boolean;
  monitor: IElkProgressMonitor;
  childSizes: [number, number][];
  edgeEnds: [number, number][];
  childrenAreOriginal: boolean;
}

/** A provider that records what it is asked to lay out and optionally scripts a layout. */
class StubProvider extends AbstractLayoutProvider {
  static script: ((graph: ElkNode) => void) | null = null;
  static snapshots: Snapshot[] = [];
  static originals: ElkNode | null = null;
  disposed = 0;

  layout(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    const children = graph.getChildren().toArray();
    StubProvider.snapshots.push({
      nodeIsOriginal: graph === StubProvider.originals,
      monitor: progressMonitor,
      childSizes: children.map((c) => [c.getWidth(), c.getHeight()]),
      edgeEnds: graph
        .getContainedEdges()
        .toArray()
        .map((e) => [
          children.indexOf(e.getSources().get(0) as ElkNode),
          children.indexOf(e.getTargets().get(0) as ElkNode),
        ]),
      childrenAreOriginal: children.some((c) => StubProvider.originals?.getChildren().contains(c) ?? false),
    });
    StubProvider.script?.(graph);
  }

  override dispose(): void {
    this.disposed++;
  }
}

let created: StubProvider[] = [];

function registerStub(): LayoutAlgorithmData {
  const factory: IFactory<AbstractLayoutProvider> = {
    create: () => {
      const provider = new StubProvider();
      created.push(provider);
      return provider;
    },
    destroy: (provider) => provider.dispose(),
  };
  const data = new LayoutAlgorithmData.Builder().id(STUB_ID).name(STUB_ID).providerFactory(factory).create();
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders({
    apply: (registry) => {
      registry.register(data);
    },
  });
  return data;
}

function resolvedRoot(): ElkNode {
  registerStub();
  const root = ElkGraphUtil.createGraph();
  root.setProperty(CoreOptions.ALGORITHM, STUB_ID);
  new LayoutAlgorithmResolver().visit(root);
  StubProvider.originals = root;
  return root;
}

function withChildren(parent: ElkNode, count: number): ElkNode[] {
  return Array.from({ length: count }, () => ElkGraphUtil.createNode(parent));
}

function sizeOf(node: ElkNode): [number, number] {
  const size = TopdownSizeApproximator.COUNT_CHILDREN.getSize(node);
  return [size.x, size.y];
}

beforeEach(() => {
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
  created = [];
  StubProvider.script = null;
  StubProvider.snapshots = [];
  StubProvider.originals = null;
});

afterEach(() => {
  LayoutMetaDataService.unload();
});

describe('TopdownSizeApproximator enum surface', () => {
  it('declares the constants in Java order', () => {
    const names = TopdownSizeApproximator.values().map((c) => c.name());
    expect(names).toEqual(['COUNT_CHILDREN', 'LOOKAHEAD_LAYOUT', 'FIXED_INTEGER_RATIO_BOXES', 'LAYOUT_NEXT_LEVEL']);
    expect(TopdownSizeApproximator.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(TopdownSizeApproximator.LAYOUT_NEXT_LEVEL.toString()).toBe('LAYOUT_NEXT_LEVEL');
    expect(TopdownSizeApproximator.LAYOUT_NEXT_LEVEL.compareTo(TopdownSizeApproximator.COUNT_CHILDREN)).toBe(3);
  });

  it('valueOf resolves names and throws the Java message otherwise', () => {
    expect(TopdownSizeApproximator.valueOf('LOOKAHEAD_LAYOUT')).toBe(TopdownSizeApproximator.LOOKAHEAD_LAYOUT);
    expect(() => TopdownSizeApproximator.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => TopdownSizeApproximator.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.core.options.TopdownSizeApproximator.NOPE',
    );
  });
});

describe('COUNT_CHILDREN', () => {
  it('scales the base width by the square root of the child count', () => {
    const node = ElkGraphUtil.createGraph();
    withChildren(node, 3);
    const [w, h] = sizeOf(node);
    expect(w).toBeCloseTo(259.8076211353316, PRECISION);
    expect(h).toBeCloseTo(183.73947746487386, PRECISION);
  });

  it('yields 0 x 0 without children and honours configured base size', () => {
    const node = ElkGraphUtil.createGraph();
    expect(sizeOf(node)).toEqual([0, 0]);
    withChildren(node, 4);
    node.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, 10);
    node.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, 2);
    expect(sizeOf(node)).toEqual([20, 10]);
  });
});

describe('FIXED_INTEGER_RATIO_BOXES', () => {
  const size = (node: ElkNode): [number, number] => {
    const result = TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES.getSize(node);
    return [result.x, result.y];
  };

  it('uses multiplier 1 and the default spacing for a root node', () => {
    const [w, h] = size(ElkGraphUtil.createGraph());
    expect(w).toBeCloseTo(BASE_WIDTH - 2 * DEFAULT_PADDING - 20, PRECISION);
    expect(h).toBeCloseTo(BASE_HEIGHT - 2 * DEFAULT_PADDING - 20, PRECISION);
  });

  it('applies the category multiplier and the parent spacing', () => {
    const parent = ElkGraphUtil.createGraph();
    const [small, medium] = [ElkGraphUtil.createNode(parent), ElkGraphUtil.createNode(parent)];
    withChildren(small, 3);
    withChildren(medium, 5);
    const [w, h] = size(medium);
    expect(w).toBeCloseTo(2 * BASE_WIDTH - 44, PRECISION);
    expect(h).toBeCloseTo(2 * BASE_HEIGHT - 44, PRECISION);
    parent.setProperty(CoreOptions.SPACING_NODE_NODE, 30);
    const [w30, h30] = size(small);
    expect(w30).toBeCloseTo(BASE_WIDTH - 24 - 30, PRECISION);
    expect(h30).toBeCloseTo(BASE_HEIGHT - 24 - 30, PRECISION);
  });
});

describe('LOOKAHEAD_LAYOUT', () => {
  function lookaheadRoot(): { root: ElkNode; c1: ElkNode; c2: ElkNode } {
    const root = resolvedRoot();
    root.setProperty(CoreOptions.PADDING, new ElkPadding(10));
    const [c1, c2] = withChildren(root, 2) as [ElkNode, ElkNode];
    c1.setDimensions(30, 20);
    c2.setDimensions(5, 5);
    withChildren(c2, 2);
    const edge = ElkGraphUtil.createEdge(root);
    edge.getSources().add(c1);
    edge.getTargets().add(c2);
    return { root, c1, c2 };
  }

  it('lays out a copy sized by COUNT_CHILDREN and derives the size from the reported child area', () => {
    const { root } = lookaheadRoot();
    StubProvider.script = (copy) => {
      copy.setProperty(CoreOptions.CHILD_AREA_WIDTH, 400);
      copy.setProperty(CoreOptions.CHILD_AREA_HEIGHT, 100);
    };
    const size = TopdownSizeApproximator.LOOKAHEAD_LAYOUT.getSize(root);
    expect(size.x).toBeCloseTo(SQRT2_WIDTH, PRECISION);
    expect(size.y).toBeCloseTo(SQRT2_WIDTH / 4, PRECISION);
    const [snapshot] = StubProvider.snapshots;
    expect(StubProvider.snapshots).toHaveLength(1);
    expect(snapshot?.nodeIsOriginal).toBe(false);
    expect(snapshot?.childrenAreOriginal).toBe(false);
    expect(snapshot?.monitor).toBeInstanceOf(NullElkProgressMonitor);
    expect(snapshot?.edgeEnds).toEqual([[0, 1]]);
    expect(snapshot?.childSizes[0]).toEqual([30, 20]);
    expect(snapshot?.childSizes[1]?.[0]).toBeCloseTo(SQRT2_WIDTH, PRECISION);
    expect(snapshot?.childSizes[1]?.[1]).toBeCloseTo(SQRT2_HEIGHT, PRECISION);
    // the original hierarchy is untouched
    expect(root.getChildren().get(0)?.getWidth()).toBe(30);
    expect(root.hasProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(false);
  });

  it('computes the child area itself when the provider reported none', () => {
    const { root } = lookaheadRoot();
    const size = TopdownSizeApproximator.LOOKAHEAD_LAYOUT.getSize(root);
    expect(size.x).toBeCloseTo(SQRT2_WIDTH, PRECISION);
    expect(size.y).toBeCloseTo(SQRT2_HEIGHT, PRECISION);
  });

  it('lets the padding dominate when it exceeds the base size', () => {
    const { root } = lookaheadRoot();
    root.setProperty(CoreOptions.PADDING, new ElkPadding(200));
    StubProvider.script = (copy) => {
      copy.setProperty(CoreOptions.CHILD_AREA_WIDTH, 400);
      copy.setProperty(CoreOptions.CHILD_AREA_HEIGHT, 100);
    };
    const size = TopdownSizeApproximator.LOOKAHEAD_LAYOUT.getSize(root);
    expect([size.x, size.y]).toEqual([401, 401]);
  });

  it('releases the provider after success and disposes and rethrows after a failure', () => {
    const { root } = lookaheadRoot();
    TopdownSizeApproximator.LOOKAHEAD_LAYOUT.getSize(root);
    TopdownSizeApproximator.LOOKAHEAD_LAYOUT.getSize(root);
    expect(created).toHaveLength(1);
    expect(created[0]?.disposed).toBe(0);

    const failure = new Error('layout failed');
    StubProvider.script = () => {
      throw failure;
    };
    expect(() => TopdownSizeApproximator.LOOKAHEAD_LAYOUT.getSize(root)).toThrow(failure);
    expect(created[0]?.disposed).toBe(1);
  });
});

describe('LAYOUT_NEXT_LEVEL', () => {
  function nextLevelRoot(): { root: ElkNode; a: ElkNode; b: ElkNode; c: ElkNode } {
    const root = resolvedRoot();
    const [a, b, c] = withChildren(root, 3) as [ElkNode, ElkNode, ElkNode];
    withChildren(a, 2);
    withChildren(b, 1);
    a.setProperty(CoreOptions.TOPDOWN_SIZE_APPROXIMATOR, TopdownSizeApproximator.COUNT_CHILDREN);
    c.setProperty(CoreOptions.TOPDOWN_SIZE_APPROXIMATOR, TopdownSizeApproximator.COUNT_CHILDREN);
    c.setDimensions(20, 20);
    return { root, a, b, c };
  }

  const place = (graph: ElkNode): void => {
    const [a, b, c] = graph.getChildren().toArray() as [ElkNode, ElkNode, ElkNode];
    a.setLocation(0, 0);
    b.setLocation(300, 0);
    c.setLocation(0, 400);
  };

  it('sizes the children, lays out the node, fixes its algorithm and returns the child area', () => {
    const { root, a, b, c } = nextLevelRoot();
    StubProvider.script = place;
    const size = TopdownSizeApproximator.LAYOUT_NEXT_LEVEL.getSize(root);
    expect([size.x, size.y]).toEqual([450, 420]);

    const [snapshot] = StubProvider.snapshots;
    expect(StubProvider.snapshots).toHaveLength(1);
    expect(snapshot?.nodeIsOriginal).toBe(true);
    expect(snapshot?.monitor).toBeInstanceOf(NullElkProgressMonitor);
    // A: COUNT_CHILDREN size plus padding; B: base size (no approximator); C: no children, left alone
    expect(a.getWidth()).toBeCloseTo(SQRT2_WIDTH + 2 * DEFAULT_PADDING, PRECISION);
    expect(a.getHeight()).toBeCloseTo(SQRT2_HEIGHT + 2 * DEFAULT_PADDING, PRECISION);
    expect(snapshot?.childSizes[0]?.[0]).toBeCloseTo(SQRT2_WIDTH + 2 * DEFAULT_PADDING, PRECISION);
    expect(b.getWidth()).toBe(BASE_WIDTH);
    expect(b.getHeight()).toBeCloseTo(BASE_HEIGHT, PRECISION);
    expect([c.getWidth(), c.getHeight()]).toEqual([20, 20]);

    expect(root.getProperty(CoreOptions.ALGORITHM)).toBe(FixedLayouterOptions.ALGORITHM_ID);
    expect(root.getProperty(CoreOptions.RESOLVED_ALGORITHM).getId()).toBe(FixedLayouterOptions.ALGORITHM_ID);
    expect(root.getProperty(CoreOptions.CHILD_AREA_WIDTH)).toBe(450);
    expect(root.getProperty(CoreOptions.CHILD_AREA_HEIGHT)).toBe(420);
  });

  it('never reuses an old larger size of an approximated child but keeps it when larger', () => {
    const { root, a } = nextLevelRoot();
    a.setDimensions(1000, 1);
    TopdownSizeApproximator.LAYOUT_NEXT_LEVEL.getSize(root);
    expect(a.getWidth()).toBe(1000);
    expect(a.getHeight()).toBeCloseTo(SQRT2_HEIGHT + 2 * DEFAULT_PADDING, PRECISION);
  });

  it('disposes the provider and rethrows when the layout fails, leaving the algorithm unchanged', () => {
    const { root } = nextLevelRoot();
    const failure = new Error('layout failed');
    StubProvider.script = () => {
      throw failure;
    };
    expect(() => TopdownSizeApproximator.LAYOUT_NEXT_LEVEL.getSize(root)).toThrow(failure);
    expect(created[0]?.disposed).toBe(1);
    expect(root.getProperty(CoreOptions.ALGORITHM)).toBe(STUB_ID);
  });
});
