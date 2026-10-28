// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LayerUnzippingStrategy } from './LayerUnzippingStrategy.js';

const DECLARED = ['NONE', 'ALTERNATING'] as const;

describe('LayerUnzippingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LayerUnzippingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LayerUnzippingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(LayerUnzippingStrategy.values()[1]).toBe(LayerUnzippingStrategy.ALTERNATING);
  });

  it('toString is the name', () => {
    expect(LayerUnzippingStrategy.ALTERNATING.toString()).toBe('ALTERNATING');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LayerUnzippingStrategy.valueOf(name)).toBe(LayerUnzippingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LayerUnzippingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LayerUnzippingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.LayerUnzippingStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(LayerUnzippingStrategy.ALTERNATING.compareTo(LayerUnzippingStrategy.NONE)).toBe(1);
    expect(LayerUnzippingStrategy.NONE.compareTo(LayerUnzippingStrategy.ALTERNATING)).toBe(-1);
    expect(LayerUnzippingStrategy.NONE.compareTo(LayerUnzippingStrategy.NONE)).toBe(0);
  });
});

describe('LayerUnzippingStrategy oracle row site/enums/LayerUnzippingStrategy', () => {
  // oracle: site/enums/LayerUnzippingStrategy
  it('site/enums/LayerUnzippingStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(LayerUnzippingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NONE', 0, 'NONE'],
      ['ALTERNATING', 1, 'ALTERNATING'],
    ]);
  });

  // oracle: site/enums/LayerUnzippingStrategy
  it('site/enums/LayerUnzippingStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => LayerUnzippingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => LayerUnzippingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.LayerUnzippingStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/LayerUnzippingStrategy
  it('site/enums/LayerUnzippingStrategy: compareTo first/last', () => {
    const values = LayerUnzippingStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-1);
    expect(last.compareTo(first)).toBe(1);
    expect(first.compareTo(first)).toBe(0);
  });
});
