// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { ClassCastException } from '../../../../java/lang/ClassCastException.js';
import { Random } from '../../../../java/util/Random.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { RandVal } from './RandVal.js';
import { connect } from './RandomGraphGeneratorConnect.js';
import { createNode } from './RandomGraphGeneratorElements.js';
import { moveSource, moveTarget, split } from './RandomGraphGeneratorRewire.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 42n;

function makeGenerator(ports: boolean): RandomGraphGenerator {
  const options = new GeneratorOptions();
  const set = <T>(property: IProperty<T>, value: T): void => {
    options.setProperty(property, value);
  };
  set(GeneratorOptions.ENABLE_PORTS, ports);
  set(GeneratorOptions.USE_EXISTING_PORTS_CHANCE, RandVal.exact(0));
  const gen = new RandomGraphGenerator(new Random(SEED));
  gen.options = options;
  return gen;
}

interface Fixture {
  readonly gen: RandomGraphGenerator;
  readonly parent: ElkNode;
  readonly a: ElkNode;
  readonly b: ElkNode;
  readonly c: ElkNode;
}

function fixture(ports: boolean): Fixture {
  const gen = makeGenerator(ports);
  const parent = ElkGraphUtil.createGraph();
  return { gen, parent, a: createNode(gen, parent), b: createNode(gen, parent), c: createNode(gen, parent) };
}

function hyperedge(sources: ElkPort[] | ElkNode[], targets: ElkPort[] | ElkNode[]): ElkEdge {
  return ElkGraphUtil.createHyperedge(sources, targets);
}

describe('split', () => {
  it('turns a -> b into a -> m (the original edge) and m -> b inside the same container', () => {
    const { gen, parent, a, b } = fixture(false);
    const edge = connect(gen, a, b);

    const pair = split(gen, edge);

    const m = pair.getFirst() as ElkNode;
    const e2 = pair.getSecond() as ElkEdge;
    expect(e2).not.toBe(edge);
    expect(edge.getSources().toArray()).toEqual([a]);
    expect(edge.getTargets().toArray()).toEqual([m]);
    expect(e2.getSources().toArray()).toEqual([m]);
    expect(e2.getTargets().toArray()).toEqual([b]);
    expect(edge.getContainingNode()).toBe(parent);
    expect(e2.getContainingNode()).toBe(parent);
    expect(m.getParent()).toBe(parent);
    expect(m.getIdentifier()).toBe('n3');
  });

  it('moves every further target of a hyperedge to the new edge', () => {
    const { gen, parent, a, b, c } = fixture(false);
    const edge = hyperedge([a], [b, c]);
    edge.setContainingNode(parent);

    const [m, e2] = [split(gen, edge).getFirst() as ElkNode, edge];

    expect(e2.getTargets().toArray()).toEqual([m]);
    expect(m.getOutgoingEdges().size()).toBe(1);
    const newEdge = m.getOutgoingEdges().get(0);
    expect(newEdge.getTargets().toArray()).toEqual([b, c]);
  });

  it('fails with a ClassCastException when ports are enabled (moveTarget casts the old port to a node)', () => {
    const { gen, a, b } = fixture(true);
    const edge = connect(gen, a, b);

    expect(() => split(gen, edge)).toThrow(ClassCastException);
  });

  it('rejects an edge without a containing node like a Java NullPointerException', () => {
    const { gen, a, b } = fixture(false);
    const edge = ElkGraphUtil.createEdge(null);
    edge.getSources().add(a);
    edge.getTargets().add(b);
    edge.setContainingNode(null);

    expect(() => split(gen, edge)).toThrow(TypeError);
  });
});

