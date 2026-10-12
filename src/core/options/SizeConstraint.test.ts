// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { SizeConstraint } from './SizeConstraint.js';

const DECLARED = ['PORTS', 'PORT_LABELS', 'NODE_LABELS', 'MINIMUM_SIZE'] as const;

describe('SizeConstraint', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(SizeConstraint.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(SizeConstraint.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3]);
    expect(SizeConstraint.values()).toHaveLength(4);
  });

  it('toString is the name', () => {
    expect(SizeConstraint.PORT_LABELS.toString()).toBe('PORT_LABELS');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(SizeConstraint.valueOf(name)).toBe(SizeConstraint[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => SizeConstraint.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => SizeConstraint.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.SizeConstraint.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(SizeConstraint.MINIMUM_SIZE.compareTo(SizeConstraint.PORTS)).toBe(3);
    expect(SizeConstraint.PORTS.compareTo(SizeConstraint.NODE_LABELS)).toBe(-2);
    expect(SizeConstraint.PORT_LABELS.compareTo(SizeConstraint.PORT_LABELS)).toBe(0);
  });

  it('fixed is an empty set over the enum', () => {
    const fixed = SizeConstraint.fixed();
    expect(fixed.isEmpty()).toBe(true);
    expect(fixed.add(SizeConstraint.PORTS)).toBe(true);
  });

  it('fixed returns a fresh set on every call', () => {
    expect(SizeConstraint.fixed()).not.toBe(SizeConstraint.fixed());
  });

  it('minimumSize holds only MINIMUM_SIZE', () => {
    expect([...SizeConstraint.minimumSize()]).toEqual([SizeConstraint.MINIMUM_SIZE]);
  });

  it('minimumSizeWithPorts equals EnumSet.of(PORTS, MINIMUM_SIZE)', () => {
    const set = SizeConstraint.minimumSizeWithPorts();
    expect(set.equals(EnumSet.of(SizeConstraint.PORTS, SizeConstraint.MINIMUM_SIZE))).toBe(true);
    expect([...set]).toEqual([SizeConstraint.PORTS, SizeConstraint.MINIMUM_SIZE]);
  });

  it('free holds all four constants and clones to a distinct equal set', () => {
    const free = SizeConstraint.free();
    expect(free.size()).toBe(4);
    expect([...free]).toEqual([...SizeConstraint.values()]);
    const copy = free.clone();
    expect(copy).not.toBe(free);
    expect(copy.equals(free)).toBe(true);
  });

  it('EnumSet.allOf accepts the enum class directly', () => {
    expect(EnumSet.allOf(SizeConstraint).size()).toBe(4);
  });
});
