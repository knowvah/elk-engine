// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HighLevelSortingCriterion } from '../compaction/options/HighLevelSortingCriterion.js';
import { LowLevelSortingCriterion } from '../compaction/options/LowLevelSortingCriterion.js';
import { PolyominoOptions } from '../compaction/options/PolyominoOptions.js';
import { TraversalStrategy } from '../compaction/options/TraversalStrategy.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { PolyominoCompactor } from './PolyominoCompactor.js';
import { Direction } from './structures/Direction.js';
import { Polyomino } from './structures/Polyomino.js';
import { Polyominoes } from './structures/Polyominoes.js';

/** The `polyomino` section of the JVM vectors (AlgCommonVectors.java header documents the row shape). */
interface PolyRow {
  w: number;
  h: number;
  cells: string[];
  ext: [string, number, number][];
}
interface Row {
  name: string;
  input: { aspectRatio: string; fill: boolean; polys: PolyRow[] };
  options: { traversal: string; low: string; high: string };
  result:
    | { error: string }
    | { positions: [number, number][]; order: number[]; grid: [number, number]; filledBounds: number[] };
}

const VECTORS_URL = new URL('../../../../test/golden/refs/java/alg-common.json', import.meta.url);
const IOOBE = 'java.lang.IndexOutOfBoundsException';
const BLOCKED = '#';
const WEAKLY_BLOCKED = 'w';

/** Reinterprets a 16-hex-digit string as the raw IEEE-754 bits of a double. */
function hexToDouble(hex: string): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, BigInt(`0x${hex}`));
  return view.getFloat64(0);
}

function buildPolyomino(spec: PolyRow): Polyomino {
  const poly = new Polyomino(spec.w, spec.h);
  spec.cells.forEach((line, y) => {
    [...line].forEach((c, x) => {
      if (c === BLOCKED) {
        poly.setBlocked(x, y);
      } else if (c === WEAKLY_BLOCKED) {
        poly.setWeaklyBlocked(x, y);
      }
    });
  });
  for (const [dir, s, e] of spec.ext) {
    poly.addExtension(Direction.valueOf(dir), s, e);
  }
  return poly;
}

function buildHolder(row: Row): { holder: Polyominoes<Polyomino>; polys: Polyomino[] } {
  const polys = row.input.polys.map(buildPolyomino);
  const holder = new Polyominoes<Polyomino>(polys, hexToDouble(row.input.aspectRatio), row.input.fill);
  holder.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, TraversalStrategy.valueOf(row.options.traversal));
  holder.setProperty(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT, LowLevelSortingCriterion.valueOf(row.options.low));
  holder.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT, HighLevelSortingCriterion.valueOf(row.options.high));
  return { holder, polys };
}

const rows = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { polyomino: Row[] }).polyomino;

describe('PolyominoCompactor against the JVM vectors', () => {
  it('replays 108 recorded scenarios', () => {
    expect(rows).toHaveLength(108);
  });

  for (const row of rows) {
    it(row.name, () => {
      const { holder, polys } = buildHolder(row);
      if ('error' in row.result) {
        expect(row.result.error).toBe(IOOBE);
        expect(() => new PolyominoCompactor().packPolyominoes(holder)).toThrow(IndexOutOfBoundsException);
        return;
      }
      new PolyominoCompactor().packPolyominoes(holder);
      const grid = holder.getGrid();
      const bounds = grid.getFilledBounds();
      expect({
        positions: polys.map((p) => [p.getX(), p.getY()]),
        order: holder.getPolyominoes().map((p) => polys.indexOf(p)),
        grid: [grid.getWidth(), grid.getHeight()],
        filledBounds: [bounds.getFirst(), bounds.getSecond(), bounds.getThird(), bounds.getFourth()],
      }).toEqual(row.result);
    });
  }
});
