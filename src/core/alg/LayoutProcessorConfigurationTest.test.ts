// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import type { StringBuilder } from '../../java/lang/StringBuilder.js';
import { TestPhases } from '../../../test/helpers/TestPhases.js';
import { TestProcessors } from '../../../test/helpers/TestProcessors.js';
import { LayoutProcessorConfiguration } from './LayoutProcessorConfiguration.js';

/** @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/alg/LayoutProcessorConfigurationTest.java */
function create(): LayoutProcessorConfiguration<TestPhases, StringBuilder> {
  return LayoutProcessorConfiguration.create<TestPhases, StringBuilder>();
}

describe('LayoutProcessorConfigurationTest', () => {
  // @Ignore in Java (FIXME: clear() is package-visible there)
  it.skip('testClear', () => {
    const config = create();
    config.before(TestPhases.PHASE_1).add(TestProcessors.PROCESSOR_1);
    // config.clear();

    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(0);
    expect(config.processorsAfter(TestPhases.PHASE_1).size).toBe(0);
    expect(config.processorsBefore(TestPhases.PHASE_2).size).toBe(0);
    expect(config.processorsAfter(TestPhases.PHASE_2).size).toBe(0);
  });

  it('testBefore', () => {
    const config = create();
    config
      .before(TestPhases.PHASE_1)
      .add(TestProcessors.PROCESSOR_1)
      .before(TestPhases.PHASE_2)
      .add(TestProcessors.PROCESSOR_2)
      .add(TestProcessors.PROCESSOR_3);

    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(1);
    expect(config.processorsAfter(TestPhases.PHASE_1).size).toBe(2);
    expect(config.processorsBefore(TestPhases.PHASE_2).size).toBe(2);
    expect(config.processorsAfter(TestPhases.PHASE_2).size).toBe(0);
  });

  it('testAfter', () => {
    const config = create();
    config
      .after(TestPhases.PHASE_1)
      .add(TestProcessors.PROCESSOR_1)
      .after(TestPhases.PHASE_2)
      .add(TestProcessors.PROCESSOR_2)
      .add(TestProcessors.PROCESSOR_3);

    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(0);
    expect(config.processorsAfter(TestPhases.PHASE_1).size).toBe(1);
    expect(config.processorsBefore(TestPhases.PHASE_2).size).toBe(1);
    expect(config.processorsAfter(TestPhases.PHASE_2).size).toBe(2);
  });

  it('testAddBefore1', () => {
    const config = create();
    config.before(TestPhases.PHASE_1);
    config.addBefore(TestPhases.PHASE_2, TestProcessors.PROCESSOR_1);

    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(0);
    expect(config.processorsAfter(TestPhases.PHASE_1).size).toBe(1);
    expect(config.processorsBefore(TestPhases.PHASE_2).size).toBe(1);
    expect(config.processorsAfter(TestPhases.PHASE_2).size).toBe(0);
  });

  it('testAddBefore2', () => {
    const config = create();
    config.before(TestPhases.PHASE_1);
    config.addBefore(TestPhases.PHASE_2, TestProcessors.PROCESSOR_1);
    expect(() => config.add(TestProcessors.PROCESSOR_2)).toThrow(IllegalStateException);
  });

  it('testAddAfter1', () => {
    const config = create();
    config.before(TestPhases.PHASE_1);
    config.addAfter(TestPhases.PHASE_1, TestProcessors.PROCESSOR_1);

    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(0);
    expect(config.processorsAfter(TestPhases.PHASE_1).size).toBe(1);
    expect(config.processorsBefore(TestPhases.PHASE_2).size).toBe(1);
    expect(config.processorsAfter(TestPhases.PHASE_2).size).toBe(0);
  });

  it('testAddAfter2', () => {
    const config = create();
    config.before(TestPhases.PHASE_1);
    config.addAfter(TestPhases.PHASE_1, TestProcessors.PROCESSOR_1);
    expect(() => config.add(TestProcessors.PROCESSOR_2)).toThrow(IllegalStateException);
  });

  it('testAddAll', () => {
    const config = create();
    config
      .after(TestPhases.PHASE_1)
      .add(TestProcessors.PROCESSOR_1)
      .after(TestPhases.PHASE_2)
      .add(TestProcessors.PROCESSOR_2)
      .add(TestProcessors.PROCESSOR_3);

    const config2 = create();
    config2.addAll(config);

    expect(config2.processorsBefore(TestPhases.PHASE_1).size).toBe(0);
    expect(config2.processorsAfter(TestPhases.PHASE_1).size).toBe(1);
    expect(config2.processorsBefore(TestPhases.PHASE_2).size).toBe(1);
    expect(config2.processorsAfter(TestPhases.PHASE_2).size).toBe(2);
  });
});
