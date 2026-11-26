// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { Command } from './Command.js';

const DECLARED = ['INVALID', 'DOT', 'NEATO', 'TWOPI', 'FDP', 'CIRCO'] as const;
const JAVA_NAME = 'org.eclipse.elk.alg.graphviz.dot.transform.Command';

describe('Command', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(Command.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(Command.values().map((c) => c.ordinal())).toEqual([0, 1, 2, 3, 4, 5]);
    expect(Command.values()[5]).toBe(Command.CIRCO);
  });

  it('toString is the lower-case name', () => {
    expect(Command.values().map((c) => c.toString())).toEqual(['invalid', 'dot', 'neato', 'twopi', 'fdp', 'circo']);
    expect(String(Command.TWOPI)).toBe('twopi');
  });

  it('valueOf resolves each constant by its exact name', () => {
    for (const name of DECLARED) {
      expect(Command.valueOf(name)).toBe(Command[name]);
    }
  });

  it('valueOf throws the Java enum message for an unknown or lower-case name', () => {
    expect(() => Command.valueOf('X')).toThrow(IllegalArgumentException);
    expect(() => Command.valueOf('X')).toThrow(`No enum constant ${JAVA_NAME}.X`);
    expect(() => Command.valueOf('dot')).toThrow(`No enum constant ${JAVA_NAME}.dot`);
  });

  it('parse ignores case and maps an unknown string to INVALID', () => {
    expect(Command.parse('neato')).toBe(Command.NEATO);
    expect(Command.parse('CiRcO')).toBe(Command.CIRCO);
    expect(Command.parse('invalid')).toBe(Command.INVALID);
    expect(Command.parse('graphviz')).toBe(Command.INVALID);
    expect(Command.parse('')).toBe(Command.INVALID);
  });

  it('parse lets the NullPointerException of a null string through (only IllegalArgumentException is caught)', () => {
    expect(() => Command.parse(null as unknown as string)).toThrow(TypeError);
  });

  it('compareTo orders by ordinal', () => {
    expect(Command.CIRCO.compareTo(Command.INVALID)).toBe(5);
    expect(Command.DOT.compareTo(Command.FDP)).toBe(-3);
    expect(Command.DOT.compareTo(Command.DOT)).toBe(0);
  });
});
