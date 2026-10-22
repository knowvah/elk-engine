// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { Random } from '../../../../java/util/Random.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';
import { createNode } from './RandomGraphGeneratorElements.js';
import {
  addEdgeLabel,
  connect,
  connected,
  connectConditional,
  connectRandomlyAndConditional,
  determineOutgoingEdges,
  type EdgeCondition,
  findNodeWithDFS,
  removeIsolatedNodes,
  retrievePort,
} from './RandomGraphGeneratorConnect.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 42n;
const MAX_LABEL_LENGTH = 49;

function makeGenerator(...settings: ReadonlyArray<readonly [IProperty<never>, unknown]>): RandomGraphGenerator {
  const options = new GeneratorOptions();
  for (const [property, value] of settings) {
    options.setProperty(property as IProperty<unknown>, value);
  }
  const gen = new RandomGraphGenerator(new Random(SEED));
  gen.options = options;
  return gen;
}

function setting<T>(property: IProperty<T>, value: T): readonly [IProperty<never>, unknown] {
  return [property as IProperty<never>, value];
}

/** A generator with ports enabled and port reuse switched off (`exact(0)` draws nothing). */
function portsGenerator(reuseChance = 0): RandomGraphGenerator {
  return makeGenerator(
    setting(GeneratorOptions.ENABLE_PORTS, true),
    setting(GeneratorOptions.USE_EXISTING_PORTS_CHANCE, RandVal.exact(reuseChance)),
  );
}

function twoNodes(gen: RandomGraphGenerator): [ElkNode, ElkNode, ElkNode] {
  const parent = ElkGraphUtil.createGraph();
  return [parent, createNode(gen, parent), createNode(gen, parent)];
}

describe('connect without ports', () => {
  it('connects the two nodes and contains the edge in their common parent', () => {
    const gen = makeGenerator();
    const [parent, a, b] = twoNodes(gen);

    const edge = connect(gen, a, b);

    expect(edge.getSources().toArray()).toEqual([a]);
    expect(edge.getTargets().toArray()).toEqual([b]);
    expect(edge.getContainingNode()).toBe(parent);
    expect(edge.getLabels().size()).toBe(0);
    expect(a.getOutgoingEdges().toArray()).toEqual([edge]);
    expect(b.getIncomingEdges().toArray()).toEqual([edge]);
  });

  it('resolves port shapes to their parent nodes', () => {
    const gen = makeGenerator();
    const [parent, a, b] = twoNodes(gen);
    const portA = ElkGraphUtil.createPort(a);
    const portB = ElkGraphUtil.createPort(b);

    const edge = connect(gen, portA, portB);

    expect(edge.getSources().toArray()).toEqual([a]);
    expect(edge.getTargets().toArray()).toEqual([b]);
    expect(edge.getContainingNode()).toBe(parent);
  });

  it('adds a blind-text label when edge labels are enabled', () => {
    const gen = makeGenerator(setting(GeneratorOptions.EDGE_LABELS, true));
    const [, a, b] = twoNodes(gen);

    const edge = connect(gen, a, b);

    expect(edge.getLabels().size()).toBe(1);
    const text = edge.getLabels().get(0).getText() as string;
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThanOrEqual(MAX_LABEL_LENGTH);
  });
});

describe('addEdgeLabel', () => {
  it('adds exactly one label with text to the edge', () => {
    const edge = ElkGraphUtil.createEdge(null);
    addEdgeLabel(edge);
    expect(edge.getLabels().size()).toBe(1);
    expect(edge.getLabels().get(0).getParent()).toBe(edge);
    expect((edge.getLabels().get(0).getText() as string).length).toBeGreaterThan(0);
  });
});

