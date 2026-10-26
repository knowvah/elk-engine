// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addLabel, cellSystemContext, constrain } from '../../../../../../test/helpers/cell-creator-fixtures.js';
import { contextOf, loadLayoutMetaData, nodeFixture } from '../../../../../../test/helpers/node-context-fixtures.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../../../../core/options/NodeLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { ElkNode } from '../../../../../graph/ElkNode.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { ContainerArea } from '../../cellsystem/ContainerArea.js';
import { LabelCell } from '../../cellsystem/LabelCell.js';
import { StripContainerCell } from '../../cellsystem/StripContainerCell.js';
import { StripContainerCellStrip } from '../../cellsystem/StripContainerCellStrip.js';
import { NodeLabelLocation } from '../NodeLabelLocation.js';
import { NodeLabelCellCreator } from './NodeLabelCellCreator.js';

const { INSIDE, OUTSIDE, V_TOP, V_CENTER, V_BOTTOM, H_LEFT, H_CENTER, H_RIGHT, H_PRIORITY } = NodeLabelPlacement;
const { BEGIN, CENTER, END } = ContainerArea;
const { NORTH, SOUTH, EAST, WEST } = PortSide;

beforeAll(loadLayoutMetaData);

/** Inside locations: the placement set (NodeLabelLocation.java IN_*) and the row and column of the grid cell. */
const INSIDE_LOCATIONS = [
  [NodeLabelLocation.IN_T_L, EnumSet.of(INSIDE, V_TOP, H_LEFT), BEGIN, BEGIN],
  [NodeLabelLocation.IN_T_C, EnumSet.of(INSIDE, V_TOP, H_CENTER), BEGIN, CENTER],
  [NodeLabelLocation.IN_T_R, EnumSet.of(INSIDE, V_TOP, H_RIGHT), BEGIN, END],
  [NodeLabelLocation.IN_C_L, EnumSet.of(INSIDE, V_CENTER, H_LEFT), CENTER, BEGIN],
  [NodeLabelLocation.IN_C_C, EnumSet.of(INSIDE, V_CENTER, H_CENTER), CENTER, CENTER],
  [NodeLabelLocation.IN_C_R, EnumSet.of(INSIDE, V_CENTER, H_RIGHT), CENTER, END],
  [NodeLabelLocation.IN_B_L, EnumSet.of(INSIDE, V_BOTTOM, H_LEFT), END, BEGIN],
  [NodeLabelLocation.IN_B_C, EnumSet.of(INSIDE, V_BOTTOM, H_CENTER), END, CENTER],
  [NodeLabelLocation.IN_B_R, EnumSet.of(INSIDE, V_BOTTOM, H_RIGHT), END, END],
] as const;

/** Outside locations: the placement set, the side and the index of the cell in the side's strip container. */
const OUTSIDE_LOCATIONS = [
  [NodeLabelLocation.OUT_T_L, EnumSet.of(OUTSIDE, V_TOP, H_LEFT), NORTH, BEGIN],
  [NodeLabelLocation.OUT_T_C, EnumSet.of(OUTSIDE, V_TOP, H_CENTER), NORTH, CENTER],
  [NodeLabelLocation.OUT_T_R, EnumSet.of(OUTSIDE, V_TOP, H_RIGHT), NORTH, END],
  [NodeLabelLocation.OUT_B_L, EnumSet.of(OUTSIDE, V_BOTTOM, H_LEFT), SOUTH, BEGIN],
  [NodeLabelLocation.OUT_B_C, EnumSet.of(OUTSIDE, V_BOTTOM, H_CENTER), SOUTH, CENTER],
  [NodeLabelLocation.OUT_B_R, EnumSet.of(OUTSIDE, V_BOTTOM, H_RIGHT), SOUTH, END],
  [NodeLabelLocation.OUT_L_T, EnumSet.of(OUTSIDE, H_LEFT, V_TOP, H_PRIORITY), WEST, BEGIN],
  [NodeLabelLocation.OUT_L_C, EnumSet.of(OUTSIDE, H_LEFT, V_CENTER), WEST, CENTER],
  [NodeLabelLocation.OUT_L_B, EnumSet.of(OUTSIDE, H_LEFT, V_BOTTOM, H_PRIORITY), WEST, END],
  [NodeLabelLocation.OUT_R_T, EnumSet.of(OUTSIDE, H_RIGHT, V_TOP, H_PRIORITY), EAST, BEGIN],
  [NodeLabelLocation.OUT_R_C, EnumSet.of(OUTSIDE, H_RIGHT, V_CENTER), EAST, CENTER],
  [NodeLabelLocation.OUT_R_B, EnumSet.of(OUTSIDE, H_RIGHT, V_BOTTOM, H_PRIORITY), EAST, END],
] as const;

