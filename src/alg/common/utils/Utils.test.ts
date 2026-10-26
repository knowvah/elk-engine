// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { Utils } from './Utils.js';

const rect = (x: number, y: number, w: number, h: number): ElkRectangle => new ElkRectangle(x, y, w, h);

describe('Utils.overlap', () => {
  const r1 = rect(0, 0, 10, 10);

  it('is 1 when the centers are too far apart horizontally or vertically', () => {
    expect(Utils.overlap(r1, rect(30, 0, 10, 10))).toBe(1);
    expect(Utils.overlap(r1, rect(0, 30, 10, 10))).toBe(1);
  });

  it('is 0 for equal centers', () => {
    expect(Utils.overlap(r1, rect(0, 0, 10, 10))).toBe(0);
  });

  it('uses the vertical ratio when the centers are vertically aligned', () => {
    // vOverlap = min(|0-18|, |10-8|) = 2, vcd = |5-13| = 8 -> 2/8 + 1
    expect(Utils.overlap(r1, rect(0, 8, 10, 10))).toBe(1.25);
  });

  it('uses the horizontal ratio when the centers are horizontally aligned', () => {
    expect(Utils.overlap(r1, rect(8, 0, 10, 10))).toBe(1.25);
  });

  it('uses the smaller ratio otherwise', () => {
    // hOverlap = vOverlap = 5, hcd = vcd = 5 -> 1 + 1
    expect(Utils.overlap(r1, rect(5, 5, 10, 10))).toBe(2);
    // hOverlap = min(|0-17|, |10-7|) = 3, hcd = 7; vOverlap = 5, vcd = 5 -> min(3/7, 1) + 1
    expect(Utils.overlap(r1, rect(7, 5, 10, 10))).toBe(3 / 7 + 1);
  });
});

describe('Utils.getRectEdges', () => {
  it('returns top, left, right and bottom edge in the Java order', () => {
    const edges = Utils.getRectEdges(rect(1, 2, 3, 4));
    expect(edges.map((e) => [e.u.x, e.u.y, e.v.x, e.v.y])).toEqual([
      [1, 2, 4, 2],
      [1, 2, 1, 6],
      [4, 6, 4, 2],
      [4, 6, 1, 6],
    ]);
  });
});
