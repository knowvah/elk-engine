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

const { NORTH, EAST, SOUTH, WEST } = PortSide;
const { INSIDE, OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, ALWAYS_SAME_SIDE, SPACE_EFFICIENT } = PortLabelPlacement;
const { LEFT, RIGHT, CENTER } = HorizontalLabelAlignment;
const { TOP, BOTTOM, CENTER: MIDDLE } = VerticalLabelAlignment;

beforeAll(loadLayoutMetaData);

type Tuple = readonly [number, number, HorizontalLabelAlignment, VerticalLabelAlignment];

const tuple = (placed: Placed): Tuple => [placed.x, placed.y, placed.horizontal!, placed.vertical!];

function run(setup: PlacementSetup) {
  const context = placementContext(setup);
  if (setup.side === NORTH || setup.side === SOUTH) {
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
  } else {
    PortLabelPlacementCalculator.placeVerticalPortLabels(context);
  }
  return context;
}

const inside = (...rest: PortLabelPlacement[]) => EnumSet.of(INSIDE, ...rest);

describe('simple inside port labels (label cells are 10x10, spacing 2 horizontal and 3 vertical)', () => {
  // One port per side. Not next to its port means a compound node without NEXT_TO_PORT_IF_POSSIBLE.
  const cases: [string, PortSide, boolean, Tuple][] = [
    ['NORTH next to port', NORTH, true, [-4, 5, CENTER, TOP]],
    ['NORTH beside port', NORTH, false, [4, 5, CENTER, TOP]],
    ['SOUTH next to port', SOUTH, true, [-4, -13, CENTER, BOTTOM]],
    ['SOUTH beside port', SOUTH, false, [4, -13, CENTER, BOTTOM]],
    ['EAST next to port', EAST, true, [-12, -4, RIGHT, MIDDLE]],
    ['EAST beside port', EAST, false, [-12, 5, RIGHT, MIDDLE]],
    ['WEST next to port', WEST, true, [4, -4, LEFT, MIDDLE]],
    ['WEST beside port', WEST, false, [4, 5, LEFT, MIDDLE]],
  ];

  it.each(cases)('%s', (_name, side, next, expected) => {
    const context = run({ side, ports: 1, placement: inside(), compound: !next, treatAsGroup: true });
    expect(placedOn(context, side).map(tuple)).toEqual([expected]);
  });

  it('centers only the first label of an EAST or WEST port when labels are not treated as a group', () => {
    expect(placedOn(run({ side: EAST, ports: 1, placement: inside() }), EAST).map(tuple)).toEqual([
      [-12, -1, RIGHT, MIDDLE],
    ]);
    expect(placedOn(run({ side: WEST, ports: 1, placement: inside() }), WEST).map(tuple)).toEqual([
      [4, -1, LEFT, MIDDLE],
    ]);
  });

  it('treats a compound node with next-to-port labels like a non-compound one', () => {
    const context = run({
      side: NORTH,
      ports: 1,
      placement: inside(NEXT_TO_PORT_IF_POSSIBLE),
      compound: true,
    });
    expect(placedOn(context, NORTH).map(tuple)).toEqual([[-4, 5, CENTER, TOP]]);
  });

  it('sets the inside label area height of NORTH and SOUTH to the tallest label cell, not EAST or WEST', () => {
    const north = run({ side: NORTH, ports: 2, placement: inside(), labelSizes: [[[10, 4]], [[6, 7]]] });
    expect(north.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().y).toBe(7);
    const south = run({ side: SOUTH, ports: 1, placement: inside() });
    expect(south.insidePortLabelCells.get(SOUTH)!.getMinimumContentAreaSize().y).toBe(10);
    const east = run({ side: EAST, ports: 1, placement: inside() });
    expect(east.insidePortLabelCells.get(EAST)!.getMinimumContentAreaSize().y).toBe(0);
  });

  it('leaves the inside label area alone when no port on the side has labels', () => {
    const context = run({ side: NORTH, ports: 1, placement: inside(), labelSizes: [[]] });
    expect(context.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().y).toBe(0);
    const [only] = placedOn(context, NORTH);
    expect([only!.x, only!.y]).toEqual([0, 0]);
  });

  it('adds the node container padding to the label border offset on every side', () => {
    const expected = new Map<PortSide, Tuple>([
      // padding top 1, right 2, bottom 3, left 4; offsets: N 1 + 3, S 3 + 3, E 2 + 2, W 4 + 2
      [NORTH, [-4, 6, CENTER, TOP]],
      [SOUTH, [-4, -16, CENTER, BOTTOM]],
      [EAST, [-14, -4, RIGHT, MIDDLE]],
      [WEST, [8, -4, LEFT, MIDDLE]],
    ]);
    for (const [side, tupleValue] of expected) {
      const context = placementContext({ side, ports: 1, placement: inside(), treatAsGroup: true });
      context.nodeContainer.getPadding().set(1, 2, 3, 4);
      if (side === NORTH || side === SOUTH) {
        PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
      } else {
        PortLabelPlacementCalculator.placeVerticalPortLabels(context);
      }
      expect(placedOn(context, side).map(tuple)).toEqual([tupleValue]);
    }
  });

  it('adds the port border offset', () => {
    const north = run({ side: NORTH, ports: 1, placement: inside(), portBorderOffset: 1.5 });
    expect(placedOn(north, NORTH).map(tuple)).toEqual([[-4, 6.5, CENTER, TOP]]);
    const south = run({ side: SOUTH, ports: 1, placement: inside(), portBorderOffset: 1.5 });
    expect(placedOn(south, SOUTH).map(tuple)).toEqual([[-4, -14.5, CENTER, BOTTOM]]);
    const east = run({ side: EAST, ports: 1, placement: inside(), portBorderOffset: 1.5, treatAsGroup: true });
    expect(placedOn(east, EAST).map(tuple)).toEqual([[-13.5, -4, RIGHT, MIDDLE]]);
    const west = run({ side: WEST, ports: 1, placement: inside(), portBorderOffset: 1.5, treatAsGroup: true });
    expect(placedOn(west, WEST).map(tuple)).toEqual([[5.5, -4, LEFT, MIDDLE]]);
  });

  it('ignores the other axis: horizontal placement does not touch EAST and WEST', () => {
    const context = placementContext({ side: EAST, ports: 1, placement: inside() });
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
    const [only] = placedOn(context, EAST);
    expect([only!.x, only!.y]).toEqual([0, 0]);
  });
});

describe('fixed placement and unrelated option combinations', () => {
  it('does nothing for fixed port labels', () => {
    const context = placementContext({ side: NORTH, ports: 1, placement: EnumSet.noneOf(PortLabelPlacement) });
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
    expect(context.portContexts.get(NORTH).size).toBe(1);
    expect([...context.portContexts.get(NORTH)][0]!.portLabelCell).toBeNull();
  });

  it('does nothing when only flags without INSIDE or OUTSIDE are set', () => {
    const context = placementContext({ side: NORTH, ports: 1, placement: EnumSet.of(SPACE_EFFICIENT) });
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
    expect([...context.portContexts.get(NORTH)][0]!.portLabelCell).toBeNull();
  });

  it('ignores OUTSIDE-only modifiers on inside labels', () => {
    const context = run({ side: NORTH, ports: 1, placement: inside(ALWAYS_SAME_SIDE) });
    expect(placedOn(context, NORTH).map(tuple)).toEqual([[-4, 5, CENTER, TOP]]);
    const outside = run({ side: NORTH, ports: 1, placement: EnumSet.of(OUTSIDE) });
    expect(placedOn(outside, NORTH).map(tuple)).toEqual([[4, -13, LEFT, BOTTOM]]);
  });
});
