// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LGraph } from '../graph/LGraph.js';
import { LNode } from '../graph/LNode.js';
import { LayeredOptions } from './LayeredOptions.js';
import { NodeFlexibility } from './NodeFlexibility.js';

const DECLARED = ['NONE', 'PORT_POSITION', 'NODE_SIZE_WHERE_SPACE_PERMITS', 'NODE_SIZE'] as const;

const { NONE, PORT_POSITION, NODE_SIZE_WHERE_SPACE_PERMITS, NODE_SIZE } = NodeFlexibility;

describe('NodeFlexibility', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(NodeFlexibility.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(NodeFlexibility.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(NodeFlexibility.values()[3]).toBe(NODE_SIZE);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(NODE_SIZE.toString()).toBe('NODE_SIZE');
    expect(NODE_SIZE.compareTo(NONE)).toBe(3);
    expect(NONE.compareTo(NODE_SIZE)).toBe(-3);
    expect(PORT_POSITION.compareTo(PORT_POSITION)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(NodeFlexibility.valueOf(name)).toBe(NodeFlexibility[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => NodeFlexibility.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => NodeFlexibility.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.NodeFlexibility.FOO',
    );
  });

  it('isFlexibleSize holds for NODE_SIZE only', () => {
    expect(NodeFlexibility.values().map((c) => c.isFlexibleSize())).toEqual([false, false, false, true]);
  });

  it('isFlexibleSizeWhereSpacePermits holds for the two size-flexible constants', () => {
    expect(NodeFlexibility.values().map((c) => c.isFlexibleSizeWhereSpacePermits())).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it('isFlexiblePorts holds for every constant but NONE', () => {
    expect(NodeFlexibility.values().map((c) => c.isFlexiblePorts())).toEqual([false, true, true, true]);
  });

  it('isAtLeast: NONE is at least every constant', () => {
    expect(NodeFlexibility.values().map((nf) => NONE.isAtLeast(nf))).toEqual([true, true, true, true]);
  });

  it('isAtLeast: PORT_POSITION answers nf.isFlexiblePorts()', () => {
    expect(NodeFlexibility.values().map((nf) => PORT_POSITION.isAtLeast(nf))).toEqual([false, true, true, true]);
  });

  it('isAtLeast: NODE_SIZE_WHERE_SPACE_PERMITS falls through to the PORT_POSITION arm (Java quirk)', () => {
    // Java: the arm computes nf.isFlexibleSizeWhereSpacePermits() without returning it and falls through, so the
    // answer is nf.isFlexiblePorts(): false only for NONE (a size-based answer would be false for PORT_POSITION too).
    expect(NodeFlexibility.values().map((nf) => NODE_SIZE_WHERE_SPACE_PERMITS.isAtLeast(nf))).toEqual([
      false,
      true,
      true,
      true,
    ]);
  });

  it('isAtLeast: NODE_SIZE answers nf.isFlexibleSize()', () => {
    expect(NodeFlexibility.values().map((nf) => NODE_SIZE.isAtLeast(nf))).toEqual([false, false, false, true]);
  });
});

describe('NodeFlexibility.getNodeFlexibility', () => {
  it('returns the flexibility set on the node', () => {
    const node = addNode(new LGraph());
    node.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY, PORT_POSITION);
    expect(NodeFlexibility.getNodeFlexibility(node)).toBe(PORT_POSITION);
  });

  it('falls back to the default set on the graph when the node sets none', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT, NODE_SIZE);
    const node = addNode(graph);
    expect(NodeFlexibility.getNodeFlexibility(node)).toBe(NODE_SIZE);
  });
});

