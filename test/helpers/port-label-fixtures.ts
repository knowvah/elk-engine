// SPDX-License-Identifier: EPL-2.0
import { PortContextCreator } from '../../src/alg/common/nodespacing/internal/algorithm/PortContextCreator.js';
import { AtomicCell } from '../../src/alg/common/nodespacing/cellsystem/AtomicCell.js';
import type { HorizontalLabelAlignment } from '../../src/alg/common/nodespacing/cellsystem/HorizontalLabelAlignment.js';
import type { VerticalLabelAlignment } from '../../src/alg/common/nodespacing/cellsystem/VerticalLabelAlignment.js';
import type { NodeContext } from '../../src/alg/common/nodespacing/internal/NodeContext.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import type { PortLabelPlacement } from '../../src/core/options/PortLabelPlacement.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { SizeConstraint } from '../../src/core/options/SizeConstraint.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import { addPort, contextOf, nodeFixture, NODE_HEIGHT, NODE_WIDTH } from './node-context-fixtures.js';

/** Horizontal gap between a port and its labels used by every port label scenario. */
export const LABEL_PORT_SPACING_H = 2;
/** Vertical gap between a port and its labels used by every port label scenario. */
export const LABEL_PORT_SPACING_V = 3;
/** Distance between two ports on one side. */
export const PORT_STEP = 10;
/** Size of the label cell (two labels of 10x4 and 8x6, stacked, no label-label gap). */
export const CELL_WIDTH = 10;
export const CELL_HEIGHT = 10;
/** Port size, from `addPort`. */
export const PORT_SIZE = 2;

export interface PlacementSetup {
  readonly side: PortSide;
  /** Number of ports on `side`, laid out along it in steps of {@link PORT_STEP}. */
  readonly ports: number;
  readonly placement: EnumSet<PortLabelPlacement>;
  readonly treatAsGroup?: boolean;
  /** `true` makes `PORT_LABELS` a size constraint (simple placement); `false` leaves it out (constrained). */
  readonly simple?: boolean;
  readonly fixedPos?: boolean;
  /** Node gets a child, so inside labels are not automatically next to their port. */
  readonly compound?: boolean;
  /** Indexes (creation order) of ports that get an outgoing edge. */
  readonly edgePorts?: readonly number[];
  /** Label sizes per port; defaults to a 10x4 and an 8x6 label for each port. */
  readonly labelSizes?: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  readonly portBorderOffset?: number;
  /** Explicit port locations (node-relative) replacing the default layout along the side. */
  readonly positions?: ReadonlyArray<readonly [number, number]>;
}

const DEFAULT_LABELS: ReadonlyArray<readonly [number, number]> = [
  [10, 4],
  [8, 6],
];

function portLocation(side: PortSide, index: number): [number, number] {
  const along = PORT_STEP * index;
  switch (side) {
    case PortSide.NORTH:
      return [along, 0];
    case PortSide.SOUTH:
      return [along, NODE_HEIGHT - PORT_SIZE];
    case PortSide.EAST:
      return [NODE_WIDTH - PORT_SIZE, along];
    default:
      return [0, along];
  }
}

/** A node context with port contexts and inside port label cells (empty atomic cells over the node width). */
export function placementContext(setup: PlacementSetup): NodeContext {
  const fixture = nodeFixture((node, root) => {
    root.setProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL, LABEL_PORT_SPACING_H);
    root.setProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL, LABEL_PORT_SPACING_V);
    node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, setup.placement);
    node.setProperty(CoreOptions.PORT_LABELS_TREAT_AS_GROUP, setup.treatAsGroup ?? false);
    if (setup.simple ?? true) {
      node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORT_LABELS));
    }
    if (setup.fixedPos ?? false) {
      node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    }
    if (setup.compound ?? false) {
      ElkGraphUtil.createNode(node);
    }
    for (let i = 0; i < setup.ports; i++) {
      const [x, y] = setup.positions?.[i] ?? portLocation(setup.side, i);
      const port = addPort(node, setup.side, x, y);
      if (setup.portBorderOffset !== undefined) {
        port.setProperty(CoreOptions.PORT_BORDER_OFFSET, setup.portBorderOffset);
      }
      for (const [width, height] of setup.labelSizes?.[i] ?? DEFAULT_LABELS) {
        ElkGraphUtil.createLabel(port).setDimensions(width, height);
      }
      if (setup.edgePorts?.includes(i) ?? false) {
        ElkGraphUtil.createSimpleEdge(port, ElkGraphUtil.createNode(root));
      }
    }
  });
  const context = contextOf(fixture);
  PortContextCreator.createPortContexts(context, false);
  for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
    const cell = new AtomicCell();
    cell.getCellRectangle().width = NODE_WIDTH;
    context.insidePortLabelCells.put(side, cell);
  }
  return context;
}

/** A port label cell's rectangle origin and alignments. */
export interface Placed {
  readonly x: number;
  readonly y: number;
  readonly horizontal: HorizontalLabelAlignment | null;
  readonly vertical: VerticalLabelAlignment | null;
}

/** The placement of every port label cell on `side`, in port context order. */
export function placedOn(context: NodeContext, side: PortSide): Placed[] {
  return [...context.portContexts.get(side)].map((portContext) => {
    const cell = portContext.portLabelCell!;
    const rect = cell.getCellRectangle();
    return {
      x: rect.x,
      y: rect.y,
      horizontal: cell.getHorizontalAlignment(),
      vertical: cell.getVerticalAlignment(),
    };
  });
}
