// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLayoutMetaData } from '../../../../../../test/helpers/node-context-fixtures.js';
import {
  contextsOn,
  placementContext,
  portsOn,
  type PortSpec,
} from '../../../../../../test/helpers/port-placement-fixtures.js';
import { ElkMargin } from '../../../../../core/math/ElkMargin.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortAlignment } from '../../../../../core/options/PortAlignment.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { ElkNode } from '../../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import type { NodeContext } from '../NodeContext.js';
import { HorizontalPortPlacementSizeCalculator } from './HorizontalPortPlacementSizeCalculator.js';

const { NORTH, SOUTH, EAST } = PortSide;
const { BEGIN, DISTRIBUTED } = PortAlignment;
const { INSIDE, OUTSIDE, SPACE_EFFICIENT, NEXT_TO_PORT_IF_POSSIBLE } = PortLabelPlacement;
const PORT_LABELS = EnumSet.of(SizeConstraint.PORT_LABELS);
const LABEL_WIDTH = 10;
const LABEL_SPACING = 2;

beforeAll(loadLayoutMetaData);

const minSize = HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing;

function size(context: NodeContext, side: PortSide): number {
  return context.insidePortLabelCells.get(side)!.getMinimumContentAreaSize().x;
}
function padding(context: NodeContext, side: PortSide): [number, number] {
  const cell = context.insidePortLabelCells.get(side)!;
  return [cell.getPadding().left, cell.getPadding().right];
}
function margins(context: NodeContext, side: PortSide): [number, number][] {
  return contextsOn(context, side).map(({ portMargin }) => [portMargin.left, portMargin.right]);
}
function labelled(side: PortSide, x = 0): PortSpec {
  return {
    side,
    configure: (port: ElkPort) => {
      const label = ElkGraphUtil.createLabel(port);
      label.setDimensions(LABEL_WIDTH, 6);
      label.setLocation(x, 0);
    },
  };
}
function labelSettings(placement: EnumSet<PortLabelPlacement>, ...options: SizeOptions[]) {
  return (node: ElkNode, root: ElkNode): void => {
    root.setProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL, LABEL_SPACING);
    node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, PORT_LABELS);
    node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
    node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE, ...options));
  };
}

describe('calculateHorizontalPortPlacementSize, FIXED_POS', () => {
  it('requires the rightmost port border per side and clears the left padding', () => {
    const context = placementContext({
      ports: [
        { side: NORTH, x: 5 },
        { side: NORTH, x: 30 },
        { side: SOUTH, x: 8 },
      ],
      portConstraints: PortConstraints.FIXED_POS,
    });
    context.insidePortLabelCells.get(NORTH)!.getPadding().left = 7;
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(size(context, NORTH)).toBe(32);
    expect(padding(context, NORTH)[0]).toBe(0);
    expect(size(context, SOUTH)).toBe(10);
  });

  it('requires nothing on sides without ports', () => {
    const context = placementContext({
      ports: [{ side: NORTH, x: 5 }],
      portConstraints: PortConstraints.FIXED_POS,
    });
    context.insidePortLabelCells.get(SOUTH)!.getPadding().left = 7;
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(size(context, SOUTH)).toBe(0);
    expect(padding(context, SOUTH)[0]).toBe(0);
  });
});

