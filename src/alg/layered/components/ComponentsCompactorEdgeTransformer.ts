// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { Pair } from '../../../core/util/Pair.js';
import type { IExternalExtension } from '../compaction/components/IExternalExtension.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { ComponentsCompactorHullpoints } from './ComponentsCompactorHullpoints.js';
import { ComponentsCompactorInternalExternalExtension } from './ComponentsCompactorInternalExternalExtension.js';
import type { ComponentsCompactorOuterSegments } from './ComponentsCompactorOuterSegments.js';
import { ComponentsCompactorSegments } from './ComponentsCompactorSegments.js';

/**
 * The external-edge half of Java's `ComponentsCompactor` (`transformLEdge` and its auxiliaries, Java :423-583),
 * moved behind a facade for the 500-line file limit. It reads the graph frame the compactor determined; the Java
 * never changes the frame after `compact` has computed it, so the two vectors are shared by reference.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:423
 */
export class ComponentsCompactorEdgeTransformer {
  private readonly graphTopLeft: KVector;
  private readonly graphBottomRight: KVector;

  constructor(graphTopLeft: KVector, graphBottomRight: KVector) {
    this.graphTopLeft = graphTopLeft;
    this.graphBottomRight = graphBottomRight;
  }

  /**
   * Converts an external edge to an external extension. While doing so, the the original edge contributes
   * three things as explained in the code.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:427
   */
  transformLEdge(
    externalEdge: LEdge,
    hullPoints: ComponentsCompactorHullpoints,
    outerSegments: ComponentsCompactorOuterSegments,
  ): IExternalExtension<LEdge> {
    const externalExtension = new ComponentsCompactorInternalExternalExtension(externalEdge);

    // #1 convert the edge's path into a set of segments
    const segments = this.edgeToSegments(externalEdge, externalExtension);

    // #2 all 'inner' segments contribute to the hull (consider the edge's thickness)
    const thickness = Math.max(externalEdge.getProperty(LayeredOptions.EDGE_THICKNESS), 1);
    for (const segment of segments.innerSegments) {
      const rect = this.segmentToRectangle(segment.getFirst()!, segment.getSecond()!, thickness);
      hullPoints.add(rect);
    }

    // #3 the 'outer' segment, being the segment that actually connects to the external port,
    //    contributes to the 'union external segment' that we create
    //    for one direction of the component
    const side = externalExtension.externalPortSide;
    this.contributeOuterSegment(segments, thickness, side, outerSegments);
    this.contributeExtent(externalExtension, outerSegments);

    return externalExtension;
  }

  /**
   * The min/max half of step #3 of `transformLEdge` (Java :447-460; split for the complexity limits).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:447
   */
  private contributeOuterSegment(
    segments: ComponentsCompactorSegments,
    thickness: number,
    side: PortSide,
    outerSegments: ComponentsCompactorOuterSegments,
  ): void {
    const outerSegmentRect = this.segmentToRectangle(
      segments.outerSegment.getFirst()!,
      segments.outerSegment.getSecond()!,
      thickness,
    );
    if (side === PortSide.WEST || side === PortSide.EAST) {
      outerSegments.min[side.ordinal()] = Math.min(outerSegments.min[side.ordinal()], outerSegmentRect.y);
      outerSegments.max[side.ordinal()] = Math.max(
        outerSegments.max[side.ordinal()],
        outerSegmentRect.y + outerSegmentRect.height,
      );
    } else {
      outerSegments.min[side.ordinal()] = Math.min(outerSegments.min[side.ordinal()], outerSegmentRect.x);
      outerSegments.max[side.ordinal()] = Math.max(
        outerSegments.max[side.ordinal()],
        outerSegmentRect.x + outerSegmentRect.width,
      );
    }
  }

