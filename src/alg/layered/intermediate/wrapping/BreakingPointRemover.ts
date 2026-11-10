// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import { KVectorChain } from '../../../../core/math/KVectorChain.js';
import { EdgeRouting } from '../../../../core/options/EdgeRouting.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { SplineSegment } from '../../p5edges/splines/SplineSegment.js';
import { BPInfo } from './BreakingPointInserterBPInfo.js';

/**
 * The processor locates any `BREAKING_POINT` end dummies and removes them together with the start dummy and the edge
 * dummies from the graph. Before removing though it transfers the split edge routes to the original (split) edge. Care
 * has to be taken when assembling the new edge route. Different `EdgeRouting` styles require different bend points.
 *
 * The `LongEdgeJoiner` took care of joining long edges an in-layer dummies, therefore the scenario we are given is:
 * `node --nodeStartEdge--> startMarker --startEndEdge--> endMarker --e--> node`.
 *
 * Preconditions: the graph is fully laid out, in particular, edges have been routed. Postconditions: `BREAKING_POINT`s
 * have been removed; the 'backward' wrapping edges already point into the correct direction, the
 * `ReversedEdgeRestorer` does _not_ have to revert them. Slots: after phase 5. Same-slot dependencies: must run after
 * `LongEdgeJoiner`, before `HorizontalGraphCompactor`.
 *
 * The `SPLINES` arm of the switch in `remove` is `joinSplineRoutes` and the junction point block is `mergeJunctionPoints`
 * (complexity limits); the `remove` recursion over
 * `bpi.prev` is an explicit loop (the Java visit order: the node's own `BPInfo`, then `prev`, then its `prev`, ...).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointRemover.java
 */
export class BreakingPointRemover implements ILayoutProcessor<LGraph> {
  private edgeRouting: EdgeRouting | null = null;

  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Breaking Point Removing', 1);

    this.edgeRouting = graph.getProperty(LayeredOptions.EDGE_ROUTING);
    for (const l of graph) {
      for (const node of [...l.getNodes()]) {
        if (BPInfo.isEnd(node)) {
          const bpi = node.getProperty(InternalProperties.BREAKING_POINT_INFO);
          if (bpi.next === null) {
            this.remove(graph, bpi);
          }
        }
      }
    }

