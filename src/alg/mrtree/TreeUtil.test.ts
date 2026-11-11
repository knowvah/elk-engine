// SPDX-License-Identifier: EPL-2.0
// Expectations come from the recorded stop graphs of test/golden/refs/java/mrtree.json (rebuilt by test/helpers/mrtree-replay-dump.ts) or
// are traced from the Java line quoted in the test title; no hand-derived numerics.
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { Direction } from '../../core/options/Direction.js';
import { NoSuchElementException } from '../../java/util/NoSuchElementException.js';
import { buildTGraph, nodeRef } from '../../../test/helpers/mrtree-replay-dump.js';
import {
  decodeHex,
  decodeHexPair,
  loadStopsRows,
  type StopGraph,
  type StopNode,
} from '../../../test/helpers/mrtree-replay-rows.js';
import { TEdge } from './graph/TEdge.js';
import { TGraph } from './graph/TGraph.js';
import { TNode } from './graph/TNode.js';
import { InternalProperties } from './options/InternalProperties.js';
import { MrTreeOptions } from './options/MrTreeOptions.js';
import { TreeUtil } from './TreeUtil.js';

const rows = loadStopsRows();
const recorded = (id: string, step: string, comp = 0): StopGraph =>
  rows.find((r) => r.id.startsWith(id))!.expected.stops.find((s) => s.step === step && s.comp === comp)!.graphs[0]!;
const RANDOM12 = 'stops/weighting/random12/weighting=MODEL_ORDER';
const refs = (nodes: readonly TNode[]): string[] => nodes.map(nodeRef);
const byRef = (graph: TGraph, ref: string): TNode => [...graph.getNodes()].find((n) => nodeRef(n) === ref)!;
const dataOf = (dump: StopGraph, ref: string): StopNode => dump.nodes.find((n) => n.ref === ref)!;

/** A bare graph; nodes are labelled with their letter and linked source to target through `link`. */
class Builder {
  readonly graph = new TGraph();
  private next = 0;

  node(label: string, x = 0, y = 0, level = 0): TNode {
    const node = new TNode(this.next++, this.graph, label);
    node.getPosition().x = x;
    node.getPosition().y = y;
    node.setProperty(MrTreeOptions.TREE_LEVEL, level);
    this.graph.getNodes().add(node);
    return node;
  }

  link(source: TNode, target: TNode): TEdge {
    const edge = new TEdge(source, target);
    source.getOutgoingEdges().add(edge);
    target.getIncomingEdges().add(edge);
    this.graph.getEdges().add(edge);
    return edge;
  }
}

describe('TreeUtil.getRoot (TreeUtil.java:41-45)', () => {
  it('is the first node whose ROOT property is true: the recorded ROOT node', () => {
    const dump = recorded(RANDOM12, 'LevelProcessor');
    const graph = buildTGraph(dump);
    expect(nodeRef(TreeUtil.getRoot(graph))).toBe(dump.nodes.find((n) => n.props.ROOT === true)!.ref);
  });

  it('returns the first of several roots in node order', () => {
    const b = new Builder();
    b.node('x').setProperty(InternalProperties.ROOT, false);
    const second = b.node('y');
    second.setProperty(InternalProperties.ROOT, true);
    b.node('z').setProperty(InternalProperties.ROOT, true);
    expect(TreeUtil.getRoot(b.graph)).toBe(second);
  });

  it('throws NoSuchElementException (Optional.get) without a root', () => {
    const b = new Builder();
    b.node('x');
    expect(() => TreeUtil.getRoot(b.graph)).toThrow(NoSuchElementException);
  });
});

