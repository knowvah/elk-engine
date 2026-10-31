// SPDX-License-Identifier: EPL-2.0
// ModelOrderPortComparator.PortSideComparator (ModelOrderPortComparator.java:426-434): `Integer.compare` of the
// side ordinals, whose three arms the oracle rows reach only partly (mission 7c, T12b).
import { describe, expect, it } from 'vitest';
import { PortSide } from '../../../../core/options/PortSide.js';
import { ModelOrderPortComparatorPortSideComparator } from './ModelOrderPortComparatorPortSideComparator.js';

describe('ModelOrderPortComparatorPortSideComparator', () => {
  const comparator = new ModelOrderPortComparatorPortSideComparator();

  it('orders sides by ordinal, as Integer.compare', () => {
    expect(comparator.compare(PortSide.NORTH, PortSide.EAST)).toBe(-1);
    expect(comparator.compare(PortSide.WEST, PortSide.SOUTH)).toBe(1);
    expect(comparator.compare(PortSide.EAST, PortSide.EAST)).toBe(0);
  });
});