describe('calculateHorizontalPortPlacementSize, FIXED_RATIO', () => {
  const ratios = [
    { side: NORTH, ratio: 0.25 },
    { side: NORTH, ratio: 0.75 },
  ];

  it('respects surrounding margins and port-port spacing at the ratios', () => {
    const context = placementContext({
      ports: ratios,
      portConstraints: PortConstraints.FIXED_RATIO,
      surroundingMargins: new ElkMargin(0, 4, 0, 3),
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    // max(3 / 0.25, (2 + 10) / 0.5, (2 + 4) / 0.25)
    expect(size(context, NORTH)).toBe(24);
    expect(padding(context, NORTH)[0]).toBe(0);
  });

  it.each([
    [OUTSIDE, 36],
    [INSIDE, 44],
  ])('includes the right port margin at the end only for %s labels', (placement, expected) => {
    const context = placementContext({
      ports: ratios,
      portConstraints: PortConstraints.FIXED_RATIO,
      surroundingMargins: new ElkMargin(0, 4, 0, 3),
      configure: (node) => node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, EnumSet.of(placement)),
    });
    for (const portContext of contextsOn(context, NORTH)) {
      portContext.portMargin.left = 1;
      portContext.portMargin.right = 5;
    }
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    // OUTSIDE: max((3 + 1) / 0.25, (2 + 5 + 10 + 1) / 0.5, (2 + 4) / 0.25) = 36
    // INSIDE: the last term is (2 + 4 + 5) / 0.25 = 44
    expect(size(context, NORTH)).toBe(expected);
  });

  it('ignores surrounding margins of zero', () => {
    const context = placementContext({ ports: ratios, portConstraints: PortConstraints.FIXED_RATIO });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(size(context, NORTH)).toBe(24);
  });

  it('requires nothing for ports with (nearly) equal ratios', () => {
    const context = placementContext({
      ports: [
        { side: NORTH, ratio: 0.5 },
        { side: NORTH, ratio: 0.505 },
      ],
      portConstraints: PortConstraints.FIXED_RATIO,
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(size(context, NORTH)).toBe(0);
  });

  it('clears both paddings of sides without ports', () => {
    const context = placementContext({ ports: ratios, portConstraints: PortConstraints.FIXED_RATIO });
    const cell = context.insidePortLabelCells.get(SOUTH)!;
    cell.getPadding().left = 9;
    cell.getPadding().right = 9;
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(padding(context, SOUTH)).toEqual([0, 0]);
  });

  it('computes the port margins from the labels when port labels are a size constraint', () => {
    const context = placementContext({
      ports: [
        { ...labelled(NORTH), ratio: 0.25 },
        { ...labelled(NORTH), ratio: 0.5 },
        { ...labelled(NORTH), ratio: 0.75 },
      ],
      portConstraints: PortConstraints.FIXED_RATIO,
      configure: labelSettings(EnumSet.of(OUTSIDE)),
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    // outside labels sit right of their port: right margin 2 + 10, the last port loses its right margin
    expect(margins(context, NORTH)).toEqual([
      [0, 12],
      [0, 12],
      [0, 0],
    ]);
    // (2 + 12 + 10) / 0.25
    expect(size(context, NORTH)).toBe(96);
  });
});

describe('minSizeRequiredToRespectSpacing', () => {
  it('divides the spacing by the ratio difference', () => {
    expect(minSize(12, 0.25, 0.75)).toBe(24);
    expect(minSize(6, 0, 1)).toBe(6);
  });

  it('returns zero when the ratios differ by at most the tolerance', () => {
    expect(minSize(12, 0.5, 0.5)).toBe(0);
    expect(minSize(12, 0.5, 0.505)).toBe(0);
    expect(minSize(5, 0, 0.01)).toBe(0);
  });

  it('divides when the ratios differ by more than the tolerance', () => {
    expect(minSize(5, 0, 0.02)).toBe(250);
    expect(minSize(12, 0.5, 0.52)).toBeCloseTo(600, 9);
  });
});

describe('calculateHorizontalPortPlacementSize, free ports', () => {
  it('sums port widths and spacings, plus two spacings for DISTRIBUTED, and pads by the surrounding margins', () => {
    const context = placementContext({
      ports: portsOn(NORTH, 3),
      alignment: DISTRIBUTED,
      surroundingMargins: new ElkMargin(0, 4, 0, 3),
    });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(size(context, NORTH)).toBe(46);
    expect(padding(context, NORTH)).toEqual([3, 4]);
  });

  it.each([
    [3, 26],
    [1, 2],
  ])('needs no extra spacing for BEGIN alignment of %i ports', (count, expected) => {
    const context = placementContext({ ports: portsOn(NORTH, count), alignment: BEGIN });
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(size(context, NORTH)).toBe(expected);
  });

  it('clears the paddings of sides without ports', () => {
    const context = placementContext({
      ports: portsOn(NORTH, 1),
      surroundingMargins: new ElkMargin(0, 4, 0, 3),
    });
    context.insidePortLabelCells.get(EAST)!.getPadding().left = 5;
    const southCell = context.insidePortLabelCells.get(SOUTH)!;
    southCell.getPadding().left = 5;
    southCell.getPadding().right = 5;
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
    expect(padding(context, SOUTH)).toEqual([0, 0]);
    expect(padding(context, EAST)[0]).toBe(5);
  });

  describe('with port labels as a size constraint', () => {
    function labelContext(
      specs: PortSpec[],
      placement: EnumSet<PortLabelPlacement>,
      ...options: SizeOptions[]
    ): NodeContext {
      return placementContext({ ports: specs, alignment: BEGIN, configure: labelSettings(placement, ...options) });
    }

    it('puts outside labels right of their port, except for the rightmost port', () => {
      const context = labelContext([labelled(NORTH), labelled(NORTH), labelled(NORTH)], EnumSet.of(OUTSIDE));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)).toEqual([
        [0, 12],
        [0, 12],
        [0, 0],
      ]);
      // (2 + 12) + 10 + (2 + 12) + 10 + 2
      expect(size(context, NORTH)).toBe(50);
    });

    it('drops the leftmost right margin for space efficient labels', () => {
      const context = labelContext(
        [labelled(NORTH), labelled(NORTH), labelled(NORTH)],
        EnumSet.of(OUTSIDE, SPACE_EFFICIENT),
      );
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)[0]).toEqual([0, 0]);
      expect(size(context, NORTH)).toBe(38);
    });

    it('treats two ports as space efficient even without the option', () => {
      const context = labelContext([labelled(NORTH), labelled(NORTH)], EnumSet.of(OUTSIDE));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)).toEqual([
        [0, 0],
        [0, 0],
      ]);
      expect(size(context, NORTH)).toBe(14);
    });

    it('overhangs labels next to their port on both sides of wide labels only', () => {
      const context = labelContext([labelled(NORTH), labelled(NORTH)], EnumSet.of(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      // overhang (10 - 2) / 2 = 4; the outermost margins are removed
      expect(margins(context, NORTH)).toEqual([
        [0, 4],
        [4, 0],
      ]);
      expect(size(context, NORTH)).toBe(22);
    });

    it('keeps a narrow label next to its port without a margin', () => {
      const narrow: PortSpec = {
        side: NORTH,
        configure: (port) => ElkGraphUtil.createLabel(port).setDimensions(1, 6),
      };
      const context = labelContext([narrow], EnumSet.of(INSIDE));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)).toEqual([[0, 0]]);
    });

    it('equalizes the margins for uniform port spacing, then resets the outermost ones', () => {
      const context = labelContext(
        [{ side: NORTH }, labelled(NORTH), { side: NORTH }],
        EnumSet.of(OUTSIDE),
        SizeOptions.UNIFORM_PORT_SPACING,
      );
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)).toEqual([
        [0, 12],
        [0, 12],
        [0, 0],
      ]);
      expect(size(context, NORTH)).toBe(50);
    });

    it('leaves the margins of the middle port alone without uniform port spacing', () => {
      const context = labelContext([{ side: NORTH }, labelled(NORTH), { side: NORTH }], EnumSet.of(OUTSIDE));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(size(context, NORTH)).toBe(38);
    });

    it('equalizes the margins for uniform port spacing with inside labels', () => {
      const context = labelContext(
        [{ side: NORTH }, labelled(NORTH, -3)],
        EnumSet.of(INSIDE, NEXT_TO_PORT_IF_POSSIBLE),
        SizeOptions.UNIFORM_PORT_SPACING,
      );
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)).toEqual([
        [4, 4],
        [4, 4],
      ]);
    });

    it('widens margins by fixed labels that stick out of the port', () => {
      const context = labelContext([labelled(NORTH, -3), { side: NORTH }], EnumSet.noneOf(PortLabelPlacement));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      // label x -3 .. 7 against the port 0 .. 2
      expect(margins(context, NORTH)).toEqual([
        [3, 5],
        [0, 0],
      ]);
      expect(size(context, NORTH)).toBe(8 + 2 + 10 + 2);
    });

    it('ignores fixed labels inside the port', () => {
      const inside: PortSpec = {
        side: NORTH,
        configure: (port) => ElkGraphUtil.createLabel(port).setDimensions(2, 2),
      };
      const context = labelContext([inside], EnumSet.noneOf(PortLabelPlacement));
      HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(context);
      expect(margins(context, NORTH)).toEqual([[0, 0]]);
    });
  });
});
