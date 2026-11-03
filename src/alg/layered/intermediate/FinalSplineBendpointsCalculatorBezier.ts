// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { SplineRoutingMode } from '../options/SplineRoutingMode.js';
import { NubSpline } from '../p5edges/splines/NubSpline.js';
import { SplineEdgeRouter } from '../p5edges/splines/SplineEdgeRouter.js';
import { SplinesMath } from '../p5edges/splines/SplinesMath.js';

/**
 * Defines the gap between the source/target anchor of an edge and the control point that is inserted to straighten the
 * start/end of the edge-spline (for `SplineRoutingMode.CONSERVATIVE`). The facade re-exports it as the public static of
 * the Java class.
 *
 * @see FinalSplineBendpointsCalculator.java:77
 */
export const NODE_TO_STRAIGHTENING_CP_GAP = 5;

/**
 * Avoiding magic number problems.
 *
 * @see FinalSplineBendpointsCalculator.java:74
 */
const ONE_HALF = 0.5;

/**
 * Section of `FinalSplineBendpointsCalculator` (mission 7e T9; P1: it never imports the facade): the conversion of the
 * NUB control points of one edge chain to Bezier bend points, `calculateBezierBendPoints` and
 * `insertStraighteningControlPoints`. The Java method `calculateBezierBendPoints` is cut into the end-point helpers
 * `addSourceControlPoints`, `copySegmentControlPoints` and `addTargetControlPoints` (complexity limits), in Java order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/FinalSplineBendpointsCalculator.java
 */

/**
 * Java unboxes the `Double` `SPLINE_NS_PORT_Y_COORD` of a north/south port (`:488`, `:524`): a port without it is a
 * `NullPointerException` (AD-16 keeps the error condition; the `SortByInputModelProcessor` precedent).
 */
function northSouthPortY(port: LPort): number {
  const y = port.getProperty(InternalProperties.SPLINE_NS_PORT_Y_COORD) as number | null;
  if (y === null) {
    throw new TypeError('Cannot unbox the spline north/south y coordinate of a port without one');
  }
  return y;
}

/** Adds the source as the very first control point (and the north/south one), `:483-491`. */
function addSourceControlPoints(allCP: KVectorChain, sourcePort: LPort): void {
  // add the source as the very first control point.
  allCP.addLast(sourcePort.getAbsoluteAnchor());

  // add an additional control point if the source port is a north or south port
  if (PortSide.SIDES_NORTH_SOUTH.has(sourcePort.getSide())) {
    const y = northSouthPortY(sourcePort);
    const northSouthCP = new KVector(sourcePort.getAbsoluteAnchor().x, y);
    allCP.addLast(northSouthCP);
  }
}

/**
 * Copies the calculated control points for all spline segments, possibly adding additional control points halfway
 * between computed ones, `:493-517`.
 */
function copySegmentControlPoints(allCP: KVectorChain, edgeChain: readonly LEdge[]): void {
  let lastCP: KVector | null = null;
  let addMidPoint = false;
  for (const currentEdge of edgeChain) {
    // read the stored bend-points for vertical segments, calculated by calculateNUBSBendPoint.
    const currentBendPoints = currentEdge.getBendPoints();

    if (!currentBendPoints.isEmpty()) {
      // add a CP in the middle of the straight segment between two vertical segments to
      // get a more straight horizontal segment
      if (addMidPoint) {
        // `KVector.add` mutates `lastCP`, as in Java; `lastCP` is non-null here as `addMidPoint` is set after it is
        const halfway = lastCP!.add(currentBendPoints.getFirst()).scale(ONE_HALF);
        allCP.addLast(halfway);
        addMidPoint = false;
      } else {
        addMidPoint = true;
      }
      lastCP = currentBendPoints.getLast().clone();
      allCP.addAll(currentBendPoints);
      currentBendPoints.clear();
    }
  }
}

/** Finalizes the spline with the target end (and the north/south control point), `:519-530`. */
function addTargetControlPoints(allCP: KVectorChain, targetPort: LPort): void {
  // again, add an additional control point if the target port is a north or sout port
  if (PortSide.SIDES_NORTH_SOUTH.has(targetPort.getSide())) {
    const y = northSouthPortY(targetPort);
    const northSouthCP = new KVector(targetPort.getAbsoluteAnchor().x, y);
    allCP.addLast(northSouthCP);
  }

  // finish with the target as last control point.
  allCP.addLast(targetPort.getAbsoluteAnchor());
}

