// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` coordinate translation and conversion: the four `translate` overloads, `absolutePosition`,
 * `toAbsolute`, `toRelative`, `createVectorChain` and `applyVectorChain` (M10 section module of `ElkUtil.ts`).
 * Java's private `getPoints` (`:869`) lives in `ElkUtilJunctions.ts`, its only caller.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import type { ElkEdge } from '../../graph/ElkEdge.js';
import { isElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../graph/ElkEdgeSection.js';
import type { ElkBendPoint } from '../../graph/ElkBendPoint.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { ElkGraphFactory } from '../../graph/ElkGraphFactory.js';
import { isElkLabel } from '../../graph/ElkLabel.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { isElkPort } from '../../graph/ElkPort.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { KVector } from '../math/KVector.js';
import { KVectorChain } from '../math/KVectorChain.js';
import { ContentAlignment } from '../options/ContentAlignment.js';
import { CoreOptions } from '../options/CoreOptions.js';

/** The divisor of a centering translation (Java `/ 2f`). */
const HALF = 2;
/** The minimum number of vectors of a chain applied to a section: a source and a target point. */
const MIN_CHAIN_SIZE = 2;
/** Message of the exception `applyVectorChain` throws for a chain that is too short. */
const CHAIN_TOO_SHORT_MESSAGE = 'The vector chain must contain at least a source and a target point.';

/**
 * Translates the contents of the given node by an offset.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function translateNode(parent: ElkNode, xoffset: number, yoffset: number): void {
  for (const child of parent.getChildren()) {
    // Translate node position
    child.setLocation(child.getX() + xoffset, child.getY() + yoffset);
  }
  // Translates all edges contained in the parent. This includes edges connecting the parent to its
  // children. For these edges the start or end point might get separated from the node boundary.
  for (const edge of parent.getContainedEdges()) {
    translateEdge(edge, xoffset, yoffset);
  }
}

/**
 * Translates the given edge by an offset. This includes all routing information, junction points (if any), and
 * edge labels.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function translateEdge(edge: ElkEdge, xoffset: number, yoffset: number): void {
  // Edge sections
  for (const section of edge.getSections()) {
    translateSection(section, xoffset, yoffset);
  }

  // Edge labels
  for (const label of edge.getLabels()) {
    label.setLocation(label.getX() + xoffset, label.getY() + yoffset);
  }

  // Junction points
  const junctionPoints = edge.getProperty(CoreOptions.JUNCTION_POINTS);
  if (junctionPoints !== null) {
    junctionPoints.offset(xoffset, yoffset);
  }
}

/**
 * Translates the given edge section by an offset.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function translateSection(section: ElkEdgeSection, xoffset: number, yoffset: number): void {
  // Translate source point
  section.setStartLocation(section.getStartX() + xoffset, section.getStartY() + yoffset);

  // Translate bend points
  for (const bendPoint of section.getBendPoints()) {
    bendPoint.set(bendPoint.getX() + xoffset, bendPoint.getY() + yoffset);
  }

  // Translate target point
  section.setEndLocation(section.getEndX() + xoffset, section.getEndY() + yoffset);
}

/**
 * Translates the contents of the given node based on the content alignment property without resizing the node
 * itself.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function translateWithAlignment(parent: ElkNode, newSize: KVector, oldSize: KVector): void {
  const contentAlignment = parent.getProperty(CoreOptions.CONTENT_ALIGNMENT);
  let xTranslate = 0;
  let yTranslate = 0;

  // Horizontal alignment
  if (newSize.x > oldSize.x) {
    if (contentAlignment.contains(ContentAlignment.H_CENTER)) {
      xTranslate = (newSize.x - oldSize.x) / HALF;
    } else if (contentAlignment.contains(ContentAlignment.H_RIGHT)) {
      xTranslate = newSize.x - oldSize.x;
    }
  }

  // Vertical alignment
  if (newSize.y > oldSize.y) {
    if (contentAlignment.contains(ContentAlignment.V_CENTER)) {
      yTranslate = (newSize.y - oldSize.y) / HALF;
    } else if (contentAlignment.contains(ContentAlignment.V_BOTTOM)) {
      yTranslate = newSize.y - oldSize.y;
    }
  }

  translateNode(parent, xTranslate, yTranslate);
}

/**
 * The four Java overloads of `translate`: the contents of a node by an offset, an edge by an offset, an edge
 * section by an offset, and the contents of a node by the content alignment between an old and a new size.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function translate(parent: ElkNode, xoffset: number, yoffset: number): void;
export function translate(edge: ElkEdge, xoffset: number, yoffset: number): void;
export function translate(section: ElkEdgeSection, xoffset: number, yoffset: number): void;
export function translate(parent: ElkNode, newSize: KVector, oldSize: KVector): void;
export function translate(target: ElkNode | ElkEdge | ElkEdgeSection, a: number | KVector, b: number | KVector): void {
  if (typeof a !== 'number' || typeof b !== 'number') {
    translateWithAlignment(target as ElkNode, a as KVector, b as KVector);
  } else if (isElkNode(target)) {
    translateNode(target, a, b);
  } else if (isElkEdge(target)) {
    translateEdge(target, a, b);
  } else {
    translateSection(target, a, b);
  }
}

/**
 * Converts the given relative point to an absolute location.
 *
 * @param point a relative point
 * @param parent the parent node to which the point is relative to
 * @returns `point` for convenience
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function toAbsolute(point: KVector, parent: ElkNode | null): KVector {
  let node = parent;
  while (node !== null) {
    point.add(node.getX(), node.getY());
    node = node.getParent();
  }
  return point;
}

/**
 * Converts the given absolute point to a relative location.
 *
 * @param point an absolute point
 * @param parent the parent node to which the point shall be made relative to
 * @returns `point` for convenience
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function toRelative(point: KVector, parent: ElkNode | null): KVector {
  let node = parent;
  while (node !== null) {
    point.add(-node.getX(), -node.getY());
    node = node.getParent();
  }
  return point;
}

/**
 * Returns the absolute position of the given element. For nodes and ports, this is exactly what you would expect.
 * Edges don't exactly have an absolute position, so we simply return the absolute position of their containing
 * node. For labels, we walk up the parent relationship and keep adding up positions. Returns `null` for any other
 * element.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function absolutePosition(element: ElkGraphElement): KVector | null {
  if (isElkNode(element)) {
    return toAbsolute(new KVector(element.getX(), element.getY()), element.getParent());
  } else if (isElkPort(element)) {
    return toAbsolute(new KVector(element.getX(), element.getY()), element.getParent());
  } else if (isElkEdge(element)) {
    return absolutePosition(element.getContainingNode() as ElkNode);
  } else if (isElkLabel(element)) {
    const absoluteParentPosition = absolutePosition(element.getParent() as ElkGraphElement) as KVector;
    return new KVector(absoluteParentPosition.x + element.getX(), absoluteParentPosition.y + element.getY());
  } else {
    return null;
  }
}

/**
 * Creates a vector chain containing the start point, bend points, and end point of the given edge section. Note
 * that modifying the vector chain will be of no consequence to the edge section.
 *
 * @param edgeSection the edge section to initialize the vector chain with.
 * @returns the vector chain.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function createVectorChain(edgeSection: ElkEdgeSection): KVectorChain {
  const chain = new KVectorChain();

  chain.add(new KVector(edgeSection.getStartX(), edgeSection.getStartY()));

  for (const bendPoint of edgeSection.getBendPoints()) {
    chain.add(new KVector(bendPoint.getX(), bendPoint.getY()));
  }

  chain.add(new KVector(edgeSection.getEndX(), edgeSection.getEndY()));

  return chain;
}

/**
 * Applies the vector chain's vectors to the given edge section. The first and the last point of the vector chain
 * are used as the section's new source and start point, respectively. The remaining points become the section's
 * new bend points. The method tries to reuse as many bend points as possible instead of wiping all bend points
 * out and creating new ones.
 *
 * @param vectorChain the vector chain to apply.
 * @param section the edge section to apply the chain to.
 * @throws IllegalArgumentException if the vector chain contains less than two vectors.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function applyVectorChain(vectorChain: KVectorChain, section: ElkEdgeSection): void {
  // We need at least a start and an end point
  if (vectorChain.size() < MIN_CHAIN_SIZE) {
    throw new IllegalArgumentException(CHAIN_TOO_SHORT_MESSAGE);
  }

  // Start point
  const firstPoint = vectorChain.getFirst();
  section.setStartLocation(firstPoint.x, firstPoint.y);

  // Reuse as many existing bend points as possible
  const oldPointIter = section.getBendPoints().listIterator();
  const newPointIter = vectorChain.listIterator(1);

  while (newPointIter.nextIndex() < vectorChain.size() - 1) {
    const nextPoint = newPointIter.next();
    let bendpoint: ElkBendPoint;
    if (oldPointIter.hasNext()) {
      bendpoint = oldPointIter.next();
    } else {
      bendpoint = ElkGraphFactory.eINSTANCE.createElkBendPoint();
      oldPointIter.add(bendpoint);
    }

    bendpoint.set(nextPoint.x, nextPoint.y);
  }

  // Remove existing bend points that we did not use
  while (oldPointIter.hasNext()) {
    oldPointIter.next();
    oldPointIter.remove();
  }

  // End point
  const lastPoint = vectorChain.getLast();
  section.setEndLocation(lastPoint.x, lastPoint.y);
}
