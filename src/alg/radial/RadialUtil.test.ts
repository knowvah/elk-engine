// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildStopState,
  collectNodes,
  decodeHex,
  importRadialInput,
} from '../../../test/helpers/radial-replay-dump.js';
import { buildTree, idsOf, nodeOf } from '../../../test/helpers/radial-replay-graphs.js';
import {
  isFullRow,
  isStopsRow,
  isThrowsRow,
  loadRadialRows,
  propOf,
  radialRefPath,
  rowsWithStepPair,
  stopIndex,
  stopsOf,
  type RadialRow,
  type RadialStopsRow,
} from '../../../test/helpers/radial-replay-rows.js';
import { KVector } from '../../core/math/KVector.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { RadialUtil } from './RadialUtil.js';

// ------------------------------------------------------------------------------------------------------------
// the recorded input graphs as a plain model, to state what the Java methods return without calling them

interface JsonNode {
  readonly id: string;
  readonly children?: readonly JsonNode[];
  readonly ports?: readonly { readonly id: string }[];
  readonly edges?: readonly {
    readonly id: string;
    readonly sources: readonly string[];
    readonly targets: readonly string[];
  }[];
}
interface ModelEdge {
  readonly id: string;
  readonly source: string;
  readonly sourceIsPort: boolean;
  readonly target: string;
  readonly targetPort: string | null;
}
interface Model {
  readonly nodes: string[];
  readonly children: Map<string, string[]>;
  readonly edges: ModelEdge[];
  readonly ports: Map<string, string[]>;
}

function modelOf(input: RadialRow['input']): Model {
  const portOwner = new Map<string, string>();
  const model: Model = { nodes: [], children: new Map(), edges: [], ports: new Map() };
  const raw: NonNullable<JsonNode['edges']>[number][] = [];
  const walk = (node: JsonNode): void => {
    model.children.set(
      node.id,
      (node.children ?? []).map((c) => c.id),
    );
    model.ports.set(
      node.id,
      (node.ports ?? []).map((p) => p.id),
    );
    for (const port of node.ports ?? []) {
      portOwner.set(port.id, node.id);
    }
    raw.push(...(node.edges ?? []));
    for (const child of node.children ?? []) {
      model.nodes.push(child.id);
      walk(child);
    }
  };
  walk(input as unknown as JsonNode);
  for (const e of raw) {
    const [source, target] = [e.sources[0] as string, e.targets[0] as string];
    model.edges.push({
      id: e.id,
      source: portOwner.get(source) ?? source,
      sourceIsPort: portOwner.has(source),
      target: portOwner.get(target) ?? target,
      targetPort: portOwner.has(target) ? target : null,
    });
  }
  return model;
}

/** RadialUtil.getSuccessors by its Javadoc: targets of the outgoing edges that start at a node (not a port) and do not end at a child. */
const expectedSuccessors = (model: Model, node: string): string[] =>
  model.edges
    .filter((e) => e.source === node && !e.sourceIsPort && !(model.children.get(node) ?? []).includes(e.target))
    .map((e) => e.target);

/** RadialUtil.getTreeParent: the source node of the first incoming edge (edges at the node, then at its ports), else none. */
function expectedParent(model: Model, node: string): string | null {
  const direct = model.edges.find((e) => e.target === node && e.targetPort === null);
  const viaPort = (model.ports.get(node) ?? []).flatMap((p) => model.edges.filter((e) => e.targetPort === p));
  return (direct ?? viaPort[0])?.source ?? null;
}

const stopsRows = (): readonly RadialStopsRow[] => loadRadialRows('stops').filter(isStopsRow);
const idOf = (node: { getIdentifier(): string | null }): string => node.getIdentifier() as string;

