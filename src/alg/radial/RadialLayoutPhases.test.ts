// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EadesRadial } from './p1position/EadesRadial.js';
import { StraightLineEdgeRouter } from './p2routing/StraightLineEdgeRouter.js';
import { RadialLayoutPhases } from './RadialLayoutPhases.js';

const DECLARED = ['P1_NODE_PLACEMENT', 'P2_EDGE_ROUTING'] as const;

describe('RadialLayoutPhases', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(RadialLayoutPhases.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(RadialLayoutPhases.values()[1]).toBe(RadialLayoutPhases.P2_EDGE_ROUTING);
  });

  it('compareTo orders by ordinal', () => {
    expect(RadialLayoutPhases.P2_EDGE_ROUTING.compareTo(RadialLayoutPhases.P1_NODE_PLACEMENT)).toBe(1);
    expect(RadialLayoutPhases.P1_NODE_PLACEMENT.compareTo(RadialLayoutPhases.P2_EDGE_ROUTING)).toBe(-1);
    expect(RadialLayoutPhases.P1_NODE_PLACEMENT.compareTo(RadialLayoutPhases.P1_NODE_PLACEMENT)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(RadialLayoutPhases.valueOf(name)).toBe(RadialLayoutPhases[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => RadialLayoutPhases.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => RadialLayoutPhases.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.RadialLayoutPhases.FOO',
    );
  });

  it('create() of P1_NODE_PLACEMENT constructs EadesRadial', () => {
    expect(RadialLayoutPhases.P1_NODE_PLACEMENT.create()).toBeInstanceOf(EadesRadial);
  });

  it('create() of P2_EDGE_ROUTING constructs StraightLineEdgeRouter', () => {
    expect(RadialLayoutPhases.P2_EDGE_ROUTING.create()).toBeInstanceOf(StraightLineEdgeRouter);
  });
});
