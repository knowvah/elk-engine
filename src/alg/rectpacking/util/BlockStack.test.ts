// SPDX-License-Identifier: EPL-2.0
// Proof of BlockStack (mission 8c, T6): stacks are rebuilt from the recorded p2 stops (rectpacking.json, 161 stops) and every
// expectation is a recorded stack, a recorded block position, or the arithmetic of BlockStack.java on recorded sizes where a method is
// not observable through a stop.
import { describe, expect, it } from 'vitest';
import { decodeHex, type BlockStackEntry } from '../../../../test/helpers/rectpacking-replay-rows.js';
import { p2Stops, replayRows, type RowsReplay } from '../../../../test/helpers/rectpacking-replay-run.js';
import { BlockStack } from './BlockStack.js';

const LOOP = { timeout: 60_000 };
const num = decodeHex;

/** Every (recorded stack entry, rebuilt stack, replay, index) of every p2 stop. */
function eachStack(
  visit: (entry: BlockStackEntry, stack: BlockStack, replay: RowsReplay, index: number) => void,
): number {
  let visited = 0;
  for (const found of p2Stops()) {
    const replay = replayRows(found);
    found.rec.stacks.forEach((entry, index) => {
      visit(entry, replay.rebuilt.stacks[index]!, replay, index);
      visited++;
    });
  }
  return visited;
}