describe('RadialUtil against the recorded graphs', () => {
  it.each(stopsRows().map((row) => [row.id, row] as const))('findRoot is the recorded root: %s', (_id, row) => {
    const rootStop = stopIndex(stopsOf(row), 'RootAndRadius');
    const graph = buildStopState(row, rootStop);
    const root = RadialUtil.findRoot(graph);
    expect(root === null ? null : idOf(root)).toBe(propOf(stopsOf(row)[rootStop] as never, 'root', 'root'));
  });

  it('findRoot is null for the recorded rows that have no root (every node has an incoming edge)', () => {
    const rows = loadRadialRows('throws')
      .filter(isThrowsRow)
      .filter((r) => r.expected.throws.message === 'The given graph is not a tree!');
    expect(rows.map((r) => r.id).sort()).toEqual([
      'throws/empty',
      'throws/ring-with-leaf',
      'throws/ring3',
      'throws/ring3-omit-micro',
      'throws/self-loop',
    ]);
    for (const row of rows) {
      const graph = importRadialInput(row);
      expect(RadialUtil.findRoot(graph)).toBeNull();
    }
  });

  // RadialLayoutProvider.java:58-63: radius = RADIUS, or the diameter of the largest node when it is 0 (the default)
  it.each(
    stopsRows()
      .filter(
        (row) => row.input['layoutOptions'] !== undefined && !('radius' in (row.input['layoutOptions'] as object)),
      )
      .map((row) => [row.id, row] as const),
  )('findLargestNodeInGraph is the recorded radius: %s', (_id, row) => {
    const stops = stopsOf(row);
    const index = stopIndex(stops, 'RootAndRadius');
    const radius = propOf(stops[index] as never, 'root', 'radius');
    expect(RadialUtil.findLargestNodeInGraph(buildStopState(row, index))).toBeCloseTo(decodeHex(radius as string), 6);
  });

  const treeRows = stopsRows().filter((row) => stopIndex(stopsOf(row), 'StraightLineEdgeRouter') >= 0);

  it.each(treeRows.map((row) => [row.id, row] as const))(
    'successors, leaves, tree parents and roots of every node: %s',
    (_id, row) => {
      const stops = stopsOf(row);
      const model = modelOf(row.input);
      const graph = buildStopState(row, stops.length - 1);
      const rootId = propOf(stops.at(-1) as never, 'root', 'root') as string;
      const byId = new Map(collectNodes(graph).map((n) => [idOf(n), n]));
      const leaves = (id: string): number => {
        const next = expectedSuccessors(model, id);
        return next.length === 0 ? 1 : next.reduce((sum, child) => sum + leaves(child), 0);
      };
      const reachable = new Set<string>();
      const visit = (id: string): void => {
        reachable.add(id);
        expectedSuccessors(model, id).forEach(visit);
      };
      visit(rootId);
      for (const id of model.nodes) {
        const node = byId.get(id) as NonNullable<ReturnType<typeof byId.get>>;
        const successors = expectedSuccessors(model, id);
        expect(idsOf(RadialUtil.getSuccessors(node))).toEqual(successors);
        expect([...RadialUtil.getSuccessorSet(node)].map(idOf)).toEqual(successors);
        expect(RadialUtil.getNumberOfLeaves(node)).toBe(leaves(id));
        const parent = RadialUtil.getTreeParent(node);
        expect(parent === null ? null : idOf(parent)).toBe(expectedParent(model, id));
        expect(idsOf(RadialUtil.getNextLevelNodes([node]))).toEqual(successors);
        expect(idsOf(RadialUtil.getLastLevelNodes([node]))).toEqual([expectedParent(model, id)]);
      }
      // the oracle: the nodes reachable from the root by successors are exactly the targets of the edges the router gave a section
      const routed = new Set((stops.at(-1)?.edges ?? []).map((e) => e[0]));
      const expectedRouted = model.edges.filter(
        (e) => reachable.has(e.source) && expectedSuccessors(model, e.source).includes(e.target) && !e.sourceIsPort,
      );
      expect(new Set(expectedRouted.map((e) => e.id))).toEqual(routed);
      for (const id of reachable) {
        expect(idOf(RadialUtil.findRootOfNode(byId.get(id) as never))).toBe(rootId);
      }
    },
  );

  it('covers the port, hierarchy and forest rows', () => {
    const ids = treeRows.map((r) => r.id);
    expect(ids).toContain('stops/shapes/ports');
    expect(ids.filter((id) => id.startsWith('stops/hier/')).length).toBeGreaterThan(0);
    expect(ids).toContain('stops/shapes/forest-nontree');
  });

  it('the rows for the steps this file reads exist', () => {
    expect(rowsWithStepPair('RootAndRadius').length).toBeGreaterThan(100);
    expect(loadRadialRows().filter(isFullRow).length).toBe(148);
  });
});