describe('moveSource and moveTarget without ports', () => {
  it('replaces the source node and re-contains the edge', () => {
    const { gen, parent, a, b, c } = fixture(false);
    const edge = connect(gen, a, b);

    moveSource(gen, edge, a, c);

    expect(edge.getSources().toArray()).toEqual([c]);
    expect(edge.getTargets().toArray()).toEqual([b]);
    expect(a.getOutgoingEdges().isEmpty()).toBe(true);
    expect(edge.getContainingNode()).toBe(parent);
  });

  it('replaces the target node and re-contains the edge in the new common ancestor', () => {
    const { gen, parent, a, b, c } = fixture(false);
    const inner = createNode(gen, a);
    const edge = connect(gen, a, b);
    expect(edge.getContainingNode()).toBe(parent);

    moveTarget(gen, edge, b, inner);

    expect(edge.getTargets().toArray()).toEqual([inner]);
    expect(edge.getSources().toArray()).toEqual([a]);
    expect(edge.getContainingNode()).toBe(a);
    expect(c.getIncomingEdges().isEmpty()).toBe(true);
  });

  it('resolves old and new port shapes to their parent nodes', () => {
    const { gen, a, b, c } = fixture(false);
    const edge = connect(gen, a, b);
    const portA = ElkGraphUtil.createPort(a);
    const portC = ElkGraphUtil.createPort(c);

    moveSource(gen, edge, portA, portC);

    expect(edge.getSources().toArray()).toEqual([c]);
  });

  it('only adds the new end when the old one is not an end of the edge', () => {
    const { gen, a, b, c } = fixture(false);
    const edge = connect(gen, a, b);

    moveTarget(gen, edge, c, c);

    expect(edge.getTargets().toArray()).toEqual([b, c]);
  });

  it('moves a target given as ports', () => {
    const { gen, a, b, c } = fixture(false);
    const edge = connect(gen, a, b);

    moveTarget(gen, edge, ElkGraphUtil.createPort(b), ElkGraphUtil.createPort(c));

    expect(edge.getTargets().toArray()).toEqual([c]);
  });
});

describe('moveSource with ports', () => {
  it('casts the OLD node for the new end (Java quirk): the new source is a fresh port of the old node', () => {
    const { gen, a, b, c } = fixture(true);
    const edge = ElkGraphUtil.createSimpleEdge(b, c);
    edge.getSources().clear();

    moveSource(gen, edge, a, c);

    const [port] = a.getPorts().toArray();
    expect(a.getPorts().size()).toBe(1);
    expect(edge.getSources().toArray()).toEqual([port]);
    expect(c.getPorts().size()).toBe(0);
  });

  it('adds no end when the old node is a hypernode (isHypernode of the cast old node)', () => {
    const { gen, a, c } = fixture(true);
    a.setProperty(CoreOptions.HYPERNODE, true);
    const edge = ElkGraphUtil.createSimpleEdge(c, c);
    edge.getSources().clear();

    moveSource(gen, edge, a, c);

    expect(edge.getSources().isEmpty()).toBe(true);
    expect(a.getPorts().size()).toBe(1);
  });

  it('drops the old node ports from the sources, then stops iterating on the shrunken list', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const portB = ElkGraphUtil.createPort(b);
    const edge = hyperedge([portA, portB], [c]);

    moveSource(gen, edge, a, c);

    // portA is removed during iteration; the cursor then equals the new size, so portB is skipped
    const newPort = a.getPorts().get(1);
    expect(edge.getSources().toArray()).toEqual([portB, newPort]);
    expect(a.getPorts().toArray()).toContain(portA);
    expect(portA.getOutgoingEdges().isEmpty()).toBe(true);
  });

  it('keeps ports of other nodes among the sources', () => {
    const { gen, a, b, c } = fixture(true);
    const portB = ElkGraphUtil.createPort(b);
    const edge = hyperedge([c, portB], [c]);

    moveSource(gen, edge, a, c);

    expect(edge.getSources().toArray()).toEqual([c, portB, a.getPorts().get(0)]);
  });

  it('removes an old node port that is left with exactly one incoming edge', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const portB = ElkGraphUtil.createPort(b);
    const edge = hyperedge([portA, portB], [c]);
    ElkGraphUtil.createSimpleEdge(c, portA);

    moveSource(gen, edge, a, c);

    expect(a.getPorts().toArray()).not.toContain(portA);
  });

  it('removes an old source port with one incoming edge, then fails casting it to a node (Java quirk)', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const edge = ElkGraphUtil.createSimpleEdge(portA, b);
    ElkGraphUtil.createSimpleEdge(c, portA);

    expect(() => moveSource(gen, edge, portA, c)).toThrow(ClassCastException);

    expect(edge.getSources().isEmpty()).toBe(true);
    expect(a.getPorts().isEmpty()).toBe(true);
  });

  it('keeps an old source port that still has no other incoming edge', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const edge = ElkGraphUtil.createSimpleEdge(portA, b);

    expect(() => moveSource(gen, edge, portA, c)).toThrow(ClassCastException);

    expect(edge.getSources().isEmpty()).toBe(true);
    expect(a.getPorts().toArray()).toEqual([portA]);
  });

  it('takes a new port shape as the old port and fails dereferencing the missing new node', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const portC = ElkGraphUtil.createPort(c);
    const edge = ElkGraphUtil.createSimpleEdge(portA, b);

    expect(() => moveSource(gen, edge, portA, portC)).toThrow(TypeError);
  });

  it('fails with a ClassCastException when a new node meets an old port', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const edge = ElkGraphUtil.createSimpleEdge(portA, b);
    const other = ElkGraphUtil.createSimpleEdge(c, b);

    expect(() => moveSource(gen, other, portA, c)).toThrow(ClassCastException);
    expect(edge.getSources().toArray()).toEqual([portA]);
  });

  it('does nothing to an empty source list except adding the new end', () => {
    const { gen, a, b } = fixture(true);
    const edge = ElkGraphUtil.createSimpleEdge(b, b);
    edge.getSources().clear();

    moveSource(gen, edge, a, b);

    expect(edge.getSources().size()).toBe(1);
  });
});

