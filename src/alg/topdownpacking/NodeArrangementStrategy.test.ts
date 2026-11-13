// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LeftRightTopDownNodePlacer } from './LeftRightTopDownNodePlacer.js';
import { NodeArrangementStrategy } from './NodeArrangementStrategy.js';

const DECLARED = ['LEFT_RIGHT_TOP_DOWN_NODE_PLACER'] as const;

describe('NodeArrangementStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(NodeArrangementStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(NodeArrangementStrategy.values()[0]).toBe(NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER);
  });

  it('compareTo of a constant with itself is 0', () => {
    expect(
      NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER.compareTo(
        NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER,
      ),
    ).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(NodeArrangementStrategy.valueOf(name)).toBe(NodeArrangementStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => NodeArrangementStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => NodeArrangementStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.topdownpacking.NodeArrangementStrategy.FOO',
    );
  });

  it('create() returns a new LeftRightTopDownNodePlacer for each call (Java `create()` switch)', () => {
    for (const constant of NodeArrangementStrategy.values()) {
      const first = constant.create();
      const second = constant.create();
      expect(first).toBeInstanceOf(LeftRightTopDownNodePlacer);
      expect(second).toBeInstanceOf(LeftRightTopDownNodePlacer);
      expect(second).not.toBe(first);
    }
  });
});
