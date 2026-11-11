// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkMargin } from '../../../core/math/ElkMargin.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { InternalProperties } from '../InternalProperties.js';
import { OutlineNode } from './OutlineNode.js';

/**
 * The outline construction and distance methods of `RelativeXPlacer` (`:71-141`, `:556-587`) as module functions
 * behind the facade (file-size limit). The Java instance field `spacingNodeNode` is a parameter here.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */

/** a constant for moving every Outline to a minimal y-pos */
export const MINIMAL_Y = -100.0;

/**
 * First run of `outlineDistance` (compare points of o1 with o2); the Java loop at `:94-112`.
 *
 * @returns the updated distance
 * @see RelativeXPlacer.java:89
 */
function firstRun(changedOutline1: OutlineNode, changedOutline2: OutlineNode, distance: number): number {
  let dist = distance;
  let o1: OutlineNode | null = changedOutline1;
  let o2: OutlineNode = changedOutline2;
  let x1 = changedOutline1.getRelativeX();
  let x2 = changedOutline2.getRelativeX();
  while (o1 !== null && !o2.isLast()) {
    if (o2.getNext()!.getAbsoluteY() > o1.getAbsoluteY()) {
      // now we compare
      const deltaX = o2.getNext()!.getRelativeX();
      const deltaY = o2.getNext()!.getAbsoluteY() - o2.getAbsoluteY();
      const newdist = x1 - x2 - ((o1.getAbsoluteY() - o2.getAbsoluteY()) * deltaX) / deltaY;

      dist = Math.max(dist, newdist);

      // now change o1
      o1 = o1.getNext();
      if (o1 !== null) {
        x1 += o1.getRelativeX();
      }
    } else {
      o2 = o2.getNext()!;
      x2 += o2.getRelativeX();
    }
  }
  return dist;
}

/**
 * Second run of `outlineDistance` (compare points of o2 with o1); the Java loop at `:119-138`.
 *
 * @returns the updated distance
 * @see RelativeXPlacer.java:114
 */
function secondRun(changedOutline1: OutlineNode, changedOutline2: OutlineNode, distance: number): number {
  let dist = distance;
  let o1: OutlineNode = changedOutline1;
  let o2: OutlineNode | null = changedOutline2;
  let x1 = changedOutline1.getRelativeX();
  let x2 = changedOutline2.getRelativeX();
  while (o2 !== null && !o1.isLast()) {
    if (o1.getNext()!.getAbsoluteY() > o2.getAbsoluteY()) {
      // now we compare
      const deltaX = o1.getNext()!.getRelativeX();
      const deltaY = o1.getNext()!.getAbsoluteY() - o1.getAbsoluteY();
      const newdist = x1 - x2 + ((o2.getAbsoluteY() - o1.getAbsoluteY()) * deltaX) / deltaY;

      dist = Math.max(dist, newdist);

      // now change o2
      o2 = o2.getNext();
      if (o2 !== null) {
        x2 += o2.getRelativeX();
      }
    } else {
      o1 = o1.getNext()!;
      x1 += o1.getRelativeX();
    }
  }
  return dist;
}

/**
 * Computes the distance between two outlines.
 *
 * @see RelativeXPlacer.java:71
 */
export function outlineDistance(outline1: OutlineNode, outline2: OutlineNode): number {
  const changedOutline1 = new OutlineNode(
    outline1.getRelativeX(),
    MINIMAL_Y,
    new OutlineNode(0.0, outline1.getAbsoluteY(), outline1.getNext()),
  );
  const changedOutline2 = new OutlineNode(
    outline2.getRelativeX(),
    MINIMAL_Y,
    new OutlineNode(0.0, outline2.getAbsoluteY(), outline2.getNext()),
  );

  // the return value
  const dist = changedOutline1.getRelativeX() - changedOutline2.getRelativeX();

  // first run (compare points of o1 with o2), second run (compare points of o2 with o1)
  return secondRun(changedOutline1, changedOutline2, firstRun(changedOutline1, changedOutline2, dist));
}

/**
 * The left outline of `makeSimpleOutlines`.
 *
 * @see RelativeXPlacer.java:559
 */
function setSimpleLeftOutline(graph: ElkNode, margins: ElkMargin, spacingNodeNode: number): void {
  const endpart = new OutlineNode(
    0.0,
    graph.getY() + graph.getHeight() + margins.bottom + spacingNodeNode / 2,
    new OutlineNode(
      graph.getWidth() / 2.0,
      graph.getY() + graph.getHeight() + margins.bottom + spacingNodeNode / 2,
      null,
    ),
  );

  graph.setProperty(
    InternalProperties.LEFT_OUTLINE,
    new OutlineNode(
      -margins.left - spacingNodeNode / 2 + graph.getWidth() / 2.0,
      graph.getY() - margins.top - spacingNodeNode / 2,
      new OutlineNode(-graph.getWidth() / 2.0, graph.getY() - margins.top, endpart),
    ),
  );
}

/**
 * The right outline of `makeSimpleOutlines`.
 *
 * @see RelativeXPlacer.java:569
 */
function setSimpleRightOutline(graph: ElkNode, margins: ElkMargin, spacingNodeNode: number): void {
  const endpart = new OutlineNode(
    0.0,
    graph.getY() + graph.getHeight() + margins.bottom,
    new OutlineNode(
      -graph.getWidth() / 2.0,
      graph.getY() + graph.getHeight() + margins.bottom + spacingNodeNode / 2,
      null,
    ),
  );

  graph.setProperty(
    InternalProperties.RIGHT_OUTLINE,
    new OutlineNode(
      graph.getWidth() / 2.0 + margins.right + spacingNodeNode / 2,
      graph.getY() - margins.top,
      new OutlineNode(graph.getWidth() / 2.0, graph.getY() - margins.top - spacingNodeNode / 2, endpart),
    ),
  );
}

/**
 * Create the initial outlines around a node.
 *
 * @param graph the node
 * @param spacingNodeNode the `spacingNodeNode` field of the placer
 * @see RelativeXPlacer.java:556
 */
export function makeSimpleOutlines(graph: ElkNode, spacingNodeNode: number): void {
  const margins = graph.getProperty(CoreOptions.MARGINS);

  // set the properties for left and right outlines
  setSimpleLeftOutline(graph, margins, spacingNodeNode);
  setSimpleRightOutline(graph, margins, spacingNodeNode);

  // set min and max values
  graph.setProperty(InternalProperties.MIN_X, graph.getX() - margins.left);
  graph.setProperty(InternalProperties.MAX_X, graph.getX() + margins.right + graph.getWidth());
  graph.setProperty(InternalProperties.MIN_Y, graph.getY() - margins.top);
  graph.setProperty(InternalProperties.MAX_Y, graph.getY() + margins.bottom + graph.getHeight());
  graph.setProperty(
    InternalProperties.OUTLINE_MAX_DEPTH,
    graph.getProperty(InternalProperties.LEFT_OUTLINE).getNext()!.getNext()!.getAbsoluteY(),
  );
}
