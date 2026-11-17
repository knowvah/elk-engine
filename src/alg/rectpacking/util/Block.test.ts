// SPDX-License-Identifier: EPL-2.0
// Proof of Block (mission 8c, T6): every expectation is a recorded p2 stop row (rectpacking.json, 168 stops, 659 blocks) or the arithmetic
// of Block.java applied to recorded sizes where a method is not observable through a stop. Blocks are rebuilt from the rows
// (test/helpers/rectpacking-replay-*.ts) and compared at raw-bit equality (the same IEEE operations as the Java).
import { describe, expect, it } from 'vitest';
import { compareJson, dumpRectRows, formatDifferences } from '../../../../test/helpers/rectpacking-replay-dump.js';
import { decodeHex, type BlockEntry } from '../../../../test/helpers/rectpacking-replay-rows.js';
import { p2Stops, replayRows, type RowsReplay } from '../../../../test/helpers/rectpacking-replay-run.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { Block } from './Block.js';
import { RectRow } from './RectRow.js';

const LOOP = { timeout: 60_000 };
const EXACT = 0;
const num = decodeHex;

/** Every (recorded block entry, rebuilt block, replay) of every p2 stop. */
function eachBlock(visit: (entry: BlockEntry, block: Block, replay: RowsReplay) => void): number {
  let visited = 0;
  for (const found of p2Stops()) {
    const replay = replayRows(found);
    found.rec.blocks.forEach((entry, i) => {
      visit(entry, replay.rebuilt.blocks[i]!, replay);
      visited++;
    });
  }
  return visited;
}

/** A fresh block built the way the compaction builds one: `addChild`, `addChildInNewRow` where the recorded block row starts. */
function buildByAdding(
  entry: BlockEntry,
  parent: RectRow,
  nodes: ReadonlyMap<string, import('../../../graph/ElkNode.js').ElkNode>,
): Block {
  const block = new Block(num(entry.x), num(entry.y), parent, num(entry.spacing));
  const starts = new Set(entry.rows.map((row) => row.rects[0]));
  entry.children.forEach((id, index) => {
    const node = nodes.get(id)!;
    if (index > 0 && starts.has(id)) {
      block.addChildInNewRow(node);
    } else {
      block.addChild(node);
    }
  });
  return block;
}

