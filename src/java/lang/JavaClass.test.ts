// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  JavaClass,
  getEnumConstants,
  isAssignableToDataObject,
  isEnum,
  javaInterface,
  simpleNameOf,
} from './JavaClass.js';

class Color {
  static values(): readonly { ordinal(): number; name(): string; toString(): string }[] {
    return [];
  }
}
class Plain {}
class Parsable {
  parse(_s: string): void {}
}

describe('JavaClass', () => {
  it('names the java.lang tokens', () => {
    expect(simpleNameOf(JavaClass.Double)).toBe('Double');
    expect(JavaClass.Integer.javaName).toBe('java.lang.Integer');
    expect(simpleNameOf(JavaClass.Object)).toBe('Object');
  });

  it('names classes and interface tokens', () => {
    expect(simpleNameOf(Color)).toBe('Color');
    expect(simpleNameOf(javaInterface('ILabelManager'))).toBe('ILabelManager');
    expect(javaInterface('ILabelManager').kind).toBe('interface');
  });

  it('recognises enum classes by a static values()', () => {
    expect(isEnum(Color)).toBe(true);
    expect(isEnum(Plain)).toBe(false);
    expect(isEnum(JavaClass.String)).toBe(false);
    expect(getEnumConstants(Color as never)).toEqual([]);
  });

  it('checks IDataObject assignability structurally', () => {
    expect(isAssignableToDataObject(Parsable)).toBe(true);
    expect(isAssignableToDataObject(Plain)).toBe(false);
    expect(isAssignableToDataObject(JavaClass.Double)).toBe(false);
  });
});
