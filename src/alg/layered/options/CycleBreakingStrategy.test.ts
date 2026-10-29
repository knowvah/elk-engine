// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { BFSNodeOrderCycleBreaker } from '../p1cycles/BFSNodeOrderCycleBreaker.js';
import { DFSNodeOrderCycleBreaker } from '../p1cycles/DFSNodeOrderCycleBreaker.js';
import { DepthFirstCycleBreaker } from '../p1cycles/DepthFirstCycleBreaker.js';
import { GreedyCycleBreaker } from '../p1cycles/GreedyCycleBreaker.js';
import { GreedyModelOrderCycleBreaker } from '../p1cycles/GreedyModelOrderCycleBreaker.js';
import { InteractiveCycleBreaker } from '../p1cycles/InteractiveCycleBreaker.js';
import { ModelOrderCycleBreaker } from '../p1cycles/ModelOrderCycleBreaker.js';
import { SCCNodeTypeCycleBreaker } from '../p1cycles/SCCNodeTypeCycleBreaker.js';
import { SCConnectivity } from '../p1cycles/SCConnectivity.js';
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

/** Constant name to the class its `create()` arm returns. */
const ARMS = {
  GREEDY: GreedyCycleBreaker,
  DEPTH_FIRST: DepthFirstCycleBreaker,
  INTERACTIVE: InteractiveCycleBreaker,
  MODEL_ORDER: ModelOrderCycleBreaker,
  GREEDY_MODEL_ORDER: GreedyModelOrderCycleBreaker,
  SCC_CONNECTIVITY: SCConnectivity,
  SCC_NODE_TYPE: SCCNodeTypeCycleBreaker,
  DFS_NODE_ORDER: DFSNodeOrderCycleBreaker,
  BFS_NODE_ORDER: BFSNodeOrderCycleBreaker,
} satisfies Record<(typeof DECLARED)[number], new () => unknown>;

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

  it('create() of every constant returns a new instance of its class', () => {
    for (const name of DECLARED) {
      const created = CycleBreakingStrategy[name].create();
      expect(created).toBeInstanceOf(ARMS[name]);
      expect(created.constructor).toBe(ARMS[name]);
      expect(CycleBreakingStrategy[name].create()).not.toBe(created);
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

describe('CycleBreakingStrategy oracle row site/enums/CycleBreakingStrategy', () => {
  // oracle: site/enums/CycleBreakingStrategy
  it('site/enums/CycleBreakingStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(CycleBreakingStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['GREEDY', 0, 'GREEDY'],
      ['DEPTH_FIRST', 1, 'DEPTH_FIRST'],
      ['INTERACTIVE', 2, 'INTERACTIVE'],
      ['MODEL_ORDER', 3, 'MODEL_ORDER'],
      ['GREEDY_MODEL_ORDER', 4, 'GREEDY_MODEL_ORDER'],
      ['SCC_CONNECTIVITY', 5, 'SCC_CONNECTIVITY'],
      ['SCC_NODE_TYPE', 6, 'SCC_NODE_TYPE'],
      ['DFS_NODE_ORDER', 7, 'DFS_NODE_ORDER'],
      ['BFS_NODE_ORDER', 8, 'BFS_NODE_ORDER'],
    ]);
  });

  // oracle: site/enums/CycleBreakingStrategy
  it('site/enums/CycleBreakingStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => CycleBreakingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => CycleBreakingStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.CycleBreakingStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/CycleBreakingStrategy
  it('site/enums/CycleBreakingStrategy: compareTo first/last', () => {
    const values = CycleBreakingStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-8);
    expect(last.compareTo(first)).toBe(8);
    expect(first.compareTo(first)).toBe(0);
  });
});
