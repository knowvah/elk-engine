// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import {
  addLabel,
  cellSystemContext,
  constrain,
  constrainNone,
} from '../../../../../../test/helpers/cell-creator-fixtures.js';
import {
  addPort,
  contextOf,
  loadLayoutMetaData,
  nodeFixture,
} from '../../../../../../test/helpers/node-context-fixtures.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../../../../core/options/NodeLabelPlacement.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { ElkLabel } from '../../../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../../../graph/ElkNode.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { HorizontalLabelAlignment } from '../../cellsystem/HorizontalLabelAlignment.js';
import { VerticalLabelAlignment } from '../../cellsystem/VerticalLabelAlignment.js';
import type { NodeContext } from '../NodeContext.js';
import { NodeLabelLocation } from '../NodeLabelLocation.js';
import { CellSystemConfigurator } from './CellSystemConfigurator.js';
import { InsidePortLabelCellCreator } from './InsidePortLabelCellCreator.js';
import { LabelPlacer } from './LabelPlacer.js';
import { NodeLabelCellCreator } from './NodeLabelCellCreator.js';
import { NodeSizeCalculator } from './NodeSizeCalculator.js';
import { PortContextCreator } from './PortContextCreator.js';

const { NORTH, SOUTH, EAST, WEST } = PortSide;
const { INSIDE, OUTSIDE, V_TOP, V_BOTTOM, V_CENTER, H_LEFT, H_CENTER, H_RIGHT } = NodeLabelPlacement;

beforeAll(loadLayoutMetaData);

/** `[x, y]` of a label; adding 0 turns the `-0` that Java's `-(a - b) / 2` yields into `0`. */
function at(label: ElkLabel): number[] {
  return [label.getX() + 0, label.getY() + 0];
}

function rectOf(context: NodeContext, side: PortSide): number[] {
  const r = context.outsideNodeLabelContainers.get(side)!.getCellRectangle();
  return [r.x + 0, r.y + 0, r.width, r.height];
}

/** Runs the configurator and both size passes on a context. */
function layOut(context: NodeContext): void {
  CellSystemConfigurator.configureCellSystemSizeContributions(context);
  NodeSizeCalculator.setNodeWidth(context);
  NodeSizeCalculator.setNodeHeight(context);
}

describe('placeLabels on a fixed-size 40x30 node', () => {
  const labels = {} as Record<string, ElkLabel>;
  let context: NodeContext;

  beforeAll(() => {
    context = cellSystemContext((node: ElkNode) => {
      constrainNone(node);
      node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.ASYMMETRICAL));
      labels['north'] = addLabel(node, 20, 12, EnumSet.of(OUTSIDE, V_TOP, H_CENTER));
      labels['south'] = addLabel(node, 16, 8, EnumSet.of(OUTSIDE, V_BOTTOM, H_LEFT));
      labels['west'] = addLabel(node, 9, 14, EnumSet.of(OUTSIDE, H_LEFT, V_CENTER));
      labels['east'] = addLabel(node, 6, 10, EnumSet.of(OUTSIDE, H_RIGHT, V_BOTTOM, NodeLabelPlacement.H_PRIORITY));
      labels['insideTopLeft'] = addLabel(node, 10, 5, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      labels['insideBottomRight'] = addLabel(node, 8, 6, EnumSet.of(INSIDE, V_BOTTOM, H_RIGHT));
      labels['port'] = addLabel(addPort(node, NORTH), 5, 5);
    });
    layOut(context);
    // the port label cell is positioned by the port placement code; place it by hand here
    const portLabelCell = [...context.portContexts.values()][0]!.portLabelCell!;
    portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
    portLabelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
    portLabelCell.getCellRectangle().setRect(100, 200, 50, 20);
    LabelPlacer.placeLabels(context);
  });

  it('keeps the node size', () => {
    expect([context.nodeSize.x, context.nodeSize.y]).toEqual([40, 30]);
  });

  it('places the northern container above the node, the label centered at its bottom', () => {
    // container: height 12 + padding 5 = 17, width = node width 40, x = -(40 - 40) / 2, y = -17
    expect(rectOf(context, NORTH)).toEqual([0, -17, 40, 17]);
    expect(at(labels['north']!)).toEqual([10, -17]);
  });

  it('places the southern container below the node', () => {
    expect(rectOf(context, SOUTH)).toEqual([0, 30, 40, 13]);
    expect(at(labels['south']!)).toEqual([0, 35]);
  });

  it('places the western container left of the node, the label centered and right-aligned', () => {
    // width 9 + padding 5 = 14, height = node height 30
    expect(rectOf(context, WEST)).toEqual([-14, 0, 14, 30]);
    expect(at(labels['west']!)).toEqual([-14, 8]);
  });

  it('places the eastern container right of the node, the label at the bottom', () => {
    expect(rectOf(context, EAST)).toEqual([40, 0, 11, 30]);
    expect(at(labels['east']!)).toEqual([45, 20]);
  });

  it('places inside node labels in the laid out grid', () => {
    // The north and south port label cells have no content height, so they take no height (ContainerCell.java
    // minHeightOfCell): the inside container spans y 0..30; the grid content area (padding 5) is x 5..35, y 5..25.
    // Top left: (5, 5). Bottom right: the END row is 6 high at y 25 - 6 = 19; its column is 8 wide, right-aligned
    // at 35 - 8 = 27.
    expect(at(labels['insideTopLeft']!)).toEqual([5, 5]);
    expect(at(labels['insideBottomRight']!)).toEqual([27, 19]);
  });

  it('places port labels in their cell', () => {
    // right-aligned: 100 + 50 - 5; bottom-aligned: 200 + 20 - 5
    expect(at(labels['port']!)).toEqual([145, 215]);
  });
});