describe('TreeUtil.depth and getChildren (TreeUtil.java:53-76)', () => {
  it('depth of a leaf is 1, of a path of n nodes is n, of a star is 2: the recorded node counts', () => {
    const path = buildTGraph(recorded('stops/default/path6', 'LevelProcessor'));
    expect(TreeUtil.depth(TreeUtil.getRoot(path))).toBe(path.getNodes().size());
    const star = buildTGraph(recorded('stops/default/fan6', 'LevelProcessor'));
    expect(TreeUtil.depth(TreeUtil.getRoot(star))).toBe(2);
    const single = buildTGraph(recorded('stops/default/single', 'LevelProcessor'));
    expect(TreeUtil.depth(TreeUtil.getRoot(single))).toBe(1);
  });

  it('depth of random12 is one more than its deepest recorded TREE_LEVEL', () => {
    const dump = recorded(RANDOM12, 'LevelProcessor');
    const deepest = Math.max(...dump.nodes.map((n) => n.props.TREE_LEVEL as number));
    expect(TreeUtil.depth(TreeUtil.getRoot(buildTGraph(dump)))).toBe(deepest + 1);
  });

  it('getChildren lists the outgoing targets in recorded child order', () => {
    const dump = recorded(RANDOM12, 'NodeOrderer');
    const graph = buildTGraph(dump);
    for (const data of dump.nodes) {
      expect(refs(TreeUtil.getChildren(byRef(graph, data.ref)))).toEqual(data.children);
    }
  });

  it('getChildren keeps the first occurrence of a target reached by two edges (stream().distinct())', () => {
    const b = new Builder();
    const [p, x, y] = [b.node('p'), b.node('x'), b.node('y')] as [TNode, TNode, TNode];
    b.link(p, x);
    b.link(p, y);
    b.link(p, x);
    expect(TreeUtil.getChildren(p)).toEqual([x, y]);
    expect(p.getOutgoingEdges().size()).toBe(3);
  });
});

describe('TreeUtil.rootDistance (TreeUtil.java:85-93)', () => {
  it('is 0 for the root and the recorded TREE_LEVEL for every other node of random12', () => {
    const dump = recorded(RANDOM12, 'LevelProcessor');
    const graph = buildTGraph(dump);
    const root = TreeUtil.getRoot(graph);
    expect(TreeUtil.rootDistance(root, root)).toBe(0);
    for (const data of dump.nodes) {
      expect(TreeUtil.rootDistance(byRef(graph, data.ref), root), data.ref).toBe(data.props.TREE_LEVEL);
    }
  });
});