// ------------------------------------------------------------------------------------------------------------
// I30: the next-level sets of the rows the recorder classified

interface I30Entry {
  readonly id: string;
  readonly treeified: boolean;
  readonly levels: readonly { readonly size: number; readonly parents: number }[];
}

describe('I30: getNextLevelNodeSet against the recorded level sizes and parent counts', () => {
  const entries = (JSON.parse(readFileSync(radialRefPath(), 'utf8')) as { i30: I30Entry[] }).i30;

  it('the ref lists the I30 rows', () => {
    expect(entries.length).toBeGreaterThanOrEqual(30);
    expect(entries.some((e) => e.treeified)).toBe(true);
  });

  // RadialVectors.levelsOf: level = successors of the root; per level next = getNextLevelNodeSet(level) with its size and the number of
  // distinct tree parents; the next level is next in iteration order
  it.each(entries.map((e) => [e.id, e] as const))('%s', (id, entry) => {
    const row = loadRadialRows().find(
      (r) => r.id === `full/${id}` || r.id === `stops/${id}` || r.id === `throws/${id}`,
    ) as RadialRow;
    const graph = importRadialInput(row);
    const root = RadialUtil.findRoot(graph) as NonNullable<ReturnType<typeof RadialUtil.findRoot>>;
    let level = RadialUtil.getSuccessors(root);
    const levels: { size: number; parents: number }[] = [];
    while (level.length > 0) {
      const next = RadialUtil.getNextLevelNodeSet(level);
      // AD-10: the TS Set iterates in insertion order, the first occurrence in the concatenated successor lists
      const firstOccurrences = [...new Set(level.flatMap((n) => RadialUtil.getSuccessors(n)))];
      expect([...next]).toEqual(firstOccurrences);
      const parents = new Set([...next].map((n) => RadialUtil.getTreeParent(n)));
      if (next.size > 0) {
        levels.push({ size: next.size, parents: parents.size });
      }
      level = [...next];
    }
    expect(levels).toEqual(entry.levels);
  });
});

// ------------------------------------------------------------------------------------------------------------
// Java-traced tests (each states the Java line)

