// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` sizing: `resizeNode`, `effectiveMinSizeConstraintFor`, `applyConfiguredNodeScaling` and
 * `computeChildAreaDimensions` (M10 section module of `ElkUtil.ts`). Also holds `DEFAULT_MIN_WIDTH/HEIGHT`, which
 * `ElkUtil.ts` re-exports: defined here so that no import cycle arises.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import type { ElkEdgeSection } from '../../graph/ElkEdgeSection.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import type { ElkShape } from '../../graph/ElkShape.js';
import { KVector } from '../math/KVector.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { PortConstraints } from '../options/PortConstraints.js';
import { PortSide } from '../options/PortSide.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { SizeOptions } from '../options/SizeOptions.js';
import { layoutDirectionOf, resolvePortSide } from './ElkUtilPorts.js';

/** Default minimal width for nodes. @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java */
export const DEFAULT_MIN_WIDTH = 20.0;

/** Default minimal height for nodes. @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java */
export const DEFAULT_MIN_HEIGHT = 20.0;

/** The minimum extent of a side before ports are added (Java `minNorth = 2` and friends). */
const MIN_SIDE_EXTENT = 2;
/** The spacing added around every port when summing up a side (Java `port.getWidth() + 2`). */
const PORT_SPACING = 2;

/** The running minimum extent per side of `resizeNode(ElkNode)` (Java locals `minNorth` ... `minWest`). */
interface SideMinima {
  north: number;
  east: number;
  south: number;
  west: number;
}

/** The `FIXED_POS` branch of the port loop of `resizeNode(ElkNode)`. */
function growFixedPos(minima: SideMinima, port: ElkPort, portSide: PortSide): void {
  switch (portSide) {
    case PortSide.NORTH:
      minima.north = Math.max(minima.north, port.getX() + port.getWidth());
      break;
    case PortSide.EAST:
      minima.east = Math.max(minima.east, port.getY() + port.getHeight());
      break;
    case PortSide.SOUTH:
      minima.south = Math.max(minima.south, port.getX() + port.getWidth());
      break;
    case PortSide.WEST:
      minima.west = Math.max(minima.west, port.getY() + port.getHeight());
      break;
  }
}

/** The other-constraints branch of the port loop of `resizeNode(ElkNode)`. */
function growFree(minima: SideMinima, port: ElkPort, portSide: PortSide): void {
  switch (portSide) {
    case PortSide.NORTH:
      minima.north += port.getWidth() + PORT_SPACING;
      break;
    case PortSide.EAST:
      minima.east += port.getHeight() + PORT_SPACING;
      break;
    case PortSide.SOUTH:
      minima.south += port.getWidth() + PORT_SPACING;
      break;
    case PortSide.WEST:
      minima.west += port.getHeight() + PORT_SPACING;
      break;
  }
}

/** The size the ports of the node need, from the `PORTS` block of `resizeNode(ElkNode)`. */
function sizeForPorts(node: ElkNode): KVector {
  const portConstraints = node.getProperty(CoreOptions.PORT_CONSTRAINTS);
  const minima: SideMinima = {
    north: MIN_SIDE_EXTENT,
    east: MIN_SIDE_EXTENT,
    south: MIN_SIDE_EXTENT,
    west: MIN_SIDE_EXTENT,
  };
  const direction = layoutDirectionOf(node);
  for (const port of node.getPorts()) {
    const portSide = resolvePortSide(port, direction);
    if (portConstraints === PortConstraints.FIXED_POS) {
      growFixedPos(minima, port, portSide);
    } else {
      growFree(minima, port, portSide);
    }
  }
  return new KVector(Math.max(minima.north, minima.south), Math.max(minima.east, minima.west));
}

/** Moves one port for `resizeNode`: scaled along its side unless fixed, shifted on the far sides. */
function movePort(port: ElkPort, portSide: PortSide, fixedPorts: boolean, ratio: KVector, diff: KVector): void {
  switch (portSide) {
    case PortSide.NORTH:
      if (!fixedPorts) {
        port.setX(port.getX() * ratio.x);
      }
      break;
    case PortSide.EAST:
      port.setX(port.getX() + diff.x);
      if (!fixedPorts) {
        port.setY(port.getY() * ratio.y);
      }
      break;
    case PortSide.SOUTH:
      if (!fixedPorts) {
        port.setX(port.getX() * ratio.x);
      }
      port.setY(port.getY() + diff.y);
      break;
    case PortSide.WEST:
      if (!fixedPorts) {
        port.setY(port.getY() * ratio.y);
      }
      break;
  }
}

