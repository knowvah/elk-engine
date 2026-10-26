// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { GreedyRectangleStripOverlapRemover } from './GreedyRectangleStripOverlapRemover.js';
import type { IRectangleStripOverlapRemovalStrategy } from './IRectangleStripOverlapRemovalStrategy.js';
import {
  OverlapRemovalDirection,
  type RectangleNode,
  RectangleStripOverlapRemover,
} from './RectangleStripOverlapRemover.js';

const GAP = 2;
const START = 10;

/** Three rectangles in a row that overlap pairwise-ish: a and b overlap, c overlaps b only. */
function rects(): ElkRectangle[] {
  return [new ElkRectangle(0, 0, 10, 4), new ElkRectangle(5, 100, 10, 6), new ElkRectangle(14, 50, 10, 3)];
}

function run(direction: OverlapRemovalDirection, input: ElkRectangle[]): number {
  const remover = RectangleStripOverlapRemover.createForDirection(direction)
    .withGap(GAP, GAP)
    .withStartCoordinate(START);
  for (const rect of input) {
    remover.addRectangle(rect);
  }
  return remover.removeOverlaps();
}

describe('RectangleStripOverlapRemover builder', () => {
  it('defaults both gaps to 5', () => {
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN);
    expect(remover.getHorizontalGap()).toBe(5);
    expect(remover.getVerticalGap()).toBe(5);
  });

  it('withGap sets horizontal then vertical gap and chains', () => {
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN);
    expect(remover.withGap(1, 2)).toBe(remover);
    expect(remover.getHorizontalGap()).toBe(1);
    expect(remover.getVerticalGap()).toBe(2);
  });

  it('withStartCoordinate and withOverlapRemovalStrategy chain', () => {
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN);
    expect(remover.withStartCoordinate(3)).toBe(remover);
    expect(remover.withOverlapRemovalStrategy(new GreedyRectangleStripOverlapRemover())).toBe(remover);
  });

  it('addRectangle chains and records one node per rectangle', () => {
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN);
    const rect = new ElkRectangle(1, 2, 3, 4);
    expect(remover.addRectangle(rect)).toBe(remover);
    expect(remover.getRectangleNodes().length).toBe(1);
    expect(remover.getRectangleNodes()[0]!.getRectangle()).toBe(rect);
  });

  it('uses a custom strategy and returns its strip size', () => {
    const strategy: IRectangleStripOverlapRemovalStrategy = { removeOverlaps: () => 42 };
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN)
      .withOverlapRemovalStrategy(strategy)
      .addRectangle(new ElkRectangle(0, 0, 1, 1));
    expect(remover.removeOverlaps()).toBe(42);
  });
});

describe('RectangleStripOverlapRemover directions', () => {
  it('DOWN adds the start coordinate to the strategy-written y', () => {
    const input = rects();
    const size = run(OverlapRemovalDirection.DOWN, input);
    // a at 0; b overlaps a -> 4 + 2; c overlaps b only -> placed above b's range check: 0 < 6+6+2 && 0+3+2 > 6? no -> 0
    expect(input.map((r) => r.y)).toEqual([START + 0, START + 6, START + 0]);
    expect(input.map((r) => r.x)).toEqual([0, 5, 14]);
    expect(size).toBe(12);
  });

  it('UP mirrors y around the start coordinate', () => {
    const input = rects();
    const size = run(OverlapRemovalDirection.UP, input);
    expect(input.map((r) => r.y)).toEqual([START - 4 - 0, START - 6 - 6, START - 3 - 0]);
    expect(size).toBe(12);
  });

  it('RIGHT moves along x using the transposed rectangle', () => {
    // Transposed: (x=y, y=0, w=height, h=width). Rectangles overlap in y-extent, so x is increased.
    const input = [new ElkRectangle(0, 0, 4, 10), new ElkRectangle(100, 5, 6, 10)];
    const size = run(OverlapRemovalDirection.RIGHT, input);
    expect(input.map((r) => r.x)).toEqual([START + 0, START + 6]);
    expect(input.map((r) => r.y)).toEqual([0, 5]);
    expect(size).toBe(12);
  });

  it('LEFT mirrors x around the start coordinate', () => {
    const input = [new ElkRectangle(0, 0, 4, 10), new ElkRectangle(100, 5, 6, 10)];
    const size = run(OverlapRemovalDirection.LEFT, input);
    // transposed heights are the original widths: 4 and 6; second placed at y=4+2=6 in strip space
    expect(input.map((r) => r.x)).toEqual([START - 4 - 0, START - 6 - 6]);
    expect(input.map((r) => r.y)).toEqual([0, 5]);
    expect(size).toBe(12);
  });

  it('drops a rectangle with an equal right border from the scanline set (TreeSet semantics)', () => {
    // a and b share the right border 10; c starts inside both. c overlaps only the retained one.
    const a = new ElkRectangle(0, 0, 10, 1);
    const b = new ElkRectangle(2, 0, 8, 1);
    const c = new ElkRectangle(5, 0, 1, 1);
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN);
    [a, b, c].forEach((r) => remover.addRectangle(r));
    remover.removeOverlaps();
    const nodes = remover.getRectangleNodes();
    // b is dropped from the set (same right border as a), so c overlaps only a
    expect(nodes.map((n) => n.getOverlappingNodes().length)).toEqual([2, 1, 1]);
  });
});

describe('OverlapRemovalDirection', () => {
  it('lists constants in declaration order', () => {
    expect(OverlapRemovalDirection.values().map((d) => d.name())).toEqual(['UP', 'DOWN', 'LEFT', 'RIGHT']);
    expect(OverlapRemovalDirection.RIGHT.ordinal()).toBe(3);
    expect(OverlapRemovalDirection.LEFT.toString()).toBe('LEFT');
  });

  it('valueOf resolves names and rejects unknown ones', () => {
    expect(OverlapRemovalDirection.valueOf('UP')).toBe(OverlapRemovalDirection.UP);
    expect(() => OverlapRemovalDirection.valueOf('SIDEWAYS')).toThrow(IllegalArgumentException);
  });
});

describe('GreedyRectangleStripOverlapRemover', () => {
  it('result does not depend on the order rectangles are added in', () => {
    const forward = rects();
    run(OverlapRemovalDirection.DOWN, forward);
    const reversed = rects().reverse();
    run(OverlapRemovalDirection.DOWN, reversed);
    expect(reversed.reverse().map((r) => r.y)).toEqual(forward.map((r) => r.y));
  });

  it('compareByYCoordinate orders by y with Double.compare semantics', () => {
    const remover = RectangleStripOverlapRemover.createForDirection(OverlapRemovalDirection.DOWN)
      .addRectangle(new ElkRectangle(0, -0, 1, 1))
      .addRectangle(new ElkRectangle(0, 0, 1, 1));
    const [n1, n2] = remover.getRectangleNodes() as [RectangleNode, RectangleNode];
    // Double.compare orders -0.0 before 0.0
    expect(GreedyRectangleStripOverlapRemover.compareByYCoordinate(n1, n2)).toBe(-1);
    n1.rectangle.y = 0;
    expect(GreedyRectangleStripOverlapRemover.compareByYCoordinate(n1, n2)).toBe(0);
    n1.rectangle.y = 1;
    expect(GreedyRectangleStripOverlapRemover.compareByYCoordinate(n1, n2)).toBe(1);
  });
});
