// SPDX-License-Identifier: EPL-2.0
// Mission spore-recursion-depth (#76, AC6): proof of the explicit-stack `MinSTPhase.addNode` against a verbatim
// transcription of the recursive Java (`MinSTPhase.java:90-96`), run through `convert` (`MinSTPhase.java:77-83`) for
// `MinSTPhase` and `MaxSTPhase` on seeded vector trees, compared on tree structure and the identity of every `Node`.
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { MAX_STACK_DEPTH, STACK_OVERFLOW_MESSAGE } from '../../../java/lang/StackDepth.js';
import type { JavaHashMap } from '../../../java/util/JavaHashMap.js';
import { Tree } from '../../common/Tree.js';
import { Node } from '../../common/spore/Node.js';
import { Graph } from '../graph/Graph.js';
import { CompactionStrategy } from '../options/CompactionStrategy.js';
import { TreeConstructionStrategy } from '../options/TreeConstructionStrategy.js';
import {
  pathSpec,
  randomSpec,
  seededRandom,
  SHAPES,
  type TreeSpec,
} from '../../../../test/helpers/spore-tree-fixtures.js';
import { MaxSTPhase } from './MaxSTPhase.js';
import { MinSTPhase } from './MinSTPhase.js';

/** The members of `MinSTPhase` the proof drives: `convert` protected, `nodeMap` and `addNode` private. */
interface Internals {
  readonly nodeMap: JavaHashMap<KVector, Node>;
  convert(tTree: Tree<KVector>, graph: Graph): void;
  addNode(s: Tree<Node>, t: Tree<KVector>): void;
}

const TREES = 120;
const MAX_NODES = 40;
const DEEP_LENGTH = 20_000;
const SPACING = 20;
const PHASES = [
  ['MinSTPhase', () => new MinSTPhase()],
  ['MaxSTPhase', () => new MaxSTPhase()],
] as const;

/** Verbatim transcription of the recursive Java `addNode` (`MinSTPhase.java:90-96`). */
function referenceAddNode(internals: Internals, s: Tree<Node>, t: Tree<KVector>): void {
  for (const tTree of t.children) {
    const child = new Tree<Node>(internals.nodeMap.get(tTree.node)!);
    s.children.push(child);
    referenceAddNode(internals, child, tTree);
  }
}

/** The graph's vertices (one per rectangle, centre as `originalVertex`) and the vector tree of the spec. */
interface Input {
  readonly graph: Graph;
  readonly tTree: Tree<KVector>;
}

/**
 * Builds the input of `convert`. The vector tree holds equal copies of the centres, not the vertices' own vectors: the
 * `nodeMap` lookup is by value, as with `NaiveMinST`'s output. Equal centres collapse in the map, as in the Java.
 * Iterative: the deep paths are 100,000 long.
 */
function inputOf(spec: TreeSpec): Input {
  const graph = new Graph(
    { cost: () => 0 },
    TreeConstructionStrategy.MINIMUM_SPANNING_TREE,
    CompactionStrategy.DEPTH_FIRST,
  );
  const vectors = spec.rects.map(([x, y, w, h]) => {
    const centre = new KVector(x + w / 2, y + h / 2);
    graph.vertices.push(new Node(centre, new ElkRectangle(x, y, w, h)));
    return new Tree<KVector>(centre.clone());
  });
  spec.parents.forEach((parent, i) => vectors[parent]!.children.push(vectors[i + 1]!));
  return { graph, tTree: vectors[0]! };
}

/** Pre-order list of `vertex index:child count` of the converted tree, by `Node` identity. Iterative. */
function shapeOf(graph: Graph): string[] {
  const index = new Map<Node, number>(graph.vertices.map((n, i) => [n, i]));
  const out: string[] = [];
  const stack: Tree<Node>[] = [graph.tree!];
  while (stack.length > 0) {
    const t = stack.pop()!;
    out.push(`${String(index.get(t.node))}:${String(t.children.length)}`);
    for (let i = t.children.length - 1; i >= 0; i--) {
      stack.push(t.children[i]!);
    }
  }
  return out;
}

