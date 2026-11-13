// SPDX-License-Identifier: EPL-2.0
// Proof of RectRow (mission 8c, T6): rows are rebuilt from the recorded p2 stops (rectpacking.json, 161 stops) and every
// expectation is a recorded row, the p3 stops that replay RectangleExpansion.expand over them (34 stops), or the arithmetic of
// RectRow.java on recorded sizes where a method is not observable through a stop.
import { describe, expect, it } from 'vitest';
import {
  compareJson,
  dumpRectRows,
  formatDifferences,
  TOLERANCE,
} from '../../../../test/helpers/rectpacking-replay-dump.js';
import { dumpElk } from '../../../../test/helpers/rectpacking-replay-elk.js';
import {
  collectStops,
  decodeHex,
  STOP_AFTER_ASPECT_RATIO_EXPANDER,
  STOP_AFTER_EQUAL_WHITESPACE,
  type RectRowEntry,
} from '../../../../test/helpers/rectpacking-replay-rows.js';
import { p2Stops, replayRows, type RowsReplay } from '../../../../test/helpers/rectpacking-replay-run.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { RectRow } from './RectRow.js';

const LOOP = { timeout: 60_000 };
const totalRows = (): number => p2Stops().reduce((sum, found) => sum + found.rec.rows.length, 0);
const EXACT = 0;
const num = decodeHex;

/**
 * Stops rows on which `resetStacks` + `calculateBlockStacks` does not rebuild the recorded stacks (mission 8c, T14; needs-ruling
 * issue #78). `calculateBlockStacks` groups ADJACENT blocks of equal x (RectRow.java:98-108) and has no caller in the Java; the
 * compaction appends a moved block to the row's children after blocks of other stacks (`placeBelow`, `placeNextBeside`:
 * Compaction.java:309-325, 411-413), so in these rows the blocks of one stack are not adjacent (children x order such as
 * 0, 0, 55, 0). The rows stay exactly as the oracle recorded them, and the port replays them at raw bits through the phases.
 */
const CHILDREN_NOT_X_GROUPED_ROWS: readonly string[] = [
  'stops/arm/fixedBlockSkip/default',
  'stops/arm/fixedBlockSkipSpaced/default',
  'stops/arm/staleParentRow/default',
  'stops/arm/staleParentRowNoSpacing/default',
];

/** Every (recorded row entry, rebuilt row, replay) of every p2 stop. */
function eachRow(visit: (entry: RectRowEntry, row: RectRow, replay: RowsReplay, index: number) => void): number {
  let visited = 0;
  for (const found of p2Stops()) {
    const replay = replayRows(found);
    found.rec.rows.forEach((entry, index) => {
      visit(entry, replay.rebuilt.rows[index]!, replay, index);
      visited++;
    });
  }
  return visited;
}

