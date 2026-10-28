// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { EdgeLabelSideSelection } from './EdgeLabelSideSelection.js';

const DECLARED = ['ALWAYS_UP', 'ALWAYS_DOWN', 'DIRECTION_UP', 'DIRECTION_DOWN', 'SMART_UP', 'SMART_DOWN'] as const;

describe('EdgeLabelSideSelection', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(EdgeLabelSideSelection.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(EdgeLabelSideSelection.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(EdgeLabelSideSelection.values()[5]).toBe(EdgeLabelSideSelection.SMART_DOWN);
  });

  it('toString is the name', () => {
    expect(EdgeLabelSideSelection.SMART_DOWN.toString()).toBe('SMART_DOWN');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(EdgeLabelSideSelection.valueOf(name)).toBe(EdgeLabelSideSelection[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => EdgeLabelSideSelection.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => EdgeLabelSideSelection.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(EdgeLabelSideSelection.SMART_DOWN.compareTo(EdgeLabelSideSelection.ALWAYS_UP)).toBe(5);
    expect(EdgeLabelSideSelection.ALWAYS_UP.compareTo(EdgeLabelSideSelection.SMART_DOWN)).toBe(-5);
    expect(EdgeLabelSideSelection.ALWAYS_UP.compareTo(EdgeLabelSideSelection.ALWAYS_UP)).toBe(0);
  });

  it('transpose swaps up and down variants for every constant', () => {
    const expected: Record<(typeof DECLARED)[number], (typeof DECLARED)[number]> = {
      ALWAYS_UP: 'ALWAYS_DOWN',
      ALWAYS_DOWN: 'ALWAYS_UP',
      DIRECTION_UP: 'DIRECTION_DOWN',
      DIRECTION_DOWN: 'DIRECTION_UP',
      SMART_UP: 'SMART_DOWN',
      SMART_DOWN: 'SMART_UP',
    };
    for (const name of DECLARED) {
      expect(EdgeLabelSideSelection[name].transpose()).toBe(EdgeLabelSideSelection[expected[name]]);
    }
  });
});

describe('EdgeLabelSideSelection oracle row site/enums/EdgeLabelSideSelection', () => {
  // oracle: site/enums/EdgeLabelSideSelection
  it('site/enums/EdgeLabelSideSelection: constants in declaration order with name, ordinal and toString', () => {
    expect(EdgeLabelSideSelection.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['ALWAYS_UP', 0, 'ALWAYS_UP'],
      ['ALWAYS_DOWN', 1, 'ALWAYS_DOWN'],
      ['DIRECTION_UP', 2, 'DIRECTION_UP'],
      ['DIRECTION_DOWN', 3, 'DIRECTION_DOWN'],
      ['SMART_UP', 4, 'SMART_UP'],
      ['SMART_DOWN', 5, 'SMART_DOWN'],
    ]);
  });

  // oracle: site/enums/EdgeLabelSideSelection
  it('site/enums/EdgeLabelSideSelection: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => EdgeLabelSideSelection.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => EdgeLabelSideSelection.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/EdgeLabelSideSelection
  it('site/enums/EdgeLabelSideSelection: compareTo first/last', () => {
    const values = EdgeLabelSideSelection.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-5);
    expect(last.compareTo(first)).toBe(5);
    expect(first.compareTo(first)).toBe(0);
  });

  // oracle: site/enums/EdgeLabelSideSelection
  it.each([
    ['ALWAYS_UP', 'ALWAYS_DOWN'],
    ['ALWAYS_DOWN', 'ALWAYS_UP'],
    ['DIRECTION_UP', 'DIRECTION_DOWN'],
    ['DIRECTION_DOWN', 'DIRECTION_UP'],
    ['SMART_UP', 'SMART_DOWN'],
    ['SMART_DOWN', 'SMART_UP'],
  ] as const)('site/enums/EdgeLabelSideSelection: %s.transpose() is %s', (constant, expected) => {
    expect(EdgeLabelSideSelection.valueOf(constant).transpose()?.name()).toBe(expected);
  });
});

describe('EdgeLabelSideSelection.transpose default arm', () => {
  // Not an oracle row: the Java default arm (`assert false; return null;`) is unreachable for a closed enum. A foreign
  // receiver reaches it; the JVM without -ea returns null.
  it('returns null for a receiver that is no constant', () => {
    expect(Reflect.apply(EdgeLabelSideSelection.prototype.transpose, {}, [])).toBeNull();
  });
});
