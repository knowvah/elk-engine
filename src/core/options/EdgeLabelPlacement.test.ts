// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EdgeLabelPlacement } from './EdgeLabelPlacement.js';

const DECLARED = ['CENTER', 'HEAD', 'TAIL'] as const;

describe('EdgeLabelPlacement', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeLabelPlacement.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeLabelPlacement.values().map((c) => c.ordinal())).toEqual([0, 1, 2]);
    expect(EdgeLabelPlacement.values()).toHaveLength(3);
    expect(EdgeLabelPlacement.values()[2]).toBe(EdgeLabelPlacement.TAIL);
  });

  it('toString is the name', () => {
    expect(EdgeLabelPlacement.TAIL.toString()).toBe('TAIL');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeLabelPlacement.valueOf(name)).toBe(EdgeLabelPlacement[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeLabelPlacement.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeLabelPlacement.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.EdgeLabelPlacement.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeLabelPlacement.TAIL.compareTo(EdgeLabelPlacement.CENTER)).toBe(2);
    expect(EdgeLabelPlacement.CENTER.compareTo(EdgeLabelPlacement.TAIL)).toBe(-2);
    expect(EdgeLabelPlacement.CENTER.compareTo(EdgeLabelPlacement.CENTER)).toBe(0);
  });

  it('isEndLabelPlacement is true only for HEAD and TAIL', () => {
    expect(EdgeLabelPlacement.HEAD.isEndLabelPlacement()).toBe(true);
    expect(EdgeLabelPlacement.TAIL.isEndLabelPlacement()).toBe(true);
    expect(EdgeLabelPlacement.CENTER.isEndLabelPlacement()).toBe(false);
  });
});