describe('RectRow (RectRow.java)', () => {
  it(
    'replays RectangleExpansion.expand over the p2 rows: nodes, ports, labels and rows equal the p3 stops (RectRow.java:96-107, 253)',
    LOOP,
    () => {
      let replayed = 0;
      const names = [STOP_AFTER_EQUAL_WHITESPACE, STOP_AFTER_ASPECT_RATIO_EXPANDER];
      for (const found of collectStops(names)) {
        const previous = found.run.stops[found.run.stops.indexOf(found.stop) - 1]!;
        const replay = replayRows({ ...found, stop: previous });
        const { list } = replay.rebuilt;
        const drawingWidth = num(found.stop.state.props.drawingWidth!);
        const additionalHeight = num(found.stop.state.props.additionalHeight!);
        // RectangleExpansion.expand (RectangleExpansion.java), the call sequence the two p3 processors end in.
        const heightPerRow = additionalHeight / list.length;
        list.forEach((row, index) => {
          row.setY(row.getY() + heightPerRow * index);
          row.expand(drawingWidth, heightPerRow);
        });
        const { graph, nodes, ports, labels, extras, rows } = found.stop.state;
        const actual = { ...dumpElk(replay.layout), rows: dumpRectRows(list) };
        const comparison = compareJson({ graph, nodes, ports, labels, extras, rows }, actual, TOLERANCE);
        expect(formatDifferences(comparison), `${found.row.id} ${found.stop.stop}`).toBe('');
        replayed++;
      }
      expect(replayed).toBe(34);
    },
  );

  it(
    'notifyAboutNodeChange sums the block widths plus spacing and takes the highest block (RectRow.java:78-91)',
    LOOP,
    () => {
      const visited = eachRow((entry, row) => {
        if (entry.blocks.length > 0) {
          const spacing = num(entry.spacing);
          const blocks = row.getChildren();
          const width = blocks.reduce((sum, block, index) => sum + (block.getWidth() + (index > 0 ? spacing : 0)), 0);
          const height = Math.max(...blocks.map((block) => block.getHeight()));
          row.notifyAboutNodeChange();
          expect([row.getWidth(), row.getHeight()]).toEqual([width, height]);
        }
      });
      expect(visited).toBe(totalRows());
    },
  );

  it(
    'getFirstBlock, getLastBlock and getNumberOfAssignedBlocks follow the recorded block indices (RectRow.java:124-148)',
    LOOP,
    () => {
      eachRow((entry, row, replay) => {
        if (entry.blocks.length > 0) {
          expect(row.getFirstBlock()).toBe(replay.rebuilt.blocks[entry.blocks[0]!]);
          expect(row.getLastBlock()).toBe(replay.rebuilt.blocks[entry.blocks[entry.blocks.length - 1]!]);
        }
        expect(row.getNumberOfAssignedBlocks()).toBe(entry.blocks.length);
      });
    },
  );

  it('getFirstBlock and getLastBlock of an empty row throw the IndexOutOfBoundsException of ArrayList.get (RectRow.java:127, 134)', () => {
    const found = p2Stops()[0]!;
    const empty = new RectRow(num(found.rec.rows[0]!.y), num(found.rec.rows[0]!.spacing));
    // Message template JVM-recorded in topdownpacking.json ("Index -1 out of bounds for length 2", GridElkNode.java:73).
    expect(() => empty.getFirstBlock()).toThrow(new IndexOutOfBoundsException('Index 0 out of bounds for length 0'));
    expect(() => empty.getLastBlock()).toThrow(new IndexOutOfBoundsException('Index -1 out of bounds for length 0'));
  });

  it(
    'addBlock accumulates the width with spacing between blocks and keeps the highest block (RectRow.java:158-162)',
    LOOP,
    () => {
      eachRow((entry, original, replay) => {
        if (entry.blocks.length > 0) {
          const row = new RectRow(num(entry.y), num(entry.spacing));
          let width = 0;
          let height = 0;
          entry.blocks.forEach((blockIndex, position) => {
            const block = replay.rebuilt.blocks[blockIndex]!;
            row.addBlock(block);
            width += block.getWidth() + (position === 0 ? 0 : num(entry.spacing));
            height = Math.max(height, block.getHeight());
          });
          expect([row.getWidth(), row.getHeight()]).toEqual([width, height]);
          expect(row.getChildren()).toEqual(original.getChildren());
        }
      });
    },
  );

  it(
    'removeBlock removes by identity: an equal-valued block of another rebuild stays out, the width still shrinks (RectRow.java:170-178)',
    LOOP,
    () => {
      const found = p2Stops().find((f) => f.rec.rows.some((r) => r.blocks.length > 1))!;
      const index = found.rec.rows.findIndex((r) => r.blocks.length > 1);
      const row = replayRows(found).rebuilt.rows[index]!;
      const twin = replayRows(found).rebuilt.rows[index]!.getChildren()[0]!;
      const before = [row.getChildren().length, row.getWidth()];
      row.removeBlock(twin);
      expect(twin.getWidth()).toBe(row.getChildren()[0]!.getWidth());
      expect(row.getChildren().length).toBe(before[0]);
      expect(row.getWidth()).toBe(before[1]! - (twin.getWidth() + num(found.rec.rows[index]!.spacing)));
    },
  );

  it(
    'removeBlock drops the block, shrinks the width and takes the highest remaining block (RectRow.java:170-178)',
    LOOP,
    () => {
      let removed = 0;
      eachRow((entry, row) => {
        if (entry.blocks.length > 1) {
          const block = row.getChildren()[0]!;
          const widthBefore = row.getWidth();
          const remaining = row.getChildren().slice(1);
          row.removeBlock(block);
          expect(row.getChildren()).toEqual(remaining);
          expect(row.getWidth()).toBe(widthBefore - (block.getWidth() + num(entry.spacing)));
          // Java seeds the maximum with Double.MIN_VALUE (RectRow.java:175), so zero-height blocks leave it at MIN_VALUE.
          expect(row.getHeight()).toBe(Math.max(Number.MIN_VALUE, ...remaining.map((b) => b.getHeight())));
          removed++;
        }
      });
      expect(removed).toBeGreaterThan(0);
    },
  );

  it('removeBlock of the last block leaves the Double.MIN_VALUE height sentinel (RectRow.java:176-177)', LOOP, () => {
    let emptied = 0;
    eachRow((entry, row) => {
      if (entry.blocks.length === 1) {
        const block = row.getChildren()[0]!;
        const widthBefore = row.getWidth();
        row.removeBlock(block);
        expect(row.getChildren()).toEqual([]);
        expect(row.getHeight()).toBe(Number.MIN_VALUE);
        expect(row.getHeight()).toBe(num('0000000000000001'));
        expect(row.getWidth()).toBe(widthBefore - block.getWidth());
        emptied++;
      }
    });
    expect(emptied).toBeGreaterThan(0);
  });

  it(
    'resetStacks followed by calculateBlockStacks rebuilds the recorded stacks of every row (RectRow.java:110-122, 248-251)',
    LOOP,
    () => {
      const differing = new Set<string>();
      const visited = eachRow((entry, row, replay) => {
        if (entry.blocks.length > 0) {
          row.resetStacks();
          expect(row.getStacks()).toEqual([]);
          row.calculateBlockStacks();
          const rebuilt = dumpRectRows(replay.rebuilt.list);
          const index = replay.rebuilt.rows.indexOf(row);
          if (index < rebuilt.listSize) {
            const stacks = rebuilt.rows[index]!.stacks.map((s) => rebuilt.stacks[s]);
            const recorded = entry.stacks.map((s) => replay.rec.stacks[s]);
            if (formatDifferences(compareJson(recorded, stacks, EXACT)) !== '') {
              differing.add(replay.row.id);
            }
          }
        }
      });
      expect(visited).toBe(totalRows());
      // every row rebuilds its recorded stacks except exactly the classified ones (a change in either direction fails)
      expect([...differing].sort()).toEqual([...CHILDREN_NOT_X_GROUPED_ROWS].sort());
    },
  );

  it('setY moves every stack of the row by the change and records the new y (RectRow.java:216-222)', LOOP, () => {
    eachRow((entry, row) => {
      const newY = num(entry.y) + num(entry.height);
      const change = newY - num(entry.y);
      const stackYs = row.getStacks().map((s) => s.getY());
      row.setY(newY);
      expect(row.getY()).toBe(newY);
      expect(row.getStacks().map((s) => s.getY())).toEqual(stackYs.map((y) => y + change));
    });
  });

  it('the getters and setters read and write the recorded values (RectRow.java:185-246)', () => {
    const found = p2Stops()[0]!;
    const { rebuilt, rec } = replayRows(found);
    const row = rebuilt.rows[0]!;
    const entry = rec.rows[0]!;
    expect([row.getY(), row.getWidth(), row.getHeight(), row.getPotentialAdditionalWidthToGetLastBlock()]).toEqual(
      [entry.y, entry.width, entry.height, entry.potentialAdditionalWidth].map(num),
    );
    row.setHeight(num(entry.width));
    row.setWidth(num(entry.height));
    row.setPotentialAdditionalWidthToGetLastBlock(num(entry.y) + 1);
    expect([row.getHeight(), row.getWidth(), row.getPotentialAdditionalWidthToGetLastBlock()]).toEqual([
      num(entry.width),
      num(entry.height),
      num(entry.y) + 1,
    ]);
    expect(row.getStacks().length).toBe(entry.stacks.length);
  });
});
