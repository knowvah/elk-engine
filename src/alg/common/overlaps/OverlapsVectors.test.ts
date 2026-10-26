// SPDX-License-Identifier: EPL-2.0
// Replays the `overlaps` section of test/golden/refs/java/alg-common.json (AC3, recorded by AlgCommonVectors.java
// before any TS consumer): every rectangle's final x/y and the returned strip size are compared bit for bit.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { doubleToRawLongBits, longBitsToDouble } from '../../../java/lang/JavaDouble.js';
import { GreedyRectangleStripOverlapRemover } from './GreedyRectangleStripOverlapRemover.js';
import { OverlapRemovalDirection, RectangleStripOverlapRemover } from './RectangleStripOverlapRemover.js';

const VECTORS_URL = new URL('../../../../test/golden/refs/java/alg-common.json', import.meta.url);

type Hex = string;
interface OverlapsRow {
  name: string;
  direction: string;
  gap: [Hex, Hex];
  start: Hex;
  strategy: 'default' | 'greedy';
  rects: [Hex, Hex, Hex, Hex][];
  result: [Hex, Hex][];
  stripSize: Hex;
}

const toDouble = (hex: Hex): number => longBitsToDouble(BigInt.asIntN(64, BigInt(`0x${hex}`)));
const toHex = (d: number): Hex => BigInt.asUintN(64, doubleToRawLongBits(d)).toString(16).padStart(16, '0');

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { overlaps: OverlapsRow[] }).overlaps;

describe('alg-common.json overlaps replay', () => {
  it('has the recorded scenarios', () => {
    expect(rows.length).toBe(34);
  });

  it.each(rows.map((row) => [row.name, row] as const))('%s', (_name, row) => {
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.valueOf(row.direction))
      .withGap(toDouble(row.gap[0]), toDouble(row.gap[1]))
      .withStartCoordinate(toDouble(row.start));
    if (row.strategy === 'greedy') {
      remover.withOverlapRemovalStrategy(new GreedyRectangleStripOverlapRemover());
    }
    const rects = row.rects.map(([x, y, w, h]) => new ElkRectangle(toDouble(x), toDouble(y), toDouble(w), toDouble(h)));
    for (const rect of rects) {
      remover.addRectangle(rect);
    }

    const stripSize = remover.removeOverlaps();

    expect(rects.map((rect) => [toHex(rect.x), toHex(rect.y)])).toEqual(row.result);
    expect(toHex(stripSize)).toBe(row.stripSize);
  });
});