describe('moveTarget with ports', () => {
  it('casts the OLD node for the new end (Java quirk): the new target is a fresh port of the old node', () => {
    const { gen, a, b, c } = fixture(true);
    const edge = ElkGraphUtil.createSimpleEdge(c, b);
    edge.getTargets().clear();

    moveTarget(gen, edge, a, c);

    expect(edge.getTargets().toArray()).toEqual(a.getPorts().toArray());
    expect(a.getPorts().size()).toBe(1);
  });

  it('drops the old node ports from the targets', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const portB = ElkGraphUtil.createPort(b);
    const edge = hyperedge([c], [portA, portB]);

    moveTarget(gen, edge, a, c);

    expect(edge.getTargets().toArray()).toEqual([portB, a.getPorts().get(1)]);
    expect(portA.getIncomingEdges().isEmpty()).toBe(true);
  });

  it('keeps ports of other nodes among the targets', () => {
    const { gen, a, b, c } = fixture(true);
    const portB = ElkGraphUtil.createPort(b);
    const edge = hyperedge([c], [c, portB]);

    moveTarget(gen, edge, a, c);

    expect(edge.getTargets().toArray()).toEqual([c, portB, a.getPorts().get(0)]);
  });

  it('removes an old node port left with one incoming edge from its node', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const portB = ElkGraphUtil.createPort(b);
    const edge = hyperedge([c], [portA, portB]);
    ElkGraphUtil.createSimpleEdge(c, portA);

    moveTarget(gen, edge, a, c);

    expect(a.getPorts().toArray()).not.toContain(portA);
  });

  it('removes an old target port with one other incoming edge, then fails casting it to a node', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const edge = ElkGraphUtil.createSimpleEdge(b, portA);
    ElkGraphUtil.createSimpleEdge(c, portA);

    expect(() => moveTarget(gen, edge, portA, c)).toThrow(ClassCastException);

    expect(edge.getTargets().isEmpty()).toBe(true);
    expect(a.getPorts().isEmpty()).toBe(true);
  });

  it('keeps an old target port without other edges', () => {
    const { gen, a, b, c } = fixture(true);
    const portA = ElkGraphUtil.createPort(a);
    const edge = ElkGraphUtil.createSimpleEdge(b, portA);
    const other: ElkPort = ElkGraphUtil.createPort(c);

    expect(() => moveTarget(gen, edge, portA, other)).toThrow(TypeError);

    expect(edge.getTargets().isEmpty()).toBe(true);
    expect(a.getPorts().toArray()).toEqual([portA]);
  });
});
