// SPDX-License-Identifier: EPL-2.0
// Structural proof of RoutingDirection (mission 7e, T4): the declaration order of RoutingDirection.java:23-30 and the
// enum protocol every ported enum shares.
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';
import { RoutingDirection } from './RoutingDirection.js';

describe('RoutingDirection', () => {
  it('lists WEST_TO_EAST, NORTH_TO_SOUTH, SOUTH_TO_NORTH in declaration order with their ordinals', () => {
    expect(RoutingDirection.values().map((direction) => direction.name())).toEqual([
      'WEST_TO_EAST',
      'NORTH_TO_SOUTH',
      'SOUTH_TO_NORTH',
    ]);
    expect(RoutingDirection.values().map((direction) => direction.ordinal())).toEqual([0, 1, 2]);
  });

  it('valueOf returns the constant of that name', () => {
    expect(RoutingDirection.valueOf('NORTH_TO_SOUTH')).toBe(RoutingDirection.NORTH_TO_SOUTH);
    expect(RoutingDirection.valueOf('SOUTH_TO_NORTH').toString()).toBe('SOUTH_TO_NORTH');
  });

  it('valueOf throws the IllegalArgumentException of Enum.valueOf for an unknown name', () => {
    expect(() => RoutingDirection.valueOf('EAST_TO_WEST')).toThrow(IllegalArgumentException);
    expect(() => RoutingDirection.valueOf('EAST_TO_WEST')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.p5edges.orthogonal.direction.RoutingDirection.EAST_TO_WEST',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(RoutingDirection.WEST_TO_EAST.compareTo(RoutingDirection.SOUTH_TO_NORTH)).toBe(-2);
    expect(RoutingDirection.SOUTH_TO_NORTH.compareTo(RoutingDirection.NORTH_TO_SOUTH)).toBe(1);
  });
});