describe('BlockStack (BlockStack.java)', () => {
  it('exposes the recorded stack state and its blocks through the getters (BlockStack.java:186-249)', LOOP, () => {
    const visited = eachStack((entry, stack, replay) => {
      expect([stack.getX(), stack.getY(), stack.getWidth(), stack.getHeight()]).toEqual(
        [entry.x, entry.y, entry.width, entry.height].map(num),
      );
      expect(stack.getBlocks()).toEqual(entry.blocks.map((b) => replay.rebuilt.blocks[b]));
    });
    expect(visited).toBe(p2Stops().reduce((sum, found) => sum + found.rec.stacks.length, 0));
  });

  it(
    'addBlock links each block to the stack and accumulates width and height as recorded (BlockStack.java:79-84)',
    LOOP,
    () => {
      eachStack((entry, original, replay) => {
        const stack = new BlockStack(num(entry.x), num(entry.y), num(entry.spacing));
        for (const index of entry.blocks) {
          stack.addBlock(replay.rebuilt.blocks[index]!);
        }
        expect([stack.getWidth(), stack.getHeight()]).toEqual([num(entry.width), num(entry.height)]);
        expect(stack.getBlocks()).toEqual(original.getBlocks());
        for (const block of stack.getBlocks()) {
          expect(block.getStack()).toBe(stack);
        }
      });
    },
  );

  it('updateDimension reproduces the recorded width and height of all stacks (BlockStack.java:90-101)', LOOP, () => {
    eachStack((entry, stack) => {
      stack.setWidth(Number.NaN);
      stack.setHeight(Number.NaN);
      stack.updateDimension();
      expect([stack.getWidth(), stack.getHeight()]).toEqual([num(entry.width), num(entry.height)]);
    });
  });

  it('setLocation moves the stack and every block by the change (BlockStack.java:108-116)', LOOP, () => {
    eachStack((entry, stack) => {
      const target = [num(entry.x) + num(entry.width), num(entry.y) + num(entry.height)] as const;
      const blocks = stack.getBlocks().map((b) => [b.getX(), b.getY()] as const);
      stack.setLocation(...target);
      expect([stack.getX(), stack.getY()]).toEqual([...target]);
      expect(stack.getBlocks().map((b) => [b.getX(), b.getY()])).toEqual(
        blocks.map(([x, y]) => [x + (target[0] - num(entry.x)), y + (target[1] - num(entry.y))]),
      );
    });
  });

  it(
    'placeRectsIn stacks the blocks below each other at the recorded block positions and widths (BlockStack.java:155-168)',
    LOOP,
    () => {
      const visited = eachStack((entry, stack, replay) => {
        stack.placeRectsIn(num(entry.width));
        stack.getBlocks().forEach((block, position) => {
          const recorded = replay.rec.blocks[entry.blocks[position]!]!;
          expect([block.getX(), block.getY(), block.getWidth()]).toEqual(
            [recorded.x, recorded.y, recorded.width].map(num),
          );
        });
        expect(stack.getWidth()).toBe(num(entry.width));
        // Java stores `currentY` (which starts at the stack's y and includes the trailing spacing) as the height.
        const last = stack.getBlocks()[stack.getBlocks().length - 1]!;
        expect(stack.getHeight()).toBe(last.getY() + (last.getHeight() + num(entry.spacing)));
      });
      expect(visited).toBeGreaterThan(0);
    },
  );

  it(
    'getWidthForFixedHeight of a one-block stack is the block width for that height (BlockStack.java:128-131)',
    LOOP,
    () => {
      let single = 0;
      eachStack((entry, stack) => {
        if (entry.blocks.length === 1) {
          const block = stack.getBlocks()[0]!;
          const height = num(entry.height);
          expect(stack.getWidthForFixedHeight(height)).toBe(block.getWidthForTargetHeight(height));
          single++;
        }
      });
      expect(single).toBeGreaterThan(0);
    },
  );

  it(
    'getWidthForFixedHeight of a multi-block stack bisects to a width whose blocks fit the height (BlockStack.java:133-156)',
    LOOP,
    () => {
      let bisected = 0;
      eachStack((entry, stack) => {
        if (entry.blocks.length > 1) {
          // Heights above the sum of the block heights: every candidate width is viable, so the bisection ends at the lower bound.
          const generous = num(entry.height) * 2 + 1;
          const result = stack.getWidthForFixedHeight(generous);
          const total = stack.getBlocks().reduce((sum, block) => sum + block.getHeightForTargetWidth(result), 0);
          expect(result).toBeLessThanOrEqual(stack.getWidth());
          expect(total).toBeLessThan(generous);
          // A height no width can reach (every block is at least as high as 0): no candidate is viable and the stack width is kept.
          expect(stack.getWidthForFixedHeight(0)).toBe(stack.getWidth());
          bisected++;
        }
      });
      expect(bisected).toBeGreaterThan(0);
    },
  );

  it(
    'expand enlarges every block of the stack by the additional width and its share of the additional height (BlockStack.java:196-205)',
    LOOP,
    () => {
      eachStack((entry, stack) => {
        if (entry.blocks.length > 0) {
          const additionalWidth = num(entry.x) + 1;
          const additionalHeight = num(entry.height);
          const widths = stack.getBlocks().map((b) => b.getWidth());
          const heights = stack.getBlocks().map((b) => b.getHeight());
          const perBlock = additionalHeight / entry.blocks.length;
          stack.expand(additionalWidth, additionalHeight);
          stack.getBlocks().forEach((block, index) => {
            // Block.expand(stack.width - block.width + additionalWidth, perBlock): the block grows to the stack width + additionalWidth.
            expect(block.getWidth()).toBe(widths[index]! + (num(entry.width) - widths[index]! + additionalWidth));
            expect(block.getHeight()).toBe(heights[index]! + perBlock);
          });
        }
      });
    },
  );

  it('the setters write the recorded values (BlockStack.java:224-247)', () => {
    const found = p2Stops()[0]!;
    const { rebuilt, rec } = replayRows(found);
    const stack = rebuilt.stacks[0]!;
    stack.setWidth(num(rec.stacks[0]!.height));
    stack.setHeight(num(rec.stacks[0]!.width));
    expect([stack.getWidth(), stack.getHeight()]).toEqual([num(rec.stacks[0]!.height), num(rec.stacks[0]!.width)]);
  });
});
