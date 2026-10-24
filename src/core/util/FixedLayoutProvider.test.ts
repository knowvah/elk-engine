// SPDX-License-Identifier: EPL-2.0
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { ElkPadding } from '../math/ElkPadding.js';
import { KVector } from '../math/KVector.js';
import { KVectorChain } from '../math/KVectorChain.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { EdgeRouting } from '../options/EdgeRouting.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { ElkUtil } from './ElkUtil.js';
import { FixedLayoutProvider } from './FixedLayoutProvider.js';
import { NullElkProgressMonitor } from './NullElkProgressMonitor.js';

// Expected values are traced from FixedLayoutProvider.java (line numbers in the test names); the default padding of
// the fixed algorithm is 15 on every side (Core.melk: `supports padding = new ElkPadding(15)`).
const DEFAULT_PADDING = 15;

class RecordingMonitor extends NullElkProgressMonitor {
  readonly events: string[] = [];

  override begin(name: string, totalWork: number): boolean {
    this.events.push(`begin ${name} ${totalWork}`);
    return super.begin(name, totalWork);
  }

  override done(): void {
    this.events.push('done');
  }
}

function node(parent: ElkNode, x: number, y: number, width: number, height: number): ElkNode {
  const child = ElkGraphUtil.createNode(parent);
  child.setLocation(x, y);
  child.setDimensions(width, height);
  return child;
}

function chain(...points: [number, number][]): KVectorChain {
  return new KVectorChain(...points.map(([x, y]) => new KVector(x, y)));
}

function layout(root: ElkNode): RecordingMonitor {
  const monitor = new RecordingMonitor();
  new FixedLayoutProvider().layout(root, monitor);
  return monitor;
}

function sizeOf(root: ElkNode): [number, number] {
  return [root.getWidth(), root.getHeight()];
}

beforeAll(() => {
  // Property defaults of mutable types (padding, vectors) need the registered cloners.
  LayoutMetaDataService.getInstance();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FixedLayoutProvider: parent size and progress (:55-58, :64-66, :118-130)', () => {
  it('reports the task and sizes an empty graph to the padding alone', () => {
    const root = ElkGraphUtil.createGraph();
    const monitor = layout(root);
    expect(monitor.events).toEqual(['begin Fixed Layout 1', 'done']);
    expect(sizeOf(root)).toEqual([2 * DEFAULT_PADDING, 2 * DEFAULT_PADDING]);
  });

  it('sizes the parent to the maximal extent plus padding when no size constraints are set', () => {
    const root = ElkGraphUtil.createGraph();
    node(root, 10, 20, 30, 40).setProperty(CoreOptions.POSITION, new KVector(10, 20));
    layout(root);
    expect(sizeOf(root)).toEqual([10 + 30 + 2 * DEFAULT_PADDING, 20 + 40 + 2 * DEFAULT_PADDING]);
  });

  it('uses the configured padding sides (:120-123)', () => {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(CoreOptions.PADDING, new ElkPadding(1, 4, 3, 2));
    node(root, 10, 20, 30, 40);
    layout(root);
    expect(sizeOf(root)).toEqual([40 + 2 + 4, 60 + 1 + 3]);
  });

  it('leaves the parent size alone when it is fixed (:119)', () => {
    const root = ElkGraphUtil.createGraph();
    root.setDimensions(5, 6);
    root.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    node(root, 10, 20, 30, 40);
    layout(root);
    expect(sizeOf(root)).toEqual([5, 6]);
  });
});

