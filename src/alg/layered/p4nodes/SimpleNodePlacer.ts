// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import type { Spacings } from '../options/Spacings.js';

/**
 * Node placement implementation that centers all nodes vertically.
 *
 * <dl>
 *   <dt>Preconditions:</dt>
 *     <dd>The graph has a proper layering with optimized nodes ordering</dd>
 *     <dd>Ports are properly arranged</dd>
 *   <dt>Postconditions:</dt>
 *     <dd>Each node is assigned a vertical coordinate such that no two nodes overlap</dd>
 *     <dd>The size of each layer is set according to the area occupied by its nodes</dd>
 * </dl>
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/SimpleNodePlacer.java
 */
export class SimpleNodePlacer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #HIERARCHY_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Additional processor dependencies for graphs with hierarchical ports. Built on first use, as Java builds the
   * static field at class initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that
   * enum finishes evaluating (mission 7b decision E1, mission 7d N4).
   *
   * @see SimpleNodePlacer.java:47
   */
  private static get HIERARCHY_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (SimpleNodePlacer.#HIERARCHY_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR));
  }

  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    if (graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      return SimpleNodePlacer.HIERARCHY_PROCESSING_ADDITIONS;
    } else {
      return null;
    }
  }

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Simple node placement', 1);

    const spacings = layeredGraph.getProperty(InternalProperties.SPACINGS);

    // first iteration: determine the height of each layer
    const maxHeight = SimpleNodePlacer.determineLayerHeights(layeredGraph, spacings);

    // second iteration: center the nodes of each layer around the tallest layer
    SimpleNodePlacer.centerNodes(layeredGraph, spacings, maxHeight);

    monitor.done();
  }

  /**
   * The first iteration of `process` (split out for the complexity limits).
   *
   * @return the height of the tallest layer
   */
  private static determineLayerHeights(layeredGraph: LGraph, spacings: Spacings): number {
    let maxHeight = 0;
    for (const layer of layeredGraph.getLayers()) {
      const layerSize = layer.getSize();
      layerSize.y = 0;
      let lastNode: LNode | null = null;
      for (const node of layer.getNodes()) {
        if (lastNode !== null) {
          // use normal spacing as soon as a regular node is involved
          layerSize.y += spacings.getVerticalSpacing(node, lastNode);
        }
        layerSize.y += node.getMargin().top + node.getSize().y + node.getMargin().bottom;
        lastNode = node;
      }
      maxHeight = Math.max(maxHeight, layerSize.y);
    }
    return maxHeight;
  }

  /** The second iteration of `process` (split out for the complexity limits). */
  private static centerNodes(layeredGraph: LGraph, spacings: Spacings, maxHeight: number): void {
    for (const layer of layeredGraph.getLayers()) {
      const layerSize = layer.getSize();
      let pos = (maxHeight - layerSize.y) / 2;
      let lastNode: LNode | null = null;
      for (const node of layer.getNodes()) {
        if (lastNode !== null) {
          pos += spacings.getVerticalSpacing(node, lastNode);
        }
        pos += node.getMargin().top;
        node.getPosition().y = pos;
        pos += node.getSize().y + node.getMargin().bottom;
        lastNode = node;
      }
    }
  }
}