describe('placeLabels skips ports without a label cell', () => {
  it('leaves the port label where it was', () => {
    let label!: ElkLabel;
    const context = contextOf(
      nodeFixture((node) => {
        constrainNone(node);
        node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, EnumSet.of(PortLabelPlacement.INSIDE));
        label = addLabel(addPort(node, EAST), 5, 5);
        label.setLocation(3, 4);
      }),
    );
    PortContextCreator.createPortContexts(context, true);
    NodeLabelCellCreator.createNodeLabelCells(context, false, true);
    InsidePortLabelCellCreator.createInsidePortLabelCells(context);
    layOut(context);
    LabelPlacer.placeLabels(context);
    expect([...context.portContexts.values()].map((c) => c.portLabelCell)).toEqual([null]);
    expect(at(label)).toEqual([3, 4]);
  });
});

describe('outside node label containers wider or higher than the node', () => {
  /** A north label of width 80 and a west label of height 70 on a node that is then forced to 50x30. */
  function oversized(
    overhang: boolean,
    forceContributions = overhang,
  ): { context: NodeContext; north: ElkLabel; west: ElkLabel } {
    const labels = {} as { north: ElkLabel; west: ElkLabel };
    const context = cellSystemContext((node) => {
      constrain(node, SizeConstraint.NODE_LABELS);
      node.setProperty(
        CoreOptions.NODE_SIZE_OPTIONS,
        overhang
          ? EnumSet.of(SizeOptions.ASYMMETRICAL, SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG)
          : EnumSet.of(SizeOptions.ASYMMETRICAL),
      );
      labels.north = addLabel(node, 80, 12, EnumSet.of(OUTSIDE, V_TOP, H_CENTER));
      labels.west = addLabel(node, 9, 70, EnumSet.of(OUTSIDE, H_LEFT, V_CENTER));
    });
    layOut(context);
    context.nodeSize.set(50, 30);
    if (forceContributions) {
      // an overhanging cell does not contribute, so make the cells report their size to the containers
      for (const location of [NodeLabelLocation.OUT_T_C, NodeLabelLocation.OUT_L_C]) {
        context.nodeLabelCells.get(location)!.setContributesToMinimumWidth(true);
        context.nodeLabelCells.get(location)!.setContributesToMinimumHeight(true);
      }
    }
    LabelPlacer.placeLabels(context);
    return { context, ...labels };
  }

  it('shrinks the containers to the node size when labels may not overhang', () => {
    const { context, north, west } = oversized(false);
    expect(rectOf(context, NORTH)).toEqual([0, -17, 50, 17]);
    expect(rectOf(context, WEST)).toEqual([-14, 0, 14, 30]);
    expect(at(north)).toEqual([-15, -17]);
    expect(at(west)).toEqual([-14, -20]);
  });

  it('keeps the container sizes and centers them on the node when labels overhang', () => {
    const { context, north, west } = oversized(true);
    expect(rectOf(context, NORTH)).toEqual([-15, -17, 80, 17]);
    expect(rectOf(context, WEST)).toEqual([-14, -20, 14, 70]);
    expect(at(north)).toEqual([-15, -17]);
    expect(at(west)).toEqual([-14, -20]);
  });

  it('collapses the containers of overhanging labels that report no size', () => {
    const { context, north, west } = oversized(true, false);
    expect(rectOf(context, NORTH)).toEqual([0, 0, 50, 0]);
    expect(rectOf(context, WEST)).toEqual([0, 0, 0, 30]);
    // north: cell height 0 - bottom padding 5 = -5, bottom-aligned: 0 + (-5) - 12; west: cell width 0 - padding 5 =
    // -5, right-aligned: 0 + (-5) - 9
    expect(at(north)).toEqual([-15, -17]);
    expect(at(west)).toEqual([-14, -20]);
  });
});
