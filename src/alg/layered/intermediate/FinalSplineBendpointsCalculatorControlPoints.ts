// SPDX-License-Identifier: EPL-2.0
import { ElkMath } from '../../../core/math/ElkMath.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { sub as int32Sub, add as int32Add } from '../../../java/lang/Int32.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import type { SplineSegment } from '../p5edges/splines/SplineSegment.js';
import type { SplineSegmentEdgeInformation as EdgeInformation } from '../p5edges/splines/SplineSegmentEdgeInformation.js';

/** The two spacings the control point methods read (`edgeEdgeSpacing`, `edgeNodeSpacing`, `:68-69`). */
export interface ControlPointSpacings {
  readonly edgeEdgeSpacing: number;
  readonly edgeNodeSpacing: number;
}

/**
 * Multiplier used to determine the curvature of certain sloppy splines (for `SplineRoutingMode.SLOPPY`).
 *
 * @see FinalSplineBendpointsCalculator.java:79
 */
const SLOPPY_CENTER_CP_MULTIPLIER = 0.4;

/**
 * Section of `FinalSplineBendpointsCalculator` (mission 7e T9; P1: it never imports the facade): the four
 * `calculateControlPoints*` methods below the dispatcher and their helpers. The Java `calculateControlPointsSloppy`
 * is cut into `sourceShortCut` and `targetShortCut` (complexity limits), in Java order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/FinalSplineBendpointsCalculator.java
 */

/**
 * Adds a single control point to a straight segment, halfway between the source and target layer.
 *
 * @see FinalSplineBendpointsCalculator.java:181
 */
export function calculateControlPointsStraight(segment: SplineSegment): void {
  const xStartPos = segment.boundingBox.x;
  const xEndPos = segment.boundingBox.x + segment.boundingBox.width;
  const halfway = new KVector(xStartPos + (xEndPos - xStartPos) / 2, segment.centerControlPointY);
  segment.edges.values().next().value!.getBendPoints().add(halfway);
}

/** The straight control points of an inverted edge (`:209-221`), cut out of the Java method for the NLOC limit. */
function invertedStraightControlPoints(
  ei: EdgeInformation,
  startXPos: number,
  endXPos: number,
): { readonly sourceStraightCP: KVector; readonly targetStraightCP: KVector } {
  let sourceStraightCP: KVector;
  let targetStraightCP: KVector;
  if (ei.invertedLeft) {
    sourceStraightCP = new KVector(endXPos, ei.startY);
  } else {
    sourceStraightCP = new KVector(startXPos, ei.startY);
  }
  if (ei.invertedRight) {
    targetStraightCP = new KVector(startXPos, ei.endY);
  } else {
    targetStraightCP = new KVector(endXPos, ei.endY);
  }
  return { sourceStraightCP, targetStraightCP };
}

/**
 * If `edge` is an inverted edge on the western side, control points are computed so that the edge leaves the node
 * straight, runs to the vertical segment and back. An inverted edge on the right side works analog.
 *
 * @see FinalSplineBendpointsCalculator.java:201
 */
export function calculateControlPointsInvertedEdge(
  edge: LEdge,
  containingSegment: SplineSegment,
  spacings: ControlPointSpacings,
): void {
  const startXPos = containingSegment.boundingBox.x;
  const endXPos = containingSegment.boundingBox.x + containingSegment.boundingBox.width;

  const ei = containingSegment.edgeInformation.get(edge)!;
  const ySourceAnchor = ei.startY;
  const yTargetAnchor = ei.endY;

  // compute the desired control points
  const { sourceStraightCP, targetStraightCP } = invertedStraightControlPoints(ei, startXPos, endXPos);

  // the center position is the same for all edges but depends on sloppiness of the routing
  let centerXPos = startXPos;
  if (!containingSegment.isWestOfInitialLayer) {
    centerXPos += spacings.edgeNodeSpacing;
  }
  // `(rank + 0)` is the Java `(containingSegment.rank + 0)`
  centerXPos += containingSegment.xDelta + (containingSegment.rank + 0) * spacings.edgeEdgeSpacing;

  const sourceVerticalCP = new KVector(centerXPos, ySourceAnchor);
  const targetVerticalCP = new KVector(centerXPos, yTargetAnchor);

  // add control points to the edge's bendpoints
  edge.getBendPoints().addAll(sourceStraightCP, sourceVerticalCP);
  const isHyperedge = containingSegment.edges.size > 1;
  if (isHyperedge) {
    // add an additional center control point to assert that the hyperedge segments
    // share a part of their route
    const center = new KVector(centerXPos, containingSegment.centerControlPointY);
    edge.getBendPoints().add(center);
  }
  edge.getBendPoints().addAll(targetVerticalCP, targetStraightCP);
}