describe('TreeUtil.getAllIncomingEdges / getAllOutgoingEdges (TreeUtil.java:106-175)', () => {
  const dump = recorded(RANDOM12, 'LevelProcessor');
  const graph = buildTGraph(dump);

  it('incoming: exactly the parent edge of each non-root node, none for the root', () => {
    for (const data of dump.nodes) {
      const incoming = TreeUtil.getAllIncomingEdges(byRef(graph, data.ref), graph);
      expect(
        incoming.map((e) => nodeRef(e.getSource()!)),
        data.ref,
      ).toEqual(data.parent === null ? [] : [data.parent]);
    }
  });

  it('outgoing: the child edges sorted by target x, each listed once although the edge list repeats edges', () => {
    expect(graph.getEdges().size()).toBeGreaterThan(new Set(graph.getEdges().toArray()).size);
    for (const data of dump.nodes) {
      const expected = [...data.children].sort((p, q) => decodeHex(dataOf(dump, p).x) - decodeHex(dataOf(dump, q).x));
      const outgoing = TreeUtil.getAllOutgoingEdges(byRef(graph, data.ref), graph);
      expect(
        outgoing.map((e) => nodeRef(e.getTarget()!)),
        data.ref,
      ).toEqual(expected);
    }
  });

  it('skips edges whose ends share a TREE_LEVEL (TreeUtil.java:115-116, 163-164)', () => {
    const b = new Builder();
    const [s, t] = [b.node('s', 0, 0, 3), b.node('t', 5, 0, 3)] as [TNode, TNode];
    b.link(s, t);
    expect(TreeUtil.getAllIncomingEdges(t, b.graph)).toEqual([]);
    expect(TreeUtil.getAllOutgoingEdges(s, b.graph)).toEqual([]);
  });

  it('compares the two TREE_LEVEL Integers by reference: equal levels beyond the box cache count as different', () => {
    const b = new Builder();
    const [s, t] = [b.node('s', 0, 0, 200), b.node('t', 5, 0, 200)] as [TNode, TNode];
    const edge = b.link(s, t);
    expect(TreeUtil.getAllIncomingEdges(t, b.graph)).toEqual([edge]);
    expect(TreeUtil.getAllOutgoingEdges(s, b.graph)).toEqual([edge]);
    const small = new Builder();
    const [u, v] = [small.node('u', 0, 0, 127), small.node('v', 5, 0, 127)] as [TNode, TNode];
    small.link(u, v);
    expect(TreeUtil.getAllIncomingEdges(v, small.graph)).toEqual([]);
    const negative = new Builder();
    const [w, x] = [negative.node('w', 0, 0, -129), negative.node('x', 5, 0, -129)] as [TNode, TNode];
    const kept = negative.link(w, x);
    expect(TreeUtil.getAllIncomingEdges(x, negative.graph)).toEqual([kept]);
  });

  it('dedups by toString and sorts by Double.compare of the other end x, stably (TreeUtil.java:118-123, 168-172)', () => {
    const b = new Builder();
    const target = b.node('t', 50, 0, 1);
    const left = b.node('l', 10, 0, 0);
    const right = b.node('r', 30, 0, 0);
    const twin = b.node('r', 99, 0, 0);
    twin.id = 77;
    const keptRight = b.link(right, target);
    b.link(left, target);
    b.link(twin, target);
    b.link(right, target);
    // the two edges from `right` print the same text n_r->n_t, the edge from `twin` too: only the first is kept
    const incoming = TreeUtil.getAllIncomingEdges(target, b.graph);
    expect(incoming.map((e) => e.getSource())).toEqual([left, right]);
    expect(incoming[1]).toBe(keptRight);
  });

  it('outgoing ignores edges of a SUPER_ROOT source and throws a TypeError (Java NPE) for an unlabeled source', () => {
    const b = new Builder();
    const root = b.node('SUPER_ROOT', 0, 0, 0);
    const child = b.node('c', 5, 0, 1);
    b.link(root, child);
    expect(TreeUtil.getAllOutgoingEdges(root, b.graph)).toEqual([]);
    const bare = new Builder();
    const unlabeled = new TNode(0, bare.graph);
    const other = bare.node('o', 1, 0, 1);
    bare.graph.getNodes().add(unlabeled);
    bare.link(unlabeled, other);
    expect(() => TreeUtil.getAllOutgoingEdges(unlabeled, bare.graph)).toThrow(TypeError);
  });
});

describe('TreeUtil.getSubtree (TreeUtil.java:182-201)', () => {
  it('a leaf is its own subtree', () => {
    const graph = buildTGraph(recorded('stops/default/fan6', 'NodeOrderer'));
    const leaf = [...graph.getNodes()].find((n) => n.isLeaf())!;
    expect(TreeUtil.getSubtree(leaf)).toEqual([leaf]);
  });

  it('lists the children subtrees in child order, then the node itself', () => {
    const dump = recorded('stops/default/fan6', 'NodeOrderer');
    const graph = buildTGraph(dump);
    const root = TreeUtil.getRoot(graph);
    expect(refs(TreeUtil.getSubtree(root))).toEqual([...dump.nodes[0]!.children, dump.nodes[0]!.ref]);
  });

  it('holds every node of the recorded random12 tree exactly once for the root', () => {
    const dump = recorded(RANDOM12, 'NodeOrderer');
    const subtree = TreeUtil.getSubtree(TreeUtil.getRoot(buildTGraph(dump)));
    expect(refs(subtree).sort()).toEqual(dump.nodes.map((n) => n.ref).sort());
    expect(subtree.at(-1)).toBe(subtree.find((n) => n.getParent() === null));
  });

  it('a one-child chain is the chain bottom up (reduce of a single list)', () => {
    const dump = recorded('stops/default/path6', 'NodeOrderer');
    const graph = buildTGraph(dump);
    const subtree = TreeUtil.getSubtree(TreeUtil.getRoot(graph));
    expect(refs(subtree)).toEqual(dump.nodes.map((n) => n.ref).reverse());
  });
});