describe('connect with ports', () => {
  it('creates a source port on the source node and a target port on the target node, in that order', () => {
    const gen = portsGenerator();
    const [parent, a, b] = twoNodes(gen);

    const edge = connect(gen, a, b);

    const [portA] = a.getPorts().toArray();
    const [portB] = b.getPorts().toArray();
    expect([portA?.getIdentifier(), portB?.getIdentifier()]).toEqual(['p0', 'p1']);
    expect(edge.getSources().toArray()).toEqual([portA]);
    expect(edge.getTargets().toArray()).toEqual([portB]);
    expect(edge.getContainingNode()).toBe(parent);
  });

  it('keeps ports it is given and creates none', () => {
    const gen = portsGenerator();
    const [, a, b] = twoNodes(gen);
    const portA = ElkGraphUtil.createPort(a);
    const portB = ElkGraphUtil.createPort(b);

    const edge = connect(gen, portA, portB);

    expect(edge.getSources().toArray()).toEqual([portA]);
    expect(edge.getTargets().toArray()).toEqual([portB]);
    expect(gen.portLabelCounter).toBe(0);
    expect([a.getPorts().size(), b.getPorts().size()]).toEqual([1, 1]);
  });

  it('retrieves the target port only when the target is a node', () => {
    const gen = portsGenerator();
    const [, a, b] = twoNodes(gen);
    const portB = ElkGraphUtil.createPort(b);

    const edge = connect(gen, a, portB);

    expect(a.getPorts().size()).toBe(1);
    expect(b.getPorts().toArray()).toEqual([portB]);
    expect(edge.getTargets().toArray()).toEqual([portB]);
  });

  it('leaves a hypernode source without any shape (the port is created but not attached)', () => {
    const gen = portsGenerator();
    const [parent, a, b] = twoNodes(gen);
    a.setProperty(CoreOptions.HYPERNODE, true);

    const edge = connect(gen, a, b);

    expect(edge.getSources().isEmpty()).toBe(true);
    expect(edge.getTargets().toArray()).toEqual(b.getPorts().toArray());
    expect(a.getPorts().size()).toBe(1);
    expect(b.getPorts().size()).toBe(1);
    expect(edge.getContainingNode()).toBe(parent);
  });

  it('leaves a hypernode target without any shape and creates no port for it', () => {
    const gen = portsGenerator();
    const [, a, b] = twoNodes(gen);
    b.setProperty(CoreOptions.HYPERNODE, true);

    const edge = connect(gen, a, b);

    expect(edge.getSources().toArray()).toEqual(a.getPorts().toArray());
    expect(edge.getTargets().isEmpty()).toBe(true);
    expect(b.getPorts().size()).toBe(0);
  });

  it('fails in updateContainment when both ends are hypernodes (no incident shape)', () => {
    const gen = portsGenerator();
    const [, a, b] = twoNodes(gen);
    a.setProperty(CoreOptions.HYPERNODE, true);
    b.setProperty(CoreOptions.HYPERNODE, true);

    expect(() => connect(gen, a, b)).toThrow(IllegalArgumentException);
  });
});