/** Runs `convert` of a fresh phase on the spec's input, with the port's `addNode` or the twin. */
function convert(createPhase: () => MinSTPhase, spec: TreeSpec, twin: boolean): string[] {
  const { graph, tTree } = inputOf(spec);
  // Justification: `convert` is protected and `addNode` private; the cast is the only access to them.
  const internals = createPhase() as unknown as Internals;
  if (twin) {
    internals.addNode = (s, t) => referenceAddNode(internals, s, t);
  }
  internals.convert(tTree, graph);
  return shapeOf(graph);
}

describe.each(PHASES)(
  '%s.convert: the explicit-stack addNode equals the verbatim recursion (#76)',
  (_name, createPhase) => {
    it(`${TREES} seeded vector trees over every shape: structure and Node identity at every position are equal`, () => {
      const rnd = seededRandom(20_261_124);
      const mismatches: number[] = [];
      const shapes = new Set<string>();
      let inner = 0;
      for (let i = 0; i < TREES; i++) {
        const spec = randomSpec(SHAPES[i % SHAPES.length]!, 1 + Math.floor(rnd() * MAX_NODES), rnd);
        shapes.add(spec.shape);
        const expected = convert(createPhase, spec, true);
        if (JSON.stringify(convert(createPhase, spec, false)) !== JSON.stringify(expected)) {
          mismatches.push(i);
        }
        inner += expected.filter((entry) => !entry.endsWith(':0')).length;
        expect(expected).toHaveLength(spec.rects.length);
      }
      expect(mismatches).toEqual([]);
      expect([...shapes].sort()).toEqual([...SHAPES].sort());
      // the comparison has power: the trees have inner nodes at every depth
      expect(inner).toBeGreaterThan(TREES);
    });

    it('a single node converts to a leaf; a star keeps its children in list order', () => {
      expect(convert(createPhase, pathSpec(1, SPACING), false)).toEqual(['0:0']);
      expect(convert(createPhase, pathSpec(1, SPACING), true)).toEqual(['0:0']);
      const star = pathSpec(6, SPACING);
      const starSpec: TreeSpec = { shape: 'star', rects: star.rects, parents: [0, 0, 0, 0, 0] };
      const expected = ['0:5', '1:0', '2:0', '3:0', '4:0', '5:0'];
      expect(convert(createPhase, starSpec, false)).toEqual(expected);
      expect(convert(createPhase, starSpec, true)).toEqual(expected);
    });

    it(`converts a ${DEEP_LENGTH}-node path without overflowing the call stack; the twin is equal or overflows`, () => {
      // under --jitless or a small stack the recursive twin itself may overflow (B8); the port must not
      const spec = pathSpec(DEEP_LENGTH, SPACING);
      const port = convert(createPhase, spec, false);
      expect(port).toHaveLength(DEEP_LENGTH);
      expect(port[0]).toBe('0:1');
      expect(port[DEEP_LENGTH - 1]).toBe(`${String(DEEP_LENGTH - 1)}:0`);
      let twin: string[] | null = null;
      try {
        twin = convert(createPhase, spec, true);
      } catch (e) {
        expect(e).toBeInstanceOf(RangeError);
      }
      if (twin !== null) {
        expect(twin).toEqual(port);
      }
    });

    it(`a path of MAX_STACK_DEPTH + 2 nodes throws RangeError(${STACK_OVERFLOW_MESSAGE})`, () => {
      // Java's StackOverflowError (checkStackDepth). The vector tree is acyclic (NaiveMinST builds it), so the walk
      // cannot run without end; the limit is only the depth check every loop of the AC6 ruling carries.
      expect(() => convert(createPhase, pathSpec(MAX_STACK_DEPTH + 2, SPACING), false)).toThrow(
        new RangeError(STACK_OVERFLOW_MESSAGE),
      );
    });
  },
);