describe('TreeUtil.getFirstPoint / getLastPoint (TreeUtil.java:211-231)', () => {
  it('without bend points: a copy of the target (first) or source (last) position', () => {
    const b = new Builder();
    const [s, t] = [b.node('s', 1, 2), b.node('t', 3, 4)] as [TNode, TNode];
    const edge = b.link(s, t);
    expect(TreeUtil.getFirstPoint(edge)).toEqual(new KVector(3, 4));
    expect(TreeUtil.getFirstPoint(edge)).not.toBe(t.getPosition());
    expect(TreeUtil.getLastPoint(edge)).toEqual(new KVector(1, 2));
    expect(TreeUtil.getLastPoint(edge)).not.toBe(s.getPosition());
  });

  it('with bend points: the first and last bend point themselves, as recorded after EdgeRouter', () => {
    const dump = recorded(RANDOM12, 'EdgeRouter');
    const graph = buildTGraph(dump);
    const data = dump.edges[0]!;
    const edge = graph.getEdges().get(0);
    expect(data.bends.length).toBeGreaterThan(1);
    const [fx, fy] = decodeHexPair(data.bends[0]!);
    const [lx, ly] = decodeHexPair(data.bends.at(-1)!);
    expect(TreeUtil.getFirstPoint(edge)).toBe(edge.getBendPoints().getFirst());
    expect([TreeUtil.getFirstPoint(edge).x, TreeUtil.getFirstPoint(edge).y]).toEqual([fx, fy]);
    expect(TreeUtil.getLastPoint(edge)).toBe(edge.getBendPoints().getLast());
    expect([TreeUtil.getLastPoint(edge).x, TreeUtil.getLastPoint(edge).y]).toEqual([lx, ly]);
  });
});

describe('directions (TreeUtil.java:238-326)', () => {
  const ALL = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT, Direction.UNDEFINED];

  it('getDirection reads the graph DIRECTION property, UNDEFINED by default (TreeUtil.java:240)', () => {
    const graph = new TGraph();
    expect(TreeUtil.getDirection(graph)).toBe(MrTreeOptions.DIRECTION.getDefault());
    expect(TreeUtil.getDirection(graph)).toBe(Direction.UNDEFINED);
    graph.setProperty(MrTreeOptions.DIRECTION, Direction.LEFT);
    expect(TreeUtil.getDirection(graph)).toBe(Direction.LEFT);
  });

  it('getDirectionVector: UP (0,-1), RIGHT (1,0), LEFT (-1,0), everything else (0,1) (TreeUtil.java:250-261)', () => {
    expect(TreeUtil.getDirectionVector(Direction.UP)).toEqual(new KVector(0, -1));
    expect(TreeUtil.getDirectionVector(Direction.RIGHT)).toEqual(new KVector(1, 0));
    expect(TreeUtil.getDirectionVector(Direction.LEFT)).toEqual(new KVector(-1, 0));
    expect(TreeUtil.getDirectionVector(Direction.DOWN)).toEqual(new KVector(0, 1));
    expect(TreeUtil.getDirectionVector(Direction.UNDEFINED)).toEqual(new KVector(0, 1));
    expect(TreeUtil.getDirectionVector(Direction.UNDEFINED)).not.toBe(TreeUtil.getDirectionVector(Direction.UNDEFINED));
  });

  it('getNodeSizeInDirection: -w/2 left, -h/2 up, w/2 right, h/2 otherwise (TreeUtil.java:272-282)', () => {
    const node = new TNode(0, new TGraph(), 'n');
    node.getSize().x = 10;
    node.getSize().y = 6;
    expect(TreeUtil.getNodeSizeInDirection(node, Direction.LEFT)).toBe(-5);
    expect(TreeUtil.getNodeSizeInDirection(node, Direction.UP)).toBe(-3);
    expect(TreeUtil.getNodeSizeInDirection(node, Direction.RIGHT)).toBe(5);
    expect(TreeUtil.getNodeSizeInDirection(node, Direction.DOWN)).toBe(3);
    expect(TreeUtil.getNodeSizeInDirection(node, Direction.UNDEFINED)).toBe(3);
  });

  it('getNodeSizeVectorInDirection: the same halves as a vector (TreeUtil.java:292-302)', () => {
    const node = new TNode(0, new TGraph(), 'n');
    node.getSize().x = 10;
    node.getSize().y = 6;
    expect(TreeUtil.getNodeSizeVectorInDirection(node, Direction.LEFT)).toEqual(new KVector(-5, 0));
    expect(TreeUtil.getNodeSizeVectorInDirection(node, Direction.UP)).toEqual(new KVector(0, -3));
    expect(TreeUtil.getNodeSizeVectorInDirection(node, Direction.RIGHT)).toEqual(new KVector(5, 0));
    expect(TreeUtil.getNodeSizeVectorInDirection(node, Direction.DOWN)).toEqual(new KVector(0, 3));
    expect(TreeUtil.getNodeSizeVectorInDirection(node, Direction.UNDEFINED)).toEqual(new KVector(0, 3));
  });

  it('turnRight: LEFT to UP, UP to RIGHT, RIGHT to DOWN, anything else to LEFT (TreeUtil.java:312-322)', () => {
    expect(ALL.map((d) => TreeUtil.turnRight(d).name())).toEqual(['RIGHT', 'DOWN', 'LEFT', 'UP', 'LEFT']);
  });

  it('turnLeft: RIGHT to UP, UP to LEFT, LEFT to DOWN, anything else to RIGHT (TreeUtil.java:332-342)', () => {
    expect(ALL.map((d) => TreeUtil.turnLeft(d).name())).toEqual(['LEFT', 'UP', 'RIGHT', 'DOWN', 'RIGHT']);
  });
});

