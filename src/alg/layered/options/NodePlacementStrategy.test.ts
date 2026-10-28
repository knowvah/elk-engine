// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { NodePlacementStrategy } from './NodePlacementStrategy.js';

const DECLARED = ['SIMPLE', 'INTERACTIVE', 'LINEAR_SEGMENTS', 'BRANDES_KOEPF', 'NETWORK_SIMPLEX'] as const;

/** Constant name to the class its `create()` arm will return, and the mission porting it. */
const ARMS: Record<(typeof DECLARED)[number], [string, string]> = {
  SIMPLE: ['SimpleNodePlacer', '7d'],
  INTERACTIVE: ['InteractiveNodePlacer', '7d'],
  LINEAR_SEGMENTS: ['LinearSegmentsNodePlacer', '7d'],
  BRANDES_KOEPF: ['BKNodePlacer', '7d'],
  NETWORK_SIMPLEX: ['NetworkSimplexPlacer', '7d'],
};

describe('NodePlacementStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(NodePlacementStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(NodePlacementStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(NodePlacementStrategy.values()[4]).toBe(NodePlacementStrategy.NETWORK_SIMPLEX);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(NodePlacementStrategy.NETWORK_SIMPLEX.toString()).toBe('NETWORK_SIMPLEX');
    expect(NodePlacementStrategy.NETWORK_SIMPLEX.compareTo(NodePlacementStrategy.SIMPLE)).toBe(4);
    expect(NodePlacementStrategy.SIMPLE.compareTo(NodePlacementStrategy.NETWORK_SIMPLEX)).toBe(-4);
    expect(NodePlacementStrategy.SIMPLE.compareTo(NodePlacementStrategy.SIMPLE)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(NodePlacementStrategy.valueOf(name)).toBe(NodePlacementStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => NodePlacementStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => NodePlacementStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.NodePlacementStrategy.FOO',
    );
  });

  it('create() of every constant throws UnsupportedOperationException naming its class and mission', () => {
    for (const name of DECLARED) {
      const [className, mission] = ARMS[name];
      expect(() => NodePlacementStrategy[name].create()).toThrow(UnsupportedOperationException);
      expect(() => NodePlacementStrategy[name].create()).toThrow(`${className} is ported in mission ${mission}`);
    }
  });

  it('create() of an unknown strategy keeps the Java IllegalArgumentException text', () => {
    const unknown = { toString: () => 'FAKE' } as unknown as NodePlacementStrategy;
    expect(() => NodePlacementStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => NodePlacementStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation is available for the node placer FAKE',
    );
  });
});

describe('NodePlacementStrategy oracle row site/enums/NodePlacementStrategy', () => {
  // oracle: site/enums/NodePlacementStrategy
  it('site/enums/NodePlacementStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(NodePlacementStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['SIMPLE', 0, 'SIMPLE'],
      ['INTERACTIVE', 1, 'INTERACTIVE'],
      ['LINEAR_SEGMENTS', 2, 'LINEAR_SEGMENTS'],
      ['BRANDES_KOEPF', 3, 'BRANDES_KOEPF'],
      ['NETWORK_SIMPLEX', 4, 'NETWORK_SIMPLEX'],
    ]);
  });

  // oracle: site/enums/NodePlacementStrategy
  it('site/enums/NodePlacementStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => NodePlacementStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => NodePlacementStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.NodePlacementStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/NodePlacementStrategy
  it('site/enums/NodePlacementStrategy: compareTo first/last', () => {
    const values = NodePlacementStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-4);
    expect(last.compareTo(first)).toBe(4);
    expect(first.compareTo(first)).toBe(0);
  });
});
