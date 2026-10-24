// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Rectangle2D } from './Rectangle2D.js';

type Op = 'outcode' | 'isEmpty' | 'intersects4' | 'intersectsRect';
interface Row {
  readonly rect: string[];
  readonly op: Op;
  readonly args: string[];
  readonly result: number | boolean;
}

const VECTORS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../test/golden/refs/java/awt.json');
const rows = (JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as { rows: Row[] }).rows;

const scratch = new DataView(new ArrayBuffer(8));
/** Decodes a 16-hex-digit IEEE-754 bit string to a double. */
function fromBits(hex: string): number {
  scratch.setBigUint64(0, BigInt(`0x${hex}`));
  return scratch.getFloat64(0);
}

function makeRect(bits: string[]): Rectangle2D.Double {
  const [x, y, w, h] = bits.map(fromBits) as [number, number, number, number];
  return new Rectangle2D.Double(x, y, w, h);
}

function replay(row: Row): number | boolean {
  const rect = makeRect(row.rect);
  const args = row.args.map(fromBits);
  switch (row.op) {
    case 'outcode':
      return rect.outcode(args[0] as number, args[1] as number);
    case 'isEmpty':
      return rect.isEmpty();
    case 'intersects4':
      return rect.intersects(args[0] as number, args[1] as number, args[2] as number, args[3] as number);
    case 'intersectsRect':
      return rect.intersects(makeRect(row.args));
  }
}

describe('Rectangle2D', () => {
  it('has the Javadoc constant values', () => {
    expect([Rectangle2D.OUT_LEFT, Rectangle2D.OUT_TOP, Rectangle2D.OUT_RIGHT, Rectangle2D.OUT_BOTTOM]).toEqual([
      1, 2, 4, 8,
    ]);
  });

  it('constructs with mutable fields and defaults', () => {
    const r = new Rectangle2D.Double();
    expect([r.x, r.y, r.width, r.height]).toEqual([0, 0, 0, 0]);
    r.width = 3;
    expect(r.getWidth()).toBe(3);
    expect(new Rectangle2D.Double(1, 2, 3, 4).getY()).toBe(2);
    expect(new Rectangle2D.Double(1, 2, 3, 4).getHeight()).toBe(4);
    expect(new Rectangle2D.Double(1, 2, 3, 4).getX()).toBe(1);
  });

  it('replays every JVM vector row', () => {
    expect(rows.length).toBe(2842);
    const mismatches = rows.filter((row) => replay(row) !== row.result);
    expect(mismatches.slice(0, 5)).toEqual([]);
  });
});