function placed(placement: EnumSet<NodeLabelPlacement>) {
  return (node: ElkNode) => {
    node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, placement);
    addLabel(node, 10, 4);
  };
}

function created(configure: (node: ElkNode, root: ElkNode) => void, onlyInside = false, horizontal = true) {
  const context = contextOf(nodeFixture(configure));
  NodeLabelCellCreator.createNodeLabelCells(context, onlyInside, horizontal);
  return context;
}

describe('inside node labels', () => {
  for (const [location, placement, row, column] of INSIDE_LOCATIONS) {
    it(`${location.name()} goes to grid cell (${row.name()}, ${column.name()})`, () => {
      const context = created(placed(placement));
      const cell = context.nodeLabelCells.get(location);
      expect(cell).toBeInstanceOf(LabelCell);
      expect(context.insideNodeLabelContainer.getCell(row, column)).toBe(cell);
      expect(context.nodeLabelCells.size).toBe(1);
      expect(cell?.getLabels().length).toBe(1);
      expect(cell?.getMinimumWidth()).toBe(10);
      expect(cell?.getMinimumHeight()).toBe(4);
      expect(cell?.getHorizontalAlignment()).toBe(location.getHorizontalAlignment());
      expect(cell?.getVerticalAlignment()).toBe(location.getVerticalAlignment());
    });
  }

  it('puts the inside container into the center of the middle row and copies the node label padding', () => {
    const context = created(placed(EnumSet.of(INSIDE, V_TOP, H_LEFT)));
    expect(context.nodeContainerMiddleRow.getCell(CENTER)).toBe(context.insideNodeLabelContainer);
    const padding = context.insideNodeLabelContainer.getPadding();
    expect([padding.top, padding.right, padding.bottom, padding.left]).toEqual([5, 5, 5, 5]);
  });

  it('leaves the inside container padding alone if the node has no node labels padding', () => {
    const context = contextOf(nodeFixture());
    (context as { nodeLabelsPadding: unknown }).nodeLabelsPadding = null;
    NodeLabelCellCreator.createNodeLabelCells(context, false, true);
    const padding = context.insideNodeLabelContainer.getPadding();
    expect([padding.top, padding.right, padding.bottom, padding.left]).toEqual([0, 0, 0, 0]);
  });

  it('stacks several labels of one location in the same cell, reusing it', () => {
    const context = created((node) => {
      node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 10, 4);
      addLabel(node, 16, 6);
    });
    expect(context.nodeLabelCells.size).toBe(1);
    const cell = context.nodeLabelCells.get(NodeLabelLocation.IN_T_L);
    expect(cell?.getLabels().length).toBe(2);
    // horizontal layout mode: widest label, heights summed, one gap (labelLabelSpacing 0)
    expect([cell?.getMinimumWidth(), cell?.getMinimumHeight()]).toEqual([16, 10]);
  });

  it('honours the vertical layout mode', () => {
    const context = created(
      (node) => {
        node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, EnumSet.of(INSIDE, V_TOP, H_LEFT));
        addLabel(node, 10, 4);
        addLabel(node, 16, 6);
      },
      false,
      false,
    );
    const cell = context.nodeLabelCells.get(NodeLabelLocation.IN_T_L);
    expect([cell?.getMinimumWidth(), cell?.getMinimumHeight()]).toEqual([26, 6]);
  });

  it('derives the cell spacing from twice the label-label spacing and uses the spacing within a cell', () => {
    const context = created((node, root) => {
      root.setProperty(CoreOptions.SPACING_LABEL_LABEL, 3);
      node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 10, 4);
      addLabel(node, 16, 6);
    });
    expect(context.labelCellSpacing).toBe(6);
    const cell = context.nodeLabelCells.get(NodeLabelLocation.IN_T_L);
    expect(cell?.getMinimumHeight()).toBe(13);
  });
});

