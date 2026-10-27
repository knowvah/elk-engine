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
import { VerticalPortPlacementSizeCalculator } from './VerticalPortPlacementSizeCalculator.js';

const { EAST, WEST, NORTH } = PortSide;
const { BEGIN, DISTRIBUTED } = PortAlignment;
const { INSIDE, OUTSIDE, SPACE_EFFICIENT, NEXT_TO_PORT_IF_POSSIBLE } = PortLabelPlacement;
const PORT_LABELS = EnumSet.of(SizeConstraint.PORT_LABELS);
const LABEL_HEIGHT = 10;
const LABEL_SPACING = 3;
const LABEL_LABEL_SPACING = 2;

beforeAll(loadLayoutMetaData);

function size(context: NodeContext, side: PortSide): number {
  return context.insidePortLabelCells.get(side)!.getMinimumContentAreaSize().y;
}
function padding(context: NodeContext, side: PortSide): [number, number] {
  const cell = context.insidePortLabelCells.get(side)!;
  return [cell.getPadding().top, cell.getPadding().bottom];
}
function margins(context: NodeContext, side: PortSide): [number, number][] {
  return contextsOn(context, side).map(({ portMargin }) => [portMargin.top, portMargin.bottom]);
}
/** A port with `heights.length` labels of those heights, the first one at vertical position `y`. */
function labelled(side: PortSide, y = 0, ...heights: number[]): PortSpec {
  return {
    side,
    configure: (port: ElkPort) => {
      for (const height of heights.length > 0 ? heights : [LABEL_HEIGHT]) {
        const label = ElkGraphUtil.createLabel(port);
        label.setDimensions(6, height);
        label.setLocation(0, y);
      }
    },
  };
}
function labelSettings(placement: EnumSet<PortLabelPlacement>, treatAsGroup: boolean, ...options: SizeOptions[]) {
  return (node: ElkNode, root: ElkNode): void => {
    root.setProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL, LABEL_SPACING);
    root.setProperty(CoreOptions.SPACING_LABEL_LABEL, LABEL_LABEL_SPACING);
    node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, PORT_LABELS);
    node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
    node.setProperty(CoreOptions.PORT_LABELS_TREAT_AS_GROUP, treatAsGroup);
    node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE, ...options));
  };
}

describe('calculateVerticalPortPlacementSize, FIXED_POS', () => {
  it('requires the bottommost port border per side and clears the top padding', () => {
    const context = placementContext({
      ports: [
        { side: EAST, y: 5 },
        { side: EAST, y: 20 },
        { side: WEST, y: 8 },
      ],
      portConstraints: PortConstraints.FIXED_POS,
    });
    context.insidePortLabelCells.get(EAST)!.getPadding().top = 7;
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(size(context, EAST)).toBe(22);
    expect(padding(context, EAST)[0]).toBe(0);
    expect(size(context, WEST)).toBe(10);
  });

  it('requires nothing on sides without ports', () => {
    const context = placementContext({ ports: [{ side: EAST, y: 5 }], portConstraints: PortConstraints.FIXED_POS });
    context.insidePortLabelCells.get(WEST)!.getPadding().top = 7;
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(size(context, WEST)).toBe(0);
    expect(padding(context, WEST)[0]).toBe(0);
  });
});

