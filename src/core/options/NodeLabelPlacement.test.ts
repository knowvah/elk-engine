// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

import { NodeLabelPlacement } from './NodeLabelPlacement.js';

const NAMES = ['H_LEFT', 'H_CENTER', 'H_RIGHT', 'V_TOP', 'V_CENTER', 'V_BOTTOM', 'INSIDE', 'OUTSIDE', 'H_PRIORITY'];

const names = (s: EnumSet<NodeLabelPlacement>): string[] => [...s].map((c) => c.name());

describe('NodeLabelPlacement', () => {
  it('declares the constants in Java order', () => {
    expect(NodeLabelPlacement.values().map((c) => c.name())).toEqual(NAMES);
    expect(NodeLabelPlacement.values().map((c) => c.ordinal())).toEqual(NAMES.map((_n, i) => i));
    expect(NodeLabelPlacement.values()[0]?.toString()).toBe(NAMES[0]);
  });

  it('valueOf resolves by name and throws the Java message for an unknown name', () => {
    for (const n of NAMES) {
      expect(NodeLabelPlacement.valueOf(n).name()).toBe(n);
    }
    expect(() => NodeLabelPlacement.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => NodeLabelPlacement.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.NodeLabelPlacement.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    const last = NodeLabelPlacement.values()[NAMES.length - 1] as NodeLabelPlacement;
    const first = NodeLabelPlacement.values()[0] as NodeLabelPlacement;
    expect(last.compareTo(first)).toBe(NAMES.length - 1);
    expect(first.compareTo(last)).toBe(1 - NAMES.length);
    expect(first.compareTo(first)).toBe(0);
  });

  it('valueOf(int) indexes values() and throws out of range', () => {
    expect(NodeLabelPlacement.valueOf(0)).toBe(NodeLabelPlacement.values()[0]);
    expect(NodeLabelPlacement.valueOf(NAMES.length - 1)).toBe(NodeLabelPlacement.values()[NAMES.length - 1]);
    expect(() => NodeLabelPlacement.valueOf(NAMES.length)).toThrow(ArrayIndexOutOfBoundsException);
    expect(() => NodeLabelPlacement.valueOf(NAMES.length)).toThrow(
      'Index ' + NAMES.length + ' out of bounds for length ' + NAMES.length,
    );
    expect(() => NodeLabelPlacement.valueOf(-1)).toThrow(ArrayIndexOutOfBoundsException);
  });

  it('fixed is empty and fresh', () => {
    expect(NodeLabelPlacement.fixed().isEmpty()).toBe(true);
    expect(NodeLabelPlacement.fixed()).not.toBe(NodeLabelPlacement.fixed());
  });

  it.each([
    ['insideTopLeft', ['H_LEFT', 'V_TOP', 'INSIDE']],
    ['insideTopCenter', ['H_CENTER', 'V_TOP', 'INSIDE']],
    ['insideTopRight', ['H_RIGHT', 'V_TOP', 'INSIDE']],
    ['insideCenter', ['H_CENTER', 'V_CENTER', 'INSIDE']],
    ['insideBottomLeft', ['H_LEFT', 'V_BOTTOM', 'INSIDE']],
    ['insideBottomCenter', ['H_CENTER', 'V_BOTTOM', 'INSIDE']],
    ['insideBottomRight', ['H_RIGHT', 'V_BOTTOM', 'INSIDE']],
    ['outsideTopLeft', ['H_LEFT', 'V_TOP', 'OUTSIDE']],
    ['outsideTopCenter', ['H_CENTER', 'V_TOP', 'OUTSIDE']],
    ['outsideTopRight', ['H_RIGHT', 'V_TOP', 'OUTSIDE']],
    ['outsideBottomLeft', ['H_LEFT', 'V_BOTTOM', 'OUTSIDE']],
    ['outsideBottomCenter', ['H_CENTER', 'V_BOTTOM', 'OUTSIDE']],
    ['outsideBottomRight', ['H_RIGHT', 'V_BOTTOM', 'OUTSIDE']],
  ] as const)('%s holds its members in ordinal order and is fresh', (factory, members) => {
    const set = NodeLabelPlacement[factory]();
    expect(names(set)).toEqual(members);
    expect(NodeLabelPlacement[factory]()).not.toBe(set);
  });

  it('isValid accepts every factory set and the empty set', () => {
    expect(NodeLabelPlacement.isValid(NodeLabelPlacement.fixed())).toBe(true);
    expect(NodeLabelPlacement.isValid(NodeLabelPlacement.insideTopLeft())).toBe(true);
    expect(NodeLabelPlacement.isValid(NodeLabelPlacement.outsideBottomRight())).toBe(true);
    expect(NodeLabelPlacement.isValid(EnumSet.of(NodeLabelPlacement.H_PRIORITY))).toBe(true);
  });

  it.each([
    ['inside and outside', [NodeLabelPlacement.INSIDE, NodeLabelPlacement.OUTSIDE]],
    ['two horizontals', [NodeLabelPlacement.H_LEFT, NodeLabelPlacement.H_RIGHT]],
    ['two verticals', [NodeLabelPlacement.V_TOP, NodeLabelPlacement.V_BOTTOM]],
  ] as const)('isValid rejects %s', (_label, members) => {
    expect(NodeLabelPlacement.isValid(EnumSet.of(members[0], members[1]))).toBe(false);
  });
});
