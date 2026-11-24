// SPDX-License-Identifier: EPL-2.0
// Proof of the explicit-stack `routeEdges` (mission tree-recursion-depth, #67, D4) against a verbatim transcription of the
// recursive Java (`StraightLineEdgeRouter.java:48-86`) on seeded trees with port-sourced and hierarchical edges mixed in,
// compared at raw bits together with the order in which sections are written, plus a depth no recursion survives.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  doubleBits,
  randomSpec,
  seededRandom,
  SHAPES,
  type TreeSpec,
} from '../../../../test/helpers/spore-tree-fixtures.js';
import { ElkMath } from '../../../core/math/ElkMath.js';
import { KVector } from '../../../core/math/KVector.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { isElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { StraightLineEdgeRouter } from './StraightLineEdgeRouter.js';

const TREES = 60;
const MAX_NODES = 40;
const DEEP_PATH = 15_000;
const DEEP_SPACING = 20;
const TIMEOUT = { timeout: 120_000 };
const ENDLESS_TIMEOUT = { timeout: 60_000 };

/** The clipping and section writes of one edge (`StraightLineEdgeRouter.java:53-81`), verbatim. */
function twinRouteClipped(node: ElkNode, target: ElkNode, edge: ElkEdge): void {
  let sourceX = node.getX() + node.getWidth() / 2;
  let sourceY = node.getY() + node.getHeight() / 2;
  let targetX = target.getX() + target.getWidth() / 2;
  let targetY = target.getY() + target.getHeight() / 2;
  const vector = new KVector();
  vector.x = targetX - sourceX;
  vector.y = targetY - sourceY;
  const sourceClip = new KVector(vector.x, vector.y);
  ElkMath.clipVector(sourceClip, node.getWidth(), node.getHeight());
  vector.x -= sourceClip.x;
  vector.y -= sourceClip.y;
  sourceX = targetX - vector.x;
  sourceY = targetY - vector.y;
  const targetClip = new KVector(vector.x, vector.y);
  ElkMath.clipVector(targetClip, target.getWidth(), target.getHeight());
  vector.x -= targetClip.x;
  vector.y -= targetClip.y;
  targetX = sourceX + vector.x;
  targetY = sourceY + vector.y;
  const section = ElkGraphUtil.firstEdgeSection(edge, true, true);
  section.setStartLocation(sourceX, sourceY);
  section.setEndLocation(targetX, targetY);
}

/** Verbatim transcription of the recursive Java `routeEdges` (`StraightLineEdgeRouter.java:48-86`). */
function twinRouteEdges(node: ElkNode): void {
  for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
    if (!isElkPort(edge.getSources().get(0))) {
      const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;
      if (!edge.isHierarchical()) {
        twinRouteClipped(node, target, edge);
        twinRouteEdges(target);
      }
    }
  }
}

/**
 * Builds the tree of a spec iteratively (locations and sizes from the rectangles), plus, by `variant`, an edge from a port of the
 * root to an extra node (skipped: port source) or an edge from the root into a node nested in the last node (skipped:
 * hierarchical). Returns every edge, in creation order.
 */
function buildRoutedTree(spec: TreeSpec, variant: number): { root: ElkNode; edges: ElkEdge[] } {
  const graph = ElkGraphUtil.createGraph();
  const nodes = spec.rects.map(([x, y, w, h]) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(w + x / 17, h + y / 13);
    node.setLocation(x - 50 + y / 7, y - 50);
    return node;
  });
  const edges = spec.parents.map((parent, i) => ElkGraphUtil.createSimpleEdge(nodes[parent]!, nodes[i + 1]!));
  const root = nodes[0]!;
  if (variant === 1) {
    const port = ElkGraphUtil.createPort(root);
    const extra = ElkGraphUtil.createNode(graph);
    extra.setDimensions(10, 10);
    edges.push(ElkGraphUtil.createSimpleEdge(port, extra));
  } else if (variant === 2) {
    const nested = ElkGraphUtil.createNode(nodes[nodes.length - 1]!);
    nested.setDimensions(5, 5);
    edges.push(ElkGraphUtil.createSimpleEdge(root, nested));
  }
  return { root, edges };
}