describe('FixedLayoutProvider: nodes and labels (:62-90)', () => {
  it('moves a node with a position and keeps one without (:62-65)', () => {
    const root = ElkGraphUtil.createGraph();
    const fixed = node(root, 0, 0, 10, 10);
    fixed.setProperty(CoreOptions.POSITION, new KVector(7, 8));
    const loose = node(root, 3, 4, 10, 10);
    layout(root);
    expect([fixed.getX(), fixed.getY()]).toEqual([7, 8]);
    expect([loose.getX(), loose.getY()]).toEqual([3, 4]);
    expect(sizeOf(root)).toEqual([17 + 2 * DEFAULT_PADDING, 18 + 2 * DEFAULT_PADDING]);
  });

  it('resizes to the minimum size when MINIMUM_SIZE is a constraint and both sides are positive (:67-74)', () => {
    const root = ElkGraphUtil.createGraph();
    const sized = node(root, 0, 0, 30, 40);
    sized.setProperty(CoreOptions.POSITION, new KVector(10, 20));
    sized.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.minimumSize());
    sized.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(50, 60));
    layout(root);
    expect(sizeOf(sized)).toEqual([50, 60]);
    expect(sizeOf(root)).toEqual([10 + 50 + 2 * DEFAULT_PADDING, 20 + 60 + 2 * DEFAULT_PADDING]);
  });

  it.each([
    ['a zero width', new KVector(0, 60), EnumSet.of(SizeConstraint.MINIMUM_SIZE)],
    ['a zero height', new KVector(50, 0), EnumSet.of(SizeConstraint.MINIMUM_SIZE)],
    ['no MINIMUM_SIZE constraint', new KVector(50, 60), EnumSet.noneOf(SizeConstraint)],
  ])('keeps the node size with %s (:69-72)', (_name, minimum, constraints) => {
    const root = ElkGraphUtil.createGraph();
    const kept = node(root, 0, 0, 30, 40);
    kept.setProperty(CoreOptions.POSITION, new KVector(10, 20));
    kept.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, constraints);
    kept.setProperty(CoreOptions.NODE_SIZE_MINIMUM, minimum);
    layout(root);
    expect(sizeOf(kept)).toEqual([30, 40]);
  });

  it('positions node labels and counts them relative to the node (:79-90)', () => {
    const root = ElkGraphUtil.createGraph();
    const parent = node(root, 10, 20, 30, 40);
    const placed = ElkGraphUtil.createLabel(parent);
    placed.setDimensions(10, 10);
    placed.setProperty(CoreOptions.POSITION, new KVector(50, 6));
    const loose = ElkGraphUtil.createLabel(parent);
    loose.setLocation(1, 2);
    loose.setDimensions(1, 1);
    layout(root);
    expect([placed.getX(), placed.getY()]).toEqual([50, 6]);
    expect([loose.getX(), loose.getY()]).toEqual([1, 2]);
    // maxx = 10 + 50 + 10, maxy = max(20 + 40, 20 + 6 + 10)
    expect(sizeOf(root)).toEqual([70 + 2 * DEFAULT_PADDING, 60 + 2 * DEFAULT_PADDING]);
  });
});

describe('FixedLayoutProvider: ports (:92-117)', () => {
  it('positions ports and port labels relative to the node and port, and counts them', () => {
    const root = ElkGraphUtil.createGraph();
    const parent = node(root, 10, 20, 30, 40);
    const port = ElkGraphUtil.createPort(parent);
    port.setDimensions(4, 4);
    port.setProperty(CoreOptions.POSITION, new KVector(35, 5));
    const label = ElkGraphUtil.createLabel(port);
    label.setDimensions(6, 6);
    label.setProperty(CoreOptions.POSITION, new KVector(10, 0));
    const plainPort = ElkGraphUtil.createPort(parent);
    plainPort.setLocation(1, 1);
    plainPort.setDimensions(1, 1);
    const plainLabel = ElkGraphUtil.createLabel(plainPort);
    plainLabel.setLocation(2, 3);
    plainLabel.setDimensions(1, 1);
    layout(root);
    expect([port.getX(), port.getY()]).toEqual([35, 5]);
    expect([label.getX(), label.getY()]).toEqual([10, 0]);
    expect([plainPort.getX(), plainPort.getY()]).toEqual([1, 1]);
    expect([plainLabel.getX(), plainLabel.getY()]).toEqual([2, 3]);
    // port at (45, 25): maxx = max(40, 49, 45 + 10 + 6), maxy = max(60, 29, 25 + 0 + 6)
    expect(sizeOf(root)).toEqual([61 + 2 * DEFAULT_PADDING, 60 + 2 * DEFAULT_PADDING]);
  });
});