describe('TreeUtil.toNodeBorder (TreeUtil.java:350-363)', () => {
  it('scales the step by half-size over distance on the axis that leaves the box', () => {
    const center = new KVector(0, 0);
    TreeUtil.toNodeBorder(center, new KVector(10, 0), new KVector(4, 4));
    // wh = 2, absx = 10 > 2: xscale = 2 / 10; absy = 0: yscale = 1; scale = min = 0.2; x += 0.2 * 10
    expect(center).toEqual(new KVector(2, 0));
  });

  it('takes the smaller of the two scales', () => {
    const center = new KVector(1, 1);
    TreeUtil.toNodeBorder(center, new KVector(5, 21), new KVector(8, 4));
    // wh = 4, hh = 2: absx = 4 (not > 4): xscale = 1; absy = 20 > 2: yscale = 2 / 20; x += 0.1 * 4, y += 0.1 * 20
    expect(center.x).toBe(1 + 0.1 * 4);
    expect(center.y).toBe(1 + 0.1 * 20);
  });

  it('moves the centre onto the next point when that lies inside the box (both scales 1)', () => {
    const center = new KVector(0, 0);
    TreeUtil.toNodeBorder(center, new KVector(1, -1), new KVector(10, 10));
    expect(center).toEqual(new KVector(1, -1));
  });
});

describe('TreeUtil.isCycleInducing (TreeUtil.java:371-375)', () => {
  const edgeAt = (down: boolean): { edge: TEdge; graph: TGraph } => {
    const b = new Builder();
    const s = b.node('s', 0, 0);
    const t = b.node('t', 0, down ? 10 : -10);
    return { edge: b.link(s, t), graph: b.graph };
  };

  it('is true when the target is not strictly ahead in the layout direction (dot product <= 0)', () => {
    const forward = edgeAt(true);
    expect(TreeUtil.isCycleInducing(forward.edge, forward.graph)).toBe(false);
    const backward = edgeAt(false);
    expect(TreeUtil.isCycleInducing(backward.edge, backward.graph)).toBe(true);
    backward.graph.setProperty(MrTreeOptions.DIRECTION, Direction.UP);
    expect(TreeUtil.isCycleInducing(backward.edge, backward.graph)).toBe(false);
  });

  it('a zero step is cycle inducing', () => {
    const b = new Builder();
    const edge = b.link(b.node('s', 3, 3), b.node('t', 3, 3));
    expect(TreeUtil.isCycleInducing(edge, b.graph)).toBe(true);
  });
});

