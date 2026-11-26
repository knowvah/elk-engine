// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { NeatoModel } from './NeatoModel.js';

const DECLARED = ['SHORTPATH', 'CIRCUIT', 'SUBSET'] as const;
const JAVA_NAME = 'org.eclipse.elk.alg.graphviz.dot.transform.NeatoModel';

describe('NeatoModel', () => {
  it('declares the constants in Java order with matching ordinals; toString is the name', () => {
    expect(NeatoModel.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(NeatoModel.values().map((c) => c.ordinal())).toEqual([0, 1, 2]);
    expect(NeatoModel.values().map((c) => c.toString())).toEqual([...DECLARED]);
  });

  it('literal is the lower-case name', () => {
    expect(NeatoModel.values().map((c) => c.literal())).toEqual(['shortpath', 'circuit', 'subset']);
  });

  it('valueOf resolves exact names and throws the Java enum message otherwise', () => {
    for (const name of DECLARED) {
      expect(NeatoModel.valueOf(name)).toBe(NeatoModel[name]);
    }
    expect(() => NeatoModel.valueOf('circuit')).toThrow(IllegalArgumentException);
    expect(() => NeatoModel.valueOf('circuit')).toThrow(`No enum constant ${JAVA_NAME}.circuit`);
  });

  it('parse ignores case and throws for an unknown string (no fallback)', () => {
    expect(NeatoModel.parse('circuit')).toBe(NeatoModel.CIRCUIT);
    expect(NeatoModel.parse('SubSet')).toBe(NeatoModel.SUBSET);
    expect(() => NeatoModel.parse('mds')).toThrow(`No enum constant ${JAVA_NAME}.MDS`);
  });

  it('compareTo orders by ordinal', () => {
    expect(NeatoModel.SUBSET.compareTo(NeatoModel.SHORTPATH)).toBe(2);
    expect(NeatoModel.SHORTPATH.compareTo(NeatoModel.CIRCUIT)).toBe(-1);
  });
});
