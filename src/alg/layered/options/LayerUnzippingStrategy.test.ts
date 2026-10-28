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