describe('TreeUtil.getUniqueLong (TreeUtil.java:386-388)', () => {
  it('puts a in the upper and b in the lower 32 bits of a 64-bit long', () => {
    expect(TreeUtil.getUniqueLong(1, 2)).toBe((1n << 32n) + 2n);
    expect(TreeUtil.getUniqueLong(0, 0)).toBe(0n);
  });

  it('masks a negative b to its unsigned 32 bits (b & 0xFFFFFFFFL) and sign-extends a', () => {
    expect(TreeUtil.getUniqueLong(0, -1)).toBe(0xffffffffn);
    expect(TreeUtil.getUniqueLong(-1, -1)).toBe(-1n);
    expect(TreeUtil.getUniqueLong(-1, 0)).toBe(-(1n << 32n));
  });

  it('wraps a at the long range: Integer.MAX_VALUE shifted stays positive, MIN_VALUE becomes Long.MIN_VALUE + b', () => {
    expect(TreeUtil.getUniqueLong(2147483647, 5)).toBe((2147483647n << 32n) + 5n);
    expect(TreeUtil.getUniqueLong(-2147483648, 5)).toBe(-(1n << 63n) + 5n);
  });

  it('is injective over a range of pairs (it is the key of EdgeRouter.nodeGaps)', () => {
    const keys = new Set<bigint>();
    for (let a = -3; a <= 3; a++) {
      for (let c = -3; c <= 3; c++) {
        keys.add(TreeUtil.getUniqueLong(a, c));
      }
    }
    expect(keys.size).toBe(49);
  });
});

describe('TreeUtil.getLowestParent (TreeUtil.java:399-415)', () => {
  const twoParents = (): { b: Builder; child: TNode; high: TNode; low: TNode } => {
    const b = new Builder();
    const high = b.node('high', 0, 0);
    const low = b.node('low', 0, 40);
    const child = b.node('child', 0, 80);
    high.getSize().y = 10;
    low.getSize().y = 10;
    b.link(high, child);
    b.link(low, child);
    return { b, child, high, low };
  };

  it('is null without incoming edges', () => {
    const { b, high } = twoParents();
    expect(TreeUtil.getLowestParent(high, b.graph)).toBeNull();
  });

  it('is the parent with the largest centre dot product with the direction vector (DOWN: the larger y)', () => {
    const { b, child, low } = twoParents();
    b.graph.setProperty(MrTreeOptions.DIRECTION, Direction.DOWN);
    expect(TreeUtil.getLowestParent(child, b.graph)).toBe(low);
  });

  it('uses the direction: UP picks the other parent; RIGHT compares x including the half width', () => {
    const { b, child, high } = twoParents();
    b.graph.setProperty(MrTreeOptions.DIRECTION, Direction.UP);
    expect(TreeUtil.getLowestParent(child, b.graph)).toBe(high);
    const wide = new Builder();
    const narrow = wide.node('narrow', 10, 0);
    const broad = wide.node('broad', 8, 0);
    const target = wide.node('target', 100, 0);
    broad.getSize().x = 8;
    wide.link(narrow, target);
    wide.link(broad, target);
    wide.graph.setProperty(MrTreeOptions.DIRECTION, Direction.RIGHT);
    // centres: narrow 10 + 0/2 = 10, broad 8 + 8/2 = 12
    expect(TreeUtil.getLowestParent(target, wide.graph)).toBe(broad);
  });

  it('ties go to the first parent in the GRAPH node order, not the incoming order', () => {
    const b = new Builder();
    const first = b.node('first', 0, 5);
    const second = b.node('second', 0, 5);
    const child = b.node('child', 0, 50);
    b.link(second, child);
    b.link(first, child);
    expect(TreeUtil.getLowestParent(child, b.graph)).toBe(first);
  });

  it('a parent that is not in the graph node list leaves no candidate: NoSuchElementException', () => {
    const b = new Builder();
    const child = b.node('child');
    const outsider = new TNode(9, new TGraph(), 'outsider');
    child.getIncomingEdges().add(new TEdge(outsider, child));
    expect(() => TreeUtil.getLowestParent(child, b.graph)).toThrow(NoSuchElementException);
  });

  it('a NaN centre matches no parent (double == Double is numeric): NoSuchElementException', () => {
    const b = new Builder();
    const parent = b.node('p', Number.NaN, 0);
    const child = b.node('c', 0, 10);
    b.link(parent, child);
    expect(() => TreeUtil.getLowestParent(child, b.graph)).toThrow(NoSuchElementException);
  });
});

