// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { StringBuilder } from '../../java/lang/StringBuilder.js';
import { TestPhases } from '../../../test/helpers/TestPhases.js';
import { TestProcessors } from '../../../test/helpers/TestProcessors.js';
import { LayoutProcessorConfiguration } from './LayoutProcessorConfiguration.js';

describe('LayoutProcessorConfiguration', () => {
  it('createFrom copies the slots of the source', () => {
    const source = LayoutProcessorConfiguration.create<TestPhases, StringBuilder>();
    source.after(TestPhases.PHASE_1).add(TestProcessors.PROCESSOR_1);
    const copy = LayoutProcessorConfiguration.createFrom(source);
    expect([...copy.processorsAfter(TestPhases.PHASE_1)]).toEqual([TestProcessors.PROCESSOR_1]);
  });

  it('clear empties the configuration and invalidates the index', () => {
    const config = LayoutProcessorConfiguration.create<TestPhases, StringBuilder>();
    config.before(TestPhases.PHASE_1).add(TestProcessors.PROCESSOR_1);
    config.clear();
    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(0);
    expect(() => config.add(TestProcessors.PROCESSOR_1)).toThrow('Did not call before(...) or after(...)');
  });

  it('processorsBefore returns a copy in insertion order', () => {
    const config = LayoutProcessorConfiguration.create<TestPhases, StringBuilder>();
    config.before(TestPhases.PHASE_1).add(TestProcessors.PROCESSOR_2).add(TestProcessors.PROCESSOR_1);
    const result = config.processorsBefore(TestPhases.PHASE_1);
    expect([...result]).toEqual([TestProcessors.PROCESSOR_2, TestProcessors.PROCESSOR_1]);
    result.clear();
    expect(config.processorsBefore(TestPhases.PHASE_1).size).toBe(2);
  });

  it('phase and processor enums run and configure', () => {
    const graph = new StringBuilder();
    const phase = TestPhases.PHASE_2.create();
    phase.process(graph, null as never);
    const config = phase.getLayoutProcessorConfiguration(graph);
    const factories = [...(config?.processorsBefore(TestPhases.PHASE_2) ?? [])];
    expect(factories).toEqual([TestProcessors.PROCESSOR_2]);
    factories[0]?.create().process(graph, null as never);
    expect(graph.toString()).toBe('PHASE_2PROCESSOR_2');
    expect(TestPhases.PHASE_2.name()).toBe('PHASE_2');
    expect(TestPhases.PHASE_1.compareTo(TestPhases.PHASE_2)).toBeLessThan(0);
    expect(TestProcessors.PROCESSOR_3.name()).toBe('PROCESSOR_3');
    expect(TestProcessors.PROCESSOR_3.compareTo(TestProcessors.PROCESSOR_1)).toBeGreaterThan(0);
  });
});
