// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import {
  HIERARCHY_AWARE,
  type IHierarchyAwareLayoutProcessor,
  isHierarchyAwareLayoutProcessor,
} from './IHierarchyAwareLayoutProcessor.js';

class Aware implements IHierarchyAwareLayoutProcessor {
  readonly [HIERARCHY_AWARE] = true as const;
}

describe('isHierarchyAwareLayoutProcessor', () => {
  it('accepts an object carrying the brand', () => {
    expect(isHierarchyAwareLayoutProcessor(new Aware())).toBe(true);
    expect(isHierarchyAwareLayoutProcessor({ [HIERARCHY_AWARE]: true })).toBe(true);
  });

  it('rejects objects without the brand or with another value', () => {
    expect(isHierarchyAwareLayoutProcessor({})).toBe(false);
    expect(isHierarchyAwareLayoutProcessor({ [HIERARCHY_AWARE]: false })).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(class Plain {})).toBe(false);
  });

  it('rejects null and non-objects', () => {
    expect(isHierarchyAwareLayoutProcessor(null)).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(undefined)).toBe(false);
    expect(isHierarchyAwareLayoutProcessor('aware')).toBe(false);
    expect(isHierarchyAwareLayoutProcessor(1)).toBe(false);
  });
});
