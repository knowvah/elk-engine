// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { MaxSTPhase } from '../p2processingorder/MaxSTPhase.js';
import { MinSTPhase } from '../p2processingorder/MinSTPhase.js';
import { TreeConstructionStrategy } from './TreeConstructionStrategy.js';

const DECLARED = ['MINIMUM_SPANNING_TREE', 'MAXIMUM_SPANNING_TREE'] as const;

describe('TreeConstructionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(TreeConstructionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(TreeConstructionStrategy.values()[1]).toBe(TreeConstructionStrategy.MAXIMUM_SPANNING_TREE);
  });

  it('compareTo orders by ordinal', () => {
    expect(
      TreeConstructionStrategy.MAXIMUM_SPANNING_TREE.compareTo(TreeConstructionStrategy.MINIMUM_SPANNING_TREE),
    ).toBe(1);
    expect(
      TreeConstructionStrategy.MINIMUM_SPANNING_TREE.compareTo(TreeConstructionStrategy.MAXIMUM_SPANNING_TREE),
    ).toBe(-1);
    expect(
      TreeConstructionStrategy.MINIMUM_SPANNING_TREE.compareTo(TreeConstructionStrategy.MINIMUM_SPANNING_TREE),
    ).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(TreeConstructionStrategy.valueOf(name)).toBe(TreeConstructionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => TreeConstructionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => TreeConstructionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.spore.options.TreeConstructionStrategy.FOO',
    );
  });

  it('create() instantiates the phase of each constant', () => {
    expect(TreeConstructionStrategy.MINIMUM_SPANNING_TREE.create().constructor).toBe(MinSTPhase);
    expect(TreeConstructionStrategy.MAXIMUM_SPANNING_TREE.create().constructor).toBe(MaxSTPhase);
  });

  it('create() returns a new instance on every call', () => {
    const constant = TreeConstructionStrategy.values()[0]!;
    expect(constant.create()).not.toBe(constant.create());
  });

  it('create() throws the Java message for a constant it has no implementation for', () => {
    const unknown = { toString: () => 'NO_SUCH_STRATEGY' } as unknown as TreeConstructionStrategy;
    expect(() => TreeConstructionStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => TreeConstructionStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation available for NO_SUCH_STRATEGY',
    );
  });
});
