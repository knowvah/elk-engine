// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import { TestPhases } from '../../../test/helpers/TestPhases.js';
import { TestProcessors } from '../../../test/helpers/TestProcessors.js';
import { AlgorithmAssembler } from './AlgorithmAssembler.js';
import type { ILayoutProcessor } from './ILayoutProcessor.js';
import { LayoutProcessorConfiguration } from './LayoutProcessorConfiguration.js';

/** Java `o instanceof ILayoutPhase`: interfaces have no runtime identity, so check structurally. */
function isPhase(o: ILayoutProcessor<StringBuilder>): boolean {
  return typeof (o as { getLayoutProcessorConfiguration?: unknown }).getLayoutProcessorConfiguration === 'function';
}

function newAssembler(): AlgorithmAssembler<TestPhases, StringBuilder> {
  return AlgorithmAssembler.create<TestPhases, StringBuilder>(TestPhases);
}

/** @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/alg/AlgorithmAssemblerTest.java */
describe('AlgorithmAssemblerTest', () => {
  it('testEnableCaching', () => {
    const assembler = newAssembler();
    // Caching is enabled by default
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    assembler.setPhase(TestPhases.PHASE_2, TestPhases.PHASE_2);

    const algorithm = assembler.build(null as never);
    expect(algorithm.filter(isPhase).length).toBe(2);

    const algorithm2 = assembler.build(null as never);
    expect(algorithm2.filter(isPhase).length).toBe(2);

    for (let i = 0; i < algorithm.length; i++) {
      expect(algorithm[i]).toBe(algorithm2[i]);
    }
  });

  it('testDisableCaching', () => {
    const assembler = newAssembler();
    assembler.withCaching(false);
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    assembler.setPhase(TestPhases.PHASE_2, TestPhases.PHASE_2);

    const algorithm = assembler.build(null as never);
    expect(algorithm.filter(isPhase).length).toBe(2);

    const algorithm2 = assembler.build(null as never);
    expect(algorithm2.filter(isPhase).length).toBe(2);

    for (let i = 0; i < algorithm.length; i++) {
      expect(algorithm[i]).not.toBe(algorithm2[i]);
    }
  });

  it('testFailOnMissingPhase', () => {
    const assembler = newAssembler();
    // Failing on missing phase is the default
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    expect(() => assembler.build(null as never)).toThrow(IllegalStateException);
    expect(() => assembler.build(null as never)).toThrow('Expected 2 phases to be configured; only found 1');
  });

  it('testDontFailOnMissingPhase', () => {
    const assembler = newAssembler();
    assembler.withFailOnMissingPhase(false);
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    expect(assembler.build(null as never).length).toBeGreaterThan(0);
  });

  it('testClearCache', () => {
    const assembler = newAssembler();
    assembler.withCaching(true);
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    assembler.setPhase(TestPhases.PHASE_2, TestPhases.PHASE_2);

    const algorithm = assembler.build(null as never);
    expect(algorithm.filter(isPhase).length).toBe(2);

    assembler.clearCache();

    const algorithm2 = assembler.build(null as never);
    expect(algorithm2.filter(isPhase).length).toBe(2);

    for (let i = 0; i < algorithm.length; i++) {
      expect(algorithm[i]).not.toBe(algorithm2[i]);
    }
  });

  it('testResetWithFailOnMissingPhase', () => {
    const assembler = newAssembler();
    assembler.withFailOnMissingPhase(true);
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    assembler.setPhase(TestPhases.PHASE_2, TestPhases.PHASE_2);

    assembler.reset();

    expect(() => assembler.build(null as never)).toThrow(IllegalStateException);
  });

  it('testResetWithoutFailOnMissingPhase', () => {
    const assembler = newAssembler();
    assembler.withFailOnMissingPhase(false);
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    assembler.setPhase(TestPhases.PHASE_2, TestPhases.PHASE_2);

    assembler.reset();

    expect(assembler.build(null as never).length).toBe(0);
  });

  it('testAddProcessorConfiguration', () => {
    const assembler = newAssembler();
    assembler.addProcessorConfiguration(
      LayoutProcessorConfiguration.create<TestPhases, StringBuilder>().addBefore(
        TestPhases.PHASE_1,
        TestProcessors.PROCESSOR_3,
      ),
    );
    assembler.setPhase(TestPhases.PHASE_1, TestPhases.PHASE_1);
    assembler.setPhase(TestPhases.PHASE_2, TestPhases.PHASE_2);

    const algorithm = assembler.build(null as never);

    const expectedStrings = ['PROCESSOR_1', 'PROCESSOR_3', 'PHASE_1', 'PROCESSOR_2', 'PHASE_2'];
    expect(algorithm.length).toBe(expectedStrings.length);
    for (let i = 0; i < algorithm.length; i++) {
      const buffer = new StringBuilder();
      (algorithm[i] as ILayoutProcessor<StringBuilder>).process(buffer, null as never);
      expect(buffer.toString()).toBe(expectedStrings[i]);
    }
  });
});
