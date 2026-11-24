// SPDX-License-Identifier: EPL-2.0
// Fixtures shared by the explicit-stack proofs of the vertiflex phases (mission tree-recursion-depth, #67): seeded spec-driven
// vertiflex graphs, the specs themselves and the cycle and throw helpers every phase proof uses.
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { VertiFlexOptions } from '../../src/alg/vertiflex/options/VertiFlexOptions.js';
import { randomSpec, seededRandom, SHAPES, type TreeSpec } from './spore-tree-fixtures.js';
import { registerVertiFlex } from './vertiflex-replay-dump.js';

/** The vertical distance between the levels of a spec's graph. */
export const LAYER_STEP = 60;

const MAX_NODES = 40;
const SPEC_SEED_STRIDE = 7919;

/** The `seed`-th tree spec: a shape cycled by seed, 2 to `MAX_NODES` nodes. */
export function specOf(seed: number): TreeSpec {
  const rnd = seededRandom(seed * SPEC_SEED_STRIDE);
  return randomSpec(SHAPES[seed % SHAPES.length]!, 2 + Math.floor(rnd() * (MAX_NODES - 1)), rnd);
}

/** Depth of every node of a spec (parents precede children). */
export function depths(spec: TreeSpec): number[] {
  const result = [0];
  spec.parents.forEach((parent, i) => result.push(result[parent]! + 1));
  return result;
}

/**
 * A vertiflex graph of a spec. Mode 0: no constraints; 1: constraints that respect the ancestors; 2: random constraints
 * (some too low, so the layout throws); 3: as 1 with node model order considered. Every third node gets margins.
 */
export function buildGraph(spec: TreeSpec, mode: number, seed: number): ElkNode {
  registerVertiFlex();
  const rnd = seededRandom(seed);
  const graph = ElkGraphUtil.createGraph();
  graph.setIdentifier('root');
  graph.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, mode === 3);
  const level = depths(spec);
  const nodes = spec.rects.map(([, , w, h], i) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setIdentifier(`n${String(i)}`);
    node.setDimensions(w, h);
    if (i % 3 === 0) {
      node.setProperty(CoreOptions.MARGINS, new ElkMargin(rnd() * 8, rnd() * 8, rnd() * 8, rnd() * 8));
    }
    if (mode !== 0 && rnd() < 0.3) {
      const constraint = mode === 2 ? rnd() * LAYER_STEP * level[i]! : (level[i]! + rnd()) * LAYER_STEP * 2;
      node.setProperty(VertiFlexOptions.VERTICAL_CONSTRAINT, constraint);
    }
    return node;
  });
  spec.parents.forEach((parent, i) => {
    ElkGraphUtil.createSimpleEdge(nodes[parent]!, nodes[i + 1]!).setIdentifier(`e${String(i + 1)}`);
  });
  return graph;
}

/** The property keys of every child of a graph, in property-map order. */
export function propertyKeys(graph: ElkNode): string[][] {
  return [...graph.getChildren()].map((node) => [...node.getProperties()].map(([key]) => key.getId()));
}

/** Nodes a, b, c with edges a→b, b→c, c→b: a cycle reachable from the root a, so the Java recursion never ends. */
export function cycleRoot(): ElkNode {
  registerVertiFlex();
  const graph = ElkGraphUtil.createGraph();
  const [a, b, c] = ['a', 'b', 'c'].map((id) => {
    const node = ElkGraphUtil.createNode(graph);
    node.setIdentifier(id);
    node.setDimensions(10, 10);
    return node;
  });
  ElkGraphUtil.createSimpleEdge(a!, b!);
  ElkGraphUtil.createSimpleEdge(b!, c!);
  ElkGraphUtil.createSimpleEdge(c!, b!);
  return a!;
}

/** The error `run` throws (it must throw). */
export function thrown(run: () => void): Error {
  try {
    run();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a throw');
}
