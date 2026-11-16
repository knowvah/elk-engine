// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { OutlineNode } from './OutlineNode.js';

/**
 * The parts of `RelativeXPlacer.recursiveBentlinePlacement` (`:295-402`) that the complexity limits move out of the
 * facade. Each function is the Java block named by its `@see` line range.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */

/**
 * Computes the shift of the root over the middle of the children.
 *
 * @see RelativeXPlacer.java:319
 */
export function computeBentRootMove(graph: ElkNode, children: ElkNode[]): number {
  return (
    (children[0]!.getX() +
      children[0]!.getWidth() / 2.0 +
      children[children.length - 1]!.getX() +
      children[children.length - 1]!.getWidth() / 2.0 -
      graph.getWidth()) /
      2.0 -
    graph.getX()
  );
}

/**
 * Shifts the children by `moveRoot` and sets their initial bend heights.
 *
 * @see RelativeXPlacer.java:323
 */
export function shiftChildrenAndSetBendHeights(children: ElkNode[], moveRoot: number): void {
  for (const child of children) {
    child.setX(child.getX() - moveRoot);
    child.setProperty(
      InternalProperties.EDGE_BEND_HEIGHT,
      child.getProperty(InternalProperties.LEFT_OUTLINE).getAbsoluteY(),
    );
  }
}

/**
 * Sets the bend heights for children right of the parent.
 *
 * @returns the `globalBendHeight` after the pass
 * @see RelativeXPlacer.java:329
 */
export function setBendHeightsRight(graph: ElkNode, children: ElkNode[], childrenSize: number): number {
  let i = 0;
  while (
    i < childrenSize - 1 &&
    children[i]!.getX() +
      children[i]!.getWidth() +
      children[i]!.getProperty(CoreOptions.MARGINS).right -
      graph.getWidth() / 2.0 <=
      0.0
  ) {
    i++;
  }

  let globalBendHeight = children[i]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT);
  for (let a = 0; a < childrenSize; a++) {
    if (globalBendHeight < children[a]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT)) {
      children[a]!.setProperty(InternalProperties.EDGE_BEND_HEIGHT, globalBendHeight);
    } else {
      globalBendHeight = children[a]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT);
    }
  }
  return globalBendHeight;
}

/**
 * Sets the bend heights for children left of the parent. The Java `if (i < childrenSize)` is always true (`i` starts at
 * `childrenSize - 1` and only decreases) and is kept.
 *
 * @param globalBendHeight the value `setBendHeightsRight` returned
 * @see RelativeXPlacer.java:345
 */
export function setBendHeightsLeft(
  graph: ElkNode,
  children: ElkNode[],
  childrenSize: number,
  globalBendHeight: number,
): void {
  let height = globalBendHeight;
  let i = childrenSize - 1;
  while (
    i > 0 &&
    children[i]!.getX() - children[i]!.getProperty(CoreOptions.MARGINS).left - graph.getWidth() / 2.0 >= 0.0
  ) {
    i--;
  }

  if (i < childrenSize) {
    for (let a = i; a >= 0; a--) {
      if (height < children[a]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT)) {
        children[a]!.setProperty(InternalProperties.EDGE_BEND_HEIGHT, height);
      } else {
        height = children[a]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT);
      }
    }
  }
}

/**
 * The left and right outline update of the bent placement.
 *
 * @see RelativeXPlacer.java:363
 */
export function updateBentOutlines(graph: ElkNode, children: ElkNode[], childrenSize: number): void {
  // left outline update
  const leftChildOutline = children[0]!.getProperty(InternalProperties.LEFT_OUTLINE);
  const graphLeftOutline = graph.getProperty(InternalProperties.LEFT_OUTLINE);

  let newX = children[0]!.getX() + leftChildOutline.getRelativeX() - graphLeftOutline.getRelativeX();
  let newOutlinepart = new OutlineNode(0.0, leftChildOutline.getAbsoluteY(), leftChildOutline.getNext());
  graphLeftOutline
    .getNext()!
    .getNext()!
    .getNext()!
    .setNext(new OutlineNode(newX, children[0]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT), newOutlinepart));

  // right outline update
  const graphRightOutline = graph.getProperty(InternalProperties.RIGHT_OUTLINE);
  const rightChildOutline = children[childrenSize - 1]!.getProperty(InternalProperties.RIGHT_OUTLINE);

  newX = children[childrenSize - 1]!.getX() + rightChildOutline.getRelativeX() - graphRightOutline.getRelativeX();
  newOutlinepart = new OutlineNode(0.0, rightChildOutline.getAbsoluteY(), rightChildOutline.getNext());
  graphRightOutline
    .getNext()!
    .getNext()!
    .getNext()!
    .setNext(
      new OutlineNode(
        newX,
        children[childrenSize - 1]!.getProperty(InternalProperties.EDGE_BEND_HEIGHT),
        newOutlinepart,
      ),
    );
}
