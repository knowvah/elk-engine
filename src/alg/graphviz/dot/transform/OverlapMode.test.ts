// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { OverlapMode } from './OverlapMode.js';

const DECLARED = ['NONE', 'SCALE', 'SCALEXY', 'PRISM', 'COMPRESS'] as const;
const JAVA_NAME = 'org.eclipse.elk.alg.graphviz.dot.transform.OverlapMode';

describe('OverlapMode', () => {
  it('declares the constants in Java order with matching ordinals; toString is the name', () => {
    expect(OverlapMode.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(OverlapMode.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4]);
    expect(OverlapMode.values().map((c) => c.toString())).toEqual([...DECLARED]);
  });

  it('literal is "true" for NONE and the lower-case name otherwise', () => {
    expect(OverlapMode.values().map((c) => c.literal())).toEqual(['true', 'scale', 'scalexy', 'prism', 'compress']);
  });

  it('valueOf resolves exact names and throws the Java enum message otherwise', () => {
    for (const name of DECLARED) {
      expect(OverlapMode.valueOf(name)).toBe(OverlapMode[name]);
    }
    expect(() => OverlapMode.valueOf('true')).toThrow(IllegalArgumentException);
    expect(() => OverlapMode.valueOf('true')).toThrow(`No enum constant ${JAVA_NAME}.true`);
  });

  it('parse maps "true" in any case to NONE, other names ignoring case, and throws for an unknown string', () => {
    expect(OverlapMode.parse('true')).toBe(OverlapMode.NONE);
    expect(OverlapMode.parse('TRUE')).toBe(OverlapMode.NONE);
    expect(OverlapMode.parse('none')).toBe(OverlapMode.NONE);
    expect(OverlapMode.parse('ScaleXY')).toBe(OverlapMode.SCALEXY);
    expect(() => OverlapMode.parse('false')).toThrow(`No enum constant ${JAVA_NAME}.FALSE`);
  });

  it('compareTo orders by ordinal', () => {
    expect(OverlapMode.COMPRESS.compareTo(OverlapMode.NONE)).toBe(4);
    expect(OverlapMode.SCALE.compareTo(OverlapMode.PRISM)).toBe(-2);
  });
});
