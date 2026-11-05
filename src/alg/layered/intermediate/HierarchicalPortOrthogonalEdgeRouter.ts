// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { setNorthSouthDummyCoordinates } from './HierarchicalPortOrthogonalEdgeRouterCoordinates.js';
import { correctSlantedEdgeSegments, fixCoordinates } from './HierarchicalPortOrthogonalEdgeRouterFix.js';
import { removeTemporaryNorthSouthDummies } from './HierarchicalPortOrthogonalEdgeRouterRemoval.js';
import { restoreNorthSouthDummies } from './HierarchicalPortOrthogonalEdgeRouterRestore.js';
import { routeEdges } from './HierarchicalPortOrthogonalEdgeRouterRouting.js';

/**
 * This processor does the job of routing edges connected to hierarchical ports.
 *
 * Without going too much into the details, it does so in six distinct steps:
 *
 * 1. Dummy nodes created for northern and southern hierarchical ports are restored and connected to the nodes formerly
 *    created in their stead.
 * 2. The coordinates of these dummy nodes - and thus of the hierarchical ports they represent - are calculated and
 *    applied.
 * 3. The edges connected to northern and southern hierarchical ports are routed.
 * 4. The temporary dummy nodes are removed, thereby restoring the original bijective relationship between external
 *    ports and the dummy nodes created to represent them.
 * 5. Due to the necessity of having to route these edges, additional height may be required, which in turn may
 *    invalidate the y coordinates of eastern and western hierarchical port dummy nodes. Those are corrected in this
 *    step.
 * 6. That may in turn have produced slanted edge segments, which are corrected in the final step.
 *
 * Precondition: a layered graph with edge routing finished for edges not incident to external ports; long edge dummies
 * are not yet joined. Postcondition: all external port dummy nodes left map onto an actual external port; the
 * coordinates of external port dummy nodes specify the coordinates of their respective external port; all external
 * port dummy nodes have a size of (0, 0); edges connected to external ports have their bend points set. Slots: after
 * phase 5. Same-slot dependencies: none.
 *
 * Sections behind this facade (file-size and complexity limits, one module per Java step): `...Restore.ts` (step 1),
 * `...Coordinates.ts` (step 2 with its comparators), `...Routing.ts` (step 3), `...Removal.ts` (step 4) and
 * `...Fix.ts` (steps 5 and 6). R8: no Java method here recurses.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter.java
 */
export class HierarchicalPortOrthogonalEdgeRouter implements ILayoutProcessor<LGraph> {
  /**
   * The amount of space necessary to accomodate northern external port edge routing (written, never read, in Java).
   *
   * @see HierarchicalPortOrthogonalEdgeRouter.java:98
   */
  private northernExtPortEdgeRoutingHeight = 0;

  /** @see HierarchicalPortOrthogonalEdgeRouter.java:101 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Orthogonally routing hierarchical port edges', 1);
    this.northernExtPortEdgeRoutingHeight = 0.0;

    /* Step 1
     * Restore any north / south port dummies removed by the HierarchicalPortConstraintProcessor and connect them to
     * the dummies created in their stead.
     */
    const northSouthDummies = restoreNorthSouthDummies(layeredGraph);

    /* Step 2
     * Calculate coordinates for the north / south port dummies. Coordinates for the east / west port dummies have
     * already been calculated prior to this processor's execution. The coordinates are relative to the node's content
     * area, just like normal node coordinates. (the content area is the node size minus padding minus offset)
     */
    setNorthSouthDummyCoordinates(layeredGraph, northSouthDummies);

    /* Step 3
     * Orthogonal edge routing.
     */
    this.northernExtPortEdgeRoutingHeight = routeEdges(
      monitor,
      layeredGraph,
      northSouthDummies,
      this.northernExtPortEdgeRoutingHeight,
    );

    /* Step 4
     * Removal of the temporarily created north / south port dummies.
     */
    removeTemporaryNorthSouthDummies(layeredGraph);

    /* Step 5
     * Finally, the coordinates of east / west hierarchical port dummies have to be corrected and set. The x coordinate
     * must be set, and if north / south port routing resulted in a change of offset or graph size, the y coordinates
     * have to be adjusted if port constraints are at FIXED_RATIO or FIXED_POS. The graph's width may also have to be
     * adjusted.
     */
    fixCoordinates(layeredGraph);

    /* Step 6
     * Fixing the dummy coordinates can easily lead to slanted edge segments, which needs to be corrected.
     */
    correctSlantedEdgeSegments(layeredGraph);

    monitor.done();
  }
}