describe('TreeUtil.getLeftMost (TreeUtil.java:424-482)', () => {
  /** root -> a, b; a -> a1, a2; b -> b1; (a1, a2, b1 are the deepest level). */
  const tree = (): Record<string, TNode> => {
    const b = new Builder();
    const t: Record<string, TNode> = {};
    for (const name of ['root', 'a', 'b', 'a1', 'a2', 'b1']) {
      t[name] = b.node(name);
    }
    b.link(t.root!, t.a!);
    b.link(t.root!, t.b!);
    b.link(t.a!, t.a1!);
    b.link(t.a!, t.a2!);
    b.link(t.b!, t.b1!);
    return t;
  };

  it('without depth it is the leftmost node at the deepest level', () => {
    const t = tree();
    expect(TreeUtil.getLeftMost([t.root!])).toBe(t.a1);
  });

  it("with a positive depth it descends depth - 1 levels and returns that level's first node", () => {
    const t = tree();
    expect(TreeUtil.getLeftMost([t.root!], 1)).toBe(t.root);
    expect(TreeUtil.getLeftMost([t.root!], 2)).toBe(t.a);
    expect(TreeUtil.getLeftMost([t.root!], 3)).toBe(t.a1);
    expect(TreeUtil.getLeftMost([t.root!], 0)).toBe(t.root);
  });

  it('the deepest level can lie under a later subtree', () => {
    const b = new Builder();
    const [root, a, c, c1] = [b.node('root'), b.node('a'), b.node('c'), b.node('c1')] as [TNode, TNode, TNode, TNode];
    b.link(root, a);
    b.link(root, c);
    b.link(c, c1);
    expect(TreeUtil.getLeftMost([root])).toBe(c1);
  });

  it('walks a level made of several nodes and any iterable, including the lazy children iterable', () => {
    const t = tree();
    expect(TreeUtil.getLeftMost(t.root!.getChildren())).toBe(t.a1);
    expect(TreeUtil.getLeftMost([t.b!, t.a!])).toBe(t.b1);
    expect(TreeUtil.getLeftMost(new Set([t.a!, t.b!]), 2)).toBe(t.a1);
  });

  it('an empty level has no leftmost node: null', () => {
    expect(TreeUtil.getLeftMost([])).toBeNull();
    expect(TreeUtil.getLeftMost([], 3)).toBeNull();
  });

  it('on the recorded random12 tree it is the first node of the deepest recorded level in child order', () => {
    const dump = recorded(RANDOM12, 'NodeOrderer');
    const graph = buildTGraph(dump);
    const deepest = Math.max(...dump.nodes.map((n) => n.props.TREE_LEVEL as number));
    // breadth-first in child order: the first node met at the deepest level
    let level = [dump.nodes.find((n) => n.parent === null)!];
    for (let i = 0; i < deepest; i++) {
      level = level.flatMap((n) => n.children.map((ref) => dataOf(dump, ref)));
    }
    expect(nodeRef(TreeUtil.getLeftMost([TreeUtil.getRoot(graph)])!)).toBe(level[0]!.ref);
  });
});
