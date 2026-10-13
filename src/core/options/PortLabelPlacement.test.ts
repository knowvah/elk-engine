// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

import { PortLabelPlacement } from './PortLabelPlacement.js';

const NAMES = [
  'OUTSIDE',
  'INSIDE',
  'NEXT_TO_PORT_IF_POSSIBLE',
  'ALWAYS_SAME_SIDE',
  'ALWAYS_OTHER_SAME_SIDE',
  'SPACE_EFFICIENT',
];

const names = (s: EnumSet<PortLabelPlacement>): string[] => [...s].map((c) => c.name());

describe('PortLabelPlacement', () => {
  it('declares the constants in Java order', () => {
    expect(PortLabelPlacement.values().map((c) => c.name())).toEqual(NAMES);
    expect(PortLabelPlacement.values().map((c) => c.ordinal())).toEqual(NAMES.map((_n, i) => i));
    expect(PortLabelPlacement.values()[0]?.toString()).toBe(NAMES[0]);
  });

  it('valueOf resolves by name and throws the Java message for an unknown name', () => {
    for (const n of NAMES) {
      expect(PortLabelPlacement.valueOf(n).name()).toBe(n);
    }
    expect(() => PortLabelPlacement.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => PortLabelPlacement.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.core.options.PortLabelPlacement.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    const last = PortLabelPlacement.values()[NAMES.length - 1] as PortLabelPlacement;
    const first = PortLabelPlacement.values()[0] as PortLabelPlacement;
    expect(last.compareTo(first)).toBe(NAMES.length - 1);
    expect(first.compareTo(last)).toBe(1 - NAMES.length);
    expect(first.compareTo(first)).toBe(0);
  });

  it('fixed, inside and outside factories return fresh sets', () => {
    expect(PortLabelPlacement.fixed().isEmpty()).toBe(true);
    expect(names(PortLabelPlacement.inside())).toEqual(['INSIDE']);
    expect(names(PortLabelPlacement.outside())).toEqual(['OUTSIDE']);
    expect(PortLabelPlacement.inside()).not.toBe(PortLabelPlacement.inside());
  });

  it('isFixed is true only when neither inside nor outside is present', () => {
    expect(PortLabelPlacement.isFixed(PortLabelPlacement.fixed())).toBe(true);
    expect(PortLabelPlacement.isFixed(EnumSet.of(PortLabelPlacement.SPACE_EFFICIENT))).toBe(true);
    expect(PortLabelPlacement.isFixed(PortLabelPlacement.inside())).toBe(false);
    expect(PortLabelPlacement.isFixed(PortLabelPlacement.outside())).toBe(false);
  });

  it('isValid accepts single choices and one position with inside/outside', () => {
    expect(PortLabelPlacement.isValid(PortLabelPlacement.fixed())).toBe(true);
    expect(PortLabelPlacement.isValid(PortLabelPlacement.inside())).toBe(true);
    expect(
      PortLabelPlacement.isValid(EnumSet.of(PortLabelPlacement.OUTSIDE, PortLabelPlacement.ALWAYS_SAME_SIDE)),
    ).toBe(true);
  });

  it('isValid rejects inside with outside and two position constants', () => {
    expect(PortLabelPlacement.isValid(EnumSet.of(PortLabelPlacement.INSIDE, PortLabelPlacement.OUTSIDE))).toBe(false);
    expect(
      PortLabelPlacement.isValid(EnumSet.of(PortLabelPlacement.ALWAYS_SAME_SIDE, PortLabelPlacement.SPACE_EFFICIENT)),
    ).toBe(false);
  });
});
