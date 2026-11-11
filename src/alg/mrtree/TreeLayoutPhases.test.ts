// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { DFSTreeifyer } from './p1treeify/DFSTreeifyer.js';
import { NodeOrderer } from './p2order/NodeOrderer.js';
import { NodePlacer } from './p3place/NodePlacer.js';
import { EdgeRouter } from './p4route/EdgeRouter.js';
import { TreeLayoutPhases } from './TreeLayoutPhases.js';

const DECLARED = ['P1_TREEIFICATION', 'P2_NODE_ORDERING', 'P3_NODE_PLACEMENT', 'P4_EDGE_ROUTING'] as const;

describe('TreeLayoutPhases', () => {
  it('declares the constants in Java order (TreeLayoutPhases.java:30-37) with matching ordinals and names', () => {
    expect(TreeLayoutPhases.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(TreeLayoutPhases.values()[3]).toBe(TreeLayoutPhases.P4_EDGE_ROUTING);
  });

  it('compareTo orders by ordinal', () => {
    expect(TreeLayoutPhases.P4_EDGE_ROUTING.compareTo(TreeLayoutPhases.P1_TREEIFICATION)).toBe(3);
    expect(TreeLayoutPhases.P1_TREEIFICATION.compareTo(TreeLayoutPhases.P4_EDGE_ROUTING)).toBe(-3);
    expect(TreeLayoutPhases.P2_NODE_ORDERING.compareTo(TreeLayoutPhases.P2_NODE_ORDERING)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(TreeLayoutPhases.valueOf(name)).toBe(TreeLayoutPhases[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => TreeLayoutPhases.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => TreeLayoutPhases.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.TreeLayoutPhases.FOO',
    );
  });

  it('create() of P1_TREEIFICATION constructs a DFSTreeifyer (ported by T9)', () => {
    expect(TreeLayoutPhases.P1_TREEIFICATION.create()).toBeInstanceOf(DFSTreeifyer);
  });

  it('create() of P2_NODE_ORDERING constructs a NodeOrderer (ported by T12)', () => {
    expect(TreeLayoutPhases.P2_NODE_ORDERING.create()).toBeInstanceOf(NodeOrderer);
  });

  it('create() of P3_NODE_PLACEMENT constructs a NodePlacer (ported by T12)', () => {
    expect(TreeLayoutPhases.P3_NODE_PLACEMENT.create()).toBeInstanceOf(NodePlacer);
  });

  it('create() of P4_EDGE_ROUTING constructs an EdgeRouter (ported by T15)', () => {
    expect(TreeLayoutPhases.P4_EDGE_ROUTING.create()).toBeInstanceOf(EdgeRouter);
  });

  it('create() of a constant outside the table throws the Java message (TreeLayoutPhases.java:57-58)', () => {
    const foreign = Object.create(TreeLayoutPhases.prototype, {
      toString: { value: () => 'P9_UNKNOWN' },
    }) as TreeLayoutPhases;
    expect(() => foreign.create()).toThrow(IllegalArgumentException);
    expect(() => foreign.create()).toThrow('No implementation is available for the layout phase P9_UNKNOWN');
  });
});