/**
 * Collects all NUB control points computed for a spline segment and converts them to bezier control points. Note that
 * additional NUB control points _may_ be added before the conversion is performed.
 *
 * @param edgeChain the chain of edges of one spline
 * @param survivingEdge the edge that receives the bend points (may be `null`: the first edge of the chain)
 * @param splineRoutingMode the routing mode of the graph (`FinalSplineBendpointsCalculator.splineRoutingMode`)
 * @see FinalSplineBendpointsCalculator.java:465
 */
export function calculateBezierBendPoints(
  edgeChain: readonly LEdge[],
  survivingEdge: LEdge | null,
  splineRoutingMode: SplineRoutingMode,
): void {
  if (edgeChain.length === 0) {
    return;
  }

  // in this chain we will put all NURBS control points.
  const allCP = new KVectorChain();
  // add the computed bendpoints to the specified edge (default to the first edge in the edge chain)
  const edge = survivingEdge !== null ? survivingEdge : edgeChain[0]!;
  // Process the source end of the edge-chain.
  const sourcePort = edge.getSource()!;

  // edge must be the first edge of a chain of edges
  if (!SplineEdgeRouter.isQualifiedAsStartingNode(sourcePort.getNode()!)) {
    throw new IllegalArgumentException('The target node of the edge must be a normal node ' + 'or a northSouthPort.');
  }

  addSourceControlPoints(allCP, sourcePort);
  copySegmentControlPoints(allCP, edgeChain);

  // finalize the spline
  const targetPort = edge.getTarget()!;
  addTargetControlPoints(allCP, targetPort);

  // insert straightening control points (if desired)
  if (splineRoutingMode === SplineRoutingMode.CONSERVATIVE) {
    // Add a control point for a straight segment at the very start and at the very end of a spline to prevent
    //  the edge from colliding with self-loops or the like inside the margin of the node.
    //  This also ensures the correct initial direction of the edge
    insertStraighteningControlPoints(allCP, sourcePort, targetPort);
  }

  // convert list of NUB control points to bezier control points
  const nubSpline = new NubSpline(true, SplineEdgeRouter.SPLINE_DIMENSION, allCP);
  // ... and set them as bendpoints of the edge
  edge.getBendPoints().addAll(nubSpline.getBezierCP());
}

/** @see FinalSplineBendpointsCalculator.java:576 */
function absMin(d1: number, d2: number): number {
  if (Math.abs(d1) < Math.abs(d2)) {
    return d1;
  } else {
    return d2;
  }
}

/**
 * @see FinalSplineBendpointsCalculator.java:546
 */
function insertStraighteningControlPoints(allCPs: KVectorChain, srcPort: LPort, tgtPort: LPort): void {
  // KVectorChain extends LinkedList, thus the following operations are fast
  // Further note that the vector computations are necessary to address adding a straightening gap
  //  into either of the for cardinal directions (based on the port side)

  // beginning
  const first = allCPs.getFirst();
  const second = allCPs.get(1);

  // `new KVector(double angle)` is `KVector.fromAngle` in the port
  let v = KVector.fromAngle(SplinesMath.portSideToDirection(srcPort.getSide()));
  v.scale(NODE_TO_STRAIGHTENING_CP_GAP);
  let v2 = second.clone().sub(first);
  const straightenBeginning = new KVector(absMin(v.x, v2.x), absMin(v.y, v2.y));
  straightenBeginning.add(first);

  allCPs.addAt(1, straightenBeginning);

  // ending
  const last = allCPs.getLast();
  const secondLast = allCPs.get(allCPs.size() - 2);

  v = KVector.fromAngle(SplinesMath.portSideToDirection(tgtPort.getSide()));
  v.scale(NODE_TO_STRAIGHTENING_CP_GAP);
  v2 = secondLast.clone().sub(last);
  const straightenEnding = new KVector(absMin(v.x, v2.x), absMin(v.y, v2.y));
  straightenEnding.add(last);

  allCPs.addAt(allCPs.size() - 1, straightenEnding);
}
