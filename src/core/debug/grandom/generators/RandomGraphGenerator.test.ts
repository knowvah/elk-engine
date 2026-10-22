// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { Random } from '../../../../java/util/Random.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { GRandomText } from '../GRandomText.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { GraphType } from './GraphType.js';
import { RandVal } from './RandVal.js';
import { connect } from './RandomGraphGeneratorConnect.js';
import { nonNull, RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 42n;

describe('RandomGraphGenerator', () => {
  it('keeps the Java constants and starts with zeroed counters and no options', () => {
    const random = new Random(SEED);
    const gen = new RandomGraphGenerator(random);
    expect(RandomGraphGenerator.PORT_SEPARATION).toBe(7);
    expect(RandomGraphGenerator.MAX_ITER).toBe(12);
    expect(gen.random).toBe(random);
    expect(gen.options).toBeNull();
    expect([gen.nodeLabelCounter, gen.portLabelCounter, gen.maxHierarchyLevel]).toEqual([0, 0, 0]);
  });

  it('randomInt is from + nextInt(to - from + 1), inclusive of both bounds', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    const parallel = new Random(SEED);
    const expected = [5 + parallel.nextInt(6), 5 + parallel.nextInt(6), 5 + parallel.nextInt(6)];
    expect([gen.randomInt(5, 10), gen.randomInt(5, 10), gen.randomInt(5, 10)]).toEqual(expected);
    const single = gen.randomInt(3, 3);
    expect(single).toBe(3);
  });

  it('randomInt over a degenerate range still consumes one draw', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    gen.randomInt(0, 0);
    const parallel = new Random(SEED);
    parallel.nextInt(1);
    expect(gen.random.nextInt()).toBe(parallel.nextInt());
  });

  it('isHypernode reads the HYPERNODE property, false by default', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(RandomGraphGenerator.isHypernode(node)).toBe(false);
    node.setProperty(CoreOptions.HYPERNODE, true);
    expect(RandomGraphGenerator.isHypernode(node)).toBe(true);
  });

  it('get and set go through the options holder', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    gen.options = new GeneratorOptions();
    expect(gen.get(GeneratorOptions.ENABLE_PORTS)).toBe(false);
    gen.set(GeneratorOptions.ENABLE_PORTS, true);
    expect(gen.get(GeneratorOptions.ENABLE_PORTS)).toBe(true);
    expect(gen.options.getProperty(GeneratorOptions.ENABLE_PORTS)).toBe(true);
  });

  it('get and set without options fail like a Java NullPointerException (TypeError)', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    expect(() => gen.get(GeneratorOptions.ENABLE_PORTS)).toThrow(TypeError);
    expect(() => gen.set(GeneratorOptions.ENABLE_PORTS, true)).toThrow(TypeError);
  });

  it('nonNull passes a value through and rejects null with a TypeError', () => {
    expect(nonNull('x')).toBe('x');
    expect(nonNull(0)).toBe(0);
    expect(() => nonNull(null)).toThrow(TypeError);
  });
});

type Setting = readonly [IProperty<never>, unknown];

function setting<T>(property: IProperty<T>, value: T): Setting {
  return [property as IProperty<never>, value];
}

function generatorWith(...settings: readonly Setting[]): RandomGraphGenerator {
  const options = new GeneratorOptions();
  for (const [property, value] of settings) {
    options.setProperty(property as IProperty<unknown>, value);
  }
  const gen = new RandomGraphGenerator(new Random(SEED));
  gen.options = options;
  return gen;
}

/** Every setting that lets the connection step always succeed. */
const ANY_EDGE: readonly Setting[] = [
  setting(GeneratorOptions.SELF_LOOPS, true),
  setting(GeneratorOptions.MULTI_EDGES, true),
  setting(GeneratorOptions.CYCLES, true),
];

function descendants(node: ElkNode): ElkNode[] {
  return node
    .getChildren()
    .toArray()
    .flatMap((child) => [child, ...descendants(child)]);
}

function countEdges(root: ElkNode): number {
  return [root, ...descendants(root)].reduce((sum, node) => sum + node.getOutgoingEdges().size(), 0);
}

const HIERARCHY: readonly Setting[] = [
  setting(GeneratorOptions.ENABLE_HIERARCHY, true),
  setting(GeneratorOptions.HIERARCHY_CHANCE, Math.fround(1)),
  setting(GeneratorOptions.MAX_HIERARCHY_LEVEL, RandVal.exact(2)),
  setting(GeneratorOptions.NUMBER_OF_NODES, RandVal.exact(3)),
];