describe('outside node labels', () => {
  for (const [location, placement, side, area] of OUTSIDE_LOCATIONS) {
    it(`${location.name()} goes to cell ${area.name()} of the ${side.name()} container`, () => {
      const context = created(placed(placement));
      const cell = context.nodeLabelCells.get(location);
      const container = context.outsideNodeLabelContainers.get(side);
      expect(cell).toBeInstanceOf(LabelCell);
      expect(container?.getCell(area)).toBe(cell);
      expect(context.nodeLabelCells.size).toBe(1);
      const horizontalSide = side === NORTH || side === SOUTH;
      expect(cell?.isContributingToMinimumHeight()).toBe(horizontalSide);
      expect(cell?.isContributingToMinimumWidth()).toBe(!horizontalSide);
      expect(context.insideNodeLabelContainer.getCell(BEGIN, BEGIN)).toBeNull();
    });
  }

  it('creates four strip containers with the node label spacing as padding on the node-facing side', () => {
    const context = created(() => {});
    const containers = [NORTH, SOUTH, WEST, EAST].map((side) => context.outsideNodeLabelContainers.get(side));
    for (const container of containers) {
      expect(container).toBeInstanceOf(StripContainerCell);
    }
    const [north, south, west, east] = containers as StripContainerCell[];
    expect(
      [north, south].map((c) => [c.getContainerMode(), c.getGap(), c.getPadding().bottom, c.getPadding().top]),
    ).toEqual([
      [StripContainerCellStrip.HORIZONTAL, 0, 5, 0],
      [StripContainerCellStrip.HORIZONTAL, 0, 0, 5],
    ]);
    expect(
      [west, east].map((c) => [c.getContainerMode(), c.getGap(), c.getPadding().right, c.getPadding().left]),
    ).toEqual([
      [StripContainerCellStrip.VERTICAL, 0, 5, 0],
      [StripContainerCellStrip.VERTICAL, 0, 0, 5],
    ]);
  });

  it('creates no outside containers and skips outside labels when only inside labels are wanted', () => {
    const context = created(placed(EnumSet.of(OUTSIDE, V_TOP, H_LEFT)), true);
    expect(context.outsideNodeLabelContainers.size).toBe(0);
    expect(context.nodeLabelCells.size).toBe(0);
  });

  it('still places inside labels when only inside labels are wanted', () => {
    const context = created(placed(EnumSet.of(INSIDE, V_TOP, H_LEFT)), true);
    expect(context.nodeLabelCells.size).toBe(1);
    expect(context.outsideNodeLabelContainers.size).toBe(0);
  });
});

describe('label placement resolution', () => {
  it('ignores labels of a node whose placement is the default (fixed, undefined location)', () => {
    const context = created((node) => {
      addLabel(node, 10, 4);
    });
    expect(context.nodeLabelCells.size).toBe(0);
  });

  it('prefers a placement set on the label over the node placement', () => {
    const context = created((node) => {
      node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 10, 4, EnumSet.of(OUTSIDE, V_BOTTOM, H_RIGHT));
    });
    expect([...context.nodeLabelCells.keys()]).toEqual([NodeLabelLocation.OUT_B_R]);
  });

  it('ignores a label with an unmappable placement even if the node has a mappable one', () => {
    const context = created((node) => {
      node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 10, 4, EnumSet.of(INSIDE));
    });
    expect(context.nodeLabelCells.size).toBe(0);
  });
});

describe('FORCE_TABULAR_NODE_LABELS', () => {
  /** Two inside labels in the top-left and bottom-right cells, widths 30 and 40, contributing to the width. */
  function minimumWidth(options: SizeOptions[]): number {
    const context = cellSystemContext((node) => {
      constrain(node, SizeConstraint.NODE_LABELS);
      node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.ASYMMETRICAL, ...options));
      addLabel(node, 30, 5, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 40, 5, EnumSet.of(INSIDE, V_BOTTOM, H_RIGHT));
    });
    for (const cell of context.nodeLabelCells.values()) {
      cell.setContributesToMinimumWidth(true);
    }
    return context.insideNodeLabelContainer.getMinimumWidth();
  }

  it('aggregates column widths across rows when on: 30 + 40 + padding 10', () => {
    expect(minimumWidth([SizeOptions.FORCE_TABULAR_NODE_LABELS])).toBe(80);
  });

  it('uses the widest row when off: max(30, 40) + padding 10', () => {
    expect(minimumWidth([])).toBe(50);
  });
});
