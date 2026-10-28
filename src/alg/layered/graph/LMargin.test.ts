// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { LMargin } from './LMargin.js';

describe('LMargin', () => {
  it('is an ElkMargin with all sides zero', () => {
    const margin = new LMargin();
    expect(margin).toBeInstanceOf(ElkMargin);
    expect([margin.top, margin.bottom, margin.left, margin.right]).toEqual([0, 0, 0, 0]);
  });
});