describe('calculateVerticalPortPlacementSize, FIXED_RATIO', () => {
  const ratios = [
    { side: EAST, ratio: 0.25 },
    { side: EAST, ratio: 0.75 },
  ];

  it('respects surrounding margins and port-port spacing at the ratios', () => {
    const context = placementContext({
      ports: ratios,
      portConstraints: PortConstraints.FIXED_RATIO,
      surroundingMargins: new ElkMargin(3, 0, 4, 0),
    });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    // Oracle row t4/v-fixed-ratio-surrounding: a top (VerticalPortPlacementSizeCalculator.java:146-152) and a bottom
    // (:172-185) surrounding margin above zero each add a term.
    // max(3 / 0.25, (2 + 10) / 0.5, (2 + 4) / 0.25)
    expect(size(context, EAST)).toBe(24);
    expect(padding(context, EAST)[0]).toBe(0);
  });

  it.each([
    [OUTSIDE, 36],
    [INSIDE, 44],
  ])('includes the bottom port margin at the end only for %s labels', (placement, expected) => {
    const context = placementContext({
      ports: ratios,
      portConstraints: PortConstraints.FIXED_RATIO,
      surroundingMargins: new ElkMargin(3, 0, 4, 0),
      configure: (node) => node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, EnumSet.of(placement)),
    });
    for (const portContext of contextsOn(context, EAST)) {
      portContext.portMargin.top = 1;
      portContext.portMargin.bottom = 5;
    }
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    // The INSIDE value 44 is oracle row t4/v-fixed-ratio-inside-end-margin: VerticalPortPlacementSizeCalculator.java:
    // 177-179 adds the last port's bottom margin only if portLabelsInside (:120).
    expect(size(context, EAST)).toBe(expected);
  });

  it('ignores surrounding margins of zero', () => {
    const context = placementContext({ ports: ratios, portConstraints: PortConstraints.FIXED_RATIO });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(size(context, EAST)).toBe(24);
  });

  it('requires nothing for ports with (nearly) equal ratios', () => {
    const context = placementContext({
      ports: [
        { side: EAST, ratio: 0.5 },
        { side: EAST, ratio: 0.505 },
      ],
      portConstraints: PortConstraints.FIXED_RATIO,
    });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(size(context, EAST)).toBe(0);
  });

  it('clears both paddings of sides without ports', () => {
    const context = placementContext({ ports: ratios, portConstraints: PortConstraints.FIXED_RATIO });
    const cell = context.insidePortLabelCells.get(WEST)!;
    cell.getPadding().top = 9;
    cell.getPadding().bottom = 9;
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(padding(context, WEST)).toEqual([0, 0]);
  });

  it('computes the port margins from the labels when port labels are a size constraint', () => {
    const context = placementContext({
      ports: [
        { ...labelled(EAST), ratio: 0.25 },
        { ...labelled(EAST), ratio: 0.5 },
        { ...labelled(EAST), ratio: 0.75 },
      ],
      portConstraints: PortConstraints.FIXED_RATIO,
      configure: labelSettings(EnumSet.of(OUTSIDE), false),
    });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    // outside labels sit below their port: bottom margin 3 + 10, the last port loses its bottom margin
    expect(margins(context, EAST)).toEqual([
      [0, 13],
      [0, 13],
      [0, 0],
    ]);
    // (2 + 13 + 10) / 0.25
    expect(size(context, EAST)).toBe(100);
  });
});