describe('RadialUtil traced from the Java source', () => {
  it('getSuccessors follows the outgoing edges in order, skips edges that start at a port and targets that are children', () => {
    // RadialUtil.java:48-58
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }, { id: 'b' }] });
    const r = nodeOf(tree, 'r');
    const port = ElkGraphUtil.createPort(r);
    ElkGraphUtil.createSimpleEdge(port, nodeOf(tree, 'a')); // starts at a port: skipped (:50)
    const inner = ElkGraphUtil.createNode(r);
    inner.setIdentifier('inner');
    ElkGraphUtil.createSimpleEdge(r, inner); // ends at a child of r: skipped (:53)
    const tail = ElkGraphUtil.createNode(tree.graph);
    tail.setIdentifier('tail');
    ElkGraphUtil.createSimpleEdge(r, tail);
    expect(idsOf(RadialUtil.getSuccessors(r))).toEqual(['a', 'b', 'tail']);
    expect(idsOf(RadialUtil.getSuccessorSet(r))).toEqual(['a', 'b', 'tail']);
  });

  it('getSuccessors counts an edge that ends at a port of a node as an edge to that node', () => {
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }] });
    const port = ElkGraphUtil.createPort(nodeOf(tree, 'a'));
    const second = ElkGraphUtil.createNode(tree.graph);
    second.setIdentifier('second');
    ElkGraphUtil.createSimpleEdge(nodeOf(tree, 'r'), port);
    ElkGraphUtil.createSimpleEdge(nodeOf(tree, 'r'), second);
    expect(idsOf(RadialUtil.getSuccessors(nodeOf(tree, 'r')))).toEqual(['a', 'a', 'second']);
    expect(idsOf(RadialUtil.getSuccessorSet(nodeOf(tree, 'r')))).toEqual(['a', 'second']);
  });

  it('findRoot returns the first node without an incoming edge, also through a port', () => {
    // RadialUtil.java:90-98: allIncomingEdges includes the ports' edges
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }, { id: 'b' }] });
    expect(idOf(RadialUtil.findRoot(tree.graph) as never)).toBe('r');
    const port = ElkGraphUtil.createPort(nodeOf(tree, 'r'));
    ElkGraphUtil.createSimpleEdge(nodeOf(tree, 'b'), port);
    const second = ElkGraphUtil.createNode(tree.graph);
    second.setIdentifier('second');
    // r now has an incoming edge at its port, so the first node without one is none of r, a (target of r), b: it is `second`
    expect(idOf(RadialUtil.findRoot(tree.graph) as never)).toBe('second');
  });

  it('getTreeParent is null at the root; findRootOfNode climbs to it', () => {
    // RadialUtil.java:109-117, :294-301
    const tree = buildTree({ id: 'r', children: [{ id: 'a', children: [{ id: 'a1' }] }] });
    expect(RadialUtil.getTreeParent(nodeOf(tree, 'r'))).toBeNull();
    expect(idOf(RadialUtil.getTreeParent(nodeOf(tree, 'a1')) as never)).toBe('a');
    expect(idOf(RadialUtil.findRootOfNode(nodeOf(tree, 'a1')))).toBe('r');
    expect(idOf(RadialUtil.findRootOfNode(nodeOf(tree, 'r')))).toBe('r');
  });

  it('getNumberOfLeaves counts the leaves below a node, 1 for a leaf', () => {
    // RadialUtil.java:119-130
    const tree = buildTree({ id: 'r', children: [{ id: 'a', children: [{ id: 'a1' }, { id: 'a2' }] }, { id: 'b' }] });
    expect(RadialUtil.getNumberOfLeaves(nodeOf(tree, 'r'))).toBe(3);
    expect(RadialUtil.getNumberOfLeaves(nodeOf(tree, 'b'))).toBe(1);
  });

  it('findLargestNodeInGraph takes the largest diagonal over all levels', () => {
    // RadialUtil.java:188-201: sqrt(w * w + h * h), recursing into inner nodes; the sides are Pythagorean triples
    const graph = ElkGraphUtil.createGraph();
    const outer = ElkGraphUtil.createNode(graph);
    outer.setDimensions(6, 8);
    const inner = ElkGraphUtil.createNode(outer);
    inner.setDimensions(30, 40);
    ElkGraphUtil.createNode(graph).setDimensions(5, 12);
    expect(RadialUtil.findLargestNodeInGraph(graph)).toBe(50);
    expect(RadialUtil.findLargestNodeInGraph(ElkGraphUtil.createGraph())).toBe(0);
  });

  it('getNextLevelNodes concatenates the successor lists, getNextLevelNodeSet drops duplicates keeping first occurrences', () => {
    // RadialUtil.java:209-232; an extra edge b -> a2 makes a2 a successor of both
    const tree = buildTree({
      id: 'r',
      children: [
        { id: 'a', children: [{ id: 'a1' }, { id: 'a2' }] },
        { id: 'b', children: [{ id: 'b1' }] },
      ],
    });
    ElkGraphUtil.createSimpleEdge(nodeOf(tree, 'b'), nodeOf(tree, 'a2'));
    const level = [nodeOf(tree, 'a'), nodeOf(tree, 'b')];
    expect(idsOf(RadialUtil.getNextLevelNodes(level))).toEqual(['a1', 'a2', 'b1', 'a2']);
    expect(idsOf(RadialUtil.getNextLevelNodeSet(level))).toEqual(['a1', 'a2', 'b1']);
    expect(RadialUtil.getNextLevelNodes([])).toEqual([]);
    expect(RadialUtil.getNextLevelNodeSet([]).size).toBe(0);
  });

  it('getLastLevelNodes lists the tree parents, null for the root', () => {
    // RadialUtil.java:239-246
    const tree = buildTree({ id: 'r', children: [{ id: 'a' }] });
    const parents = RadialUtil.getLastLevelNodes([nodeOf(tree, 'a'), nodeOf(tree, 'r')]);
    expect(parents[0]).toBe(nodeOf(tree, 'r'));
    expect(parents[1]).toBeNull();
  });

  it('centerNodesOnRadi puts the center of the node on the point', () => {
    // RadialUtil.java:256-262
    const node = ElkGraphUtil.createNode(null);
    node.setDimensions(10, 6);
    RadialUtil.centerNodesOnRadi(node, 20, 30);
    expect([node.getX(), node.getY()]).toEqual([15, 27]);
  });

  describe('shiftClosestEdgeToRadi (RadialUtil.java:275-312)', () => {
    const place = (x: number, y: number): [number, number] => {
      const node = ElkGraphUtil.createNode(null);
      node.setDimensions(10, 6);
      RadialUtil.shiftClosestEdgeToRadi(node, x, y);
      return [node.getX(), node.getY()];
    };

    it('centers a node at the origin, also within 1e-10 of it (fuzzyEquals)', () => {
      expect(place(0, 0)).toEqual([-5, -3]);
      expect(place(5e-11, -5e-11)).toEqual([5e-11 - 5, -5e-11 - 3]);
    });

    it('does not treat 1e-9 as the origin', () => {
      expect(place(1e-9, 0)).toEqual([1e-9, 6]);
    });

    it('lower left: x - width, y', () => {
      expect(place(-20, -30)).toEqual([-30, -30]);
    });

    it('upper left: x - width, y + height', () => {
      expect(place(-20, 30)).toEqual([-30, 36]);
    });

    it('lower right: x, y', () => {
      expect(place(20, -30)).toEqual([20, -30]);
    });

    it('upper right: x, y + height', () => {
      expect(place(20, 30)).toEqual([20, 36]);
    });
  });

  describe('createPolarComparator (RadialUtil.java:135-185)', () => {
    const nodeAt = (x: number, y: number) => {
      const node = ElkGraphUtil.createNode(null);
      node.setProperty(CoreOptions.POSITION, new KVector(x, y));
      return node;
    };

    it('orders by the angle atan2(y, x) in [0, 2 pi)', () => {
      const compare = RadialUtil.createPolarComparator(0, 0);
      expect(compare(nodeAt(1, 0), nodeAt(0, 1))).toBe(-1);
      expect(compare(nodeAt(0, 1), nodeAt(1, 0))).toBe(1);
      // a negative angle is shifted by 2 pi (:157-159): (1, -1) is 7 pi / 4, after (0, 1) at pi / 2
      expect(compare(nodeAt(1, -1), nodeAt(0, 1))).toBe(1);
    });

    it('ignores the distance from the origin and treats angles within 1e-10 as equal (fuzzyCompare)', () => {
      const compare = RadialUtil.createPolarComparator(0, 0);
      expect(compare(nodeAt(1, 0), nodeAt(7, 0))).toBe(0);
      expect(compare(nodeAt(1, 0), nodeAt(1, 1e-11))).toBe(0);
      expect(compare(nodeAt(1, 0), nodeAt(1, 1e-9))).toBe(-1);
    });

    it('adds the radial offset and wraps angles above 2 pi', () => {
      // offset pi: (1, 0) -> pi; (-1, 0) -> pi + pi = 2 pi, which is not above 2 pi; (0, -1) -> 3 pi / 2 + pi wraps to pi / 2
      const compare = RadialUtil.createPolarComparator(Math.PI, 0);
      expect(compare(nodeAt(1, 0), nodeAt(-1, 0))).toBe(-1);
      expect(compare(nodeAt(0, -1), nodeAt(1, 0))).toBe(-1);
    });

    it('shifts y by the node offset before taking the angle', () => {
      expect(RadialUtil.createPolarComparator(0, 0)(nodeAt(1, -1), nodeAt(1, 1))).toBe(1);
      // with an offset of 1: (1, 0) -> angle 0, (1, 2) -> angle atan2(2, 1)
      expect(RadialUtil.createPolarComparator(0, 1)(nodeAt(1, -1), nodeAt(1, 1))).toBe(-1);
    });

    it('throws a TypeError for a node without the POSITION option (the NullPointerException at RadialUtil.java:154)', () => {
      const compare = RadialUtil.createPolarComparator(0, 0);
      const bare = ElkGraphUtil.createNode(null);
      expect(() => compare(bare, nodeAt(1, 0))).toThrow(TypeError);
      expect(() => compare(nodeAt(1, 0), bare)).toThrow(TypeError);
    });
  });
});
