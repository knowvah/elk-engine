// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LabelManagementOptions } from '../../../core/labels/LabelManagementOptions.js';
import type { ILabelManager } from '../../../core/labels/ILabelManager.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { SelfLoopHolder } from './loops/SelfLoopHolder.js';
import type { AbstractSelfLoopRouter } from './loops/routing/AbstractSelfLoopRouter.js';
import { LabelPlacer } from './loops/routing/LabelPlacer.js';
import { OrthogonalSelfLoopRouter } from './loops/routing/OrthogonalSelfLoopRouter.js';
import { PolylineSelfLoopRouter } from './loops/routing/PolylineSelfLoopRouter.js';
import { RoutingDirector } from './loops/routing/RoutingDirector.js';
import { RoutingSlotAssigner } from './loops/routing/RoutingSlotAssigner.js';
import { SplineSelfLoopRouter } from './loops/routing/SplineSelfLoopRouter.js';

/**
 * Computes bend points for self loops and places self loop labels. This is done in several steps.
 *
 * Preconditions: self loop ports have been restored; the node's inner margins for ports and port labels have been
 * computed. Postconditions: all self loops are properly routed; all self loop labels are placed. Slot: before phase 4.
 * Same-slot dependencies: `SelfLoopPortRestorer`, `InnermostNodeMarginCalculator`.
 *
 * Deviations: the stream pipeline of `process` is a nested loop (as in `SelfLoopPortRestorer.ts`); `getProperty` of a
 * present property is never null after `hasProperty`. The `switch` over `EdgeRouting` has `POLYLINE`, `SPLINES` and
 * the Java `default`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/SelfLoopRouter.java
 */
export class SelfLoopRouter implements ILayoutProcessor<LGraph> {
  /** Routing director we'll use to compute how the loops are routed around the node. */
  private readonly routingDirector = new RoutingDirector();
  /** Label placer we'll use to determine the placement of labels. */
  private readonly labelPlacer = new LabelPlacer();
  /** The crossing minimizer we use to assign self loops to routing slots. */
  private readonly routingSlotAssigner = new RoutingSlotAssigner();

  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Self-Loop routing', 1);

    const router = this.routerForGraph(graph);
    const labelManager = graph.getProperty(LabelManagementOptions.LABEL_MANAGER);

    // Process every node that actually has self loops
    for (const layer of graph.getLayers()) {
      for (const lNode of layer.getNodes()) {
        if (lNode.getType() === NodeType.NORMAL && lNode.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
          this.processNode(
            lNode.getProperty(InternalProperties.SELF_LOOP_HOLDER)!,
            labelManager,
            router,
            progressMonitor,
          );
        }
      }
    }

    progressMonitor.done();
  }

  private routerForGraph(graph: LGraph): AbstractSelfLoopRouter {
    switch (graph.getProperty(LayeredOptions.EDGE_ROUTING)) {
      case EdgeRouting.POLYLINE:
        return new PolylineSelfLoopRouter();

      case EdgeRouting.SPLINES:
        return new SplineSelfLoopRouter();

      default:
        return new OrthogonalSelfLoopRouter();
    }
  }

  private processNode(
    slHolder: SelfLoopHolder,
    labelManager: ILabelManager | null,
    slRouter: AbstractSelfLoopRouter,
    monitor: IElkProgressMonitor,
  ): void {
    // Compute how each hyper loop is routed around the node (from a "leftmost" to a "rightmost" port involved in
    // the loop, but those must be computed and will influence the number of crossings)
    this.routingDirector.determineLoopRoutes(slHolder);

    // Place self loop labels. This will allow the routing slot assigner to make sure that no two overlapping labels
    // end up in the same slot.
    this.labelPlacer.placeLabels(slHolder, labelManager, monitor);

    // Find out which port side each hyper loop appears on and assign routing slots such that the self loop "trunks"
    // (the pieces of the self loop that seem to run around the node, parallel to the respective node boundary) do
    // not intersect
    this.routingSlotAssigner.assignRoutingSlots(slHolder);

    // Finally route the self loops
    slRouter.routeSelfLoops(slHolder);
  }
}