describe('calculateVerticalPortPlacementSize, free ports', () => {
  it('sums port heights and spacings, plus two spacings for DISTRIBUTED, and pads by the surrounding margins', () => {
    const context = placementContext({
      ports: portsOn(EAST, 3),
      alignment: DISTRIBUTED,
      surroundingMargins: new ElkMargin(3, 0, 4, 0),
    });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(size(context, EAST)).toBe(46);
    expect(padding(context, EAST)).toEqual([3, 4]);
  });

  it.each([
    [3, 26],
    [1, 2],
  ])('needs no extra spacing for BEGIN alignment of %i ports', (count, expected) => {
    const context = placementContext({ ports: portsOn(EAST, count), alignment: BEGIN });
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(size(context, EAST)).toBe(expected);
  });

  it('clears the paddings of sides without ports and leaves the horizontal sides alone', () => {
    const context = placementContext({ ports: portsOn(EAST, 1), surroundingMargins: new ElkMargin(3, 0, 4, 0) });
    context.insidePortLabelCells.get(NORTH)!.getPadding().top = 5;
    const westCell = context.insidePortLabelCells.get(WEST)!;
    westCell.getPadding().top = 5;
    westCell.getPadding().bottom = 5;
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
    expect(padding(context, WEST)).toEqual([0, 0]);
    expect(padding(context, NORTH)[0]).toBe(5);
  });

  describe('with port labels as a size constraint', () => {
    function labelContext(
      specs: PortSpec[],
      placement: EnumSet<PortLabelPlacement>,
      treatAsGroup = false,
      ...options: SizeOptions[]
    ): NodeContext {
      return placementContext({
        ports: specs,
        alignment: BEGIN,
        configure: labelSettings(placement, treatAsGroup, ...options),
      });
    }

    it('puts outside labels below their port, except for the bottommost port', () => {
      const context = labelContext([labelled(EAST), labelled(EAST), labelled(EAST)], EnumSet.of(OUTSIDE));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)).toEqual([
        [0, 13],
        [0, 13],
        [0, 0],
      ]);
      // (2 + 13) + 10 + (2 + 13) + 10 + 2
      expect(size(context, EAST)).toBe(52);
    });

    it('drops the topmost bottom margin for space efficient labels', () => {
      const context = labelContext(
        [labelled(EAST), labelled(EAST), labelled(EAST)],
        EnumSet.of(OUTSIDE, SPACE_EFFICIENT),
      );
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)[0]).toEqual([0, 0]);
      expect(size(context, EAST)).toBe(2 + 10 + 15 + 10 + 2);
    });

    it('treats two ports as space efficient even without the option', () => {
      const context = labelContext([labelled(EAST), labelled(EAST)], EnumSet.of(OUTSIDE));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)).toEqual([
        [0, 0],
        [0, 0],
      ]);
      expect(size(context, EAST)).toBe(14);
    });

    it('does not trim margins of labels placed next to their ports', () => {
      const context = labelContext([labelled(EAST), labelled(EAST)], EnumSet.of(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      // overhang (10 - 2) / 2 = 4; the outermost margins are removed
      expect(margins(context, EAST)).toEqual([
        [0, 4],
        [4, 0],
      ]);
      expect(size(context, EAST)).toBe(22);
    });

    it('centers a single label next to its port', () => {
      const context = labelContext([labelled(EAST)], EnumSet.of(INSIDE));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)).toEqual([[4, 4]]);
    });

    it('centers a group of labels next to its port when labels are treated as a group', () => {
      const context = labelContext([labelled(EAST, 0, 6, 6)], EnumSet.of(INSIDE), true);
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      // label cell height 6 + 2 + 6 = 14, overhang (14 - 2) / 2
      expect(margins(context, EAST)).toEqual([[6, 6]]);
    });

    it('simulates centering the first label of several labels that are not a group', () => {
      const context = labelContext([labelled(EAST, 0, 6, 6)], EnumSet.of(INSIDE), false);
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      // first label overhang (6 - 2) / 2 = 2: top 2, bottom 14 - 2 - 2
      expect(margins(context, EAST)).toEqual([[2, 10]]);
    });

    it('never gives a negative top margin to the simulated first label', () => {
      const context = labelContext([labelled(EAST, 0, 1, 12)], EnumSet.of(INSIDE), false);
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      // label cell height 1 + 2 + 12 = 15; first label overhang (1 - 2) / 2 = -0.5
      expect(margins(context, EAST)).toEqual([[0, 15 + 0.5 - 2]]);
    });

    it('keeps a short label next to its port without a margin', () => {
      const short: PortSpec = {
        side: EAST,
        configure: (port) => ElkGraphUtil.createLabel(port).setDimensions(6, 1),
      };
      const context = labelContext([short], EnumSet.of(INSIDE));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      // Oracle row t4/v-short-next-to-port: a label no taller than its port adds no overhang
      // (VerticalPortPlacementSizeCalculator.java:309, the false arm).
      expect(margins(context, EAST)).toEqual([[0, 0]]);
    });

    it('equalizes the margins for uniform port spacing, then resets the outermost ones', () => {
      const context = labelContext(
        [{ side: EAST }, labelled(EAST), { side: EAST }],
        EnumSet.of(OUTSIDE),
        false,
        SizeOptions.UNIFORM_PORT_SPACING,
      );
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)).toEqual([
        [0, 13],
        [0, 13],
        [0, 0],
      ]);
      expect(size(context, EAST)).toBe(52);
    });

    it('leaves the margins of the middle port alone without uniform port spacing', () => {
      const context = labelContext([{ side: EAST }, labelled(EAST), { side: EAST }], EnumSet.of(OUTSIDE));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(size(context, EAST)).toBe(2 + 10 + 15 + 10 + 2);
    });

    it('equalizes the margins for uniform port spacing with inside labels', () => {
      const context = labelContext(
        [{ side: EAST }, labelled(EAST)],
        EnumSet.of(INSIDE, NEXT_TO_PORT_IF_POSSIBLE),
        false,
        SizeOptions.UNIFORM_PORT_SPACING,
      );
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)).toEqual([
        [4, 4],
        [4, 4],
      ]);
    });

    it('widens margins by fixed labels that stick out of the port', () => {
      const context = labelContext([labelled(EAST, -3), { side: EAST }], EnumSet.noneOf(PortLabelPlacement));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      // Oracle row t4/v-fixed-labels (VerticalPortPlacementSizeCalculator.java:336-343: the fixed label bounds -3 .. 7
      // stick out at the top at :336 and at the bottom at :340 of the port 0 .. 2; the second, unlabelled port has
      // empty bounds).
      // label y -3 .. 7 against the port 0 .. 2
      expect(margins(context, EAST)).toEqual([
        [3, 5],
        [0, 0],
      ]);
      expect(size(context, EAST)).toBe(8 + 2 + 10 + 2);
    });

    it('ignores fixed labels inside the port', () => {
      const inside: PortSpec = {
        side: EAST,
        configure: (port) => ElkGraphUtil.createLabel(port).setDimensions(2, 2),
      };
      const context = labelContext([inside], EnumSet.noneOf(PortLabelPlacement));
      VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(context);
      expect(margins(context, EAST)).toEqual([[0, 0]]);
    });
  });
});