describe('generate(Configuration)', () => {
  const parseConfig = (text: string) => GRandomText.parse(text).model!.getConfigs()[0]!;

  it('creates max(1, samples) graphs from one parsed configuration', () => {
    const zero = new RandomGraphGenerator(new Random(SEED)).generate(
      parseConfig('generate 0 graphs { nodes = 4 edges total = 2 seed = 3 }'),
    );
    const three = new RandomGraphGenerator(new Random(SEED)).generate(
      parseConfig('generate 3 graphs { nodes = 4 edges total = 2 seed = 3 }'),
    );
    expect(zero).toHaveLength(1);
    expect(three).toHaveLength(3);
    expect(three.map((graph) => graph.getChildren().size())).toEqual([4, 4, 4]);
  });

  it('seeds the generator from the configuration seed and replaces its random', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    const config = parseConfig('generate 1 graphs { nodes = 4 seed = 77 }');
    const seeded = gen.randomGeneratorFromConfig(config);
    expect(seeded.nextInt()).toBe(new Random(77n).nextInt());
    gen.generate(config);
    expect(gen.random).not.toBe(seeded);
  });

  it('draws an unseeded generator when the configuration has no seed', () => {
    const config = parseConfig('generate 1 graphs { nodes = 4 }');
    expect(config.getSeed()).toBeNull();
    const gen = new RandomGraphGenerator(new Random(SEED));
    expect(gen.randomGeneratorFromConfig(config)).toBeInstanceOf(Random);
    expect(gen.generate(config)[0]!.getChildren().size()).toBe(4);
  });
});

describe('generate(GeneratorOptions) and makeGraph', () => {
  it('resets the label counters and builds a flat graph by default', () => {
    const gen = generatorWith(setting(GeneratorOptions.NUMBER_OF_NODES, RandVal.exact(5)));
    gen.nodeLabelCounter = 9;
    gen.portLabelCounter = 9;
    const graph = gen.generate(gen.options!);
    // reset to 0 before generating, then one increment per created node (9 would remain without the reset)
    expect([gen.nodeLabelCounter, gen.portLabelCounter]).toEqual([5, 0]);
    expect(graph.getChildren().size()).toBe(5);
  });

  it('switches hierarchy off without ENABLE_HIERARCHY', () => {
    const gen = generatorWith(
      setting(GeneratorOptions.HIERARCHY_CHANCE, Math.fround(1)),
      setting(GeneratorOptions.CROSS_HIERARCHY_EDGES, true),
    );
    gen.makeGraph(ElkGraphUtil.createGraph());
    expect(gen.get(GeneratorOptions.HIERARCHY_CHANCE)).toBe(0);
    expect(gen.get(GeneratorOptions.CROSS_HIERARCHY_EDGES)).toBe(false);
  });

  it('rejects an unknown edge determination and an unknown graph type', () => {
    const edgeGen = generatorWith(setting(GeneratorOptions.EDGE_DETERMINATION, {} as EdgeDetermination));
    expect(() => edgeGen.makeGraph(ElkGraphUtil.createGraph())).toThrow(
      new IllegalArgumentException('Selected edge determination is not supported.'),
    );
    const typeGen = generatorWith(setting(GeneratorOptions.GRAPH_TYPE, {} as GraphType));
    expect(() => typeGen.makeGraph(ElkGraphUtil.createGraph())).toThrow(
      new IllegalArgumentException('Selected graph generator is not supported.'),
    );
  });

  it.each([
    [GraphType.BIPARTITE, 'generateBipartite'],
    [GraphType.TREE, 'generateTree'],
    [GraphType.BICONNECTED, 'generateBiconnectedGraph'],
    [GraphType.TRICONNECTED, 'generateTriconnectedGraph'],
    [GraphType.ACYCLIC_NO_TRANSITIVE_EDGES, 'generateANTEGraph'],
  ])('a graph type that is not ported (%s) throws the placeholder error naming %s', (type, method) => {
    const gen = generatorWith(setting(GeneratorOptions.GRAPH_TYPE, type));
    expect(() => gen.makeGraph(ElkGraphUtil.createGraph())).toThrow(`GRANDOM_PLACEHOLDER: ${method} is not ported yet`);
  });

  it('the triconnected case draws p1 before the placeholder throws', () => {
    const gen = generatorWith(setting(GeneratorOptions.GRAPH_TYPE, GraphType.TRICONNECTED));
    const parallel = new Random(SEED);
    expect(() => gen.makeGraph(ElkGraphUtil.createGraph())).toThrow(/GRANDOM_PLACEHOLDER/);
    parallel.nextFloat();
    expect(gen.random.nextInt()).toBe(parallel.nextInt());
  });

  it('removes isolated nodes when asked to', () => {
    const gen = generatorWith(
      setting(GeneratorOptions.NUMBER_OF_NODES, RandVal.exact(8)),
      setting(GeneratorOptions.EDGES_ABSOLUTE, RandVal.exact(1)),
      setting(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.ABSOLUTE),
      setting(GeneratorOptions.ISOLATED_NODES, false),
      ...ANY_EDGE,
    );
    const graph = gen.makeGraph(ElkGraphUtil.createGraph());
    expect(graph.getChildren().size()).toBeLessThanOrEqual(2);
    expect(countEdges(graph)).toBe(1);
  });
});

