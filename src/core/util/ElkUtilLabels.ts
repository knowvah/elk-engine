// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` port label helpers: `getLabelsBounds` and both `computeInsidePart` overloads (M10 section module of
 * `ElkUtil.ts`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import { ElkRectangle } from '../math/ElkRectangle.js';
import { KVector } from '../math/KVector.js';
import { PortSide } from '../options/PortSide.js';
import type { GraphAdapters } from './adapters/GraphAdapters.js';

/**
 * Compute the bounding box of the labels of the port corresponding to the `port`. This bounding box
 * coordinates are relative to the port (as the location of each port).
 *
 * @param port The port of the labels
 * @returns the bounds of the labels
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function getLabelsBounds(port: GraphAdapters.PortAdapter<unknown>): ElkRectangle {
  let bounds: ElkRectangle | null = null;
  for (const label of port.getLabels()) {
    const currentLabelBounds = new ElkRectangle(
      label.getPosition().x,
      label.getPosition().y,
      label.getSize().x,
      label.getSize().y,
    );
    if (bounds === null) {
      // First label
      bounds = currentLabelBounds;
    } else {
      bounds.union(currentLabelBounds);
    }
  }
  if (bounds === null) {
    // No label case, return an empty rectangle
    bounds = new ElkRectangle();
  }
  return bounds;
}

/**
 * Compute the part of the labels of the port that is inside the node. This method must be used for label with
 * "fixed" port label placement (`PortLabelPlacement.isFixed`). Java's `computeInsidePart(PortAdapter, double)`.
 *
 * @param port The port
 * @param portBorderOffset The border offset of the port
 * @returns the part of the labels that is inside the node
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function computeInsidePartOfPort(port: GraphAdapters.PortAdapter<unknown>, portBorderOffset: number): number {
  const labelBounds = getLabelsBounds(port);
  return computeInsidePartOfLabel(
    new KVector(labelBounds.x, labelBounds.y),
    new KVector(labelBounds.width, labelBounds.height),
    port.getSize(),
    portBorderOffset,
    port.getSide(),
  );
}

/**
 * Compute the part of the label of the port that is inside the node. This method must be used for label with
 * "fixed" port label placement (`PortLabelPlacement.isFixed`). Java's five-argument overload of
 * `computeInsidePart`.
 *
 * @param labelPosition The coordinates of the label (relative to the port)
 * @param labelSize The size of the label
 * @param portSize The size of the port
 * @param portBorderOffset The border offset of the port
 * @param portSide The side of the port
 * @returns the part of the label that is inside the node
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function computeInsidePartOfLabel(
  labelPosition: KVector,
  labelSize: KVector,
  portSize: KVector,
  portBorderOffset: number,
  portSide: PortSide,
): number {
  let insidePart = 0;
  switch (portSide) {
    case PortSide.NORTH:
      insidePart = Math.max(0, labelSize.y + labelPosition.y - (portSize.y + portBorderOffset));
      break;

    case PortSide.SOUTH:
      insidePart = Math.max(0, -labelPosition.y - portBorderOffset);
      break;

    case PortSide.EAST:
      insidePart = Math.max(0, -labelPosition.x - portBorderOffset);
      break;

    case PortSide.WEST:
      insidePart = Math.max(0, labelSize.x + labelPosition.x - (portSize.x + portBorderOffset));
      break;
  }

  return insidePart;
}

/**
 * Java's two `computeInsidePart` overloads, told apart by arity: `(port, portBorderOffset)` and
 * `(labelPosition, labelSize, portSize, portBorderOffset, portSide)`.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function computeInsidePart(port: GraphAdapters.PortAdapter<unknown>, portBorderOffset: number): number;
export function computeInsidePart(
  labelPosition: KVector,
  labelSize: KVector,
  portSize: KVector,
  portBorderOffset: number,
  portSide: PortSide,
): number;
export function computeInsidePart(
  ...args: [GraphAdapters.PortAdapter<unknown>, number] | [KVector, KVector, KVector, number, PortSide]
): number {
  return args.length === 2 ? computeInsidePartOfPort(...args) : computeInsidePartOfLabel(...args);
}
