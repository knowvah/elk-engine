// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TNode } from '../graph/TNode.js';
import { TreeUtil } from '../TreeUtil.js';

/** `EdgeRouter.oneHalf` (`EdgeRouter.java:53`), a `private final` instance field read by the start and end point sections. */
export const ONE_HALF = 0.5;

/** `EdgeRouter.steepEndEdgeTheresholdDistance` (`EdgeRouter.java:54`; the Java spelling of the name is kept). */
export const STEEP_END_EDGE_THERESHOLD_DISTANCE = 50;

/** `EdgeRouter.steepEndEdgeRatio` (`EdgeRouter.java:55`). */
export const STEEP_END_EDGE_RATIO = 5.3;

/** `EdgeRouter.steepEndEdgeSampleHeight` (`EdgeRouter.java:56`). */
export const STEEP_END_EDGE_SAMPLE_HEIGHT = 40;

/**
 * Routes a single edge from the middle of one node to the other. Section of `EdgeRouter` (the facade); shared by
 * the special-edge and Cyrus-Beck sections.
 *
 * @param tEdge the edge to route
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java:113
 */
export function middleToMiddleEdgeRoute(tEdge: TEdge): void {
  const bendPoints = tEdge.getBendPoints();

  // add the source port and target points to the vector chain
  const source = tEdge.getSource()!;
  const target = tEdge.getTarget()!;

  const sourcePoint = new KVector(
    source.getPosition().x + source.getSize().x / 2,
    source.getPosition().y + source.getSize().y / 2,
  );
  const targetPoint = new KVector(
    target.getPosition().x + target.getSize().x / 2,
    target.getPosition().y + target.getSize().y / 2,
  );

  bendPoints.addFirst(sourcePoint);
  bendPoints.addLast(targetPoint);

  // correct the source and target points
  TreeUtil.toNodeBorder(sourcePoint, bendPoints.get(1), tEdge.getSource()!.getSize());
  TreeUtil.toNodeBorder(targetPoint, bendPoints.get(bendPoints.size() - 2), tEdge.getTarget()!.getSize());
}

/**
 * `node.getLabel()` where Java dereferences it. A `null` label is a `NullPointerException` in Java (D10: `TypeError`, as
 * in `TreeUtil.getAllOutgoingEdges`).
 */
export function labelOf(node: TNode): string {
  const label = node.getLabel();
  if (label === null) {
    throw new TypeError(`Cannot invoke "String.equals(Object)" because the label of ${node.toString()} is null`);
  }
  return label;
}

/** `node.getLabel().equals(text)`. */
export function labelEquals(node: TNode, text: string): boolean {
  return labelOf(node) === text;
}

/** The label of the dummy super root, which the start and end point sections skip (`EdgeRouter.java:391,459`). */
export const SUPER_ROOT_LABEL = 'SUPER_ROOT';