/**
 * For a regular upward pointing edge and the conservative routing style, four control points (plus an extra center
 * control point for hyperedges) are computed. A downward pointing edge is handled analog.
 *
 * @see FinalSplineBendpointsCalculator.java:259
 */
export function calculateControlPointsConservative(
  edge: LEdge,
  containingSegment: SplineSegment,
  spacings: ControlPointSpacings,
): void {
  const startXPos = containingSegment.boundingBox.x;
  const endXPos = containingSegment.boundingBox.x + containingSegment.boundingBox.width;

  const ei = containingSegment.edgeInformation.get(edge)!;
  const ySourceAnchor = ei.startY;
  const yTargetAnchor = ei.endY;

  // Calculate bend points to draw inner layer segments straight
  // to prevent intersections with big nodes
  const sourceStraightCP = new KVector(startXPos, ySourceAnchor);
  const targetStraightCP = new KVector(endXPos, yTargetAnchor);

  let centerXPos = startXPos;
  if (!containingSegment.isWestOfInitialLayer) {
    centerXPos += spacings.edgeNodeSpacing;
  }
  centerXPos += containingSegment.xDelta + (containingSegment.rank + 0) * spacings.edgeEdgeSpacing;
  const sourceVerticalCP = new KVector(centerXPos, ySourceAnchor);
  const targetVerticalCP = new KVector(centerXPos, yTargetAnchor);

  // Traditional four control points (plus an extra center control point for hyperedges)
  edge.getBendPoints().addAll(sourceStraightCP, sourceVerticalCP);
  const isHyperedge = containingSegment.edges.size > 1;
  if (isHyperedge) {
    // add an additional center control point to assert that the hyperedge segments share a part of their route
    const center = new KVector(centerXPos, containingSegment.centerControlPointY);
    edge.getBendPoints().add(center);
  }
  edge.getBendPoints().addAll(targetVerticalCP, targetStraightCP);
}

/** @see FinalSplineBendpointsCalculator.java:427 */
function nodeToBoundingBox(node: LNode): ElkRectangle {
  const pos = node.getPosition();
  const size = node.getSize();
  const m = node.getMargin();
  return new ElkRectangle(pos.x - m.left, pos.y - m.top, size.x + m.getHorizontal(), size.y + m.getVertical());
}

/** The inputs the two short cut checks of the sloppy strategy share (named: 6+ Java locals, complexity limits). */
interface ShortCutContext {
  readonly ei: EdgeInformation;
  readonly segment: SplineSegment;
  readonly edgePointsDownwards: boolean;
  /** `v1`, the absolute anchor of the source port (`:354`). */
  readonly v1: KVector;
  /** `approx[0]`, the center of the curve (`:359`). */
  readonly center: KVector;
  /** `v3`, the absolute anchor of the target port (`:356`). */
  readonly v3: KVector;
}

/** Whether the source end of the sloppy spline can be omitted, `:361-389`. */
function sourceShortCut(context: ShortCutContext): boolean {
  const { ei, segment, edgePointsDownwards, v1, center } = context;
  let shortCutSource = false;
  const src = segment.sourcePort!.getNode();
  // when graph wrapping is activated, it can happen that the 'src' node doesn't exist anymore (the same goes for
  // the node's layer)
  if (src !== null && src.getLayer() !== null && ei.normalSourceNode) {
    // possible intersections must only be checked if there are nodes
    // with which the edge could potentially intersect
    const needToCheckSrc =
      (edgePointsDownwards && src.id < src.getLayer()!.getNodes().length - 1) || (!edgePointsDownwards && src.id > 0);

    if (!needToCheckSrc) {
      shortCutSource = true;
    } else {
      // check within src's layer
      // (Java `:376` repeats `if (needToCheckSrc)` in the branch where it is true: a side-effect-free duplicate,
      // collapsed per R14)
      let neighborIndex = src.id;
      if (edgePointsDownwards) {
        neighborIndex = int32Add(neighborIndex, 1);
      } else {
        neighborIndex = int32Sub(neighborIndex, 1);
      }
      const neighbor = src.getLayer()!.getNodes()[neighborIndex]!;
      const box = nodeToBoundingBox(neighbor);
      shortCutSource = !(ElkMath.intersects(box, v1, center) || ElkMath.contains(box, v1, center));
    }
  }
  return shortCutSource;
}