  /**
   * The extent half of step #3 of `transformLEdge` (Java :462-479; split for the complexity limits).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:462
   */
  private contributeExtent(
    externalExtension: ComponentsCompactorInternalExternalExtension,
    outerSegments: ComponentsCompactorOuterSegments,
  ): void {
    const side = externalExtension.externalPortSide;
    let extent = Number.NEGATIVE_INFINITY;
    const margins = externalExtension.externalPort.getNode()!.getMargin();
    if (side === PortSide.WEST) {
      extent = margins.right;
    } else if (side === PortSide.EAST) {
      extent = margins.left;
    } else if (side === PortSide.NORTH) {
      extent = margins.bottom;
    } else if (side === PortSide.SOUTH) {
      extent = margins.top;
    }
    outerSegments.extent[side.ordinal()] = Math.max(outerSegments.extent[side.ordinal()], extent);
  }

  // ------------------------------------------------------------------------------------------------
  //                                   Auxiliary stuff
  // ------------------------------------------------------------------------------------------------

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:488 */
  segmentToRectangle(p1: KVector, p2: KVector, extent: number): ElkRectangle {
    // (`extent / 2f`: the float literal 2 is exact, so this is double division by 2)
    return new ElkRectangle(
      Math.min(p1.x, p2.x) - extent / 2,
      Math.min(p1.y, p2.y) - extent / 2,
      Math.abs(p1.x - p2.x) + extent,
      Math.abs(p1.y - p2.y) + extent,
    );
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:495 */
  edgeToSegments(edge: LEdge, externalExtension: ComponentsCompactorInternalExternalExtension) {
    const externalPort = externalExtension.externalPort;
    const externalPortSide = externalExtension.externalPortSide;

    // extract the correct segment that is to be used for the external extension
    let p1 = edge.getSource()!.getAbsoluteAnchor();
    let p2 = edge.getTarget()!.getAbsoluteAnchor();

    // external ports of components may not be routed until the very border
    // of the diagram yet, hence we adjust their position here
    if (externalPort === edge.getSource()) {
      p1 = this.getExternalPortPosition(p1, externalPortSide);
      p2 = this.getPortPositionOnMargin(edge.getTarget()!);
    } else {
      p1 = this.getPortPositionOnMargin(edge.getSource()!);
      p2 = this.getExternalPortPosition(p2, externalPortSide);
    }

    const points = new KVectorChain(edge.getBendPoints());
    points.addFirst(p1);
    points.addLast(p2);

    const outerSegmentIsFirst = edge.getSource() === externalPort;

    // for easy processing, make it a list of segments
    const segments = new ComponentsCompactorSegments();
    for (let i = 0; i < points.size() - 1; ++i) {
      const segment = Pair.of(points.get(i), points.get(i + 1));

      if ((outerSegmentIsFirst && i === 0) || (!outerSegmentIsFirst && i === points.size() - 2)) {
        segments.outerSegment = segment;
      } else {
        segments.innerSegments.push(segment);
      }
    }

    return segments;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:536 */
  getExternalPortPosition(pos: KVector, ps: PortSide): KVector {
    if (ps === PortSide.NORTH) {
      return new KVector(pos.x, Math.min(this.graphTopLeft.y, pos.y));
    } else if (ps === PortSide.EAST) {
      return new KVector(Math.max(this.graphBottomRight.x, pos.x), pos.y);
    } else if (ps === PortSide.SOUTH) {
      return new KVector(pos.x, Math.max(this.graphBottomRight.y, pos.y));
    } else if (ps === PortSide.WEST) {
      return new KVector(Math.min(pos.x, this.graphTopLeft.x), pos.y);
    }
    return pos.clone();
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:550 */
  getPortPositionOnMargin(port: LPort): KVector {
    const pos = port.getAbsoluteAnchor().clone();
    const margins = port.getNode()!.getMargin();

    const side = port.getSide();
    if (side === PortSide.NORTH) {
      pos.y -= margins.top;
    } else if (side === PortSide.EAST) {
      pos.x += margins.right;
    } else if (side === PortSide.SOUTH) {
      pos.y += margins.bottom;
    } else if (side === PortSide.WEST) {
      pos.x -= margins.left;
    }
    return pos;
  }
}
