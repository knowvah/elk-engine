// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ExclusiveBounds } from './ExclusiveBounds.js';

/** Smallest positive double (`Double.MIN_VALUE`). */
const DOUBLE_MIN_VALUE = 4.9e-324;

describe('ExclusiveBounds', () => {
  it('greaterThan excludes the limit and admits anything above', () => {
    const lower = ExclusiveBounds.greaterThan(0);
    expect(lower.compareTo(0)).toBe(1);
    expect(lower.compareTo(-1)).toBe(1);
    expect(lower.compareTo(DOUBLE_MIN_VALUE)).toBe(-1);
  });

  it('lessThan excludes the limit and admits anything below', () => {
    const upper = ExclusiveBounds.lessThan(1);
    expect(upper.compareTo(1)).toBe(-1);
    expect(upper.compareTo(2)).toBe(-1);
    expect(upper.compareTo(0.5)).toBe(1);
  });

  it('equals compares kind and limit', () => {
    const lower = new ExclusiveBounds.ExclusiveLowerBound(1);
    const upper = new ExclusiveBounds.ExclusiveUpperBound(1);
    expect(lower.equals(new ExclusiveBounds.ExclusiveLowerBound(1))).toBe(true);
    expect(lower.equals(new ExclusiveBounds.ExclusiveLowerBound(2))).toBe(false);
    expect(lower.equals(upper)).toBe(false);
    expect(upper.equals(new ExclusiveBounds.ExclusiveUpperBound(1))).toBe(true);
    expect(upper.equals(new ExclusiveBounds.ExclusiveUpperBound(2))).toBe(false);
    expect(upper.equals(lower)).toBe(false);
    expect(upper.equals(1)).toBe(false);
  });

  it('hashCode is Double.hashCode of the limit', () => {
    // Double.hashCode(1.0): bits 0x3FF0000000000000 -> 0x3FF00000
    expect(new ExclusiveBounds.ExclusiveLowerBound(1).hashCode()).toBe(0x3ff00000);
    expect(new ExclusiveBounds.ExclusiveUpperBound(1).hashCode()).toBe(0x3ff00000);
  });

  it('toString appends (exclusive) to the Java double format', () => {
    expect(ExclusiveBounds.greaterThan(0).toString()).toBe('0.0 (exclusive)');
    expect(ExclusiveBounds.lessThan(1.5).toString()).toBe('1.5 (exclusive)');
  });
});
