// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLayoutMetaData, NODE_HEIGHT, NODE_WIDTH } from '../../../../../../test/helpers/node-context-fixtures.js';
import {
  contextsOn,
  placementContext,
  portsOn,
  sizeHorizontalCell,
  sizeVerticalCell,
} from '../../../../../../test/helpers/port-placement-fixtures.js';
import { ElkMargin } from '../../../../../core/math/ElkMargin.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortAlignment } from '../../../../../core/options/PortAlignment.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import type { NodeContext } from '../NodeContext.js';
import { HorizontalPortPlacementSizeCalculator } from './HorizontalPortPlacementSizeCalculator.js';
import { PortPlacementCalculator } from './PortPlacementCalculator.js';
import { VerticalPortPlacementSizeCalculator } from './VerticalPortPlacementSizeCalculator.js';

const { NORTH, EAST, SOUTH, WEST } = PortSide;
const { BEGIN, CENTER, END, DISTRIBUTED, JUSTIFIED } = PortAlignment;
const PORT = 2;
const CELL = 100;

beforeAll(loadLayoutMetaData);

function xs(context: NodeContext, side: PortSide): number[] {
  return contextsOn(context, side).map((portContext) => portContext.portPosition.x);
}
function ys(context: NodeContext, side: PortSide): number[] {
  return contextsOn(context, side).map((portContext) => portContext.portPosition.y);
}

/** Three free NORTH ports in a cell of width 100, placed with the given alignment. */
function placedNorth(
  alignment: PortAlignment,
  width = CELL,
  options: { overhang?: boolean; count?: number } = {},
): NodeContext {
  const context = placementContext({
    ports: portsOn(NORTH, options.count ?? 3),
    alignment,
    configure: (node) => {
      if (options.overhang === true) {
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.PORTS_OVERHANG));
      }
    },
  });
  HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
  sizeHorizontalCell(context, NORTH, width);
  PortPlacementCalculator.placeHorizontalPorts(context);
  return context;
}

/** Three free EAST ports in a cell of height 100, placed with the given alignment. */
function placedEast(
  alignment: PortAlignment,
  height = CELL,
  options: { overhang?: boolean; count?: number } = {},
): NodeContext {
  const context = placementContext({
    ports: portsOn(EAST, options.count ?? 3),
    alignment,
    configure: (node) => {
      if (options.overhang === true) {
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.PORTS_OVERHANG));
      }
    },
  });
  VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
  sizeVerticalCell(context, EAST, height);
  PortPlacementCalculator.placeVerticalPorts(context);
  return context;
}

describe('PortPlacementCalculator.PORT_RATIO_OR_POSITION', () => {
  it('has the Java id and a zero default', () => {
    expect(PortPlacementCalculator.PORT_RATIO_OR_POSITION.getId()).toBe('portRatioOrPosition');
    expect(PortPlacementCalculator.PORT_RATIO_OR_POSITION.getDefault()).toBe(0);
  });
});

