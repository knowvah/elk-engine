// SPDX-License-Identifier: EPL-2.0
import { PortContextCreator } from '../../src/alg/common/nodespacing/internal/algorithm/PortContextCreator.js';
import { AtomicCell } from '../../src/alg/common/nodespacing/cellsystem/AtomicCell.js';
import type { NodeContext } from '../../src/alg/common/nodespacing/internal/NodeContext.js';
import type { PortContext } from '../../src/alg/common/nodespacing/internal/PortContext.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { PortAlignment } from '../../src/core/options/PortAlignment.js';
import type { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { PortPlacementCalculator } from '../../src/alg/common/nodespacing/internal/algorithm/PortPlacementCalculator.js';
import { addPort, contextOf, nodeFixture } from './node-context-fixtures.js';

/** Port-port spacing every placement test runs with (the option's default, set explicitly for readability). */
export const PORT_PORT_SPACING = 10;

/** Width and height of the ports `addPort` creates. */
export const PORT_SIZE = 2;

/** One port of a placement fixture; the side decides which axis the port is placed along. */
export interface PortSpec {
  readonly side: PortSide;
  /** Position set on the port (only relevant for `FIXED_POS`). */
  readonly x?: number;
  readonly y?: number;
  /** Value of `PORT_RATIO_OR_POSITION` (only relevant for `FIXED_RATIO`). */
  readonly ratio?: number;
  readonly borderOffset?: number;
  /** Called with the created port, e.g. to add labels. */
  readonly configure?: (port: ElkPort) => void;
}

export interface PlacementFixtureOptions {
  readonly ports: readonly PortSpec[];
  readonly portConstraints?: PortConstraints;
  readonly alignment?: PortAlignment;
  readonly surroundingMargins?: ElkMargin;
  readonly configure?: (node: ElkNode, root: ElkNode) => void;
}

/**
 * A node context with port contexts and one empty inside port label cell per side, as `NodeLabelAndSizeCalculator`
 * leaves it before the port placement size calculators run. Spacings are set on the root graph because node adapters
 * read inherited spacings from their parent.
 */
export function placementContext(options: PlacementFixtureOptions): NodeContext {
  const fixture = nodeFixture((node, root) => {
    root.setProperty(CoreOptions.SPACING_PORT_PORT, PORT_PORT_SPACING);
    root.setProperty(CoreOptions.SPACING_PORTS_SURROUNDING, options.surroundingMargins ?? new ElkMargin(0));
    if (options.portConstraints !== undefined) {
      node.setProperty(CoreOptions.PORT_CONSTRAINTS, options.portConstraints);
    }
    node.setProperty(CoreOptions.PORT_ALIGNMENT_DEFAULT, options.alignment ?? PortAlignment.DISTRIBUTED);
    for (const spec of options.ports) {
      const port = addPort(node, spec.side, spec.x ?? 0, spec.y ?? 0);
      if (spec.ratio !== undefined) {
        port.setProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION, spec.ratio);
      }
      if (spec.borderOffset !== undefined) {
        port.setProperty(CoreOptions.PORT_BORDER_OFFSET, spec.borderOffset);
      }
      spec.configure?.(port);
    }
    options.configure?.(node, root);
  });
  const context = contextOf(fixture);
  PortContextCreator.createPortContexts(context, false);
  for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
    context.insidePortLabelCells.put(side, new AtomicCell());
  }
  return context;
}

/** The port contexts on one side, in the order the placement iterates them. */
export function contextsOn(context: NodeContext, side: PortSide): PortContext[] {
  return [...context.portContexts.get(side)];
}

/** Specs for `count` ports on one side. */
export function portsOn(side: PortSide, count: number): PortSpec[] {
  return Array.from({ length: count }, () => ({ side }));
}

/** Gives the side's inside port label cell a horizontal extent (x 0, `width`) and padding. */
export function sizeHorizontalCell(context: NodeContext, side: PortSide, width: number, left = 0, right = 0): void {
  const cell = context.insidePortLabelCells.get(side)!;
  cell.getCellRectangle().x = 0;
  cell.getCellRectangle().width = width;
  cell.getPadding().left = left;
  cell.getPadding().right = right;
}

/** Gives the side's inside port label cell a vertical extent (y 0, `height`) and padding. */
export function sizeVerticalCell(context: NodeContext, side: PortSide, height: number, top = 0, bottom = 0): void {
  const cell = context.insidePortLabelCells.get(side)!;
  cell.getCellRectangle().y = 0;
  cell.getCellRectangle().height = height;
  cell.getPadding().top = top;
  cell.getPadding().bottom = bottom;
}
