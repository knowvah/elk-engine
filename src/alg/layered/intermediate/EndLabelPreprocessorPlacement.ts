// SPDX-License-Identifier: EPL-2.0
import { HorizontalLabelAlignment } from '../../common/nodespacing/cellsystem/HorizontalLabelAlignment.js';
import type { LabelCell } from '../../common/nodespacing/cellsystem/LabelCell.js';
import { VerticalLabelAlignment } from '../../common/nodespacing/cellsystem/VerticalLabelAlignment.js';
import {
  OverlapRemovalDirection,
  RectangleStripOverlapRemover,
} from '../../common/overlaps/RectangleStripOverlapRemover.js';
import type { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * The label placement half of `EndLabelPreprocessor` (Java `placeLabels` and its helpers). The Java methods are private
 * instance methods that read no state, so they are functions here; this file exists to keep the facade under the
 * complexity limits and never imports it (no cycle).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/EndLabelPreprocessor.java
 */

/**
 * Retrieve the side of the edge the labels of the given cell should be placed at. Different labels may actually have
 * different label sides configured for them, but we simply put them all into one place.
 *
 * @see EndLabelPreprocessor.java:453
 */
function getLabelSide(labelCell: LabelCell): LabelSide {
  // Java `assert labelCell != null` and `assert labelCell.hasLabels()`: disabled without -ea (translation rules 6.8)
  return labelCell.getLabels()[0]!.getProperty(InternalProperties.LABEL_SIDE);
}

/**
 * Returns the maximum thickness of all edges incident to the port.
 *
 * @see EndLabelPreprocessor.java:463
 */
function maxEdgeThickness(port: LPort): number {
  return port.getProperty(InternalProperties.MAX_EDGE_THICKNESS);
}

/**
 * Returns the overlap removal direction appropriate for the given port side.
 *
 * @see EndLabelPreprocessor.java:470
 */
function portSideToOverlapRemovalDirection(portSide: PortSide): OverlapRemovalDirection {
  switch (portSide) {
    case PortSide.NORTH:
      return OverlapRemovalDirection.UP;
    case PortSide.SOUTH:
      return OverlapRemovalDirection.DOWN;
    case PortSide.EAST:
      return OverlapRemovalDirection.RIGHT;
    case PortSide.WEST:
      return OverlapRemovalDirection.LEFT;
    default:
      // Shouldn't happen (Java `assert false; return null;`)
      return null as never;
  }
}

/**
 * Calculates the start coordinate to use for overlap removal on the given port side.
 *
 * @see EndLabelPreprocessor.java:391
 */
function calculateOverlapStartCoordinate(node: LNode, portSide: PortSide, edgeLabelSpacing: number): number {
  const nodeSize = node.getSize();
  const nodeMargin = node.getMargin();

  switch (portSide) {
    case PortSide.NORTH:
      return -nodeMargin.top - edgeLabelSpacing;
    case PortSide.SOUTH:
      return nodeSize.y + nodeMargin.bottom + edgeLabelSpacing;
    case PortSide.EAST:
      return nodeSize.x + nodeMargin.right + edgeLabelSpacing;
    case PortSide.WEST:
      return -nodeMargin.left - edgeLabelSpacing;
    default:
      // Should never happen (Java `assert false; return 0;`)
      return 0;
  }
}

/**
 * Calls the rectangle overlap removal code to remove overlaps between end labels of edges connected to ports on the
 * given sides.
 *
 * @see EndLabelPreprocessor.java:365
 */
function removeLabelOverlaps(
  node: LNode,
  portLabelCells: readonly (LabelCell | null)[],
  portSide: PortSide,
  labelLabelSpacing: number,
  edgeLabelSpacing: number,
): void {
  const overlapRemover = RectangleStripOverlapRemover.createForDirection(portSideToOverlapRemovalDirection(portSide))
    .withGap(labelLabelSpacing, labelLabelSpacing)
    .withStartCoordinate(calculateOverlapStartCoordinate(node, portSide, edgeLabelSpacing));

  // Gather the rectangles
  for (const port of node.getPorts(portSide)) {
    const cell = portLabelCells[port.id];
    if (cell !== null && cell !== undefined) {
      const labelCellRect = cell.getCellRectangle();
      // Java `assert labelCellRect.height > 0 && labelCellRect.width > 0`: disabled without -ea (rules 6.8)
      overlapRemover.addRectangle(labelCellRect);
    }
  }

  // Remove overlaps. Since we have stuffed the original label cell rectangles into this thing, we won't evern have to
  // apply or post-process anything.
  overlapRemover.removeOverlaps();
}

/** The values the four `placeLabels(port, ...)` side arms share (Java locals of the one method). */
interface PortPlacement {
  readonly port: LPort;
  readonly labelCell: LabelCell;
  readonly rect: ElkRectangle;
  readonly edgeLabelSpacing: number;
  readonly anchorX: number;
  readonly anchorY: number;
}

/** The north arm of `placeLabels(port, ...)`. @see EndLabelPreprocessor.java:279 */
function placeNorth(p: PortPlacement, nodeMarginTop: number): void {
  p.labelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
  p.rect.y = -nodeMarginTop - p.edgeLabelSpacing - p.rect.height;

  if (getLabelSide(p.labelCell) === LabelSide.ABOVE) {
    p.labelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
    p.rect.x = p.anchorX - maxEdgeThickness(p.port) - p.edgeLabelSpacing - p.rect.width;
  } else {
    p.labelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
    p.rect.x = p.anchorX + maxEdgeThickness(p.port) + p.edgeLabelSpacing;
  }
}

/** The east arm of `placeLabels(port, ...)`. @see EndLabelPreprocessor.java:299 */
function placeEast(p: PortPlacement, nodeWidth: number, nodeMarginRight: number): void {
  p.labelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
  p.rect.x = nodeWidth + nodeMarginRight + p.edgeLabelSpacing;

  if (getLabelSide(p.labelCell) === LabelSide.ABOVE) {
    p.labelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
    p.rect.y = p.anchorY - maxEdgeThickness(p.port) - p.edgeLabelSpacing - p.rect.height;
  } else {
    p.labelCell.setVerticalAlignment(VerticalLabelAlignment.TOP);
    p.rect.y = p.anchorY + maxEdgeThickness(p.port) + p.edgeLabelSpacing;
  }
}

/** The south arm of `placeLabels(port, ...)`. @see EndLabelPreprocessor.java:319 */
function placeSouth(p: PortPlacement, nodeHeight: number, nodeMarginBottom: number): void {
  p.labelCell.setVerticalAlignment(VerticalLabelAlignment.TOP);
  p.rect.y = nodeHeight + nodeMarginBottom + p.edgeLabelSpacing;

  if (getLabelSide(p.labelCell) === LabelSide.ABOVE) {
    p.labelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
    p.rect.x = p.anchorX - maxEdgeThickness(p.port) - p.edgeLabelSpacing - p.rect.width;
  } else {
    p.labelCell.setHorizontalAlignment(HorizontalLabelAlignment.LEFT);
    p.rect.x = p.anchorX + maxEdgeThickness(p.port) + p.edgeLabelSpacing;
  }
}

/** The west arm of `placeLabels(port, ...)`. @see EndLabelPreprocessor.java:339 */
function placeWest(p: PortPlacement, nodeMarginLeft: number): void {
  p.labelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
  p.rect.x = -nodeMarginLeft - p.edgeLabelSpacing - p.rect.width;

  if (getLabelSide(p.labelCell) === LabelSide.ABOVE) {
    p.labelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
    p.rect.y = p.anchorY - maxEdgeThickness(p.port) - p.edgeLabelSpacing - p.rect.height;
  } else {
    p.labelCell.setVerticalAlignment(VerticalLabelAlignment.TOP);
    p.rect.y = p.anchorY + maxEdgeThickness(p.port) + p.edgeLabelSpacing;
  }
}

/**
 * Places the edge end labels that are to be placed near the given port.
 *
 * @see EndLabelPreprocessor.java:269
 */
function placePortLabels(port: LPort, labelCell: LabelCell, edgeLabelSpacing: number): void {
  // Some necessary position information
  const labelCellRect = labelCell.getCellRectangle();
  const nodeSize = port.getNode()!.getSize();
  const nodeMargin = port.getNode()!.getMargin();
  const portAnchor = KVector.sum(port.getPosition(), port.getAnchor());
  const p: PortPlacement = {
    port,
    labelCell,
    rect: labelCellRect,
    edgeLabelSpacing,
    anchorX: portAnchor.x,
    anchorY: portAnchor.y,
  };

  // Calculate cell position depending on port side
  switch (port.getSide()) {
    case PortSide.NORTH:
      placeNorth(p, nodeMargin.top);
      break;
    case PortSide.EAST:
      placeEast(p, nodeSize.x, nodeMargin.right);
      break;
    case PortSide.SOUTH:
      placeSouth(p, nodeSize.y, nodeMargin.bottom);
      break;
    case PortSide.WEST:
      placeWest(p, nodeMargin.left);
      break;
    default:
      break;
  }
}

/**
 * Places end labels of all of the node's ports.
 *
 * @see EndLabelPreprocessor.java:243
 */
export function placeNodeEndLabels(
  node: LNode,
  portLabelCells: readonly (LabelCell | null)[],
  labelLabelSpacing: number,
  edgeLabelSpacing: number,
  verticalLayout: boolean,
): void {
  // First, place them as we usually would. This step can result in overlaps for northern / southern labels (for
  // horizontal layout directions) or for eastern / western labels (for vertical layout directions).
  // (Java `portSidesWithLabels` is written and never read; kept for fidelity.)
  const portSidesWithLabels = EnumSet.noneOf(PortSide);
  for (const port of node.getPorts()) {
    const cell = portLabelCells[port.id];
    if (cell !== null && cell !== undefined) {
      placePortLabels(port, cell, edgeLabelSpacing);
      portSidesWithLabels.add(port.getSide());
    }
  }

  // If there are ports on the problematic sides, go ahead and remove overlaps between them
  if (verticalLayout) {
    removeLabelOverlaps(node, portLabelCells, PortSide.EAST, 2 * labelLabelSpacing, edgeLabelSpacing);
    removeLabelOverlaps(node, portLabelCells, PortSide.WEST, 2 * labelLabelSpacing, edgeLabelSpacing);
  } else {
    removeLabelOverlaps(node, portLabelCells, PortSide.NORTH, 2 * labelLabelSpacing, edgeLabelSpacing);
    removeLabelOverlaps(node, portLabelCells, PortSide.SOUTH, 2 * labelLabelSpacing, edgeLabelSpacing);
  }
}
