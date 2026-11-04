// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { add as int32Add } from '../../../java/lang/Int32.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { GraphCompactionStrategy } from '../options/GraphCompactionStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { SplineRoutingMode } from '../options/SplineRoutingMode.js';
import type { SplineSegment } from '../p5edges/splines/SplineSegment.js';
import type { SplineSegmentEdgeInformation as EdgeInformation } from '../p5edges/splines/SplineSegmentEdgeInformation.js';
import { calculateBezierBendPoints, NODE_TO_STRAIGHTENING_CP_GAP } from './FinalSplineBendpointsCalculatorBezier.js';
import {
  type ControlPointSpacings,
  calculateControlPointsConservative,
  calculateControlPointsInvertedEdge,
  calculateControlPointsSloppy,
  calculateControlPointsStraight,
} from './FinalSplineBendpointsCalculatorControlPoints.js';

/**
 * `Collections.reverse(list)` of a bend point chain: the list is reversed in place, element by element, as the Java
 * `ListIterator` form (or the `set` form) leaves it.
 */
function reverseInPlace(chain: KVectorChain): void {
  for (let i = 0, j = chain.size() - 1; i < j; i++, j--) {
    const first = chain.get(i);
    chain.set(i, chain.get(j));
    chain.set(j, first);
  }
}

/**
 * Intermediate processor that runs some time after the edge routing phase and turns tentative spline routes into
 * concrete bezier control points that become the bendpoints of `LEdge`s.
 *
 * For further details on how the control points are assembled, see the `calculateControlPoints*(..)` methods (in
 * `FinalSplineBendpointsCalculatorControlPoints.ts`; the conversion to Bezier points is in
 * `FinalSplineBendpointsCalculatorBezier.ts`).
 *
 * Precondition: a layered graph; the `SplineEdgeRouter` did his job; no dummy nodes. Postcondition: the bendpoints of
 * edges can be interpreted as Bezier splines. Slots: after phase 5. Same-slot dependencies: after `LongEdgeJoiner`,
 * after `LabelDummyRemover`, after `HorizontalGraphCompactor`, after `NorthSouthPortPostprocessor`.
 *
 * Containers (R9): `SplineSegment.edges` is an insertion-ordered `Set`, iterated in insertion order at the sites of
 * `calculateControlPoints` and `calculateControlPointsStraight`; the replay of the hyperedge spline rows is the proof.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/FinalSplineBendpointsCalculator.java
 */
export class FinalSplineBendpointsCalculator implements ILayoutProcessor<LGraph> {
  // The four Java fields, set by `process` (Java leaves them zero/null before): definite-assignment is the port's
  // spelling of "not read before `process`".
  private edgeEdgeSpacing = 0;
  private edgeNodeSpacing = 0;
  private splineRoutingMode!: SplineRoutingMode;
  private compactionStrategy!: GraphCompactionStrategy;

  /**
   * Defines the gap between the source/target anchor of an edge and the control point that is inserted to straighten
   * the start/end of the edge-spline (for `SplineRoutingMode.CONSERVATIVE`).
   *
   * @see FinalSplineBendpointsCalculator.java:77
   */
  static readonly NODE_TO_STRAIGHTENING_CP_GAP: number = NODE_TO_STRAIGHTENING_CP_GAP;

