// SPDX-License-Identifier: EPL-2.0
// Replays the `triangulation` section of test/golden/refs/java/alg-common.json (recorded by
// tools/vectors/AlgCommonVectors.java): the BowyerWatsonTriangulation edge iteration order (V6, V7) and the
// NaiveMinST tree structure and child order (V8), exactly as the JVM produced them.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KVector } from '../../core/math/KVector.js';
import { longBitsToDouble } from '../../java/lang/JavaDouble.js';
import { BowyerWatsonTriangulation } from './BowyerWatsonTriangulation.js';
import type { ICostFunction } from './ICostFunction.js';
import { NaiveMinST } from './NaiveMinST.js';
import type { TEdge } from './TEdge.js';
import type { Tree } from './Tree.js';

/** `[vertexIndex, childT...]` in child order. */
type NestedTree = [number, ...NestedTree[]];

interface TriangulationRow {
  readonly name: string;
  readonly vertices: [string, string][];
  readonly root: number;
  readonly error?: string;
  readonly edges: [number, number][];
  readonly trees: Record<CostName, NestedTree>;
  readonly orderSensitive: Record<CostName, boolean>;
}

type CostName = 'euclidean' | 'constant';

const VECTORS_URL = new URL('../../../test/golden/refs/java/alg-common.json', import.meta.url);
const vectors = JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { triangulation: TriangulationRow[] };

const EXPECTED_ROWS = 22;
const CONSTANT_COST_VALUE = 1.0;

/** The recorder's cost functions (`AlgCommonVectors.java:130-131`). */
const COSTS: readonly (readonly [CostName, ICostFunction])[] = [
  ['euclidean', { cost: (e) => e.u.distance(e.v) }],
  ['constant', { cost: () => CONSTANT_COST_VALUE }],
];

const decode = (hex: string): number => longBitsToDouble(BigInt.asIntN(64, BigInt('0x' + hex)));
const keyOf = (v: KVector): string => `${v.x},${v.y}`;

/** The recorder's vertex index: the first input vertex with equal coordinates (`putIfAbsent`). */
function indexVertices(vs: readonly KVector[]): Map<string, number> {
  const index = new Map<string, number>();
  vs.forEach((v, i) => {
    if (!index.has(keyOf(v))) {
      index.set(keyOf(v), i);
    }
  });
  return index;
}

function nest(tree: Tree<KVector>, index: Map<string, number>): NestedTree {
  const id = index.get(keyOf(tree.node));
  if (id === undefined) {
    throw new Error(`tree node ${keyOf(tree.node)} is not an input vertex`);
  }
  return [id, ...tree.children.map((child) => nest(child, index))];
}

describe('alg-common.json triangulation replay', () => {
  it('contains the recorded scenarios, none of which throw', () => {
    expect(vectors.triangulation.length).toBe(EXPECTED_ROWS);
    expect(vectors.triangulation.filter((row) => row.error !== undefined)).toEqual([]);
  });

  describe.each(vectors.triangulation.map((row) => [row.name, row] as const))('%s', (_name, row) => {
    const vs = row.vertices.map(([x, y]) => new KVector(decode(x), decode(y)));
    const index = indexVertices(vs);
    const edges = BowyerWatsonTriangulation.triangulate(vs, null);
    const edgeList: TEdge[] = [...edges];

    it('triangulate yields the JVM edge sequence', () => {
      const actual = edgeList.map((e) => [index.get(keyOf(e.u)), index.get(keyOf(e.v))]);
      expect(actual).toEqual(row.edges);
    });

    it.each(COSTS)('createSpanningTree with %s cost yields the JVM tree and child order', (name, cost) => {
      const root = vs[row.root] as KVector;
      expect(nest(NaiveMinST.createSpanningTree(edges, root, cost), index)).toEqual(row.trees[name]);
      expect(nest(NaiveMinST.createSpanningTree(edges, root, cost, null), index)).toEqual(row.trees[name]);

      const viaReversed = nest(NaiveMinST.createSpanningTree([...edgeList].reverse(), root, cost), index);
      expect(JSON.stringify(viaReversed) !== JSON.stringify(row.trees[name])).toBe(row.orderSensitive[name]);
    });
  });
});