/** Moves the labels of a resized node by the share of the size change their old position implies. */
function moveNodeLabels(node: ElkNode, oldSize: KVector, diff: KVector): void {
  for (const label of node.getLabels()) {
    const midx = label.getX() + label.getWidth() / 2;
    const midy = label.getY() + label.getHeight() / 2;
    const widthPercent = midx / oldSize.x;
    const heightPercent = midy / oldSize.y;

    if (widthPercent + heightPercent >= 1) {
      if (widthPercent - heightPercent > 0 && midy >= 0) {
        // label is on the right
        label.setX(label.getX() + diff.x);
        label.setY(label.getY() + diff.y * heightPercent);
      } else if (widthPercent - heightPercent < 0 && midx >= 0) {
        // label is on the bottom
        label.setX(label.getX() + diff.x * widthPercent);
        label.setY(label.getY() + diff.y);
      }
    }
  }
}

/**
 * Sets the size of a given node, depending on the minimal size, the number of ports on each side and the label.
 *
 * @param node the node that shall be resized
 * @returns a vector holding the width and height resizing ratio, or `null` if the size constraint is set to
 *     `FIXED`
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function resizeNodeToConstraints(node: ElkNode): KVector | null {
  const sizeConstraint = node.getProperty(CoreOptions.NODE_SIZE_CONSTRAINTS);
  if (sizeConstraint.isEmpty()) {
    return null;
  }

  let newSize = new KVector();
  if (sizeConstraint.contains(SizeConstraint.PORTS)) {
    newSize = sizeForPorts(node);
  }

  return resizeNodeTo(node, newSize.x, newSize.y, true, true);
}

/**
 * Resize a node to the given width and height, adjusting port and label positions if needed.
 *
 * @param node a node
 * @param newWidth the new width to set
 * @param newHeight the new height to set
 * @param movePorts whether port positions should be adjusted
 * @param moveLabels whether label positions should be adjusted
 * @returns a vector holding the width and height resizing ratio
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function resizeNodeTo(
  node: ElkNode,
  newWidth: number,
  newHeight: number,
  movePorts: boolean,
  moveLabels: boolean,
): KVector {
  const oldSize = new KVector(node.getWidth(), node.getHeight());

  const newSize = effectiveMinSizeConstraintFor(node);
  newSize.x = Math.max(newSize.x, newWidth);
  newSize.y = Math.max(newSize.y, newHeight);

  const ratio = new KVector(newSize.x / oldSize.x, newSize.y / oldSize.y);
  const diff = new KVector(newSize.x - oldSize.x, newSize.y - oldSize.y);

  // update port positions
  if (movePorts) {
    const direction = layoutDirectionOf(node);
    const fixedPorts = node.getProperty(CoreOptions.PORT_CONSTRAINTS) === PortConstraints.FIXED_POS;
    for (const port of node.getPorts()) {
      movePort(port, resolvePortSide(port, direction), fixedPorts, ratio, diff);
    }
  }

  // resize the node AFTER ports have been placed, since calcPortSide needs the old size
  node.setDimensions(newSize.x, newSize.y);

  // update label positions
  if (moveLabels) {
    moveNodeLabels(node, oldSize, diff);
  }

  // set fixed size option for the node: now the size is assumed to stay as determined here
  node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, SizeConstraint.fixed());

  return ratio;
}

/**
 * Java's two `resizeNode` overloads, told apart by arity: `resizeNode(node)` sizes the node by its constraints
 * (`null` for fixed size constraints), `resizeNode(node, newWidth, newHeight, movePorts, moveLabels)` resizes it.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function resizeNode(node: ElkNode): KVector | null;
export function resizeNode(
  node: ElkNode,
  newWidth: number,
  newHeight: number,
  movePorts: boolean,
  moveLabels: boolean,
): KVector;
export function resizeNode(
  node: ElkNode,
  ...rest: [] | [newWidth: number, newHeight: number, movePorts: boolean, moveLabels: boolean]
): KVector | null {
  return rest.length === 0 ? resizeNodeToConstraints(node) : resizeNodeTo(node, ...rest);
}

/**
 * Returns the minimum size of the node according to the {@link CoreOptions.NODE_SIZE_MINIMUM} constraint. If
 * that constraint is not set, the size returned by this method will be `(0, 0)`.
 *
 * @param node the node whose minimum size to compute.
 * @returns the minimum size.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function effectiveMinSizeConstraintFor(node: ElkNode): KVector {
  const sizeConstraint = node.getProperty(CoreOptions.NODE_SIZE_CONSTRAINTS);

  if (sizeConstraint.contains(SizeConstraint.MINIMUM_SIZE)) {
    const sizeOptions = node.getProperty(CoreOptions.NODE_SIZE_OPTIONS);
    const minSize = new KVector(node.getProperty(CoreOptions.NODE_SIZE_MINIMUM));

    // If minimum width or height are not set, maybe default to default values
    if (sizeOptions.contains(SizeOptions.DEFAULT_MINIMUM_SIZE)) {
      if (minSize.x <= 0) {
        minSize.x = DEFAULT_MIN_WIDTH;
      }
      if (minSize.y <= 0) {
        minSize.y = DEFAULT_MIN_HEIGHT;
      }
    }

    return minSize;
  } else {
    return new KVector();
  }
}

/** Scales the location, size and port anchor of one shape (the body of the loop in `applyConfiguredNodeScaling`). */
function scaleShape(shape: ElkShape, scalingFactor: number): void {
  shape.setLocation(scalingFactor * shape.getX(), scalingFactor * shape.getY());
  shape.setDimensions(scalingFactor * shape.getWidth(), scalingFactor * shape.getHeight());

  const anchor = shape.getProperty(CoreOptions.PORT_ANCHOR);
  if (anchor !== null) {
    anchor.x *= scalingFactor;
    anchor.y *= scalingFactor;
  }
}