describe('retrievePort', () => {
  /** Node `a` with port `p0` carrying one outgoing edge, as `connect` builds it. */
  function nodeWithOutgoingPort(reuseChance: number): [RandomGraphGenerator, ElkNode] {
    const gen = portsGenerator(0);
    const [, a, b] = twoNodes(gen);
    connect(gen, a, b);
    gen.set(GeneratorOptions.USE_EXISTING_PORTS_CHANCE, RandVal.exact(reuseChance));
    gen.random = new Random(SEED);
    return [gen, a];
  }

  it('reuses a port that has only outgoing edges for a source when the chance is exactly 1', () => {
    const [gen, a] = nodeWithOutgoingPort(1);
    const existing = a.getPorts().get(0);

    const port = retrievePort(gen, a, true);

    expect(port).toBe(existing);
    expect(a.getPorts().size()).toBe(1);
    // draws: nextFloat for the chance test, then randomInt(0, 0) = nextInt(1)
    const parallel = new Random(SEED);
    parallel.nextFloat();
    parallel.nextInt(1);
    expect(gen.random.nextInt()).toBe(parallel.nextInt());
  });

  it('creates a new port when the chance is 0 and draws nothing', () => {
    const [gen, a] = nodeWithOutgoingPort(0);
    const existing = a.getPorts().get(0);

    const port = retrievePort(gen, a, true);

    expect(port).not.toBe(existing);
    expect(a.getPorts().size()).toBe(2);
    expect(port.getIdentifier()).toBe('p2');
    expect(gen.random.nextInt()).toBe(new Random(SEED).nextInt());
  });

  it('does not reuse an outgoing-only port for a target', () => {
    const [gen, a] = nodeWithOutgoingPort(1);
    const existing = a.getPorts().get(0);

    const port = retrievePort(gen, a, false);

    expect(port).not.toBe(existing);
    expect(a.getPorts().size()).toBe(2);
  });

  it('does not reuse a port that has edges in both directions', () => {
    const [gen, a] = nodeWithOutgoingPort(1);
    const [, , other] = twoNodes(gen);
    const existing = a.getPorts().get(0);
    ElkGraphUtil.createSimpleEdge(other, existing);

    const port = retrievePort(gen, a, true);

    expect(port).not.toBe(existing);
    expect(a.getPorts().size()).toBe(2);
  });

  it('does not reuse a port without edges', () => {
    const gen = portsGenerator(1);
    const [, a] = twoNodes(gen);
    const unused = ElkGraphUtil.createPort(a);

    const port = retrievePort(gen, a, true);

    expect(port).not.toBe(unused);
    expect(a.getPorts().size()).toBe(2);
  });

  it('reuses the incoming-only port for a target and picks the candidate by randomInt', () => {
    const gen = portsGenerator(1);
    const [, a, b] = twoNodes(gen);
    const first = ElkGraphUtil.createPort(b);
    const second = ElkGraphUtil.createPort(b);
    ElkGraphUtil.createSimpleEdge(a, first);
    ElkGraphUtil.createSimpleEdge(a, second);
    const parallel = new Random(SEED);
    parallel.nextFloat();
    const index = parallel.nextInt(2);

    const port = retrievePort(gen, b, false);

    expect(port).toBe([first, second][index]);
    expect(b.getPorts().size()).toBe(2);
  });
});

const ALWAYS: EdgeCondition = { evaluate: () => true };
const NEVER: EdgeCondition = { evaluate: () => false };

function nodeList(gen: RandomGraphGenerator, count: number): [ElkNode, ElkNode[]] {
  const parent = ElkGraphUtil.createGraph();
  return [parent, Array.from({ length: count }, () => createNode(gen, parent))];
}

describe('connectConditional', () => {
  it('connects and reports true when the condition holds', () => {
    const gen = makeGenerator();
    const [, [a, b]] = nodeList(gen, 2) as [ElkNode, [ElkNode, ElkNode]];
    expect(connectConditional(gen, a, b, ALWAYS)).toBe(true);
    expect(a.getOutgoingEdges().size()).toBe(1);
  });

  it('does nothing and reports false when the condition fails', () => {
    const gen = makeGenerator();
    const [, [a, b]] = nodeList(gen, 2) as [ElkNode, [ElkNode, ElkNode]];
    expect(connectConditional(gen, a, b, NEVER)).toBe(false);
    expect(a.getOutgoingEdges().size()).toBe(0);
  });
});

describe('connectRandomlyAndConditional', () => {
  it('node form: a failing condition drains the buffer, one draw per rejected target', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 3);
    const parallel = new Random(SEED);
    // createNode drew nothing here (no hypernodes, no labels), so the generator shares the parallel stream
    const before = new Random(SEED);
    expect(connectRandomlyAndConditional(gen, nodes[0]!, nodes, 5, NEVER)).toBe(0);
    // draws: randomInt(0,2), randomInt(0,1), randomInt(0,0)
    before.nextInt(3);
    before.nextInt(2);
    before.nextInt(1);
    expect(gen.random.nextInt()).toBe(before.nextInt());
    expect(parallel).toBeDefined();
  });

  it('node form: stops after the requested number of edges', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 3);
    expect(connectRandomlyAndConditional(gen, nodes[0]!, nodes, 2, ALWAYS)).toBe(2);
    expect(nodes[0]!.getOutgoingEdges().size()).toBe(2);
  });

  it('node form: stops when the condition accepts only some targets', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 4);
    const onlyLast: EdgeCondition = { evaluate: (_source, target) => target === nodes[3] };
    expect(connectRandomlyAndConditional(gen, nodes[0]!, nodes, 3, onlyLast)).toBe(3);
    const targets = nodes[0]!
      .getOutgoingEdges()
      .toArray()
      .map((edge) => edge.getTargets().get(0));
    expect(targets).toEqual([nodes[3], nodes[3], nodes[3]]);
  });

  it('list form: connects every node as often as its entry says and sums the edges', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 3);
    expect(connectRandomlyAndConditional(gen, nodes, [1, 0, 2], ALWAYS)).toBe(3);
    expect(nodes.map((node) => node.getOutgoingEdges().size())).toEqual([1, 0, 2]);
  });
});

