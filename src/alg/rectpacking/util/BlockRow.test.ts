// SPDX-License-Identifier: EPL-2.0
// Proof of BlockRow (mission 8c, T6): block rows are rebuilt from the recorded p2 stops (rectpacking.json, 161 stops) and every
// expectation is a recorded block row or node position, or the arithmetic of BlockRow.java on recorded sizes where a method is not
// observable through a stop. The expand chain (BlockRow.expand with ElkUtil.translate) is also replayed against the 34 p3 stops in
// RectRow.test.ts.
import { describe, expect, it } from 'vitest';
import { decodeHex, type BlockRowEntry } from '../../../../test/helpers/rectpacking-replay-rows.js';
import { p2Stops, replayRows, type RowsReplay } from '../../../../test/helpers/rectpacking-replay-run.js';
import { BlockRow } from './BlockRow.js';

const LOOP = { timeout: 60_000 };
const num = decodeHex;

/** Every (recorded block row entry, rebuilt block row, replay) of every block of every p2 stop. */
function eachBlockRow(visit: (entry: BlockRowEntry, row: BlockRow, replay: RowsReplay) => void): number {
  let visited = 0;
  for (const found of p2Stops()) {
    const replay = replayRows(found);
    found.rec.blocks.forEach((block, i) => {
      block.rows.forEach((entry, k) => {
        visit(entry, replay.rebuilt.blocks[i]!.getRows()[k]!, replay);
        visited++;
      });
    });
  }
  return visited;
}

describe('BlockRow (BlockRow.java)', () => {
  it(
    'exposes the recorded block row state and its rectangles through the getters (BlockRow.java:129-179)',
    LOOP,
    () => {
      const visited = eachBlockRow((entry, row) => {
        expect([row.getX(), row.getY(), row.getWidth(), row.getHeight()]).toEqual(
          [entry.x, entry.y, entry.width, entry.height].map(num),
        );
        expect(row.getNodes().map((n) => n.getIdentifier())).toEqual(entry.rects);
      });
      expect(visited).toBe(
        p2Stops().reduce((sum, found) => sum + found.rec.blocks.reduce((rows, b) => rows + b.rows.length, 0), 0),
      );
    },
  );

  it(
    'addRectangle places each rectangle after the previous ones at the recorded row coordinates and accumulates the recorded width and height (BlockRow.java:72-79)',
    LOOP,
    () => {
      // The coordinates come from the recorded row (x, y, spacing): in the recorded Compactor stops with several iterations the
      // nodes of a later iteration are not where the first iteration's rows put them (Compactor.java:69-93).
      eachBlockRow((entry, original) => {
        const row = new BlockRow(num(entry.x), num(entry.y), num(entry.spacing));
        let width = 0;
        for (const [position, rect] of original.getNodes().entries()) {
          const gap = position === 0 ? 0 : num(entry.spacing);
          rect.setLocation(-1, -1);
          expect(row.addRectangle(rect)).toBe(true);
          expect([rect.getX(), rect.getY()]).toEqual([num(entry.x) + width + gap, num(entry.y)]);
          width += rect.getWidth() + gap;
        }
        expect([row.getWidth(), row.getHeight()]).toEqual([num(entry.width), num(entry.height)]);
        expect(row.getNodes()).toEqual(original.getNodes());
      });
    },
  );

  it(
    'updateRow lays the rectangles out again from the recorded row coordinates; width and height drop the trailing spacing (BlockRow.java:99-110)',
    LOOP,
    () => {
      eachBlockRow((entry, row) => {
        const spacing = num(entry.spacing);
        let width = 0;
        let height = 0;
        const expectedPositions = row.getNodes().map((rect) => {
          const position = [num(entry.x) + width, num(entry.y)];
          width += rect.getWidth() + spacing;
          height = Math.max(height, rect.getHeight() + spacing);
          return position;
        });
        row.getNodes().forEach((n) => n.setLocation(-1, -1));
        row.updateRow();
        expect(row.getNodes().map((n) => [n.getX(), n.getY()])).toEqual(expectedPositions);
        expect([row.getWidth(), row.getHeight()]).toEqual([width - spacing, height - spacing]);
      });
    },
  );

  it(
    'removeRectangle without update only removes the rectangle (by identity), with update it lays the row out again (BlockRow.java:88-93)',
    LOOP,
    () => {
      let removed = 0;
      eachBlockRow((entry, row) => {
        const [first, ...remaining] = row.getNodes();
        const spacing = num(entry.spacing);
        row.removeRectangle(first!, false);
        expect(row.getNodes()).toEqual(remaining);
        expect([row.getWidth(), row.getHeight()]).toEqual([num(entry.width), num(entry.height)]);
        row.removeRectangle(first!, false);
        expect(row.getNodes()).toEqual(remaining);
        const next = remaining[0];
        if (next !== undefined) {
          row.removeRectangle(next, true);
          const rest = remaining.slice(1);
          const width = rest.reduce((sum, rect) => sum + (rect.getWidth() + spacing), 0);
          expect(row.getNodes()).toEqual(rest);
          expect(row.getWidth()).toBe(width - spacing);
          removed++;
        }
      });
      expect(removed).toBeGreaterThan(0);
    },
  );

  it(
    'removeRectangle of the last rectangle with update leaves minus the spacing as width and height (BlockRow.java:108-109)',
    LOOP,
    () => {
      let emptied = 0;
      eachBlockRow((entry, row) => {
        if (entry.rects.length === 1) {
          row.removeRectangle(row.getNodes()[0]!, true);
          expect(row.getNodes()).toEqual([]);
          expect([row.getWidth(), row.getHeight()]).toEqual([0 - num(entry.spacing), 0 - num(entry.spacing)]);
          emptied++;
        }
      });
      expect(emptied).toBeGreaterThan(0);
    },
  );

  it(
    'expand widens the row to the given width and shares the extra width among the rectangles (BlockRow.java:121-141)',
    LOOP,
    () => {
      eachBlockRow((entry, row) => {
        const widthForRow = num(entry.width) + num(entry.height);
        const additionalHeight = num(entry.x) + 1;
        const index = entry.rects.length;
        const rects = row.getNodes().map((n) => ({ x: n.getX(), y: n.getY(), w: n.getWidth() }));
        const extraPerRect = (widthForRow - num(entry.width)) / entry.rects.length;
        row.expand(widthForRow, additionalHeight, index);
        expect([row.getWidth(), row.getHeight()]).toEqual([widthForRow, num(entry.height) + additionalHeight]);
        row.getNodes().forEach((node, i) => {
          expect(node.getX()).toBe(rects[i]!.x + i * extraPerRect);
          expect(node.getY()).toBe(rects[i]!.y + index * additionalHeight);
          expect(node.getWidth()).toBe(rects[i]!.w + extraPerRect);
          expect(node.getHeight()).toBe(num(entry.height) + additionalHeight);
        });
      });
    },
  );

  it('setX and setY write the coordinates (BlockRow.java:144-176)', () => {
    const found = p2Stops()[0]!;
    const { rebuilt, rec } = replayRows(found);
    const row = rebuilt.blocks[0]!.getRows()[0]!;
    const entry = rec.blocks[0]!.rows[0]!;
    row.setX(num(entry.width));
    row.setY(num(entry.height));
    expect([row.getX(), row.getY()]).toEqual([num(entry.width), num(entry.height)]);
  });
});