describe('Block (Block.java)', () => {
  it('rebuilds 659 blocks from the p2 stop rows and exposes the recorded state through its getters', LOOP, () => {
    const visited = eachBlock((entry, block) => {
      expect([
        block.getX(),
        block.getY(),
        block.getWidth(),
        block.getHeight(),
        block.getMinWidth(),
        block.getMinHeight(),
      ]).toEqual([entry.x, entry.y, entry.width, entry.height, entry.minWidth, entry.minHeight].map(num));
      expect([
        block.getSmallestRectWidth(),
        block.getSmallestRectHeight(),
        block.getAverageHeight(),
        block.getMaxHeight(),
      ]).toEqual([entry.smallestRectWidth, entry.smallestRectHeight, entry.averageHeight, entry.maxHeight].map(num));
      expect([block.isFixed(), block.isPositionFixed()]).toEqual([entry.fixed, entry.positionFixed]);
      expect(block.getChildren().map((n) => n.getIdentifier())).toEqual(entry.children);
    });
    expect(visited).toBe(659);
  });

  it(
    'addChild / addChildInNewRow build the recorded block rows and size fields (Block.java:93-109, 167-184)',
    LOOP,
    () => {
      const visited = eachBlock((entry, original, replay) => {
        const block = buildByAdding(entry, original.getParentRow(), replay.nodes);
        expect(block.getWidth()).toBe(num(entry.width));
        expect(block.getHeight()).toBe(num(entry.height));
        expect(block.getMinHeight()).toBe(num(entry.minHeight));
        expect(block.getSmallestRectWidth()).toBe(num(entry.smallestRectWidth));
        expect(block.getSmallestRectHeight()).toBe(num(entry.smallestRectHeight));
        expect(block.getRows().length).toBe(entry.rows.length);
        entry.rows.forEach((rowEntry, k) => {
          const row = block.getRows()[k]!;
          expect([row.getX(), row.getY(), row.getWidth(), row.getHeight()]).toEqual(
            [rowEntry.x, rowEntry.y, rowEntry.width, rowEntry.height].map(num),
          );
          expect(row.getNodes().map((n) => n.getIdentifier())).toEqual(rowEntry.rects);
        });
      });
      expect(visited).toBe(659);
    },
  );

  it(
    'addChild keeps minWidth, maxHeight and averageHeight by the Java formulas on the recorded child sizes (Block.java:171-182)',
    LOOP,
    () => {
      eachBlock((entry, original, replay) => {
        const block = buildByAdding(entry, original.getParentRow(), replay.nodes);
        const spacing = num(entry.spacing);
        const sizes = entry.children.map((id) => replay.nodes.get(id)!);
        let minWidth = 0;
        let maxHeight = 0;
        sizes.forEach((node, index) => {
          minWidth = Math.max(minWidth, node.getWidth() + (index === 0 ? 0 : spacing));
          maxHeight += node.getHeight() + (index === 0 ? 0 : spacing);
        });
        const count = sizes.length;
        expect(block.getMinWidth()).toBe(minWidth);
        expect(block.getMaxHeight()).toBe(maxHeight);
        expect(block.getAverageHeight()).toBe(maxHeight / count - spacing * ((count - 1) / count));
      });
    },
  );

  it(
    'resetBlock reproduces the recorded width, height, minHeight and smallest rectangle sizes of all 659 blocks (Block.java:327-364)',
    LOOP,
    () => {
      eachBlock((entry, block) => {
        block.resetBlock();
        expect([block.getWidth(), block.getHeight(), block.getMinHeight()]).toEqual(
          [entry.width, entry.height, entry.minHeight].map(num),
        );
        expect([block.getSmallestRectWidth(), block.getSmallestRectHeight()]).toEqual(
          [entry.smallestRectWidth, entry.smallestRectHeight].map(num),
        );
      });
    },
  );

  it(
    'resetBlock sets minWidth, maxHeight and averageHeight by the Java formulas on the recorded child sizes (Block.java:348-361)',
    LOOP,
    () => {
      eachBlock((entry, block, replay) => {
        const spacing = num(entry.spacing);
        const nodes = entry.children.map((id) => replay.nodes.get(id)!);
        let minWidth = 0;
        let maxHeight = 0;
        for (const node of nodes) {
          minWidth = Math.max(minWidth, node.getWidth());
          maxHeight += node.getHeight() + spacing;
        }
        block.resetBlock();
        expect(block.getMinWidth()).toBe(minWidth);
        expect(block.getMaxHeight()).toBe(maxHeight);
        expect(block.getAverageHeight()).toBe(maxHeight / nodes.length - spacing * ((nodes.length - 1) / nodes.length));
      });
    },
  );

  it(
    'resetBlock tells the parent row, which recomputes its width from its blocks (Block.java:363, RectRow.java:78)',
    LOOP,
    () => {
      for (const found of p2Stops()) {
        const { rebuilt } = replayRows(found);
        const index = rebuilt.list.findIndex((candidate) => candidate.getChildren().length > 0);
        const row = rebuilt.list[index]!;
        const first = row.getChildren()[0]!;
        row.setWidth(Number.NaN);
        first.resetBlock();
        const spacing = num(found.rec.rows[index]!.spacing);
        const expected = row
          .getChildren()
          .reduce((sum, block, index) => sum + (block.getWidth() + (index > 0 ? spacing : 0)), 0);
        expect(row.getWidth()).toBe(expected);
      }
    },
  );

  it(
    'placeRectsIn(width) at the recorded width changes nothing and reproduces the recorded block, its rows and node positions',
    LOOP,
    () => {
      const visited = eachBlock((entry, block, replay) => {
        const changed = block.placeRectsIn(block.getWidth());
        expect(changed).toBe(false);
        const index = replay.rebuilt.blocks.indexOf(block);
        const comparison = compareJson(entry, dumpRectRows(replay.rebuilt.list).blocks[index], EXACT);
        expect(formatDifferences(comparison)).toBe('');
      });
      expect(visited).toBe(659);
    },
  );

  it(
    'placeRectsIn(width) at the width of one single row reports a change exactly when the recorded block has several rows (Block.java:317-322)',
    LOOP,
    () => {
      let merged = 0;
      eachBlock((entry, block, replay) => {
        const spacing = num(entry.spacing);
        const nodes = entry.children.map((id) => replay.nodes.get(id)!);
        const oneRowWidth = nodes.reduce((sum, node, index) => sum + (node.getWidth() + (index > 0 ? spacing : 0)), 0);
        const changed = block.placeRectsIn(oneRowWidth);
        expect(changed).toBe(entry.rows.length > 1);
        expect(block.getRows().length).toBe(1);
        expect(block.getWidth()).toBe(oneRowWidth);
        merged += changed ? 1 : 0;
      });
      expect(merged).toBeGreaterThan(0);
    },
  );

  it(
    'placeRectsIn(width, height) is true at the recorded size, false one unit below the height and false at width 0 for a positive-width rectangle (Block.java:297-310)',
    LOOP,
    () => {
      eachBlock((entry, block) => {
        // At width 0 the bounds are at least as wide as the widest rectangle, so a block with a positive-width rectangle never
        // fits (blocks of zero-size rectangles, the edge/zero* rows, are skipped: their bounds are only the spacing).
        const widest = Math.max(...block.getChildren().map((node) => node.getWidth()));
        expect(block.placeRectsIn(num(entry.width), num(entry.height))).toBe(true);
        expect(block.placeRectsIn(num(entry.width), num(entry.height) - 1)).toBe(false);
        if (widest > 0) {
          expect(block.placeRectsIn(0, num(entry.height))).toBe(false);
        }
      });
    },
  );

  it(
    'getHeightForTargetWidth gives the recorded height at the recorded width and does not move a rectangle (Block.java:226-229)',
    LOOP,
    () => {
      eachBlock((entry, block, replay) => {
        const before = dumpRectRows(replay.rebuilt.list);
        expect(block.getHeightForTargetWidth(num(entry.width))).toBe(num(entry.height));
        expect(compareJson(before, dumpRectRows(replay.rebuilt.list), EXACT).differences).toEqual([]);
      });
    },
  );

  it('getWidthForTargetHeight returns minWidth when all rectangles fit below each other (Block.java:194)', LOOP, () => {
    eachBlock((entry, block) => {
      expect(block.getWidthForTargetHeight(num(entry.maxHeight))).toBe(num(entry.minWidth));
    });
  });

  it(
    'getWidthForTargetHeight returns minWidth when the minimal width already fits the height (Block.java:199)',
    LOOP,
    () => {
      eachBlock((entry, block) => {
        const heightAtMinWidth = block.getHeightForTargetWidth(num(entry.minWidth));
        expect(block.getWidthForTargetHeight(heightAtMinWidth)).toBe(num(entry.minWidth));
      });
    },
  );

  it(
    'getWidthForTargetHeight finds a viable width between minWidth and width by bisection (Block.java:204-218)',
    LOOP,
    () => {
      let bisected = 0;
      eachBlock((entry, block) => {
        const height = num(entry.height);
        const result = block.getWidthForTargetHeight(height);
        expect(result).toBeGreaterThanOrEqual(num(entry.minWidth));
        expect(block.getHeightForTargetWidth(result)).toBeLessThanOrEqual(height);
        if (result > num(entry.minWidth)) {
          bisected++;
          expect(result).toBeLessThanOrEqual(num(entry.width));
        }
      });
      expect(bisected).toBeGreaterThan(0);
    },
  );

  it(
    'getWidthForTargetHeight keeps the first viable bisection width: a height the first midpoint already satisfies (Block.java:209-217)',
    LOOP,
    () => {
      let early = 0;
      eachBlock((entry, block) => {
        const minWidth = num(entry.minWidth);
        const middle = (num(entry.width) - minWidth) / 2 + minWidth;
        const height = block.getHeightForTargetWidth(middle);
        const fitsAtMinimum = block.getHeightForTargetWidth(minWidth) <= height;
        if (!fitsAtMinimum && minWidth + 1 < num(entry.width)) {
          const result = block.getWidthForTargetHeight(height);
          expect(result).toBeLessThanOrEqual(middle);
          expect(result).toBeGreaterThanOrEqual(minWidth);
          expect(block.getHeightForTargetWidth(result)).toBeLessThanOrEqual(height);
          early++;
        }
      });
      expect(early).toBeGreaterThan(0);
    },
  );

  it(
    'resetBlock deletes emptied block rows and counts them in the spacing index, as Java does (Block.java:331-345)',
    LOOP,
    () => {
      let emptied = 0;
      eachBlock((entry, block) => {
        if (entry.rows.length > 1) {
          const spacing = num(entry.spacing);
          const [first, ...others] = block.getRows();
          for (const rect of [...first!.getNodes()]) {
            first!.removeRectangle(rect, false);
          }
          block.resetBlock();
          expect(block.getRows()).toEqual(others);
          // index counts the deleted row: the first remaining row already carries a spacing.
          const height = entry.rows.slice(1).reduce((sum, row) => sum + (num(row.height) + spacing), 0);
          expect(block.getHeight()).toBe(height);
          expect(block.getWidth()).toBe(Math.max(...entry.rows.slice(1).map((row) => num(row.width))));
          emptied++;
        }
      });
      expect(emptied).toBeGreaterThan(0);
    },
  );

  it('removeChild of the last rectangle of a one-rectangle block row drops that row (Block.java:118-130)', LOOP, () => {
    let dropped = 0;
    eachBlock((entry, block) => {
      const last = entry.rows[entry.rows.length - 1]!;
      if (entry.rows.length > 1 && last.rects.length === 1) {
        const node = block.getChildren()[block.getChildren().length - 1]!;
        block.removeChild(node);
        expect(block.getRows().length).toBe(entry.rows.length - 1);
        expect(block.getChildren().map((n) => n.getIdentifier())).toEqual(entry.children.slice(0, -1));
        expect(block.getHeight()).toBe(
          entry.rows
            .slice(0, -1)
            .reduce((sum, row, index) => sum + num(row.height) + (index > 0 ? num(row.spacing) : 0), 0),
        );
        dropped++;
      }
    });
    expect(dropped).toBeGreaterThan(0);
  });

  it(
    'removeChild shifts the remaining rectangles of the block row left and keeps the others (Block.java:121-122, BlockRow.java:99-122)',
    LOOP,
    () => {
      let shifted = 0;
      eachBlock((entry, block, replay) => {
        const row = entry.rows[0]!;
        if (row.rects.length > 1) {
          const [removed, ...remaining] = row.rects;
          block.removeChild(replay.nodes.get(removed!)!);
          let x = num(row.x);
          for (const id of remaining) {
            const node = replay.nodes.get(id)!;
            expect(node.getX()).toBe(x);
            x += node.getWidth() + num(row.spacing);
          }
          expect(block.getChildren().length).toBe(entry.children.length - 1);
          shifted++;
        }
      });
      expect(shifted).toBeGreaterThan(0);
    },
  );

  it('removeChild of a rectangle that is not in the block removes nothing (identity, Block.java:119)', () => {
    const found = p2Stops()[0]!;
    const { rebuilt, nodes } = replayRows(found);
    const block = rebuilt.blocks[0]!;
    const outsider = [...nodes.values()].find(
      (node) => !block.getChildren().includes(node) && node.getParent() !== null,
    )!;
    const before = block.getChildren().length;
    block.removeChild(outsider);
    expect(block.getChildren().length).toBe(before);
  });

  it(
    'setLocation moves the children and block rows by the change and records the new location (Block.java:140-148)',
    LOOP,
    () => {
      eachBlock((entry, block) => {
        const target = [num(entry.x) + num(entry.width), num(entry.y) + num(entry.height)] as const;
        const xChange = target[0] - num(entry.x);
        const yChange = target[1] - num(entry.y);
        const rects = block.getChildren().map((n) => [n.getX(), n.getY()] as const);
        const rows = block.getRows().map((r) => [r.getX(), r.getY()] as const);
        block.setLocation(...target);
        expect([block.getX(), block.getY()]).toEqual([...target]);
        expect(block.getChildren().map((n) => [n.getX(), n.getY()])).toEqual(
          rects.map(([x, y]) => [x + xChange, y + yChange]),
        );
        expect(block.getRows().map((r) => [r.getX(), r.getY()])).toEqual(
          rows.map(([x, y]) => [x + target[0] - num(entry.x), y + target[1] - num(entry.y)]),
        );
      });
    },
  );

  it(
    'expand widens the block and its rows by the additional width and distributes the additional height (Block.java:371-381)',
    LOOP,
    () => {
      eachBlock((entry, block) => {
        const additionalWidth = num(entry.minWidth);
        const additionalHeight = num(entry.minHeight);
        block.expand(additionalWidth, additionalHeight);
        expect(block.getWidth()).toBe(num(entry.width) + additionalWidth);
        expect(block.getHeight()).toBe(num(entry.height) + additionalHeight);
        const perRow = additionalHeight / entry.rows.length;
        block.getRows().forEach((row) => {
          expect(row.getWidth()).toBe(num(entry.width) + additionalWidth);
          expect(row.getHeight()).toBe(num(entry.rows[block.getRows().indexOf(row)]!.height) + perRow);
        });
      });
    },
  );

  it('getLastRow, getLastRowNewX and getLastRowY read the last recorded block row (Block.java:530-545)', LOOP, () => {
    eachBlock((entry, block) => {
      const last = entry.rows[entry.rows.length - 1]!;
      expect(block.getLastRow()).toBe(block.getRows()[entry.rows.length - 1]);
      expect(block.getLastRowNewX()).toBe(num(last.x) + num(last.width));
      expect(block.getLastRowY()).toBe(num(last.y));
    });
  });

  it('the setters write the recorded flags and sizes through (Block.java:398-417, 502-518, 557-573)', () => {
    const found = p2Stops()[0]!;
    const { rebuilt, rec } = replayRows(found);
    const block = rebuilt.blocks[0]!;
    const entry = rec.blocks[0]!;
    const stack = rebuilt.stacks[entry.stack!]!;
    block.setFixed(!entry.fixed);
    block.setPositionFixed(!entry.positionFixed);
    block.setWidth(num(entry.maxHeight));
    block.setHeight(num(entry.minWidth));
    block.setSmallestRectWidth(num(entry.minHeight));
    block.setParentRow(rebuilt.rows[rebuilt.rows.length - 1]!);
    block.setStack(null);
    expect([block.isFixed(), block.isPositionFixed()]).toEqual([!entry.fixed, !entry.positionFixed]);
    expect([block.getWidth(), block.getHeight(), block.getSmallestRectWidth()]).toEqual(
      [entry.maxHeight, entry.minWidth, entry.minHeight].map(num),
    );
    expect(block.getParentRow()).toBe(rebuilt.rows[rebuilt.rows.length - 1]);
    expect(block.getStack()).toBeNull();
    block.setStack(stack);
    expect(block.getStack()).toBe(stack);
  });

  it('getLastRow of a block without rows throws the IndexOutOfBoundsException of ArrayList.get(-1) (Block.java:544)', () => {
    const found = p2Stops()[0]!;
    const { rebuilt } = replayRows(found);
    const empty = new Block(0, 0, rebuilt.rows[0]!, 0);
    // The message template is the one JVM-recorded in topdownpacking.json ("Index -1 out of bounds for length 2", GridElkNode.java:73).
    expect(() => empty.getLastRow()).toThrow(new IndexOutOfBoundsException('Index -1 out of bounds for length 0'));
    expect(() => empty.addChildInNewRow(rebuilt.blocks[0]!.getChildren()[0]!)).toThrow(IndexOutOfBoundsException);
  });
});
