// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { PROPERTY_RETURN_VALUE, unbox, unboxBoolean, unboxDouble, unboxInteger } from './Unbox.js';

const SOURCE = PROPERTY_RETURN_VALUE('ElkNode');

describe('Unbox (JLS 5.1.8: unboxing a null box is a NullPointerException, a TypeError here)', () => {
  it('returns a present value unchanged, 0 and false included', () => {
    expect(unboxInteger(0, SOURCE)).toBe(0);
    expect(unboxDouble(-0, SOURCE)).toBe(-0);
    expect(unboxBoolean(false, SOURCE)).toBe(false);
    expect(unbox(3, 'x', 'y')).toBe(3);
  });

  it('throws a TypeError with the helpful-NPE text for null and undefined', () => {
    const text =
      'Cannot invoke "java.lang.Integer.intValue()" because the return value of ' +
      '"ElkNode.getProperty(org.eclipse.elk.graph.properties.IProperty)" is null';
    expect(() => unboxInteger(null, SOURCE)).toThrow(new TypeError(text));
    expect(() => unboxInteger(undefined, SOURCE)).toThrow(TypeError);
    expect(() => unboxDouble(null, SOURCE)).toThrow('java.lang.Double.doubleValue()');
    expect(() => unboxBoolean(null, SOURCE)).toThrow('java.lang.Boolean.booleanValue()');
  });
});
