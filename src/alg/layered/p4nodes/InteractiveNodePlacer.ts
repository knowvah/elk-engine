// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { Spacings } from '../options/Spacings.js';

/**
 * A node placer that keeps the pre-existing y coordinates of nodes. As far as dummy nodes are concerned, the
 * interactive node placer tries to compute sensible coordinates for them based on the pre-existing routing of the
 * edges they represent. If nodes overlap, they are moved as far down as necessary to remove the overlaps.
 *
 * <p>Using this node placer really only makes sense if the interactive implementations of all previous phases are
 * used as well.</p>
 *
 * <dl>
 *   <dt>Preconditions:</dt>
 *     <dd>The graph layering was produced by the interactive layering algorithm</dd>
 *     <dd>The node ordering was produced by the interactive crossing minimization algorithm</dd>
 *   <dt>Postconditions:</dt>
 *     <dd>Each node is assigned a vertical coordinate such that no two nodes overlap</dd>
 *     <dd>The size of each layer is set according to the area occupied by its nodes</dd>
 *     <dd>The height of the graph is set to the maximal layer height</dd>
 * </dl>
 *
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/InteractiveNodePlacer.java
 */
export class InteractiveNodePlacer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #HIERARCHY_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Additional processor dependencies for graphs with hierarchical ports; a cached static getter (mission 7b
   * decision E1, mission 7d N4).
   *
   * @see InteractiveNodePlacer.java:49
   */
  private static get HIERARCHY_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (InteractiveNodePlacer.#HIERARCHY_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR));
  }

  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    if (graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      return InteractiveNodePlacer.HIERARCHY_PROCESSING_ADDITIONS;
    } else {
      return null;
    }
  }

  /** Spacing values. */
  private spacings!: Spacings;

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Interactive node placement', 1);

    this.spacings = layeredGraph.getProperty(InternalProperties.SPACINGS);

    // Place the nodes in each layer
    for (const layer of layeredGraph) {
      this.placeNodes(layer);
    }

    // TODO Compute a graph offset?

    monitor.done();
  }

  /**
   * Places the nodes in the given layer.
   *
   * @param layer the layer whose nodes to place.
   */
  private placeNodes(layer: Layer): void {
    // The minimum value for the next valid y coordinate
    let minValidY = Number.NEGATIVE_INFINITY;

    // The node type of the last node
    let prevNodeType = NodeType.NORMAL;

    for (const node of layer) {
      // Check which kind of node it is
      const nodeType = node.getType();
      if (nodeType !== NodeType.NORMAL) {
        minValidY = this.placeDummy(node, nodeType, prevNodeType, minValidY);
      }

      // If the node extends into nodes we already placed above, we need to move it down
      const spacing = this.spacings.getVerticalSpacing(nodeType, prevNodeType);
      if (node.getPosition().y < minValidY + spacing + node.getMargin().top) {
        node.getPosition().y = minValidY + spacing + node.getMargin().top;
      }

      // Update minimum valid y coordinate and remember node type
      minValidY = node.getPosition().y + node.getSize().y + node.getMargin().bottom;
      prevNodeType = nodeType;
    }
  }

  /**
   * The body of the Java `if (nodeType != NodeType.NORMAL)` block of `placeNodes`, split out for the complexity limits.
   * Dummy nodes have no original position unless the interactive crossing minimizer calculated one; if not, we
   * compute one.
   *
   * @returns the possibly raised minimum valid y position
   */
  private placeDummy(node: LNode, nodeType: NodeType, prevNodeType: NodeType, minValidY: number): number {
    const originalYCoordinate: number | null = node.getProperty(InternalProperties.ORIGINAL_DUMMY_NODE_POSITION);

    if (originalYCoordinate === null) {
      // Make sure that the minimum valid Y position is usable
      const usableMinValidY = Math.max(minValidY, 0.0);

      node.getPosition().y = usableMinValidY + this.spacings.getVerticalSpacing(nodeType, prevNodeType);
      return usableMinValidY;
    } else {
      node.getPosition().y = originalYCoordinate;
      return minValidY;
    }
  }
}