/** Whether the target end of the sloppy spline can be omitted, `:391-413`. */
function targetShortCut(context: ShortCutContext): boolean {
  const { ei, segment, edgePointsDownwards, v3, center } = context;
  let shortCutTarget = false;
  const tgt = segment.targetPort!.getNode();
  // see comment above
  if (tgt !== null && tgt.getLayer() !== null && ei.normalTargetNode) {
    const needToCheckTgt =
      (edgePointsDownwards && tgt.id > 0) || (!edgePointsDownwards && tgt.id < tgt.getLayer()!.getNodes().length - 1);

    // tgt's layer
    if (!needToCheckTgt) {
      shortCutTarget = true;
    } else {
      let neighborIndex = tgt.id;
      if (edgePointsDownwards) {
        neighborIndex = int32Sub(neighborIndex, 1);
      } else {
        neighborIndex = int32Add(neighborIndex, 1);
      }
      const neighbor = tgt.getLayer()!.getNodes()[neighborIndex]!;
      const box = nodeToBoundingBox(neighbor);
      shortCutTarget = !(ElkMath.intersects(box, center, v3) || ElkMath.contains(box, center, v3));
    }
  }
  return shortCutTarget;
}

/**
 * As opposed to the conservative strategy to insert control points, the sloppy version tries to use less control points
 * to make the splines curvier. The method handles only the case in which one of the two involved nodes is a normal
 * node. Control points that could be omitted without the resulting spline intersecting a neighboring node are left
 * out; in case all could be omitted, a single control point is added halfway in between the two nodes (see
 * `computeSloppyCenterY`). If none can be omitted, the control points of the conservative strategy result.
 *
 * @see FinalSplineBendpointsCalculator.java:334
 */
export function calculateControlPointsSloppy(edge: LEdge, containingSegment: SplineSegment): void {
  const ei = containingSegment.edgeInformation.get(edge)!;
  // The Java `assert ei.normalSourceNode || ei.normalTargetNode` (:336) is omitted: the dispatcher guarantees it.

  const startXPos = containingSegment.boundingBox.x;
  const endXPos = containingSegment.boundingBox.x + containingSegment.boundingBox.width;

  const ySourceAnchor = ei.startY;
  const yTargetAnchor = ei.endY;
  const edgePointsDownwards = ySourceAnchor < yTargetAnchor;

  // pre-compute a number of coordinates that we might use as control points
  const sourceStraightCP = new KVector(startXPos, ySourceAnchor);
  const targetStraightCP = new KVector(endXPos, yTargetAnchor);
  const centerXPos = (startXPos + endXPos) / 2;
  const sourceVerticalCP = new KVector(centerXPos, ySourceAnchor);
  const targetVerticalCP = new KVector(centerXPos, yTargetAnchor);

  // evaluate if a rather direct curve is possible
  const centerYPos = computeSloppyCenterY(edge, ySourceAnchor, yTargetAnchor);
  const v1 = containingSegment.sourcePort!.getAbsoluteAnchor();
  const v2 = new KVector(centerXPos, centerYPos);
  const v3 = containingSegment.targetPort!.getAbsoluteAnchor();
  // approx will be an array holding two values, the zeroth of which represents the
  // center of the curve
  const approx = ElkMath.approximateBezierSegment(2, v1, v2, v3);

  const context: ShortCutContext = { ei, segment: containingSegment, edgePointsDownwards, v1, center: approx[0]!, v3 };
  const shortCutSource = sourceShortCut(context);
  const shortCutTarget = targetShortCut(context);

  // now add the control points
  if (shortCutSource && shortCutTarget) {
    edge.getBendPoints().add(v2);
  }
  if (!shortCutSource) {
    edge.getBendPoints().addAll(sourceStraightCP, sourceVerticalCP);
  }
  if (!shortCutTarget) {
    edge.getBendPoints().addAll(targetVerticalCP, targetStraightCP);
  }
}

/** @see FinalSplineBendpointsCalculator.java:434 */
function computeSloppyCenterY(edge: LEdge, ySourceAnchor: number, yTargetAnchor: number): number {
  let indegree = 0;
  let outdegree = 0;
  // Count all the incoming and outgoing edges
  //  remember that the edge's source and target may have been set to null by now
  //  (in case they were connected to a dummy node beforehand), in which case the degree is assumed to be one
  if (edge.getSource() !== null) {
    // (sic) Java tests the source and reads the target's node (`:440-441`)
    for (const port of edge.getTarget()!.getNode()!.getPorts()) {
      indegree = int32Add(indegree, port.getIncomingEdges().length);
    }
  } else {
    indegree = 1;
  }
  if (edge.getTarget() !== null) {
    // (sic) and the mirror image for the target and the source (`:447-448`)
    for (const port of edge.getSource()!.getNode()!.getPorts()) {
      outdegree = int32Add(outdegree, port.getOutgoingEdges().length);
    }
  } else {
    outdegree = 1;
  }
  const degreeDiff = d2i(Math.sign(int32Sub(outdegree, indegree)));
  const centerYPos =
    (yTargetAnchor + ySourceAnchor) / 2 + (yTargetAnchor - ySourceAnchor) * (SLOPPY_CENTER_CP_MULTIPLIER * degreeDiff);

  return centerYPos;
}
