// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { NodeType } from '../graph/LNodeNodeType.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { Spacings } from '../options/Spacings.js';
import { balancePlacement } from './LinearSegmentsNodePlacerBalancing.js';
import { sortLinearSegments } from './LinearSegmentsNodePlacerCreation.js';
import type { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './LinearSegmentsNodePlacerLinearSegment.js';
import { postProcess } from './LinearSegmentsNodePlacerPostProcess.js';

/**
 * Node placement implementation that aligns long edges using linear segments. Inspired by Section 4 of
 * <ul>
 *   <li>Georg Sander, A fast heuristic for hierarchical Manhattan layout. In <i>Proceedings of the Symposium on Graph
 *     Drawing (GD'95)</i>, LNCS vol. 1027, pp. 447-458, Springer, 1996.</li>
 * </ul>
 *
 * <dl>
 * <dt>Precondition:</dt>
 * <dd>the graph has a proper layering with optimized nodes ordering; ports are properly arranged</dd>
 * <dt>Postcondition:</dt>
 * <dd>each node is assigned a vertical coordinate such that no two nodes overlap; the size of each layer is set
 * according to the area occupied by contained nodes; the height of the graph is set to the maximal layer height</dd>
 * </dl>
 *
 * The facade keeps `process` and `createUnbalancedPlacement`; the other Java sections are in
 * `LinearSegmentsNodePlacerCreation.ts` ("Linear Segments Creation"), `LinearSegmentsNodePlacerBalancing.ts`
 * ("Balanced Placement") and `LinearSegmentsNodePlacerPostProcess.ts` ("Post Processing for Correction"); the nested
 * `LinearSegment` and `Mode` are `LinearSegmentsNodePlacerLinearSegment.ts` and `LinearSegmentsNodePlacerMode.ts`
 * (M15), the private properties `INPUT_PRIO`/`OUTPUT_PRIO` are in `LinearSegmentsNodePlacerProperties.ts`.
 *
 * @author msp
 * @author grh
 * @author cds
 * @author ima
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/LinearSegmentsNodePlacer.java
 */
export class LinearSegmentsNodePlacer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #HIERARCHY_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Additional processor dependencies for graphs with hierarchical ports; a cached static getter (mission 7b
   * decision E1, mission 7d N4).
   *
   * @see LinearSegmentsNodePlacer.java:157
   */
  private static get HIERARCHY_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (LinearSegmentsNodePlacer.#HIERARCHY_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR));
  }

  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    if (graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      return LinearSegmentsNodePlacer.HIERARCHY_PROCESSING_ADDITIONS;
    } else {
      return null;
    }
  }

  /** array of sorted linear segments (`null` outside `process`). */
  private linearSegments: LinearSegment[] | null = null;

  /** Spacing values (`null` outside `process`). */
  private spacings: Spacings | null = null;

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Linear segments node placement', 1);

    const spacings = layeredGraph.getProperty(InternalProperties.SPACINGS);
    this.spacings = spacings;

    // sort the linear segments of the layered graph (the Java method also stores them in the field)
    const linearSegments = sortLinearSegments(layeredGraph, monitor);
    this.linearSegments = linearSegments;

    // create an unbalanced placement from the sorted segments
    this.createUnbalancedPlacement(layeredGraph);

    // balance the placement
    balancePlacement(layeredGraph, linearSegments, spacings);

    // post-process the placement for small corrections
    postProcess(layeredGraph, linearSegments, spacings);

    // release the created resources
    this.linearSegments = null;
    this.spacings = null;
    monitor.done();
  }

  /**
   * Creates an unbalanced placement for the sorted linear segments.
   *
   * @param layeredGraph the layered graph to create an unbalanced placement for.
   * @see LinearSegmentsNodePlacer.java:524
   */
  private createUnbalancedPlacement(layeredGraph: LGraph): void {
    const spacings = this.spacings!;
    const layerCount = layeredGraph.getLayers().length;

    // How many nodes are currently placed in each layer
    const nodeCount = new Array<number>(layerCount).fill(0);

    // The type of the node most recently placed in a given layer
    const recentNodeType = new Array<NodeType | null>(layerCount).fill(null);
    const recentNode = new Array<LNode | null>(layerCount).fill(null);

    // Iterate through the linear segments (in proper order!) and place them
    for (const segment of this.linearSegments!) {
      // Determine the uppermost placement for the linear segment
      let uppermostPlace = 0.0;
      for (const node of segment.nodes) {
        const layerIndex = node.getLayer()!.getIndex();
        nodeCount[layerIndex]!++;

        // Calculate how much space to leave between the linear segment and the last
        // node of the given layer
        let spacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);
        if (nodeCount[layerIndex]! > 0) {
          const previous = recentNode[layerIndex]!;
          if (previous !== null) {
            spacing = spacings.getVerticalSpacing(previous, node);
          }
        }

        uppermostPlace = Math.max(uppermostPlace, node.getLayer()!.getSize().y + spacing);
      }

      // Apply the uppermost placement to all elements
      for (const node of segment.nodes) {
        // Set the node position
        node.getPosition().y = uppermostPlace + node.getMargin().top;

        // Adjust layer size
        const layer: Layer = node.getLayer()!;
        layer.getSize().y = uppermostPlace + node.getMargin().top + node.getSize().y + node.getMargin().bottom;

        recentNodeType[layer.getIndex()] = node.getType();
        recentNode[layer.getIndex()] = node;
      }
    }
  }
}
