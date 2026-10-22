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
import { addEdgeLabel, connect, retrievePort } from './RandomGraphGeneratorConnect.js';
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