/**
 * Applies the scaling factor configured in terms of {@link CoreOptions.SCALE_FACTOR} to `node`'s size data, and
 * updates the layout data of `node`'s ports and labels accordingly. Note: The scaled layout data won't be
 * reverted during the layout process, see {@link CoreOptions.SCALE_FACTOR}.
 *
 * @param node the node to be scaled
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function applyConfiguredNodeScaling(node: ElkNode): void {
  const scalingFactor = node.getProperty(CoreOptions.SCALE_FACTOR);
  if (scalingFactor === 1) {
    return;
  }

  node.setDimensions(scalingFactor * node.getWidth(), scalingFactor * node.getHeight());

  // Iterables.concat(node.getLabels(), node.getPorts(), <the labels of every port>)
  const portLabels = [...node.getPorts()].flatMap((port) => [...port.getLabels()]);
  for (const shape of [...node.getLabels(), ...node.getPorts(), ...portLabels]) {
    scaleShape(shape, scalingFactor);
  }
}

/** The running bounds of `computeChildAreaDimensions`. */
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Grows the bounds by a shape including its margins. */
function includeShape(bounds: Bounds, shape: ElkShape): void {
  const margins = shape.getProperty(CoreOptions.MARGINS);
  if (bounds.minX > shape.getX() - margins.left) {
    bounds.minX = shape.getX() - margins.left;
  }
  if (bounds.minY > shape.getY() - margins.top) {
    bounds.minY = shape.getY() - margins.top;
  }
  if (bounds.maxX < shape.getX() + shape.getWidth() + margins.right) {
    bounds.maxX = shape.getX() + shape.getWidth() + margins.right;
  }
  if (bounds.maxY < shape.getY() + shape.getHeight() + margins.bottom) {
    bounds.maxY = shape.getY() + shape.getHeight() + margins.bottom;
  }
}

/** Grows the bounds by the start, end and bend points of one edge section. */
function includeSection(bounds: Bounds, section: ElkEdgeSection): void {
  const sX = section.getStartX();
  const eX = section.getEndX();
  const sY = section.getStartY();
  const eY = section.getEndY();

  bounds.minX = Math.min(bounds.minX, sX);
  bounds.minX = Math.min(bounds.minX, eX);

  bounds.maxX = Math.max(bounds.maxX, sX);
  bounds.maxX = Math.max(bounds.maxX, eX);

  bounds.minY = Math.min(bounds.minY, sY);
  bounds.minY = Math.min(bounds.minY, eY);

  bounds.maxY = Math.max(bounds.maxY, sY);
  bounds.maxY = Math.max(bounds.maxY, eY);

  for (const bendpoint of section.getBendPoints()) {
    bounds.minX = Math.min(bounds.minX, bendpoint.getX());
    bounds.maxX = Math.max(bounds.maxX, bendpoint.getX());
    bounds.minY = Math.min(bounds.minY, bendpoint.getY());
    bounds.maxY = Math.max(bounds.maxY, bendpoint.getY());
  }
}

/**
 * Computes the area occupied by this node's layout and stores the values in {@link CoreOptions.CHILD_AREA_WIDTH}
 * and {@link CoreOptions.CHILD_AREA_HEIGHT}.
 *
 * @param node the node whose child area should be computed
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function computeChildAreaDimensions(node: ElkNode): void {
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: 0.0, maxY: 0.0 };

  // iterate over all nodes and labels and get their coordinate bounds
  const edgeLabels: ElkShape[] = [];
  for (const edge of node.getContainedEdges()) {
    edgeLabels.push(...edge.getLabels());
  }
  for (const shape of [...node.getLabels(), ...node.getChildren(), ...edgeLabels]) {
    includeShape(bounds, shape);
  }

  // iterate over all contained edges and check their bounds
  for (const edge of node.getContainedEdges()) {
    for (const section of edge.getSections()) {
      includeSection(bounds, section);
    }
  }
  // max and min value represent outermost bounds of the layout
  node.setProperty(CoreOptions.CHILD_AREA_WIDTH, bounds.maxX - bounds.minX);
  node.setProperty(CoreOptions.CHILD_AREA_HEIGHT, bounds.maxY - bounds.minY);
}
