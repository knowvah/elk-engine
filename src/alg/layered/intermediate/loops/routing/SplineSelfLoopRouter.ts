// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../../core/math/KVectorChain.js';
import type { PortSide } from '../../../../../core/options/PortSide.js';
import { LGraphUtil } from '../../../graph/LGraphUtil.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import { NubSpline } from '../../../p5edges/splines/NubSpline.js';
import { SplinesMath } from '../../../p5edges/splines/SplinesMath.js';
import type { SelfLoopEdge } from '../SelfLoopEdge.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { EdgeRoutingDirection, OrthogonalSelfLoopRouter } from './OrthogonalSelfLoopRouter.js';

/** Dimension of our self loop splines. */
const DIM = 3;
/** To avoid magic number warning. */
const HALF = 0.5;

/**
 * Routes self loops with splines. It uses `NubSpline` and `SplinesMath`; `NubsSelfLoop` is not called by the Java.
 *
 * Deviations: the Java `assert` (`:70`) is omitted. `new KVector(double angle)` is `KVector.fromAngle`. A null
 * `SPACING_EDGE_LABEL` unboxes to a `TypeError` (Java `NullPointerException`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/SplineSelfLoopRouter.java
 */
export class SplineSelfLoopRouter extends OrthogonalSelfLoopRouter {
  /** Turns a vector chain of orthogonal bend points into polyline bend points by cutting the corners. */
  protected override modifyBendPoints(
    slEdge: SelfLoopEdge,
    routingDirection: EdgeRoutingDirection,
    bendPoints: KVectorChain,
  ): KVectorChain {
    const edgeLabelDistance = LGraphUtil.getIndividualOrInherited(
      slEdge.getSLHyperLoop()!.getSLHolder().getLNode(),
      LayeredOptions.SPACING_EDGE_LABEL,
    );
    if (edgeLabelDistance === null) {
      throw new TypeError('Cannot unbox the edge-label spacing of a node without one');
    }

    // For the splines to be routed correctly, we also have to include the source and target positions, so we build
    // up the new list of bend points bit by bit
    const splineBendPoints = new KVectorChain(this.relativePortAnchor(slEdge.getSLSource()));
    this.addSplineControlPoints(slEdge, routingDirection, bendPoints, splineBendPoints, edgeLabelDistance);
    splineBendPoints.add(this.relativePortAnchor(slEdge.getSLTarget()));

    return new NubSpline(true, DIM, splineBendPoints).getBezierCP();
  }

  private relativePortAnchor(slPort: SelfLoopPort): KVector {
    const lPort = slPort.getLPort();
    return new KVector(lPort.getPosition()).add(lPort.getAnchor());
  }

  /**
   * Inserts spline control points between each consecutive pair of bend points as computed by the orthogonal self loop
   * router. The spline control points are slightly offset away from the node.
   */
  private addSplineControlPoints(
    slEdge: SelfLoopEdge,
    routingDirection: EdgeRoutingDirection,
    orthoBendPoints: KVectorChain,
    newBendPoints: KVectorChain,
    edgeLabelDistance: number,
  ): void {
    // We want to insert a new bend point between each pair of consecutive bend points in the old list
    let currPortSide: PortSide = slEdge.getSLSource().getLPort().getSide();
    let firstBP = orthoBendPoints.get(0);

    for (let secondBPIndex = 1; secondBPIndex < orthoBendPoints.size(); secondBPIndex++) {
      // Next pair
      const secondBP = orthoBendPoints.get(secondBPIndex);

      // The first bend point will go straight into our list before we compute a new bend point
      newBendPoints.add(firstBP);

      // Compute a middle bend point and move it away from the node a little
      const midBP = new KVector(firstBP).add(secondBP).scale(HALF);
      const offset = KVector.fromAngle(SplinesMath.portSideToDirection(currPortSide)).scale(edgeLabelDistance);
      midBP.add(offset);

      newBendPoints.add(midBP);

      // Advance to the next pair of bend points on the next port side
      firstBP = secondBP;
      currPortSide = routingDirection === EdgeRoutingDirection.CLOCKWISE ? currPortSide.right() : currPortSide.left();
    }

    // Add the last of the original bend points
    newBendPoints.add(orthoBendPoints.getLast());
  }
}
