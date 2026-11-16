// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { Direction } from '../../../core/options/Direction.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { TEdge } from '../graph/TEdge.js';
import type { TGraph } from '../graph/TGraph.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { EdgeRoutingMode } from '../options/EdgeRoutingMode.js';
import { MrTreeOptions } from '../options/MrTreeOptions.js';
import { TreeLayoutPhases } from '../TreeLayoutPhases.js';
import { TreeUtil } from '../TreeUtil.js';
import { avoidOverlapSetEndPoints } from './EdgeRouterEndPoints.js';
import { middleToMiddleEdgeRoute } from './EdgeRouterShared.js';
import { avoidOverlapSpecialEdges } from './EdgeRouterSpecialEdges.js';
import { avoidOverlapSetStartPoints } from './EdgeRouterStartPoints.js';

/**
 * This class implements a dull edge routing by setting just source and target of a edge in mode MiddleToMiddle
 * as well as a edge routing algorithm that is designed to prevent edge node and edge edge overlaps in more complex
 * graphs.
 *
 * Facade over the section files of the port, split at the Java method boundaries (and, for the methods that exceed
 * the limits themselves, at their block boundaries): `EdgeRouterShared` (`middleToMiddleEdgeRoute`, the
 * `oneHalf`/`steepEnd*` constants), `EdgeRouterSpecialEdges` (`avoidOverlapSpecialEdges`,
 * `avoidOverlapHandleCycleInducingEdges`), `EdgeRouterStartPoints`, `EdgeRouterEndPoints`, and `EdgeRouterCyrusBeck`
 * (the private, never called `cyrusBeck`, exported there and not reachable from this class).
 *
 * @author sor
 * @author sgu
 * @author jnc
 * @author sdo
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p4route/EdgeRouter.java
 */
export class EdgeRouter implements ILayoutPhase<TreeLayoutPhases, TGraph> {
  static #INTERMEDIATE_PROCESSING_CONFIG: LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class initialisation
   * (see `DFSTreeifyer`).
   */
  private static get INTERMEDIATE_PROCESSING_CONFIG(): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return (EdgeRouter.#INTERMEDIATE_PROCESSING_CONFIG ??= LayoutProcessorConfiguration.create<
      TreeLayoutPhases,
      TGraph
    >()
      .before(TreeLayoutPhases.P4_EDGE_ROUTING)
      .add(IntermediateProcessorStrategy.LEVEL_COORDS)
      .add(IntermediateProcessorStrategy.COMPACTION_PROC)
      .add(IntermediateProcessorStrategy.GRAPH_BOUNDS_PROC));
  }

  /**
   * {@inheritDoc}
   */
  getLayoutProcessorConfiguration(_graph: TGraph): LayoutProcessorConfiguration<TreeLayoutPhases, TGraph> {
    return EdgeRouter.INTERMEDIATE_PROCESSING_CONFIG;
  }

  /**
   * {@inheritDoc}
   */
  process(tGraph: TGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Edge routing', 1);

    const mode = tGraph.getProperty(MrTreeOptions.EDGE_ROUTING_MODE);
    if (mode === EdgeRoutingMode.MIDDLE_TO_MIDDLE) {
      this.middleToMiddle(tGraph);
    } else if (mode === EdgeRoutingMode.AVOID_OVERLAP) {
      this.avoidOverlap(tGraph);

      // fallback
      for (const e of tGraph.getEdges()) {
        if (e.getBendPoints().size() < 2) {
          this.middleToMiddleEdgeRoute(e);
        }
      }
    }

    progressMonitor.done();
  }

  /**
   * Handles MiddleToMiddle edge routing.
   *
   * @param tGraph the graph to work on
   */
  private middleToMiddle(tGraph: TGraph): void {
    for (const tEdge of tGraph.getEdges()) {
      this.middleToMiddleEdgeRoute(tEdge);
    }
  }

  /**
   * Routes a single edge from the middle of one node to the other.
   *
   * @param tEdge the edge to route
   */
  private middleToMiddleEdgeRoute(tEdge: TEdge): void {
    middleToMiddleEdgeRoute(tEdge);
  }

  /**
   * Handles AvoidOverlap Edge Routing.
   *
   * @param tGraph the graph to work on
   */
  private avoidOverlap(tGraph: TGraph): void {
    const root = TreeUtil.getRoot(tGraph);
    const nodeBendpointPadding = tGraph.getProperty(MrTreeOptions.SPACING_EDGE_NODE);
    const edgeEndTexturePadding = tGraph.getProperty(MrTreeOptions.EDGE_END_TEXTURE_LENGTH);
    const d: Direction = tGraph.getProperty(MrTreeOptions.DIRECTION);

    avoidOverlapSetStartPoints(tGraph, d, nodeBendpointPadding);

    avoidOverlapSpecialEdges(tGraph, root, d, nodeBendpointPadding, edgeEndTexturePadding);

    avoidOverlapSetEndPoints(tGraph, d, nodeBendpointPadding, edgeEndTexturePadding);
  }
}
