// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { InteractiveNodeReorderer } from './InteractiveNodeReorderer.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { MinSizePostProcessor } from './MinSizePostProcessor.js';
import { MinSizePreProcessor } from './MinSizePreProcessor.js';
import { NodeSizeReorderer } from './NodeSizeReorderer.js';

/** The constants in declaration order of IntermediateProcessorStrategy.java:33-44, with the processor each creates. */
const DECLARED = [
  ['NODE_SIZE_REORDERER', NodeSizeReorderer],
  ['INTERACTIVE_NODE_REORDERER', InteractiveNodeReorderer],
  ['MIN_SIZE_PRE_PROCESSOR', MinSizePreProcessor],
  ['MIN_SIZE_POST_PROCESSOR', MinSizePostProcessor],
] as const;

describe('IntermediateProcessorStrategy', () => {
  it('lists the constants in declaration order with ordinal, name and toString', () => {
    const values = IntermediateProcessorStrategy.values();
    expect(values.map((v) => v.name())).toEqual(DECLARED.map(([name]) => name));
    expect(values.map((v) => v.ordinal())).toEqual([0, 1, 2, 3]);
    expect(values.map((v) => v.toString())).toEqual(DECLARED.map(([name]) => name));
  });

  it.each(DECLARED)('%s creates its processor', (name, processorClass) => {
    expect(IntermediateProcessorStrategy.valueOf(name).create()).toBeInstanceOf(processorClass);
  });

  it('valueOf resolves a name and rejects an unknown one with the Java message', () => {
    expect(IntermediateProcessorStrategy.valueOf('MIN_SIZE_POST_PROCESSOR')).toBe(
      IntermediateProcessorStrategy.MIN_SIZE_POST_PROCESSOR,
    );
    expect(() => IntermediateProcessorStrategy.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => IntermediateProcessorStrategy.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.alg.rectpacking.intermediate.IntermediateProcessorStrategy.NOPE',
    );
  });

  it('compareTo orders by ordinal', () => {
    const { NODE_SIZE_REORDERER: first, MIN_SIZE_POST_PROCESSOR: last } = IntermediateProcessorStrategy;
    expect(first.compareTo(last)).toBe(-3);
    expect(last.compareTo(first)).toBe(3);
    expect(first.compareTo(first)).toBe(0);
  });
});
