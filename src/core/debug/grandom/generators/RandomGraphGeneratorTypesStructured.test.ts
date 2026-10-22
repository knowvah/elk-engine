// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { Random } from '../../../../java/util/Random.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';
import {
  generateBiconnectedGraph,
  generateBipartite,
  generateTree,
  generateTriconnectedGraph,
} from './RandomGraphGeneratorTypesStructured.js';

const SEEDS: readonly bigint[] = [1n, 7n, 42n, 99n, 12345n];
const HIERARCHY_SEED = 4n;
const HALF = 0.5;
const CERTAIN = 1;

function makeGenerator(seed: bigint, tweak?: (options: GeneratorOptions) => void): RandomGraphGenerator {
  const options = new GeneratorOptions();
  options.setProperty(GeneratorOptions.SELF_LOOPS, true);
  options.setProperty(GeneratorOptions.MULTI_EDGES, true);
  options.setProperty(GeneratorOptions.CYCLES, true);
  tweak?.(options);
  const gen = new RandomGraphGenerator(new Random(seed));
  gen.options = options;
  return gen;
}

function withHierarchy(options: GeneratorOptions): void {
  options.setProperty(GeneratorOptions.HIERARCHY_CHANCE, CERTAIN);
  options.setProperty(GeneratorOptions.HIERARCHY_NODES_FACTOR, HALF);
}

function children(parent: ElkNode): ElkNode[] {
  return parent.getChildren().toArray();
}

function edgeCount(nodes: readonly ElkNode[]): number {
  return nodes.reduce((sum, node) => sum + node.getOutgoingEdges().size(), 0);
}

function degree(node: ElkNode): number {
  return node.getOutgoingEdges().size() + node.getIncomingEdges().size();
}

describe('generateBipartite', () => {
  it('connects only the first partition to the second without cycles', () => {
    for (const seed of SEEDS) {
      const gen = makeGenerator(seed, (o) => {
        o.setProperty(GeneratorOptions.CYCLES, false);
        o.setProperty(GeneratorOptions.PARTITION_FRAC, RandVal.exact(HALF));
      });
      const parent = ElkGraphUtil.createGraph();
      generateBipartite(gen, parent, 6, 5, 0);
      const nodes = children(parent);
      expect(nodes).toHaveLength(6);
      expect(edgeCount(nodes)).toBe(5);
      const second = new Set(nodes.slice(3));
      for (const node of nodes.slice(0, 3)) {
        for (const edge of node.getOutgoingEdges()) {
          expect(second.has(edge.getTargets().get(0) as ElkNode)).toBe(true);
        }
      }
      expect(nodes.slice(3).every((node) => node.getOutgoingEdges().size() === 0)).toBe(true);
    }
  });

  it('allows both directions with cycles', () => {
    const gen = makeGenerator(42n, (o) => o.setProperty(GeneratorOptions.PARTITION_FRAC, RandVal.exact(HALF)));
    const parent = ElkGraphUtil.createGraph();
    generateBipartite(gen, parent, 6, 40, 0);
    const nodes = children(parent);
    expect(edgeCount(nodes)).toBe(40);
    expect(nodes.slice(3).some((node) => node.getOutgoingEdges().size() > 0)).toBe(true);
  });

  it('creates compound nodes below the hierarchy limit', () => {
    const gen = makeGenerator(HIERARCHY_SEED, withHierarchy);
    gen.maxHierarchyLevel = 1;
    const parent = ElkGraphUtil.createGraph();
    generateBipartite(gen, parent, 8, 6, 0);
    const nodes = children(parent);
    expect(nodes).toHaveLength(8);
    expect(nodes.every((node) => children(node).length >= 1)).toBe(true);
    expect(nodes.every((node) => children(node).every((child) => children(child).length === 0))).toBe(true);
  });
});

