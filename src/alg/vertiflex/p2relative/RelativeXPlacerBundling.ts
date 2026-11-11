// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { OutlineNode } from './OutlineNode.js';
import { MINIMAL_Y, outlineDistance } from './RelativeXPlacerOutlines.js';

/**
 * `RelativeXPlacer.bundleChildren` (`:592-667`) as module functions behind the facade (complexity limits): the two
 * `// enhance the ... outline` blocks are `enhanceLeftOutline` and `enhanceRightOutline`.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */

/**
 * Enhance the left outline of `leftSubtree` by the left outline of `b`.
 *
 * @see RelativeXPlacer.java:601
 */
function enhanceLeftOutline(leftSubtree: ElkNode, b: ElkNode): void {
  let lastL = leftSubtree.getProperty(InternalProperties.LEFT_OUTLINE);
  let lAbsX = lastL.getRelativeX() + leftSubtree.getX();

  // move to the end of leftSubtree
  while (!lastL.isLast()) {
    lastL = lastL.getNext()!;
    lAbsX += lastL.getRelativeX();
  }
  // find fitting position in the left outline of b
  let bItterator = new OutlineNode(
    b.getProperty(InternalProperties.LEFT_OUTLINE).getRelativeX(),
    MINIMAL_Y,
    b.getProperty(InternalProperties.LEFT_OUTLINE).getNext(),
  );
  let rAbsX = bItterator.getRelativeX() + b.getX();
  while (bItterator.getNext()!.getAbsoluteY() <= lastL.getAbsoluteY()) {
    bItterator = bItterator.getNext()!;
    rAbsX += bItterator.getRelativeX();
  }
  // now we calculate the change
  const deltaX = bItterator.getNext()!.getRelativeX();
  const deltaY = bItterator.getNext()!.getAbsoluteY() - bItterator.getAbsoluteY();
  const change = ((lastL.getAbsoluteY() - bItterator.getAbsoluteY()) * deltaX) / deltaY;

  // now we calculate the new points
  const newX = -lAbsX + rAbsX + change;
  const newNext = new OutlineNode(
    bItterator.getNext()!.getRelativeX() - change,
    bItterator.getNext()!.getAbsoluteY(),
    bItterator.getNext()!.getNext(),
  );
  lastL.setNext(new OutlineNode(newX, lastL.getAbsoluteY(), newNext));

  // now update outline_max_depth
  leftSubtree.setProperty(InternalProperties.OUTLINE_MAX_DEPTH, b.getProperty(InternalProperties.OUTLINE_MAX_DEPTH));
}

/**
 * Enhance the right outline of `b` by the right outline of `a`.
 *
 * @see RelativeXPlacer.java:636
 */
function enhanceRightOutline(a: ElkNode, b: ElkNode): void {
  let lastB = b.getProperty(InternalProperties.RIGHT_OUTLINE);
  let rAbsX = lastB.getRelativeX() + b.getX();

  // move to the end of b
  while (!lastB.isLast()) {
    lastB = lastB.getNext()!;
    rAbsX += lastB.getRelativeX();
  }
  // find fitting position in the right outline of a
  let aItterator = new OutlineNode(
    a.getProperty(InternalProperties.RIGHT_OUTLINE).getRelativeX(),
    MINIMAL_Y,
    a.getProperty(InternalProperties.RIGHT_OUTLINE).getNext(),
  );
  let aAbsX = aItterator.getRelativeX() + a.getX();
  while (aItterator.getNext()!.getAbsoluteY() <= lastB.getAbsoluteY()) {
    aItterator = aItterator.getNext()!;
    aAbsX += aItterator.getRelativeX();
  }
  // now we calculate the change
  const deltaX = aItterator.getNext()!.getRelativeX();
  const deltaY = aItterator.getNext()!.getAbsoluteY() - aItterator.getAbsoluteY();
  const change = ((lastB.getAbsoluteY() - aItterator.getAbsoluteY()) * deltaX) / deltaY;

  // now we calculate the new points
  const newX = aAbsX - rAbsX + change;
  const newNext = new OutlineNode(
    aItterator.getNext()!.getRelativeX() - change,
    aItterator.getNext()!.getAbsoluteY(),
    aItterator.getNext()!.getNext(),
  );
  lastB.setNext(new OutlineNode(newX, lastB.getAbsoluteY(), newNext));
  // now update outline_max_depth
  b.setProperty(InternalProperties.OUTLINE_MAX_DEPTH, a.getProperty(InternalProperties.OUTLINE_MAX_DEPTH));
}

/**
 * Combines the individual outlines of several sibling nodes to form the outline of the tree that they belong to.
 *
 * @see RelativeXPlacer.java:592
 */
export function bundleChildren(leftSubtree: ElkNode, a: ElkNode, b: ElkNode): void {
  // calculate distance between the two parts
  const dist = outlineDistance(
    a.getProperty(InternalProperties.RIGHT_OUTLINE),
    b.getProperty(InternalProperties.LEFT_OUTLINE),
  );
  b.setX(a.getX() + dist);

  // enhance the left outline
  if (
    leftSubtree.getProperty(InternalProperties.OUTLINE_MAX_DEPTH) < b.getProperty(InternalProperties.OUTLINE_MAX_DEPTH)
  ) {
    enhanceLeftOutline(leftSubtree, b);
  }

  // enhance the right outline
  if (b.getProperty(InternalProperties.OUTLINE_MAX_DEPTH) < a.getProperty(InternalProperties.OUTLINE_MAX_DEPTH)) {
    enhanceRightOutline(a, b);
  }
}