describe('NodeFlexibility oracle row site/enums/NodeFlexibility', () => {
  // oracle: site/enums/NodeFlexibility
  it('site/enums/NodeFlexibility: constants in declaration order with name, ordinal and toString', () => {
    expect(NodeFlexibility.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['PORT_POSITION', 1, 'PORT_POSITION'],
      ['NODE_SIZE_WHERE_SPACE_PERMITS', 2, 'NODE_SIZE_WHERE_SPACE_PERMITS'],
      ['NODE_SIZE', 3, 'NODE_SIZE'],
    ]);
  });

  // oracle: site/enums/NodeFlexibility
  it('site/enums/NodeFlexibility: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => NodeFlexibility.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => NodeFlexibility.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.NodeFlexibility.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/NodeFlexibility
  it('site/enums/NodeFlexibility: compareTo first/last', () => {
    const values = NodeFlexibility.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-3);
    expect(last.compareTo(first)).toBe(3);
    expect(first.compareTo(first)).toBe(0);
  });

  // oracle: site/enums/NodeFlexibility
  it.each([
    ['NONE', 'NONE', true],
    ['NONE', 'PORT_POSITION', true],
    ['NONE', 'NODE_SIZE_WHERE_SPACE_PERMITS', true],
    ['NONE', 'NODE_SIZE', true],
    ['PORT_POSITION', 'NONE', false],
    ['PORT_POSITION', 'PORT_POSITION', true],
    ['PORT_POSITION', 'NODE_SIZE_WHERE_SPACE_PERMITS', true],
    ['PORT_POSITION', 'NODE_SIZE', true],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', 'NONE', false],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', 'PORT_POSITION', true],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', 'NODE_SIZE_WHERE_SPACE_PERMITS', true],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', 'NODE_SIZE', true],
    ['NODE_SIZE', 'NONE', false],
    ['NODE_SIZE', 'PORT_POSITION', false],
    ['NODE_SIZE', 'NODE_SIZE_WHERE_SPACE_PERMITS', false],
    ['NODE_SIZE', 'NODE_SIZE', true],
  ] as const)('site/enums/NodeFlexibility: %s.isAtLeast(%s) is %s', (a, b, expected) => {
    expect(NodeFlexibility.valueOf(a).isAtLeast(NodeFlexibility.valueOf(b))).toBe(expected);
  });

  // oracle: site/enums/NodeFlexibility
  it.each([
    ['NONE', false],
    ['PORT_POSITION', true],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', true],
    ['NODE_SIZE', true],
  ] as const)('site/enums/NodeFlexibility: %s.isFlexiblePorts() is %s', (constant, expected) => {
    expect(NodeFlexibility.valueOf(constant).isFlexiblePorts()).toBe(expected);
  });

  // oracle: site/enums/NodeFlexibility
  it.each([
    ['NONE', false],
    ['PORT_POSITION', false],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', false],
    ['NODE_SIZE', true],
  ] as const)('site/enums/NodeFlexibility: %s.isFlexibleSize() is %s', (constant, expected) => {
    expect(NodeFlexibility.valueOf(constant).isFlexibleSize()).toBe(expected);
  });

  // oracle: site/enums/NodeFlexibility
  it.each([
    ['NONE', false],
    ['PORT_POSITION', false],
    ['NODE_SIZE_WHERE_SPACE_PERMITS', true],
    ['NODE_SIZE', true],
  ] as const)('site/enums/NodeFlexibility: %s.isFlexibleSizeWhereSpacePermits() is %s', (constant, expected) => {
    expect(NodeFlexibility.valueOf(constant).isFlexibleSizeWhereSpacePermits()).toBe(expected);
  });
});

describe('NodeFlexibility.getNodeFlexibility site rows', () => {
  // oracle: site/nodeFlexibility/{none,port-position,node-size-where-space-permits,node-size}; NodeFlexibility.java:84
  it.each([
    ['none', 'NONE'],
    ['port-position', 'PORT_POSITION'],
    ['node-size-where-space-permits', 'NODE_SIZE_WHERE_SPACE_PERMITS'],
    ['node-size', 'NODE_SIZE'],
  ] as const)('site/nodeFlexibility/%s: option, graph default and unset graph', (_row, constant) => {
    const flexibility = NodeFlexibility.valueOf(constant);
    const graph = new LGraph();
    const nodeWith = addNode(graph);
    nodeWith.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY, flexibility);
    const nodeWithout = addNode(graph);
    expect(NodeFlexibility.getNodeFlexibility(nodeWith)).toBe(flexibility);
    expect(NodeFlexibility.getNodeFlexibility(nodeWithout)).toBe(NONE);
    graph.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT, flexibility);
    expect(NodeFlexibility.getNodeFlexibility(nodeWithout)).toBe(flexibility);
    expect(NodeFlexibility.getNodeFlexibility(nodeWith)).toBe(flexibility);
  });

  // oracle: site/nodeFlexibility/graph-without-default; NodeFlexibility.java:84
  it('site/nodeFlexibility/graph-without-default: a graph without the default yields NONE', () => {
    const node = addNode(new LGraph());
    expect(NodeFlexibility.getNodeFlexibility(node)).toBe(NONE);
  });

  // oracle: site/nodeFlexibility/graph-without-default; NodeFlexibility.java:86
  it('site/nodeFlexibility/graph-without-default: a node without graph answers its own option', () => {
    const loose = new LNode(null);
    loose.setProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY, PORT_POSITION);
    expect(NodeFlexibility.getNodeFlexibility(loose)).toBe(PORT_POSITION);
  });
});