describe('generateTree', () => {
  it('creates n nodes and n - 1 edges, every non-root node with one parent', () => {
    for (const seed of SEEDS) {
      const gen = makeGenerator(seed);
      const parent = ElkGraphUtil.createGraph();
      generateTree(gen, parent, { n: 10, maxDeg: 0, maxWidth: 0, hierarchyLevel: 0 });
      const nodes = children(parent);
      expect(nodes).toHaveLength(10);
      expect(edgeCount(nodes)).toBe(9);
      expect(nodes.filter((node) => node.getIncomingEdges().size() === 0)).toEqual([nodes[0]]);
      expect(nodes.slice(1).every((node) => node.getIncomingEdges().size() === 1)).toBe(true);
    }
  });

  it('respects the maximum degree', () => {
    for (const seed of SEEDS) {
      const gen = makeGenerator(seed);
      const parent = ElkGraphUtil.createGraph();
      generateTree(gen, parent, { n: 30, maxDeg: 2, maxWidth: 0, hierarchyLevel: 0 });
      const nodes = children(parent);
      expect(nodes).toHaveLength(30);
      expect(Math.max(...nodes.map((node) => node.getOutgoingEdges().size()))).toBeLessThanOrEqual(2);
    }
  });

  it('respects the maximum width of every level', () => {
    for (const seed of SEEDS) {
      const gen = makeGenerator(seed);
      const parent = ElkGraphUtil.createGraph();
      generateTree(gen, parent, { n: 20, maxDeg: 0, maxWidth: 2, hierarchyLevel: 0 });
      const nodes = children(parent);
      const depths = new Map<ElkNode, number>([[nodes[0] as ElkNode, 0]]);
      for (const node of nodes.slice(1)) {
        const source = node.getIncomingEdges().get(0).getSources().get(0) as ElkNode;
        depths.set(node, (depths.get(source) as number) + 1);
      }
      const perLevel = new Map<number, number>();
      for (const depth of depths.values()) {
        perLevel.set(depth, (perLevel.get(depth) ?? 0) + 1);
      }
      expect(nodes).toHaveLength(20);
      expect(Math.max(...[...perLevel.entries()].filter(([depth]) => depth > 0).map(([, count]) => count))).toBe(2);
    }
  });

  it('creates compound trees below the hierarchy limit', () => {
    const gen = makeGenerator(42n, withHierarchy);
    gen.maxHierarchyLevel = 1;
    const parent = ElkGraphUtil.createGraph();
    generateTree(gen, parent, { n: 6, maxDeg: 0, maxWidth: 0, hierarchyLevel: 0 });
    expect(children(parent).every((node) => children(node).length >= 1)).toBe(true);
  });
});

describe('generateBiconnectedGraph', () => {
  it('creates n nodes and m edges, every node of degree at least two', () => {
    for (const seed of SEEDS) {
      const gen = makeGenerator(seed);
      const parent = ElkGraphUtil.createGraph();
      generateBiconnectedGraph(gen, parent, 8, 14, 0);
      const nodes = children(parent);
      expect(nodes).toHaveLength(8);
      expect(edgeCount(nodes)).toBe(14);
      expect(nodes.every((node) => degree(node) >= 2)).toBe(true);
    }
  });

  it('starts with a triangle and raises m to n', () => {
    const gen = makeGenerator(42n);
    const parent = ElkGraphUtil.createGraph();
    generateBiconnectedGraph(gen, parent, 1, 0, 0);
    const nodes = children(parent);
    expect(nodes).toHaveLength(3);
    expect(edgeCount(nodes)).toBe(3);
  });

  it('creates compound graphs below the hierarchy limit', () => {
    const gen = makeGenerator(42n, withHierarchy);
    gen.maxHierarchyLevel = 1;
    const parent = ElkGraphUtil.createGraph();
    generateBiconnectedGraph(gen, parent, 6, 9, 0);
    const nodes = children(parent);
    expect(nodes).toHaveLength(6);
    expect(nodes.every((node) => children(node).length >= 3)).toBe(true);
  });
});

describe('generateTriconnectedGraph', () => {
  it('creates n nodes, every node of degree at least three', () => {
    for (const seed of SEEDS) {
      const gen = makeGenerator(seed);
      const parent = ElkGraphUtil.createGraph();
      generateTriconnectedGraph(gen, parent, { n: 20, p1: Math.fround(0.3), p2: Math.fround(0.7), hierarchyLevel: 0 });
      const nodes = children(parent);
      expect(nodes).toHaveLength(20);
      expect(nodes.every((node) => degree(node) >= 3)).toBe(true);
    }
  });

  it('creates the 4-clique for fewer than four nodes', () => {
    const gen = makeGenerator(42n);
    const parent = ElkGraphUtil.createGraph();
    generateTriconnectedGraph(gen, parent, { n: 2, p1: HALF, p2: HALF, hierarchyLevel: 0 });
    const nodes = children(parent);
    expect(nodes).toHaveLength(4);
    expect(edgeCount(nodes)).toBe(6);
  });

  it('handles probabilities that never take the first branches', () => {
    const gen = makeGenerator(42n);
    const parent = ElkGraphUtil.createGraph();
    generateTriconnectedGraph(gen, parent, { n: 12, p1: 0, p2: 0, hierarchyLevel: 0 });
    expect(children(parent)).toHaveLength(12);
  });

  it('creates compound graphs below the hierarchy limit', () => {
    const gen = makeGenerator(42n, withHierarchy);
    gen.maxHierarchyLevel = 1;
    const parent = ElkGraphUtil.createGraph();
    generateTriconnectedGraph(gen, parent, { n: 8, p1: HALF, p2: HALF, hierarchyLevel: 0 });
    const nodes = children(parent);
    expect(nodes.filter((node) => children(node).length >= 4).length).toBeGreaterThan(0);
  });
});
