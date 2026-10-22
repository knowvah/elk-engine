// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { Random } from '../../../../java/util/Random.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';
import { generateAnyGraph } from './RandomGraphGeneratorTypes.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 42n;

function makeGenerator(): RandomGraphGenerator {
  const options = new GeneratorOptions();
  options.setProperty(GeneratorOptions.SELF_LOOPS, true);
  options.setProperty(GeneratorOptions.MULTI_EDGES, true);
  options.setProperty(GeneratorOptions.CYCLES, true);
  const gen = new RandomGraphGenerator(new Random(SEED));
  gen.options = options;
  return gen;
}

describe('generateAnyGraph', () => {
  it('edge-count overload creates n nodes and m edges', () => {
    const gen = makeGenerator();
    const parent = ElkGraphUtil.createGraph();
    const nodes = generateAnyGraph(gen, parent, 4, 6, 0);
    expect(nodes).toHaveLength(4);
    expect(parent.getChildren().toArray()).toEqual(nodes);
    expect(nodes.reduce((sum, node) => sum + node.getOutgoingEdges().size(), 0)).toBe(6);
  });

  it('outgoing-edges overload creates OUTGOING_EDGES edges per node', () => {
    const gen = makeGenerator();
    gen.set(GeneratorOptions.OUTGOING_EDGES, RandVal.exact(2));
    const parent = ElkGraphUtil.createGraph();
    const nodes = generateAnyGraph(gen, parent, 3, 0);
    expect(nodes.map((node) => node.getOutgoingEdges().size())).toEqual([2, 2, 2]);
  });

  it('skips the connection step with CROSS_HIERARCHY_EDGES in either overload', () => {
    const gen = makeGenerator();
    gen.set(GeneratorOptions.CROSS_HIERARCHY_EDGES, true);
    const parent = ElkGraphUtil.createGraph();
    expect(generateAnyGraph(gen, parent, 3, 5, 0).every((node) => node.getOutgoingEdges().size() === 0)).toBe(true);
    expect(generateAnyGraph(gen, parent, 3, 0).every((node) => node.getOutgoingEdges().size() === 0)).toBe(true);
  });

  it('gives up after MAX_ITER rounds when the condition never admits an edge', () => {
    const gen = makeGenerator();
    gen.set(GeneratorOptions.SELF_LOOPS, false);
    const parent = ElkGraphUtil.createGraph();
    // one node can only connect to itself
    const nodes = generateAnyGraph(gen, parent, 1, 3, 0);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.getOutgoingEdges().size()).toBe(0);
  });
});
