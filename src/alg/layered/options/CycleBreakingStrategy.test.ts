// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { CycleBreakingStrategy } from './CycleBreakingStrategy.js';

const DECLARED = [
  'GREEDY',
  'DEPTH_FIRST',
  'INTERACTIVE',
  'MODEL_ORDER',
  'GREEDY_MODEL_ORDER',
  'SCC_CONNECTIVITY',
  'SCC_NODE_TYPE',
  'DFS_NODE_ORDER',
  'BFS_NODE_ORDER',
] as const;

/** Constant name to the class its `create()` arm will return, and the mission porting it. */
const ARMS: Record<(typeof DECLARED)[number], [string, string]> = {
  GREEDY: ['GreedyCycleBreaker', '7b'],
  DEPTH_FIRST: ['DepthFirstCycleBreaker', '7b'],
  INTERACTIVE: ['InteractiveCycleBreaker', '7b'],
  MODEL_ORDER: ['ModelOrderCycleBreaker', '7b'],
  GREEDY_MODEL_ORDER: ['GreedyModelOrderCycleBreaker', '7b'],
  SCC_CONNECTIVITY: ['SCConnectivity', '7b'],
  SCC_NODE_TYPE: ['SCCNodeTypeCycleBreaker', '7b'],
  DFS_NODE_ORDER: ['DFSNodeOrderCycleBreaker', '7b'],
  BFS_NODE_ORDER: ['BFSNodeOrderCycleBreaker', '7b'],
};

describe('CycleBreakingStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CycleBreakingStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(CycleBreakingStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(CycleBreakingStrategy.values()[8]).toBe(CycleBreakingStrategy.BFS_NODE_ORDER);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(CycleBreakingStrategy.BFS_NODE_ORDER.toString()).toBe('BFS_NODE_ORDER');
    expect(CycleBreakingStrategy.BFS_NODE_ORDER.compareTo(CycleBreakingStrategy.GREEDY)).toBe(8);
    expect(CycleBreakingStrategy.GREEDY.compareTo(CycleBreakingStrategy.BFS_NODE_ORDER)).toBe(-8);
    expect(CycleBreakingStrategy.GREEDY.compareTo(CycleBreakingStrategy.GREEDY)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CycleBreakingStrategy.valueOf(name)).toBe(CycleBreakingStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CycleBreakingStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CycleBreakingStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.CycleBreakingStrategy.FOO',
    );
  });

  it('create() of every constant throws UnsupportedOperationException naming its class and mission', () => {
    for (const name of DECLARED) {
      const [className, mission] = ARMS[name];
      expect(() => CycleBreakingStrategy[name].create()).toThrow(UnsupportedOperationException);
      expect(() => CycleBreakingStrategy[name].create()).toThrow(`${className} is ported in mission ${mission}`);
    }
  });

  it('create() of an unknown strategy keeps the Java IllegalArgumentException text', () => {
    const unknown = { toString: () => 'FAKE' } as unknown as CycleBreakingStrategy;
    expect(() => CycleBreakingStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => CycleBreakingStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation is available for the cycle breaker FAKE',
    );
  });
});
