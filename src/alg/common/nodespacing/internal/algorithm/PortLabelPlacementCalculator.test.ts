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
const { OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, ALWAYS_SAME_SIDE, ALWAYS_OTHER_SAME_SIDE, SPACE_EFFICIENT } =
  PortLabelPlacement;
const { LEFT, RIGHT, CENTER } = HorizontalLabelAlignment;
const { TOP, BOTTOM, CENTER: MIDDLE } = VerticalLabelAlignment;

beforeAll(loadLayoutMetaData);

type Tuple = readonly [number, number, HorizontalLabelAlignment, VerticalLabelAlignment];

function tuple(placed: Placed): Tuple {
  return [placed.x, placed.y, placed.horizontal!, placed.vertical!];
}

/** Placement of the labels on `side` as [x, y, horizontal, vertical] in port context order. */
function place(setup: PlacementSetup): Tuple[] {
  const context = placementContext(setup);
  if (setup.side === NORTH || setup.side === SOUTH) {
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
  } else {
    PortLabelPlacementCalculator.placeVerticalPortLabels(context);
  }
  return placedOn(context, setup.side).map(tuple);
}

const set = (...placements: PortLabelPlacement[]): EnumSet<PortLabelPlacement> =>
  EnumSet.of(placements[0]!, ...placements.slice(1));

describe('simple outside port labels (label cells are 10x10, spacing 2 horizontal and 3 vertical)', () => {
  type Style = 'std' | 'other' | 'next';
  const styles: Record<string, Record<Style, Tuple>> = {
    NORTH: { std: [4, -13, LEFT, BOTTOM], other: [-12, -13, RIGHT, BOTTOM], next: [-4, -13, CENTER, BOTTOM] },
    SOUTH: { std: [4, 5, LEFT, TOP], other: [-12, 5, RIGHT, TOP], next: [-4, 5, CENTER, TOP] },
    EAST: { std: [4, 5, LEFT, TOP], other: [4, -13, LEFT, BOTTOM], next: [4, -4, LEFT, MIDDLE] },
    WEST: { std: [-12, 5, RIGHT, TOP], other: [-12, -13, RIGHT, BOTTOM], next: [-12, -4, RIGHT, MIDDLE] },
  };
  const sides = [NORTH, EAST, SOUTH, WEST];
  const cases: [string, PortLabelPlacement[], number, Style[]][] = [
    ['plain, 3 ports', [OUTSIDE], 3, ['std', 'std', 'std']],
    ['plain, 1 port', [OUTSIDE], 1, ['std']],
    ['plain, 2 ports: first goes to the other side', [OUTSIDE], 2, ['other', 'std']],
    ['next to port, 3 ports', [OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE], 3, ['next', 'next', 'next']],
    ['next to port, 1 port', [OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE], 1, ['next']],
    ['always same side, 3 ports', [OUTSIDE, ALWAYS_SAME_SIDE], 3, ['std', 'std', 'std']],
    ['always same side, 2 ports: no special first port', [OUTSIDE, ALWAYS_SAME_SIDE], 2, ['std', 'std']],
    ['always other side, 3 ports', [OUTSIDE, ALWAYS_OTHER_SAME_SIDE], 3, ['other', 'other', 'other']],
    ['always other side, 1 port', [OUTSIDE, ALWAYS_OTHER_SAME_SIDE], 1, ['other']],
    ['space efficient, 3 ports', [OUTSIDE, SPACE_EFFICIENT], 3, ['other', 'std', 'std']],
    ['space efficient, 1 port', [OUTSIDE, SPACE_EFFICIENT], 1, ['std']],
    [
      'next to port with always other side',
      [OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, ALWAYS_OTHER_SAME_SIDE],
      3,
      ['next', 'next', 'next'],
    ],
    [
      'next to port with space efficient',
      [OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, SPACE_EFFICIENT],
      3,
      ['next', 'next', 'next'],
    ],
    [
      'next to port with always same side',
      [OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, ALWAYS_SAME_SIDE],
      3,
      ['next', 'next', 'next'],
    ],
  ];

  for (const side of sides) {
    describe(side.name(), () => {
      it.each(cases)('%s', (_name, placement, ports, expected) => {
        const table = styles[side.name()]!;
        // Without treat-as-group a first label of height 4 is centered on the port: (2 - 4) / 2.
        const nextY = side === EAST || side === WEST ? -1 : table.next[1];
        const grouped = place({ side, ports, placement: set(...placement), treatAsGroup: true });
        expect(grouped).toEqual(expected.map((style) => table[style]));
        const ungrouped = place({ side, ports, placement: set(...placement), treatAsGroup: false });
        expect(ungrouped).toEqual(
          expected.map((style) =>
            style === 'next' ? ([table.next[0], nextY, table.next[2], table.next[3]] as const) : table[style],
          ),
        );
      });
    });
  }

  it('puts a next-to-port label of an EAST port with an edge below the port and one without edge beside it', () => {
    const base = { side: EAST, ports: 1, placement: set(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE), treatAsGroup: true };
    expect(place({ ...base, edgePorts: [0] })).toEqual([[4, 5, LEFT, TOP]]);
    expect(place(base)).toEqual([[4, -4, LEFT, MIDDLE]]);
  });

  it('places only ports without edges next to their port', () => {
    const base = { side: NORTH, ports: 3, edgePorts: [1] };
    expect(place({ ...base, placement: set(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE) })).toEqual([
      [-4, -13, CENTER, BOTTOM],
      [4, -13, LEFT, BOTTOM],
      [-4, -13, CENTER, BOTTOM],
    ]);
    expect(place({ ...base, placement: set(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, ALWAYS_OTHER_SAME_SIDE) })).toEqual([
      [-4, -13, CENTER, BOTTOM],
      [-12, -13, RIGHT, BOTTOM],
      [-4, -13, CENTER, BOTTOM],
    ]);
  });

  it('moves the first label to the other side when its port has an edge and labels are space efficient', () => {
    const placement = set(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, SPACE_EFFICIENT);
    expect(place({ side: NORTH, ports: 3, edgePorts: [0], placement })).toEqual([
      [-12, -13, RIGHT, BOTTOM],
      [-4, -13, CENTER, BOTTOM],
      [-4, -13, CENTER, BOTTOM],
    ]);
  });

  it('skips ports without labels, which keeps the first-port rule for the next port with labels', () => {
    const context = placementContext({ side: NORTH, ports: 2, placement: set(OUTSIDE), labelSizes: [[], [[6, 6]]] });
    PortLabelPlacementCalculator.placeHorizontalPortLabels(context);
    const [skipped, placed] = placedOn(context, NORTH);
    expect([skipped!.x, skipped!.y]).toEqual([0, 0]);
    // The skipped port never reset the flag, so the second port's label also goes to the other side: -6 - 2, -6 - 3.
    expect(tuple(placed!)).toEqual([-8, -9, RIGHT, BOTTOM]);
  });
});