describe('placeHorizontalPorts, free ports', () => {
  it('distributes three ports over the size the calculator required (acceptance case)', () => {
    const context = placementContext({ ports: portsOn(NORTH, 3), alignment: DISTRIBUTED });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    // 3 * 2 + 2 * 10 + 2 * 10
    expect(context.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().x).toBe(46);
    sizeHorizontalCell(context, NORTH, CELL);
    PortPlacementCalculator.placeHorizontalPorts(context);
    // spacing 10 + (100 - 46) / 4 = 23.5, first port after one spacing
    expect(xs(context, NORTH)).toEqual([23.5, 49, 74.5]);
    expect(ys(context, NORTH)).toEqual([-PORT, -PORT, -PORT]);
  });

  it.each([
    [BEGIN, [0, 12, 24]],
    [CENTER, [37, 49, 61]],
    [END, [74, 86, 98]],
    [JUSTIFIED, [0, 49, 98]],
  ])('aligns three ports %s in a wide cell', (alignment, expected) => {
    expect(xs(placedNorth(alignment), NORTH)).toEqual(expected);
  });

  it.each([DISTRIBUTED, JUSTIFIED, CENTER])('centers a single port with %s alignment', (alignment) => {
    expect(xs(placedNorth(alignment, CELL, { count: 1 }), NORTH)).toEqual([49]);
  });

  it('uses the whole cell for a single BEGIN port', () => {
    expect(xs(placedNorth(BEGIN, CELL, { count: 1 }), NORTH)).toEqual([0]);
  });

  it('crams BEGIN ports into a cell that is too narrow when they may not overhang', () => {
    // spacing 10 + (20 - 26) / (3 - 1)
    expect(xs(placedNorth(BEGIN, 20), NORTH)).toEqual([0, 9, 18]);
  });

  it('crams DISTRIBUTED ports into a cell that is too narrow when they may not overhang', () => {
    // spacing 10 + (20 - 46) / 4 = 3.5, first port after one spacing
    expect(xs(placedNorth(DISTRIBUTED, 20), NORTH)).toEqual([3.5, 9, 14.5]);
  });

  it.each([BEGIN, DISTRIBUTED, JUSTIFIED])('centers overhanging %s ports in a too narrow cell', (alignment) => {
    // size 26 after dropping the two distributed spacings: pos += (20 - 26) / 2
    expect(xs(placedNorth(alignment, 20, { overhang: true }), NORTH)).toEqual([-3, 9, 21]);
  });

  it('keeps END alignment when overhanging ports still fit the available space', () => {
    expect(xs(placedNorth(END, 26, { overhang: true }), NORTH)).toEqual([0, 12, 24]);
  });

  it('puts a lone, non-overhanging port at the cell start when no space is available', () => {
    // the division by (1 - 1) yields -Infinity spacing, which only matters after the last port
    expect(xs(placedNorth(DISTRIBUTED, 1, { count: 1 }), NORTH)).toEqual([0]);
  });

  it('adds the port margins around each port and honours the cell padding', () => {
    const context = placementContext({ ports: portsOn(NORTH, 3), alignment: BEGIN });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    for (const portContext of contextsOn(context, NORTH)) {
      portContext.portMargin.left = 1;
      portContext.portMargin.right = 3;
    }
    sizeHorizontalCell(context, NORTH, CELL, 5, 5);
    PortPlacementCalculator.placeHorizontalPorts(context);
    // start 5; each port advances 1 + 2 + 3 + 10
    expect(xs(context, NORTH)).toEqual([6, 22, 38]);
  });

  it('places nothing on empty sides and handles both sides with their own alignment', () => {
    const context = placementContext({
      ports: [...portsOn(NORTH, 2), ...portsOn(SOUTH, 2)],
      alignment: BEGIN,
      configure: (node) => node.setProperty(CoreOptions.PORT_ALIGNMENT_SOUTH, END),
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    sizeHorizontalCell(context, NORTH, CELL);
    sizeHorizontalCell(context, SOUTH, CELL);
    PortPlacementCalculator.placeHorizontalPorts(context);
    expect(xs(context, NORTH)).toEqual([0, 12]);
    expect(xs(context, SOUTH)).toEqual([86, 98]);
    expect(ys(context, SOUTH)).toEqual([0, 0]);
    expect(contextsOn(context, EAST)).toEqual([]);
  });

  it.each([PortConstraints.FREE, PortConstraints.FIXED_SIDE, PortConstraints.FIXED_ORDER])(
    'treats %s like the free case',
    (portConstraints) => {
      const context = placementContext({ ports: portsOn(NORTH, 2), alignment: BEGIN, portConstraints });
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      sizeHorizontalCell(context, NORTH, CELL);
      PortPlacementCalculator.placeHorizontalPorts(context);
      expect(xs(context, NORTH)).toEqual([0, 12]);
    },
  );

  it('applies the border offset to the y coordinate', () => {
    const context = placementContext({
      ports: [
        { side: NORTH, borderOffset: 3 },
        { side: SOUTH, borderOffset: 3 },
      ],
      alignment: BEGIN,
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    sizeHorizontalCell(context, NORTH, CELL);
    sizeHorizontalCell(context, SOUTH, CELL);
    PortPlacementCalculator.placeHorizontalPorts(context);
    expect(ys(context, NORTH)).toEqual([-5]);
    expect(ys(context, SOUTH)).toEqual([3]);
  });

  it('reads the start from a surrounding-margin padded cell', () => {
    const context = placementContext({
      ports: portsOn(NORTH, 2),
      alignment: BEGIN,
      surroundingMargins: new ElkMargin(0, 4, 0, 3),
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    sizeHorizontalCell(context, NORTH, CELL, 3, 4);
    PortPlacementCalculator.placeHorizontalPorts(context);
    expect(xs(context, NORTH)).toEqual([3, 15]);
  });
});

describe('placeHorizontalPorts, fixed ports', () => {
  it('keeps the x of FIXED_POS ports and sets only the y', () => {
    const context = placementContext({
      ports: [
        { side: NORTH, x: 5 },
        { side: SOUTH, x: 30, borderOffset: 4 },
      ],
      portConstraints: PortConstraints.FIXED_POS,
    });
    PortPlacementCalculator.placeHorizontalPorts(context);
    expect(xs(context, NORTH)).toEqual([5]);
    expect(ys(context, NORTH)).toEqual([-PORT]);
    expect(xs(context, SOUTH)).toEqual([30]);
    expect(ys(context, SOUTH)).toEqual([4]);
  });

  it('places FIXED_RATIO ports at the ratio of the node width', () => {
    const context = placementContext({
      ports: [
        { side: NORTH, ratio: 0.25 },
        { side: NORTH, ratio: 0.75 },
        { side: SOUTH, ratio: 0.5, borderOffset: 1 },
      ],
      portConstraints: PortConstraints.FIXED_RATIO,
    });
    PortPlacementCalculator.placeHorizontalPorts(context);
    expect(xs(context, NORTH)).toEqual([0.25 * NODE_WIDTH, 0.75 * NODE_WIDTH]);
    expect(ys(context, NORTH)).toEqual([-PORT, -PORT]);
    expect(xs(context, SOUTH)).toEqual([0.5 * NODE_WIDTH]);
    expect(ys(context, SOUTH)).toEqual([1]);
  });
});

describe('placeVerticalPorts, free ports', () => {
  it('distributes three ports over the size the calculator required', () => {
    const context = placementContext({ ports: portsOn(EAST, 3), alignment: DISTRIBUTED });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(context.insidePortLabelCells.get(EAST)!.getMinimumContentAreaSize().y).toBe(46);
    sizeVerticalCell(context, EAST, CELL);
    PortPlacementCalculator.placeVerticalPorts(context);
    expect(ys(context, EAST)).toEqual([23.5, 49, 74.5]);
    expect(xs(context, EAST)).toEqual([NODE_WIDTH, NODE_WIDTH, NODE_WIDTH]);
  });

  it.each([
    [BEGIN, [0, 12, 24]],
    [CENTER, [37, 49, 61]],
    [END, [74, 86, 98]],
    [JUSTIFIED, [0, 49, 98]],
  ])('aligns three ports %s in a tall cell', (alignment, expected) => {
    expect(ys(placedEast(alignment), EAST)).toEqual(expected);
  });

  it.each([DISTRIBUTED, JUSTIFIED, CENTER])('centers a single port with %s alignment', (alignment) => {
    expect(ys(placedEast(alignment, CELL, { count: 1 }), EAST)).toEqual([49]);
  });

  it('crams BEGIN ports into a cell that is too short when they may not overhang', () => {
    expect(ys(placedEast(BEGIN, 20), EAST)).toEqual([0, 9, 18]);
  });

  it('crams DISTRIBUTED ports into a cell that is too short when they may not overhang', () => {
    expect(ys(placedEast(DISTRIBUTED, 20), EAST)).toEqual([3.5, 9, 14.5]);
  });

  it.each([BEGIN, DISTRIBUTED, JUSTIFIED])('centers overhanging %s ports in a too short cell', (alignment) => {
    expect(ys(placedEast(alignment, 20, { overhang: true }), EAST)).toEqual([-3, 9, 21]);
  });

  it('puts a lone, non-overhanging port at the cell start when no space is available', () => {
    expect(ys(placedEast(DISTRIBUTED, 1, { count: 1 }), EAST)).toEqual([0]);
  });

  it('adds the port margins around each port and honours the cell padding', () => {
    const context = placementContext({ ports: portsOn(WEST, 3), alignment: BEGIN });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    for (const portContext of contextsOn(context, WEST)) {
      portContext.portMargin.top = 1;
      portContext.portMargin.bottom = 3;
    }
    sizeVerticalCell(context, WEST, CELL, 5, 5);
    PortPlacementCalculator.placeVerticalPorts(context);
    // WEST ports are sorted top to bottom against their volatile ids
    expect(ys(context, WEST)).toEqual([6, 22, 38]);
    expect(xs(context, WEST)).toEqual([-PORT, -PORT, -PORT]);
  });

  it('applies the border offset to the x coordinate', () => {
    const context = placementContext({
      ports: [
        { side: WEST, borderOffset: 3 },
        { side: EAST, borderOffset: 3 },
      ],
      alignment: BEGIN,
    });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    sizeVerticalCell(context, WEST, CELL);
    sizeVerticalCell(context, EAST, CELL);
    PortPlacementCalculator.placeVerticalPorts(context);
    expect(xs(context, WEST)).toEqual([-5]);
    expect(xs(context, EAST)).toEqual([NODE_WIDTH + 3]);
  });

  it('treats FIXED_ORDER like the free case', () => {
    const context = placementContext({
      ports: portsOn(EAST, 2),
      alignment: BEGIN,
      portConstraints: PortConstraints.FIXED_ORDER,
    });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    sizeVerticalCell(context, EAST, CELL);
    PortPlacementCalculator.placeVerticalPorts(context);
    expect(ys(context, EAST)).toEqual([0, 12]);
  });

  it('places nothing on empty sides', () => {
    const context = placementContext({ ports: portsOn(EAST, 1), alignment: BEGIN });
    PortPlacementCalculator.placeVerticalPorts(context);
    expect(contextsOn(context, WEST)).toEqual([]);
  });
});

describe('placeVerticalPorts, fixed ports', () => {
  it('keeps the y of FIXED_POS ports and sets only the x', () => {
    const context = placementContext({
      ports: [
        { side: EAST, y: 7 },
        { side: WEST, y: 11, borderOffset: 4 },
      ],
      portConstraints: PortConstraints.FIXED_POS,
    });
    PortPlacementCalculator.placeVerticalPorts(context);
    expect(ys(context, EAST)).toEqual([7]);
    expect(xs(context, EAST)).toEqual([NODE_WIDTH]);
    expect(ys(context, WEST)).toEqual([11]);
    expect(xs(context, WEST)).toEqual([-PORT - 4]);
  });

  it('places FIXED_RATIO ports at the ratio of the node height', () => {
    const context = placementContext({
      ports: [
        { side: EAST, ratio: 0.5 },
        { side: WEST, ratio: 0.2, borderOffset: 1 },
      ],
      portConstraints: PortConstraints.FIXED_RATIO,
    });
    PortPlacementCalculator.placeVerticalPorts(context);
    expect(ys(context, EAST)).toEqual([0.5 * NODE_HEIGHT]);
    expect(xs(context, EAST)).toEqual([NODE_WIDTH]);
    expect(ys(context, WEST)).toEqual([0.2 * NODE_HEIGHT]);
    expect(xs(context, WEST)).toEqual([-PORT - 1]);
  });
});