describe('determineOutgoingEdges', () => {
  it('count form: distributes m edges with one randomInt draw each', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 3);
    const parallel = new Random(SEED);
    const expected = [0, 0, 0];
    for (let c = 0; c < 7; c++) {
      expected[parallel.nextInt(3)]!++;
    }
    expect(determineOutgoingEdges(gen, nodes, 7)).toEqual(expected);
  });

  it('count form: m = 0 draws nothing', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 2);
    expect(determineOutgoingEdges(gen, nodes, 0)).toEqual([0, 0]);
    expect(gen.random.nextInt()).toBe(new Random(SEED).nextInt());
  });

  it('value form: one intVal per node', () => {
    const gen = makeGenerator();
    const [, nodes] = nodeList(gen, 3);
    expect(determineOutgoingEdges(gen, nodes, RandVal.exact(2))).toEqual([2, 2, 2]);
  });
});

describe('removeIsolatedNodes', () => {
  it('removes isolated leaves recursively and keeps connected nodes and nodes with children', () => {
    const gen = makeGenerator();
    const root = ElkGraphUtil.createGraph();
    const [a, b, lonely, holder] = [0, 1, 2, 3].map(() => createNode(gen, root)) as [
      ElkNode,
      ElkNode,
      ElkNode,
      ElkNode,
    ];
    const nestedLonely = createNode(gen, holder);
    const nestedLinked = createNode(gen, holder);
    const edge = connect(gen, a, b);
    connect(gen, nestedLinked, nestedLinked);

    removeIsolatedNodes(root);

    expect(root.getChildren().toArray()).toEqual([a, b, holder]);
    expect(holder.getChildren().toArray()).toEqual([nestedLinked]);
    expect(lonely.getParent()).toBeNull();
    expect(nestedLonely.getParent()).toBeNull();
    expect(edge.getContainingNode()).toBe(root);
  });
});

describe('findNodeWithDFS and connected', () => {
  it('follows a port target to the port parent node', () => {
    const gen = makeGenerator();
    const [, [a, b, c]] = nodeList(gen, 3) as [ElkNode, [ElkNode, ElkNode, ElkNode]];
    const port = ElkGraphUtil.createPort(b);
    const edge = ElkGraphUtil.createEdge(null);
    edge.getSources().add(a);
    edge.getTargets().add(port);
    ElkGraphUtil.updateContainment(edge);
    connect(gen, b, c);
    expect(findNodeWithDFS(a, b)).toBe(true);
    expect(findNodeWithDFS(a, c)).toBe(true);
    expect(findNodeWithDFS(a, a)).toBe(true);
    expect(findNodeWithDFS(c, a)).toBe(false);
  });

  it('follows node targets of edges built without ports', () => {
    const gen = makeGenerator();
    const [, [a, b, c]] = nodeList(gen, 3) as [ElkNode, [ElkNode, ElkNode, ElkNode]];
    connect(gen, a, b);
    connect(gen, b, c);
    expect(findNodeWithDFS(a, c)).toBe(true);
    expect(findNodeWithDFS(c, b)).toBe(false);
  });

  it('connected is symmetric over outgoing edges', () => {
    const gen = makeGenerator();
    const [, [a, b, c]] = nodeList(gen, 3) as [ElkNode, [ElkNode, ElkNode, ElkNode]];
    connect(gen, a, b);
    expect(connected(a, b)).toBe(true);
    expect(connected(b, a)).toBe(true);
    expect(connected(a, c)).toBe(false);
    expect(connected(c, a)).toBe(false);
  });
});
