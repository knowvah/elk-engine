// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LGraph } from '../graph/LGraph.js';
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