/** Every effect of the routing: the edges in section-write order, then each edge's sections at raw bits. */
function runRouting(spec: TreeSpec, variant: number, route: (root: ElkNode) => void): string[] {
  const { root, edges } = buildRoutedTree(spec, variant);
  const order: number[] = [];
  const original = ElkGraphUtil.firstEdgeSection;
  vi.spyOn(ElkGraphUtil, 'firstEdgeSection').mockImplementation((edge, resetSection, removeOtherSections) => {
    order.push(edges.indexOf(edge));
    return original(edge, resetSection, removeOtherSections);
  });
  route(root);
  vi.restoreAllMocks();
  return [order.join(','), ...edges.map(sectionBits)];
}

/** The sections of an edge, start and end at raw bits. */
const sectionBits = (edge: ElkEdge): string =>
  [...edge.getSections()]
    .map((s) => [s.getStartX(), s.getStartY(), s.getEndX(), s.getEndY()].map(doubleBits).join(' '))
    .join(';');

/** A path of `DEEP_PATH` nodes 10 x 10 along the x axis, `DEEP_SPACING` apart; returns the root and the edges. */
function buildDeepPath(): { root: ElkNode; edges: ElkEdge[] } {
  const graph = ElkGraphUtil.createGraph();
  const nodes: ElkNode[] = [];
  const edges: ElkEdge[] = [];
  for (let i = 0; i < DEEP_PATH; i++) {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(10, 10);
    node.setLocation(i * DEEP_SPACING, 0);
    if (i > 0) {
      edges.push(ElkGraphUtil.createSimpleEdge(nodes[i - 1]!, node));
    }
    nodes.push(node);
  }
  return { root: nodes[0]!, edges };
}

/** Nodes a (returned), b and c (10 x 10, apart) with edges a→b, b→c, c→b: a successor cycle the recursion never leaves. */
function buildEndlessCycle(): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  const [a, b, c] = [0, 1, 2].map((i) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(10, 10);
    node.setLocation(i * DEEP_SPACING, 0);
    return node;
  });
  ElkGraphUtil.createSimpleEdge(a!, b!);
  ElkGraphUtil.createSimpleEdge(b!, c!);
  ElkGraphUtil.createSimpleEdge(c!, b!);
  return a!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StraightLineEdgeRouter.routeEdges: explicit stack equals the verbatim recursion', () => {
  it(`${TREES} seeded trees with port and hierarchical edges: section order and bits equal the twin`, TIMEOUT, () => {
    const rnd = seededRandom(23_261_112);
    const router = new StraightLineEdgeRouter();
    const mismatches: number[] = [];
    let routed = 0;
    for (let i = 0; i < TREES; i++) {
      const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
      const variant = i % 3;
      const expected = runRouting(spec, variant, twinRouteEdges);
      const actual = runRouting(spec, variant, (root) => router.routeEdges(root));
      if (actual.join('|') !== expected.join('|')) {
        mismatches.push(i);
      }
      routed += expected[0] === '' ? 0 : expected[0]!.split(',').length;
    }
    expect(mismatches).toEqual([]);
    // the comparison has power: the spy sees the section writes (every tree edge, never the port or hierarchical one)
    expect(routed).toBeGreaterThan(TREES * 10);
  });

  it(`a ${DEEP_PATH}-node path is routed without overflow, like the twin`, TIMEOUT, () => {
    const port = buildDeepPath();
    new StraightLineEdgeRouter().routeEdges(port.root);
    // centre to centre, clipped at the 10 x 10 borders: edge i runs from x = 20i + 10 to x = 20(i + 1), y = 5
    const last = port.edges[DEEP_PATH - 2]!.getSections().get(0);
    expect([last.getStartX(), last.getStartY(), last.getEndX(), last.getEndY()]).toEqual([
      (DEEP_PATH - 2) * DEEP_SPACING + 10,
      5,
      (DEEP_PATH - 1) * DEEP_SPACING,
      5,
    ]);
    const twin = buildDeepPath();
    let completed = false;
    try {
      twinRouteEdges(twin.root);
      completed = true;
    } catch (e) {
      expect(e).toBeInstanceOf(RangeError);
    }
    if (completed) {
      expect(twin.edges.map(sectionBits)).toEqual(port.edges.map(sectionBits));
    }
  });

  it(
    'a successor cycle reachable from the root (a→b, b→c, c→b) throws RangeError, like the twin',
    ENDLESS_TIMEOUT,
    () => {
      // the Java recursion never ends there and throws StackOverflowError; the port's stack is depth-checked
      expect(() => new StraightLineEdgeRouter().routeEdges(buildEndlessCycle())).toThrow(RangeError);
      expect(() => twinRouteEdges(buildEndlessCycle())).toThrow(RangeError);
    },
  );
});
