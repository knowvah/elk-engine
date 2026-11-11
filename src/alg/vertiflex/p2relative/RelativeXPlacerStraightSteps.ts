// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { OutlineNode } from './OutlineNode.js';

/**
 * The parts of `RelativeXPlacer.recursiveStraightlinePlacement` (`:156-288`) that the complexity limits move out of
 * the facade, plus the min/max update the straight and the bent placement share. Each function is the Java block named
 * by its `@see` line range.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */

/** The values the root-centering `while` loop of the straight placement computes. */
export interface RootMove {
  pos: number;
  maxDepth: number;
  maxDepthStartPos: number;
  moveRoot: number;
}

/**
 * Moves the root to the middle of the nodes: finds the child with the lowest y-position and computes the shift. If
 * there is more than one lowest child, the root will be positioned in the middle of them.
 *
 * @see RelativeXPlacer.java:181
 */
export function computeRootMove(graph: ElkNode, children: ElkNode[]): RootMove {
  let pos = 0;
  let maxDepth = 0.0;
  let maxDepthStartPos = 0;
  while (pos < children.length && children[pos]!.getY() >= maxDepth) {
    if (children[pos]!.getY() > maxDepth) {
      maxDepthStartPos = pos;
      maxDepth = children[pos]!.getY();
    }
    pos += 1;
  }
  let moveRoot = 0.0;
  if (pos > 0) {
    moveRoot =
      (children[maxDepthStartPos]!.getX() + children[pos - 1]!.getX() + children[pos - 1]!.getWidth()) / 2.0 -
      graph.getX() -
      graph.getWidth() / 2.0;
  }
  return { pos, maxDepth, maxDepthStartPos, moveRoot };
}

/**
 * The `if (betterMoveRoot < moveRoot)` block (right outlines of the children left of the deepest child).
 *
 * @returns the new `betterMoveRoot`
 * @see RelativeXPlacer.java:203
 */
function raiseBetterMoveRoot(graph: ElkNode, children: ElkNode[], rootMove: RootMove, betterMoveRoot: number): number {
  const { maxDepth, maxDepthStartPos } = rootMove;
  let better = betterMoveRoot;
  for (let i = 0; i < maxDepthStartPos; i++) {
    for (let j = i + 1; j < maxDepthStartPos + 1; j++) {
      let rightOutline: OutlineNode | null = children[i]!.getProperty(InternalProperties.RIGHT_OUTLINE);
      let rightOutlineX = children[i]!.getX() + rightOutline.getRelativeX();
      const posX = children[j]!.getX() + children[j]!.getWidth() / 2.0;
      while (rightOutline !== null && rightOutline.getAbsoluteY() < maxDepth) {
        const newMoveRoot =
          posX -
          graph.getWidth() / 2.0 +
          ((posX - rightOutlineX) * (graph.getY() + graph.getHeight() - maxDepth)) /
            (maxDepth - rightOutline.getAbsoluteY());
        better = Math.max(better, newMoveRoot);

        rightOutline = rightOutline.getNext();
        if (rightOutline !== null) {
          rightOutlineX += rightOutline.getRelativeX();
        }
      }
    }
  }
  return better;
}

/**
 * The `if (betterMoveRoot > moveRoot)` block (left outlines of the children right of the deepest child).
 *
 * @returns the new `betterMoveRoot`
 * @see RelativeXPlacer.java:226
 */
function lowerBetterMoveRoot(graph: ElkNode, children: ElkNode[], rootMove: RootMove, betterMoveRoot: number): number {
  const { pos, maxDepth } = rootMove;
  let better = betterMoveRoot;
  for (let i = pos; i < children.length; i++) {
    for (let j = pos - 1; j < i; j++) {
      let leftOutline: OutlineNode | null = children[i]!.getProperty(InternalProperties.LEFT_OUTLINE);
      let leftOutlineX = children[i]!.getX() + leftOutline.getRelativeX();
      const posX = children[j]!.getX() + children[j]!.getWidth() / 2.0;
      while (leftOutline !== null && leftOutline.getAbsoluteY() < maxDepth) {
        const newMoveRoot =
          posX -
          graph.getWidth() / 2.0 +
          ((posX - leftOutlineX) * (graph.getY() + graph.getHeight() - maxDepth)) /
            (maxDepth - leftOutline.getAbsoluteY());
        better = Math.min(better, newMoveRoot);

        leftOutline = leftOutline.getNext();
        if (leftOutline !== null) {
          leftOutlineX += leftOutline.getRelativeX();
        }
      }
    }
  }
  return better;
}