describe('FixedLayoutProvider: edges (:119-143, :147-196)', () => {
  function twoNodes(): { root: ElkNode; a: ElkNode; b: ElkNode } {
    const root = ElkGraphUtil.createGraph();
    return { root, a: node(root, 0, 0, 10, 10), b: node(root, 60, 0, 10, 10) };
  }

  function withBendPoints(edge: ElkEdge, bendPoints: KVectorChain): ElkEdge {
    edge.setProperty(CoreOptions.BEND_POINTS, bendPoints);
    return edge;
  }

  it('creates a section for the bend points and counts the bend points and edge labels (:166-170, :184-205)', () => {
    const { root, a, b } = twoNodes();
    const edge = withBendPoints(ElkGraphUtil.createSimpleEdge(a, b), chain([10, 5], [50, 40], [90, 30], [60, 5]));
    const label = ElkGraphUtil.createLabel(edge);
    label.setDimensions(8, 8);
    label.setProperty(CoreOptions.POSITION, new KVector(20, 50));
    layout(root);
    expect(edge.getSections().size()).toBe(1);
    const section = edge.getSections().get(0);
    expect([section.getStartX(), section.getStartY(), section.getEndX(), section.getEndY()]).toEqual([10, 5, 60, 5]);
    expect(
      section
        .getBendPoints()
        .toArray()
        .map((p) => [p.getX(), p.getY()]),
    ).toEqual([
      [50, 40],
      [90, 30],
    ]);
    expect([label.getX(), label.getY()]).toEqual([20, 50]);
    // maxv = (max(90, 20 + 8), max(40, 50 + 8)); the nodes reach (70, 10)
    expect(sizeOf(root)).toEqual([90 + 2 * DEFAULT_PADDING, 58 + 2 * DEFAULT_PADDING]);
  });

  it('keeps an existing single section and applies the chain to it (:168-169, :174)', () => {
    const { root, a, b } = twoNodes();
    const edge = withBendPoints(ElkGraphUtil.createSimpleEdge(a, b), chain([1, 2], [3, 4]));
    const section = ElkGraphUtil.createEdgeSection(edge);
    layout(root);
    expect(edge.getSections().size()).toBe(1);
    expect(edge.getSections().get(0)).toBe(section);
    expect([section.getStartX(), section.getStartY(), section.getEndX(), section.getEndY()]).toEqual([1, 2, 3, 4]);
  });

  it('ignores chains with fewer than two points and edges without bend points (:166)', () => {
    const { root, a, b } = twoNodes();
    const short = withBendPoints(ElkGraphUtil.createSimpleEdge(a, b), chain([1, 2]));
    const none = ElkGraphUtil.createSimpleEdge(a, b);
    layout(root);
    expect(short.getSections().size()).toBe(0);
    expect(none.getSections().size()).toBe(0);
  });

  it('counts nothing of an edge between different hierarchy levels (:184, :197-203)', () => {
    const { root, a, b } = twoNodes();
    const inner = node(b, 0, 0, 1, 1);
    const edge = withBendPoints(ElkGraphUtil.createSimpleEdge(a, inner), chain([500, 500], [600, 600]));
    const label = ElkGraphUtil.createLabel(edge);
    label.setDimensions(9, 9);
    label.setProperty(CoreOptions.POSITION, new KVector(999, 999));
    layout(root);
    expect(edge.getSections().size()).toBe(1);
    expect([label.getX(), label.getY()]).toEqual([999, 999]);
    expect(sizeOf(root)).toEqual([70 + 2 * DEFAULT_PADDING, 10 + 2 * DEFAULT_PADDING]);
  });

  it('processes each edge once from its source and hierarchical incoming edges from the parent (:131-143)', () => {
    const { root, a, b } = twoNodes();
    withBendPoints(ElkGraphUtil.createSimpleEdge(a, b), chain([0, 0], [1, 1]));
    withBendPoints(ElkGraphUtil.createSimpleEdge(root, b), chain([2, 2], [3, 3]));
    const spy = vi.spyOn(ElkUtil, 'applyVectorChain');
    layout(root);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('throws IllegalStateException for bend points on an edge with several sections (:171-177, latent ELK bug)', () => {
    const { root, a, b } = twoNodes();
    const edge = withBendPoints(ElkGraphUtil.createSimpleEdge(a, b), chain([0, 0], [1, 1]));
    ElkGraphUtil.createEdgeSection(edge);
    ElkGraphUtil.createEdgeSection(edge);
    expect(() => layout(root)).toThrow(IllegalStateException);
  });
});

describe('FixedLayoutProvider: junction points (:145-153, :210-221)', () => {
  function forkedEdges(routing: EdgeRouting | null): { root: ElkNode; first: ElkEdge; second: ElkEdge } {
    const root = ElkGraphUtil.createGraph();
    if (routing !== null) {
      root.setProperty(CoreOptions.EDGE_ROUTING, routing);
    }
    const source = node(root, 0, 0, 10, 10);
    const port = ElkGraphUtil.createPort(source);
    const first = ElkGraphUtil.createSimpleEdge(port, node(root, 100, 0, 10, 10));
    const second = ElkGraphUtil.createSimpleEdge(port, node(root, 100, 100, 10, 10));
    first.setProperty(CoreOptions.BEND_POINTS, chain([0, 0], [10, 0], [10, 10], [20, 10]));
    second.setProperty(CoreOptions.BEND_POINTS, chain([0, 0], [10, 0], [10, -10], [20, -10]));
    return { root, first, second };
  }

  it('sets the junction points of edges leaving a shared port under orthogonal routing', () => {
    const { root, first, second } = forkedEdges(EdgeRouting.ORTHOGONAL);
    layout(root);
    expect(
      first
        .getProperty(CoreOptions.JUNCTION_POINTS)
        .toArray()
        .map((p) => [p.x, p.y]),
    ).toEqual([[10, 0]]);
    expect(
      second
        .getProperty(CoreOptions.JUNCTION_POINTS)
        .toArray()
        .map((p) => [p.x, p.y]),
    ).toEqual([[10, 0]]);
  });

  it('removes stale junction points when there are none (:215-217)', () => {
    const root = ElkGraphUtil.createGraph();
    root.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
    const edge = ElkGraphUtil.createSimpleEdge(node(root, 0, 0, 10, 10), node(root, 60, 0, 10, 10));
    edge.setProperty(CoreOptions.BEND_POINTS, chain([0, 0], [10, 10]));
    edge.setProperty(CoreOptions.JUNCTION_POINTS, chain([5, 5]));
    layout(root);
    expect(edge.hasProperty(CoreOptions.JUNCTION_POINTS)).toBe(false);
  });

  it('leaves junction points alone under other routings (:145)', () => {
    const { root, first } = forkedEdges(null);
    layout(root);
    expect(first.hasProperty(CoreOptions.JUNCTION_POINTS)).toBe(false);
  });
});
