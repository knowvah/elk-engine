// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import { LPadding } from './LPadding.js';

describe('LPadding', () => {
  it('is an ElkPadding with all sides zero', () => {
    const padding = new LPadding();
    expect(padding).toBeInstanceOf(ElkPadding);
    expect([padding.top, padding.bottom, padding.left, padding.right]).toEqual([0, 0, 0, 0]);
  });

  it('clone returns a new LPadding with every side copied', () => {
    const padding = new LPadding();
    padding.setTop(1);
    padding.setBottom(2);
    padding.setLeft(3);
    padding.setRight(4);

    const clone = padding.clone();

    expect(clone).not.toBe(padding);
    expect(clone).toBeInstanceOf(LPadding);
    expect([clone.top, clone.bottom, clone.left, clone.right]).toEqual([1, 2, 3, 4]);
    clone.setTop(9);
    expect(padding.top).toBe(1);
  });
});