/**
 * The body of `if (!graph.getProperty(CONSIDER_NODE_MODEL_ORDER))`: improves the shift of the root so the edges to the
 * deepest children stay straight.
 *
 * @returns the final `moveRoot`
 * @see RelativeXPlacer.java:198
 */
export function improveMoveRoot(graph: ElkNode, children: ElkNode[], rootMove: RootMove): number {
  let moveRoot = rootMove.moveRoot;
  let betterMoveRoot =
    (children[0]!.getX() +
      children[children.length - 1]!.getX() +
      children[children.length - 1]!.getWidth() -
      graph.getWidth()) /
      2.0 -
    graph.getX();

  if (betterMoveRoot < moveRoot) {
    betterMoveRoot = raiseBetterMoveRoot(graph, children, rootMove, betterMoveRoot);
    moveRoot = betterMoveRoot;
  }

  if (betterMoveRoot > moveRoot) {
    betterMoveRoot = lowerBetterMoveRoot(graph, children, rootMove, betterMoveRoot);
    moveRoot = betterMoveRoot;
  }
  return moveRoot;
}

/**
 * The left and right outline update of the straight placement.
 *
 * @see RelativeXPlacer.java:256
 */
export function updateStraightOutlines(graph: ElkNode, children: ElkNode[]): void {
  // left outline update
  const graphLeftOutline = graph.getProperty(InternalProperties.LEFT_OUTLINE);
  const leftChildOutline = children[0]!.getProperty(InternalProperties.LEFT_OUTLINE);

  let newX = children[0]!.getX() + leftChildOutline.getRelativeX() - graphLeftOutline.getRelativeX();
  graphLeftOutline
    .getNext()!
    .getNext()!
    .getNext()!
    .setNext(new OutlineNode(newX, leftChildOutline.getAbsoluteY(), leftChildOutline.getNext()));

  // right outline update
  const graphRightOutline = graph.getProperty(InternalProperties.RIGHT_OUTLINE);
  const rightChildOutline = children[children.length - 1]!.getProperty(InternalProperties.RIGHT_OUTLINE);

  newX = children[children.length - 1]!.getX() + rightChildOutline.getRelativeX() - graphRightOutline.getRelativeX();
  graphRightOutline
    .getNext()!
    .getNext()!
    .getNext()!
    .setNext(new OutlineNode(newX, rightChildOutline.getAbsoluteY(), rightChildOutline.getNext()));
}

/**
 * Updates the outline max depth and min und max for x and y (the same Java block ends both recursive placements,
 * `:275-285` and `:388-398`).
 *
 * @see RelativeXPlacer.java:275
 */
export function updateMinMax(graph: ElkNode, children: ElkNode[]): void {
  for (const child of children) {
    graph.setProperty(
      InternalProperties.OUTLINE_MAX_DEPTH,
      Math.max(
        graph.getProperty(InternalProperties.OUTLINE_MAX_DEPTH),
        child.getProperty(InternalProperties.OUTLINE_MAX_DEPTH),
      ),
    );
    graph.setProperty(
      InternalProperties.MIN_X,
      Math.min(graph.getProperty(InternalProperties.MIN_X), child.getX() + child.getProperty(InternalProperties.MIN_X)),
    );
    graph.setProperty(
      InternalProperties.MAX_X,
      Math.max(graph.getProperty(InternalProperties.MAX_X), child.getX() + child.getProperty(InternalProperties.MAX_X)),
    );
  }
  graph.setProperty(InternalProperties.MAX_Y, graph.getProperty(InternalProperties.OUTLINE_MAX_DEPTH));
}
