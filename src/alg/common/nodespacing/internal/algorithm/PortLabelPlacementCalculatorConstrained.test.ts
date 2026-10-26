// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLayoutMetaData } from '../../../../../../test/helpers/node-context-fixtures.js';
import {
  placedOn,
  placementContext,
  type Placed,
  type PlacementSetup,
} from '../../../../../../test/helpers/port-label-fixtures.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { HorizontalLabelAlignment } from '../../cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../../cellsystem/VerticalLabelAlignment.js';
import { PortLabelPlacementCalculator } from './PortLabelPlacementCalculator.js';

const { NORTH, EAST, SOUTH } = PortSide;
const { INSIDE, OUTSIDE, SPACE_EFFICIENT } = PortLabelPlacement;
const { LEFT, RIGHT } = HorizontalLabelAlignment;
const { TOP, BOTTOM } = VerticalLabelAlignment;

beforeAll(loadLayoutMetaData);

type Pair = readonly [number, number];

const xy = (placed: Placed): Pair => [placed.x, placed.y];

function run(setup: PlacementSetup) {
  const context = placementContext({ simple: false, ...setup });
  if (setup.side === NORTH || setup.side === SOUTH) {
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
  } else {
    PortLabelPlacementCalculator.placeVerticalPortLabels(context);
  }
  return context;
}

const label = (width: number, height: number) => [[width, height]] as const;
const FOUR_HIGH = [label(10, 4), label(10, 4), label(10, 4)] as const;
const stripHeight = (context: ReturnType<typeof run>, side: PortSide) =>
  context.insidePortLabelCells.get(side)!.getMinimumContentAreaSize().y;

describe('constrained inside port labels (spacing 2 horizontal, 3 vertical; label cells 10x4)', () => {
  const inside = EnumSet.of(INSIDE);

  it('removes overlaps going down from below the lowest NORTH port', () => {
    const context = run({
      side: NORTH,
      ports: 2,
      placement: inside,
      positions: [
        [10, 0],
        [12, 1],
      ],
      labelSizes: [label(10, 4), label(10, 4)],
    });
    // start = max(0 + 2, 1 + 2) + 3 = 6; second label sits 4 + 3 below the first; both are relative to their port
    expect(placedOn(context, NORTH).map(xy)).toEqual([
      [-4, 6],
      [-4, 12],
    ]);
    expect(placedOn(context, NORTH).map((p) => [p.horizontal, p.vertical])).toEqual([
      [RIGHT, TOP],
      [RIGHT, TOP],
    ]);
    expect(stripHeight(context, NORTH)).toBe(11);
  });

  it('removes overlaps going up from above the highest SOUTH port', () => {
    const context = run({
      side: SOUTH,
      ports: 2,
      placement: inside,
      positions: [
        [10, 28],
        [12, 27],
      ],
      labelSizes: [label(10, 4), label(10, 4)],
    });
    // start = min(27, 28) - 3 = 24; ports are visited right to left (second port first)
    expect(placedOn(context, SOUTH).map(xy)).toEqual([
      [-4, -14],
      [-4, -8],
    ]);
    expect(placedOn(context, SOUTH).map((p) => [p.horizontal, p.vertical])).toEqual([
      [RIGHT, BOTTOM],
      [RIGHT, BOTTOM],
    ]);
    expect(stripHeight(context, SOUTH)).toBe(11);
  });

  // [port x, expected label x relative to the port]; borders are 5 and 35 (node label spacing 5, container 0..40)
  it.each<[string, number, number]>([
    ['left of the border, port on the border', 0, 0],
    ['left of the border, port inside the border', 6, -1],
    ['centered', 20, -4],
    ['right of the border, port inside the border', 30, -5],
    ['right of the border, port on the border', 38, -8],
  ])('keeps a label inside the container: %s', (_name, portX, expectedX) => {
    const context = run({
      side: NORTH,
      ports: 1,
      placement: inside,
      positions: [[portX, 0]],
      labelSizes: [label(10, 4)],
    });
    expect(placedOn(context, NORTH).map(xy)).toEqual([[expectedX, 5]]);
  });

  it('takes the container padding and surrounding port margins into account', () => {
    const left = placementContext({
      side: NORTH,
      ports: 1,
      placement: inside,
      simple: false,
      positions: [[6, 0]],
      labelSizes: [label(10, 4)],
    });
    left.insidePortLabelCells.get(NORTH)!.getPadding().left = 8;
    PortLabelPlacementCalculator.placeHorizontalPortLabels(left);
    // left border = max(8, 0, 5) = 8, port at 6: label x = 2 -> min(8, 6) = 6
    expect(placedOn(left, NORTH).map(xy)).toEqual([[0, 5]]);

    const right = placementContext({
      side: NORTH,
      ports: 1,
      placement: inside,
      simple: false,
      positions: [[30, 0]],
      labelSizes: [label(10, 4)],
    });
    right.surroundingPortMargins.right = 9;
    PortLabelPlacementCalculator.placeHorizontalPortLabels(right);
    // right border = 40 - max(0, 9, 5) = 31, port ends at 32: label x = 26 -> 32 - 10 = 22
    expect(placedOn(right, NORTH).map(xy)).toEqual([[-8, 5]]);
  });

  it('skips ports without labels in both passes and sizes the strip from the others', () => {
    const context = run({
      side: NORTH,
      ports: 2,
      placement: inside,
      positions: [
        [10, 0],
        [12, 1],
      ],
      labelSizes: [[], label(10, 4)],
    });
    expect(placedOn(context, NORTH).map(xy)).toEqual([
      [0, 0],
      [-4, 5],
    ]);
    expect(stripHeight(context, NORTH)).toBe(4);
  });

  it('leaves the strip height alone when there is nothing to place', () => {
    const context = run({ side: NORTH, ports: 1, placement: inside, labelSizes: [[]] });
    expect(stripHeight(context, NORTH)).toBe(0);
  });

  it('falls back to simple placement for EAST', () => {
    const context = run({ side: EAST, ports: 1, placement: inside, treatAsGroup: true });
    expect(placedOn(context, EAST).map(xy)).toEqual([[-12, -4]]);
  });

  it('is also used when port positions are fixed', () => {
    const context = run({
      side: NORTH,
      ports: 2,
      placement: inside,
      simple: true,
      fixedPos: true,
      positions: [
        [10, 0],
        [12, 1],
      ],
      labelSizes: [label(10, 4), label(10, 4)],
    });
    expect(placedOn(context, NORTH).map(xy)).toEqual([
      [-4, 6],
      [-4, 12],
    ]);
  });
});

