// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TestProcessors } from '../../../test/helpers/TestProcessors.js';
import { EnumBasedFactoryComparator } from './EnumBasedFactoryComparator.js';

describe('EnumBasedFactoryComparator', () => {
  const comparator = new EnumBasedFactoryComparator<never>();

  it('orders by ordinal', () => {
    expect(comparator.compare(TestProcessors.PROCESSOR_1, TestProcessors.PROCESSOR_3)).toBe(-2);
    expect(comparator.compare(TestProcessors.PROCESSOR_3, TestProcessors.PROCESSOR_2)).toBe(1);
    expect(comparator.compare(TestProcessors.PROCESSOR_2, TestProcessors.PROCESSOR_2)).toBe(0);
  });
});
