// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { NodeType } from './LNodeNodeType.js';

const DECLARED = [
  'NORMAL',
  'LONG_EDGE',
  'EXTERNAL_PORT',
  'NORTH_SOUTH_PORT',
  'LABEL',
  'BREAKING_POINT',
  'PLACEHOLDER',
  'NONSHIFTING_PLACEHOLDER',
] as const;

describe('LNode.NodeType', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(NodeType.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(NodeType.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(NodeType.values()[4]).toBe(NodeType.LABEL);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(NodeType.LONG_EDGE.toString()).toBe('LONG_EDGE');
    expect(NodeType.NONSHIFTING_PLACEHOLDER.compareTo(NodeType.NORMAL)).toBe(7);
    expect(NodeType.NORMAL.compareTo(NodeType.LABEL)).toBe(-4);
    expect(NodeType.LABEL.compareTo(NodeType.LABEL)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(NodeType.valueOf(name)).toBe(NodeType[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => NodeType.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => NodeType.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.graph.LNode.NodeType.FOO',
    );
  });

  it('getColor returns the Java debug colour per type, a default for the rest', () => {
    expect(NodeType.EXTERNAL_PORT.getColor()).toBe('#cc99cc');
    expect(NodeType.LONG_EDGE.getColor()).toBe('#eaed00');
    expect(NodeType.NORTH_SOUTH_PORT.getColor()).toBe('#0034de');
    expect(NodeType.LABEL.getColor()).toBe('#75c3c3');
    expect(NodeType.BREAKING_POINT.getColor()).toBe('#eeeeff');
    expect(NodeType.NORMAL.getColor()).toBe('#eeeeee');
    expect(NodeType.PLACEHOLDER.getColor()).toBe('#eeeeee');
    expect(NodeType.NONSHIFTING_PLACEHOLDER.getColor()).toBe('#eeeeee');
  });
});