describe('constrained outside port labels (spacing 2 horizontal, 3 vertical; label cells 10x4)', () => {
  const outside = EnumSet.of(OUTSIDE);

  it('stacks overlapping NORTH labels upward; the gap arguments are swapped, so 2 separates them', () => {
    const context = run({ side: NORTH, ports: 3, placement: outside, labelSizes: FOUR_HIGH });
    // x = port x + 2 + 2 (labels 4..14, 14..24, 24..34 touch); start = 0 - 3; second label 4 + 2 above the first
    expect(placedOn(context, NORTH).map(xy)).toEqual([
      [4, -7],
      [4, -13],
      [4, -7],
    ]);
    expect(placedOn(context, NORTH).map((p) => [p.horizontal, p.vertical])).toEqual(
      Array(3).fill([RIGHT, BOTTOM]) as unknown[],
    );
  });

  it('puts the first NORTH label left of its port when space efficient', () => {
    const context = run({
      side: NORTH,
      ports: 3,
      placement: EnumSet.of(OUTSIDE, SPACE_EFFICIENT),
      labelSizes: FOUR_HIGH,
    });
    expect(placedOn(context, NORTH).map(xy)).toEqual([
      [-12, -7],
      [4, -7],
      [4, -13],
    ]);
  });

  it('stacks overlapping SOUTH labels downward from below the ports', () => {
    const context = run({ side: SOUTH, ports: 3, placement: outside, labelSizes: FOUR_HIGH });
    // start = 28 + 2 + 3 = 33; ports are visited right to left
    expect(placedOn(context, SOUTH).map(xy)).toEqual([
      [4, 5],
      [4, 11],
      [4, 5],
    ]);
    expect(placedOn(context, SOUTH).map((p) => [p.horizontal, p.vertical])).toEqual(
      Array(3).fill([RIGHT, TOP]) as unknown[],
    );
  });

  it('handles a space-efficient SOUTH side where the rightmost port is visited first', () => {
    const context = run({
      side: SOUTH,
      ports: 3,
      placement: EnumSet.of(OUTSIDE, SPACE_EFFICIENT),
      labelSizes: FOUR_HIGH,
    });
    expect(placedOn(context, SOUTH).map(xy)).toEqual([
      [-12, 11],
      [4, 17],
      [4, 5],
    ]);
  });

  it('skips ports without labels', () => {
    const context = run({
      side: NORTH,
      ports: 3,
      placement: outside,
      labelSizes: [label(10, 4), [], label(10, 4)],
    });
    expect(placedOn(context, NORTH).map(xy)).toEqual([
      [4, -7],
      [0, 0],
      [4, -7],
    ]);
  });

  it('falls back to simple placement for at most two ports on a side', () => {
    const context = run({ side: NORTH, ports: 2, placement: outside });
    expect(placedOn(context, NORTH).map((p) => [p.x, p.y, p.horizontal, p.vertical])).toEqual([
      [-12, -13, RIGHT, BOTTOM],
      [4, -13, LEFT, BOTTOM],
    ]);
  });

  it('falls back to simple placement for EAST', () => {
    const context = run({ side: EAST, ports: 3, placement: outside });
    expect(placedOn(context, EAST).map(xy)).toEqual([
      [4, 5],
      [4, 5],
      [4, 5],
    ]);
  });
});