  /** @see FinalSplineBendpointsCalculator.java:82 */
  process(graph: LGraph, _progressMonitor: IElkProgressMonitor): void {
    this.edgeEdgeSpacing = graph.getProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS)!;
    this.edgeNodeSpacing = graph.getProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS)!;
    this.splineRoutingMode = graph.getProperty(LayeredOptions.EDGE_ROUTING_SPLINES_MODE);
    this.compactionStrategy = graph.getProperty(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY);

    // assign indices to nodes to efficiently query neighbors within the same layer
    this.indexNodesPerLayer(graph);

    // collect all edges that represent the first segment of a spline
    const startEdges: LEdge[] = graph
      .getLayers()
      .flatMap((l) => l.getNodes())
      .flatMap((n) => [...n.getOutgoingEdges()])
      .filter((e) => !e.isSelfLoop())
      .filter((e) => e.hasProperty(InternalProperties.SPLINE_ROUTE_START));

    // first determine the NUB control points
    for (const e of startEdges) {
      const spline = e.getProperty(InternalProperties.SPLINE_ROUTE_START);
      spline.forEach((s) => this.calculateControlPoints(s));
      e.setProperty(InternalProperties.SPLINE_ROUTE_START, null);
    }

    // ... then convert them to bezier splines
    for (const e of startEdges) {
      const survivingEdge = e.getProperty(InternalProperties.SPLINE_SURVIVING_EDGE) as LEdge | null; // may be null
      const edgeChain = e.getProperty(InternalProperties.SPLINE_EDGE_CHAIN);
      calculateBezierBendPoints(edgeChain, survivingEdge, this.splineRoutingMode);
      // clear property
      e.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, null);
    }
  }

  /** The two spacing fields the control point sections read (they cannot read the private fields of this class). */
  private spacings(): ControlPointSpacings {
    return { edgeEdgeSpacing: this.edgeEdgeSpacing, edgeNodeSpacing: this.edgeNodeSpacing };
  }

  /** @see FinalSplineBendpointsCalculator.java:116 */
  private indexNodesPerLayer(graph: LGraph): void {
    for (const l of graph) {
      let index = 0;
      for (const n of l) {
        n.id = index;
        index = int32Add(index, 1);
      }
    }
  }

  /**
   * The method dispatches the calculation of NUB control points for the passed `segment` to the
   * `calculateControlPoints*(..)` methods based on the following criteria: the desired `SplineRoutingMode`, if the
   * segment is straight, if the segment represents an in-layer edge due to inverted ports, if the segment represents a
   * hyperedge.
   *
   * The loop body is `calculateControlPointsOfEdge` (complexity limits); Java's `continue` is its `return`.
   *
   * @see FinalSplineBendpointsCalculator.java:135
   */
  private calculateControlPoints(segment: SplineSegment): void {
    // with hyperedges it can happen that this method is called multiple times for the same segment
    if (segment.handled) {
      return;
    }
    segment.handled = true;

    for (const edge of segment.edges) {
      this.calculateControlPointsOfEdge(edge, segment);
    }

    if (segment.inverseOrder) {
      segment.edges.forEach((e) => reverseInPlace(e.getBendPoints()));
    }
  }

  /** The body of the `for (final LEdge edge : segment.edges)` loop of `calculateControlPoints`, `:142-171`. */
  private calculateControlPointsOfEdge(edge: LEdge, segment: SplineSegment): void {
    if (segment.isStraight && !segment.isHyperEdge()) {
      calculateControlPointsStraight(segment);
      return;
    }

    // Remember that the edge itself is not necessarily valid at this point
    //  (it may have been remove by the long edge joiner, for instance)
    const ei = segment.edgeInformation.get(edge)!;
    // inverted ports are handled in the same way for
    if (ei.invertedLeft || ei.invertedRight) {
      calculateControlPointsInvertedEdge(edge, segment, this.spacings());
      return;
    }

    if (this.isSloppy(ei, segment)) {
      calculateControlPointsSloppy(edge, segment);
    } else {
      calculateControlPointsConservative(edge, segment, this.spacings());
    }
  }

  /**
   * To compute sloppy control points at least one of the two nodes connected by the segment must be a 'normal' node,
   * and in case horizontal compaction is active the predicate implemented by the `segmentAllowsSloppyRouting(..)` method
   * must be true. For hyperedges sloppy routing is not possible (`:157-165`).
   */
  private isSloppy(ei: EdgeInformation, segment: SplineSegment): boolean {
    return (
      this.splineRoutingMode === SplineRoutingMode.SLOPPY &&
      (ei.normalSourceNode || ei.normalTargetNode) &&
      this.segmentAllowsSloppyRouting(segment) &&
      !segment.isHyperEdge()
    );
  }

  /** @see FinalSplineBendpointsCalculator.java:584 */
  private segmentAllowsSloppyRouting(segment: SplineSegment): boolean {
    // only check this if one dimensional compaction is applied
    if (this.compactionStrategy === GraphCompactionStrategy.NONE) {
      return true;
    }

    const startXPos = segment.boundingBox.x;
    const endXPos = segment.boundingBox.x + segment.boundingBox.width;

    if (segment.initialSegment) {
      const n = segment.sourceNode!;
      const t = this.segmentNodeDistanceThreshold(n);
      const nodeSegmentDistance = startXPos - (n.getPosition().x + n.getSize().x);
      if (nodeSegmentDistance > t) {
        return false;
      }
    }
    if (segment.lastSegment) {
      const n = segment.targetNode!;
      const t = this.segmentNodeDistanceThreshold(n);
      const nodeSegmentDistance = n.getPosition().x - endXPos;
      if (nodeSegmentDistance > t) {
        return false;
      }
    }

    return true;
  }

  /**
   * @return a magically determined threshold value.
   * @see FinalSplineBendpointsCalculator.java:616
   */
  private segmentNodeDistanceThreshold(n: LNode): number {
    return n.getLayer()!.getSize().x - n.getSize().x / 2;
  }
}