    progressMonitor.done();
  }

  private remove(graph: LGraph, bpiStart: BPInfo): void {
    // recursion `remove(graph, bpi.prev)` at the end of the method: a loop over the `prev` chain
    for (let bpi: BPInfo | null = bpiStart; bpi !== null; bpi = bpi.prev) {
      this.removeOne(graph, bpi);
    }
  }

  /** The body of `remove` before the recursive call. */
  private removeOne(_graph: LGraph, bpi: BPInfo): void {
    // assemble the new edge route
    const newBends = new KVectorChain();

    // depending on the edge routing style we have to act differently
    switch (this.edgeRouting) {
      // for splines, the final bendpoints have not been computed yet
      //  (which will be done by the 'FinalSplineBendpointsCalculator').
      // so far, only the intermediate nubsplines have been attached via properties
      case EdgeRouting.SPLINES:
        this.joinSplineRoutes(bpi);
        break;

      // after executing the polyline router the edge segments are simply joined,
      // note that the positions of bpi.start and bpi.end must be added as bend points
      case EdgeRouting.POLYLINE:
        newBends.addAll(bpi.nodeStartEdge.getBendPoints());
        newBends.add(bpi.start.getPosition());
        newBends.addAll([...bpi.startEndEdge.getBendPoints()].reverse());
        newBends.add(bpi.end.getPosition());
        newBends.addAll(bpi.originalEdge.getBendPoints());
        break;

      // for orthogonal edge routing it is guaranteed, that incident edges of a node
      // enter the node parallel to the x axis. Thus, the positions
      // of bpi.start and bpi.end can be dropped since they lie on a straight line
      default: // ORTHOGONAL
        newBends.addAll(bpi.nodeStartEdge.getBendPoints());
        newBends.addAll([...bpi.startEndEdge.getBendPoints()].reverse());
        newBends.addAll(bpi.originalEdge.getBendPoints());
    }

    // restore original edge
    bpi.originalEdge.getBendPoints().clear();
    bpi.originalEdge.getBendPoints().addAll(newBends);
    bpi.originalEdge.setSource(bpi.nodeStartEdge.getSource());

    this.mergeJunctionPoints(bpi);

    // remove all the dummy stuff
    bpi.startEndEdge.setSource(null);
    bpi.startEndEdge.setTarget(null);
    bpi.nodeStartEdge.setSource(null);
    bpi.nodeStartEdge.setTarget(null);
    bpi.end.setLayer(null);
    bpi.start.setLayer(null);
  }

  /** The junction point block of `remove`. */
  private mergeJunctionPoints(bpi: BPInfo): void {
    // collect any created junction points (order can be arbitrary)
    const junctionPointsOne = bpi.nodeStartEdge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    const junctionPointsTwo = bpi.startEndEdge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    const junctionPointsThree = bpi.originalEdge.getProperty(LayeredOptions.JUNCTION_POINTS) as KVectorChain | null;
    if (junctionPointsOne !== null || junctionPointsTwo !== null || junctionPointsThree !== null) {
      const newJunctionPoints = new KVectorChain();
      this.addNullSafe(newJunctionPoints, junctionPointsThree);
      this.addNullSafe(newJunctionPoints, junctionPointsTwo);
      this.addNullSafe(newJunctionPoints, junctionPointsOne);
      bpi.originalEdge.setProperty(LayeredOptions.JUNCTION_POINTS, newJunctionPoints);
    }
  }

  /** The `SPLINES` arm of the switch of `remove`. */
  private joinSplineRoutes(bpi: BPInfo): void {
    // gather the computed spline information
    const s1 = bpi.nodeStartEdge.getProperty(InternalProperties.SPLINE_ROUTE_START);
    const s2 = bpi.startEndEdge.getProperty(InternalProperties.SPLINE_ROUTE_START);
    const s3 = bpi.originalEdge.getProperty(InternalProperties.SPLINE_ROUTE_START);
    const e1 = bpi.nodeStartEdge.getProperty(InternalProperties.SPLINE_EDGE_CHAIN);
    const e2 = bpi.startEndEdge.getProperty(InternalProperties.SPLINE_EDGE_CHAIN);
    const e3 = bpi.originalEdge.getProperty(InternalProperties.SPLINE_EDGE_CHAIN);

    // join them (... and remember to reverse some of the segments)
    const joinedSegments: SplineSegment[] = [];
    joinedSegments.push(...s1);
    s2.forEach((s) => (s.inverseOrder = true));
    joinedSegments.push(...[...s2].reverse());
    joinedSegments.push(...s3);

    const joinedEdges: LEdge[] = [];
    joinedEdges.push(...e1);
    joinedEdges.push(...[...e2].reverse());
    joinedEdges.push(...e3);

    // transfer the information to the original edge
    bpi.originalEdge.setProperty(InternalProperties.SPLINE_ROUTE_START, joinedSegments);
    bpi.originalEdge.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, joinedEdges);
    bpi.originalEdge.setProperty(InternalProperties.SPLINE_SURVIVING_EDGE, bpi.originalEdge);

    // cleanup
    bpi.nodeStartEdge.setProperty(InternalProperties.SPLINE_ROUTE_START, null);
    bpi.nodeStartEdge.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, null);
    bpi.startEndEdge.setProperty(InternalProperties.SPLINE_ROUTE_START, null);
    bpi.startEndEdge.setProperty(InternalProperties.SPLINE_EDGE_CHAIN, null);
  }

  private addNullSafe(container: KVectorChain | null, toAdd: KVectorChain | null): boolean {
    if (container === null || toAdd === null) {
      return false;
    }
    return container.addAll(toAdd);
  }
}