describe('hierarchy through generateCustomGraph', () => {
  it('the outgoing-edges overload recurses through the Java four-argument binding', () => {
    // Java quirk: the recursive call binds to (parent, n, m, hierarchyLevel) with m = level + 1 and
    // hierarchyLevel = maxHierarchyLevel, so a child level has one edge per compound node and stops there.
    const gen = generatorWith(
      ...HIERARCHY,
      setting(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.OUTGOING),
      setting(GeneratorOptions.OUTGOING_EDGES, RandVal.exact(0)),
      ...ANY_EDGE,
    );
    const graph = gen.generate(gen.options!);
    const tops = graph.getChildren().toArray();
    expect(tops).toHaveLength(3);
    for (const top of tops) {
      expect(top.getChildren().size()).toBe(1);
      const child = top.getChildren().get(0);
      expect(child.getChildren().size()).toBe(0);
      expect(child.getOutgoingEdges().size()).toBe(1);
    }
  });

  it('the edge-count overload recurses with scaled node and edge counts', () => {
    const gen = generatorWith(
      ...HIERARCHY,
      setting(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.ABSOLUTE),
      setting(GeneratorOptions.EDGES_ABSOLUTE, RandVal.exact(4)),
      ...ANY_EDGE,
    );
    const graph = gen.generate(gen.options!);
    const tops = graph.getChildren().toArray();
    expect(tops).toHaveLength(3);
    const children = tops.flatMap((top) => top.getChildren().toArray());
    expect(children.length).toBeGreaterThanOrEqual(3);
    expect(children.flatMap((child) => child.getChildren().toArray()).length).toBeGreaterThanOrEqual(3);
    expect(descendants(graph).every((node) => node.getChildren().size() === 0 || node.getParent() !== null)).toBe(true);
  });

  it('cross-hierarchy edges are created over all generated nodes (edge-count form)', () => {
    const gen = generatorWith(
      ...HIERARCHY,
      setting(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.ABSOLUTE),
      setting(GeneratorOptions.EDGES_ABSOLUTE, RandVal.exact(4)),
      setting(GeneratorOptions.CROSS_HIERARCHY_EDGES, true),
      ...ANY_EDGE,
    );
    const graph = gen.generate(gen.options!);
    expect(countEdges(graph)).toBe(4);
  });

  it('cross-hierarchy edges are created over all generated nodes (outgoing form)', () => {
    const gen = generatorWith(
      ...HIERARCHY,
      setting(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.OUTGOING),
      setting(GeneratorOptions.OUTGOING_EDGES, RandVal.exact(2)),
      setting(GeneratorOptions.CROSS_HIERARCHY_EDGES, true),
      ...ANY_EDGE,
    );
    const graph = gen.generate(gen.options!);
    // no node had edges created within its own level; the cross step makes 2 per node of the flat list
    expect(countEdges(graph)).toBe(2 * descendants(graph).length);
  });
});

describe('small hierarchy', () => {
  const SMALL: readonly Setting[] = [
    setting(GeneratorOptions.SMALL_HIERARCHY, true),
    setting(GeneratorOptions.NUMBER_OF_NODES, RandVal.exact(3)),
    setting(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.ABSOLUTE),
    setting(GeneratorOptions.EDGES_ABSOLUTE, RandVal.exact(3)),
    setting(GeneratorOptions.NUMBER_HIERARCHICAL_NODES, RandVal.exact(2)),
    ...ANY_EDGE,
  ];

  it('adds hierarchical nodes level by level and connects across levels by CROSS_HIER', () => {
    const gen = generatorWith(
      ...SMALL,
      setting(GeneratorOptions.MAX_HIERARCHY_LEVEL, RandVal.exact(2)),
      setting(GeneratorOptions.CROSS_HIER, RandVal.exact(4)),
    );
    const graph = gen.generate(gen.options!);
    // 3 generated + 2 hierarchical nodes at the root; each hierarchical node holds 3 generated nodes
    expect(graph.getChildren().size()).toBe(5);
    expect(descendants(graph)).toHaveLength(5 + 6);
    // 3 edges per generated level (3 levels) plus 4 across levels
    expect(countEdges(graph)).toBe(9 + 4);
  });

  it('derives the number of cross-hierarchy edges from EXACT_RELATIVE_HIER when set', () => {
    const gen = generatorWith(
      ...SMALL,
      setting(GeneratorOptions.MAX_HIERARCHY_LEVEL, RandVal.exact(2)),
      setting(GeneratorOptions.CROSS_HIER, RandVal.exact(99)),
      setting(GeneratorOptions.EXACT_RELATIVE_HIER, RandVal.exact(0.5)),
    );
    const graph = gen.generate(gen.options!);
    // 9 distinct edges, (int) (9 * 0.5) = 4 more
    expect(countEdges(graph)).toBe(9 + 4);
  });

  it('a single level has nothing to connect across', () => {
    const gen = generatorWith(
      ...SMALL,
      setting(GeneratorOptions.MAX_HIERARCHY_LEVEL, RandVal.exact(1)),
      setting(GeneratorOptions.CROSS_HIER, RandVal.exact(5)),
    );
    const graph = gen.generate(gen.options!);
    expect(graph.getChildren().size()).toBe(3);
    expect(countEdges(graph)).toBe(3);
  });
});

