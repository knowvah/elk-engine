// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { Layer } from '../graph/Layer.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Calculates the size of each layer, the height of the graph, and the graph's vertical offset. The graph's width
 * cannot be set at this point since that would require the edge routing phase to have already finished.
 *
 * Precondition: a layered graph with finished node placement; node margins are calculated. Postcondition: layer sizes
 * are set, the graph's height is set, the graph's offset includes node positions. Slots: before phase 5. Same-slot
 * dependencies: none.
 *
 * The layer width and the layer's top and bottom are the Java inline computations, split out for the complexity
 * limits (mission 7e, T5).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LayerSizeAndGraphHeightCalculator.java
 */
export class LayerSizeAndGraphHeightCalculator implements ILayoutProcessor<LGraph> {
  /** @see LayerSizeAndGraphHeightCalculator.java:46 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Layer size calculation', 1);

    // Remember the lowest and the highest y coordinates
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    let foundNodes = false;
    for (const layer of layeredGraph) {
      // Retrieve and reset layer size (just to be sure...)
      const layerSize = layer.getSize();
      layerSize.x = 0.0;
      layerSize.y = 0.0;

      // If the layer is empty, skip the rest (should not usually happen)
      if (layer.getNodes().length === 0) {
        continue;
      }

      foundNodes = true;

      // Calculate the layer's width
      layerSize.x = LayerSizeAndGraphHeightCalculator.layerWidth(layer);

      // Calculate the layer's height
      const top = LayerSizeAndGraphHeightCalculator.layerTop(layeredGraph, layer);
      const bottom = LayerSizeAndGraphHeightCalculator.layerBottom(layeredGraph, layer);
      layerSize.y = bottom - top;

      // Update the lowest and highest encountered Y coordinate
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    }

    // If we didn't find any nodes in the graph, be sure to set the values properly. This can happen if a connected
    // component only contains external ports.
    if (!foundNodes) {
      minY = 0;
      maxY = 0;
    }

    // Set the graph's height
    layeredGraph.getSize().y = maxY - minY;
    layeredGraph.getOffset().y -= minY;

    monitor.done();
  }

  /**
   * The width loop of `process`: the widest node including its margins, starting at the reset width 0.0.
   *
   * @see LayerSizeAndGraphHeightCalculator.java:70-77
   */
  private static layerWidth(layer: Layer): number {
    let width = 0.0;
    for (const node of layer) {
      const nodeSize = node.getSize();
      const nodeMargin = node.getMargin();

      width = Math.max(width, nodeSize.x + nodeMargin.left + nodeMargin.right);
    }
    return width;
  }

  /** @see LayerSizeAndGraphHeightCalculator.java:80-85 */
  private static layerTop(layeredGraph: LGraph, layer: Layer): number {
    const firstNode = layer.getNodes()[0]!;
    let top = firstNode.getPosition().y - firstNode.getMargin().top;
    if (firstNode.getType() === NodeType.EXTERNAL_PORT) {
      // Consider port spacing options for first node
      top -= layeredGraph.getProperty(LayeredOptions.SPACING_PORTS_SURROUNDING).getTop();
    }
    return top;
  }

  /** @see LayerSizeAndGraphHeightCalculator.java:86-93 */
  private static layerBottom(layeredGraph: LGraph, layer: Layer): number {
    const lastNode = layer.getNodes()[layer.getNodes().length - 1]!;
    let bottom = lastNode.getPosition().y + lastNode.getSize().y + lastNode.getMargin().bottom;
    if (lastNode.getType() === NodeType.EXTERNAL_PORT) {
      // Consider port spacing options for last node
      bottom += layeredGraph.getProperty(LayeredOptions.SPACING_PORTS_SURROUNDING).getBottom();
    }
    return bottom;
  }
}
