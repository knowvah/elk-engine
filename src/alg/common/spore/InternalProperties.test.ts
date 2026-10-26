// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { InternalProperties } from './InternalProperties.js';

describe('spore InternalProperties', () => {
  it('has the Java constants', () => {
    expect(InternalProperties.FUZZINESS).toBe(0.0001);
    expect(InternalProperties.DEBUG_SVG.getId()).toBe('debugSVG');
    expect(InternalProperties.DEBUG_SVG.getDefault()).toBe(false);
    expect(InternalProperties.OVERLAPS_EXISTED.getId()).toBe('overlapsExisted');
    expect(InternalProperties.OVERLAPS_EXISTED.getDefault()).toBe(true);
  });
});
