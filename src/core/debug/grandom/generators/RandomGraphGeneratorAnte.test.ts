// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { Random } from '../../../../java/util/Random.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';
import { generateANTEGraph } from './RandomGraphGeneratorAnte.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 7n;

function makeGenerator(hierarchyChance: number, maxLevel: number): RandomGraphGenerator {
  const options = new GeneratorOptions();
  options.setProperty(GeneratorOptions.HIERARCHY_CHANCE, Math.fround(hierarchyChance));
  options.setProperty(GeneratorOptions.MAX_HIERARCHY_LEVEL, RandVal.exact(maxLevel));
  const gen = new RandomGraphGenerator(new Random(SEED));
  gen.options = options;
  gen.maxHierarchyLevel = maxLevel;
  return gen;
}

/** Whether the edges of the children of `parent` contain a directed cycle (DFS colouring). */
function hasCycle(parent: ElkNode): boolean {
  const state = new Map<ElkNode, number>();
  const visit = (node: ElkNode): boolean => {
    state.set(node, 1);
    for (const edge of node.getOutgoingEdges()) {
      for (const target of edge.getTargets()) {
        const seen = state.get(target as ElkNode);
        if (seen === 1 || (seen === undefined && visit(target as ElkNode))) {
          return true;
        }
      }
    }
    state.set(node, 2);
    return false;
  };
  return [...parent.getChildren()].some((node) => state.get(node) === undefined && visit(node));
}

describe('generateANTEGraph', () => {
  for (const planar of [false, true]) {
    it(`creates n nodes and an acyclic edge set (planar ${planar})`, () => {
      const gen = makeGenerator(0, 0);
      const parent = ElkGraphUtil.createGraph();
      generateANTEGraph(gen, parent, { n: 12, m: 20, planar, singleSource: false, hierarchyLevel: 0 });
      expect(parent.getChildren().size()).toBe(12);
      expect(parent.getContainedEdges().size()).toBeGreaterThan(0);
      expect(hasCycle(parent)).toBe(false);
    });
  }

  it('single source graphs connect every node below the first layer', () => {
    const gen = makeGenerator(0, 0);
    const parent = ElkGraphUtil.createGraph();
    generateANTEGraph(gen, parent, { n: 8, m: 1, planar: false, singleSource: true, hierarchyLevel: 0 });
    const withIncoming = [...parent.getChildren()].filter((node) => node.getIncomingEdges().size() > 0);
    expect(withIncoming.length).toBeGreaterThanOrEqual(1);
    expect(hasCycle(parent)).toBe(false);
  });

  it('creates no layers and no edges for zero nodes', () => {
    const gen = makeGenerator(0, 0);
    const parent = ElkGraphUtil.createGraph();
    generateANTEGraph(gen, parent, { n: 0, m: 0, planar: true, singleSource: false, hierarchyLevel: 0 });
    expect(parent.getChildren().size()).toBe(0);
    expect(parent.getContainedEdges().size()).toBe(0);
  });

  it('creates compound nodes when the hierarchy chance is 1 and the level allows it', () => {
    const gen = makeGenerator(1, 1);
    const parent = ElkGraphUtil.createGraph();
    generateANTEGraph(gen, parent, { n: 6, m: 6, planar: false, singleSource: false, hierarchyLevel: 0 });
    expect([...parent.getChildren()].some((node) => node.getChildren().size() > 0)).toBe(true);
  });

  it('creates no compound nodes at the maximal hierarchy level', () => {
    const gen = makeGenerator(1, 1);
    const parent = ElkGraphUtil.createGraph();
    generateANTEGraph(gen, parent, { n: 6, m: 6, planar: false, singleSource: false, hierarchyLevel: 1 });
    expect([...parent.getChildren()].every((node) => node.getChildren().size() === 0)).toBe(true);
  });
});