describe('sample', () => {
  const gen = new RandomGraphGenerator(new Random(SEED));

  it('returns a shuffled copy truncated to the requested number', () => {
    const list = [1, 2, 3, 4, 5];
    const picked = gen.sample(list, 2);
    expect(picked).toHaveLength(2);
    expect(new Set(picked).size).toBe(2);
    expect(picked.every((value) => list.includes(value))).toBe(true);
    expect(list).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns the whole shuffled copy when more elements are requested than exist', () => {
    const list = [1, 2, 3];
    expect([...gen.sample(list, 7)].sort()).toEqual([1, 2, 3]);
  });
});

describe('basicCondition', () => {
  function nodes(_gen: RandomGraphGenerator): [ElkNode, ElkNode, ElkNode] {
    const parent = ElkGraphUtil.createGraph();
    return [ElkGraphUtil.createNode(parent), ElkGraphUtil.createNode(parent), ElkGraphUtil.createNode(parent)];
  }

  it('rejects a self-loop unless SELF_LOOPS is set', () => {
    const gen = generatorWith(setting(GeneratorOptions.SELF_LOOPS, false), setting(GeneratorOptions.CYCLES, true));
    const [a] = nodes(gen);
    expect(gen.basicCondition.evaluate(a, a)).toBe(false);
    gen.set(GeneratorOptions.SELF_LOOPS, true);
    expect(gen.basicCondition.evaluate(a, a)).toBe(true);
  });

  it('rejects a second connection between two nodes unless MULTI_EDGES is set', () => {
    const gen = generatorWith(setting(GeneratorOptions.MULTI_EDGES, false), setting(GeneratorOptions.CYCLES, true));
    const [a, b, c] = nodes(gen);
    expect(gen.basicCondition.evaluate(a, b)).toBe(true);
    connect(gen, a, b);
    expect(gen.basicCondition.evaluate(a, b)).toBe(false);
    expect(gen.basicCondition.evaluate(b, a)).toBe(false);
    expect(gen.basicCondition.evaluate(a, c)).toBe(true);
    gen.set(GeneratorOptions.MULTI_EDGES, true);
    expect(gen.basicCondition.evaluate(a, b)).toBe(true);
  });

  it('rejects an edge that closes a cycle unless CYCLES is set', () => {
    const gen = generatorWith(setting(GeneratorOptions.MULTI_EDGES, true), setting(GeneratorOptions.CYCLES, false));
    const [a, b, c] = nodes(gen);
    connect(gen, a, b);
    connect(gen, b, c);
    expect(gen.basicCondition.evaluate(c, a)).toBe(false);
    expect(gen.basicCondition.evaluate(a, c)).toBe(true);
    gen.set(GeneratorOptions.CYCLES, true);
    expect(gen.basicCondition.evaluate(c, a)).toBe(true);
  });
});

describe('small hierarchy without nodes', () => {
  it('records no atomic level for a graph without children', () => {
    const gen = generatorWith(
      setting(GeneratorOptions.SMALL_HIERARCHY, true),
      setting(GeneratorOptions.NUMBER_OF_NODES, RandVal.exact(0)),
      setting(GeneratorOptions.MAX_HIERARCHY_LEVEL, RandVal.exact(2)),
      setting(GeneratorOptions.NUMBER_HIERARCHICAL_NODES, RandVal.exact(0)),
    );
    expect(gen.addHierarchicalNodes(ElkGraphUtil.createGraph())).toEqual([]);
  });
});
