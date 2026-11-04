// SPDX-License-Identifier: EPL-2.0

/**
 * A segment represents an `LEdge` between adjacent layers. Thus, it may represent an `LEdge` that was introduced during
 * the splitting of long edges (see `LongEdgeSplitter`). The final spline control points need, for every such edge, the
 * information that was valid during the edge routing phase. Java's inner `SplineSegment.EdgeInformation` (M15 file
 * naming); the Java class captures no state of its outer instance, so it is a plain record class.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineSegment.java:129
 */
export class SplineSegmentEdgeInformation {
  startY = 0;
  endY = 0;

  normalSourceNode = false;
  normalTargetNode = false;

  invertedLeft = false;
  invertedRight = false;
}
