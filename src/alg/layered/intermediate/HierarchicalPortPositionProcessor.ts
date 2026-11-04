// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Sets the y coordinate of external node dummies representing eastern or western hierarchical ports. Note that due to
 * additional space required to route edges connected to northern external ports, the y coordinate set here may become
 * invalid and may need to be fixed later. That fixing is part of what `HierarchicalPortOrthogonalEdgeRouter` does.
 *
 * This processor is only necessary for node placers that do not respect the `PORT_RATIO_OR_POSITION` property
 * themselves.
 *
 * Note that this code involves a few subtleties with the graph's offset. The vertical offset is calculated by the
 * `LayerSizeAndGraphHeightCalculator`, which is executed before this processor has fixed the positions of the
 * external port dummies of eastern and western ports. However, those dummies were most likely not placed at a smaller
 * y coordinate than other nodes. This processor either moves dummies downwards, which has no influence on the graph's
 * offset, or upwards. If this had an influence on the offset, external ports could not be placed outside their border,
 * which is a perfectly valid configuration. We thus do not touch the offset again after moving the dummies around.
 *
 * Precondition: a layered graph with finished node placement; the graph's vertical coordinate offset is correct;
 * external port dummies of eastern and western ports appear in their layer's node list in the order they will later
 * appear on their node side in. Postcondition: external node dummies representing western or eastern ports have a
 * correct y coordinate. Slots: before phase 5. Same-slot dependencies: `LayerSizeAndGraphHeightCalculator`.
 *
 * R8: `fixCoordinates` is a plain loop over one layer, not a recursion.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HierarchicalPortPositionProcessor.java
 */
export class HierarchicalPortPositionProcessor implements ILayoutProcessor<LGraph> {
  /** @see HierarchicalPortPositionProcessor.java:63 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Hierarchical port position processing', 1);

    const layers = layeredGraph.getLayers();

    // We're interested in EAST and WEST external port dummies only; since they can only be in
    // the first or last layer, only fix coordinates of nodes in those two layers
    if (layers.length > 0) {
      this.fixCoordinates(layers[0]!, layeredGraph);
    }

    if (layers.length > 1) {
      this.fixCoordinates(layers[layers.length - 1]!, layeredGraph);
    }

    monitor.done();
  }

  /**
   * Fixes the y coordinates of external port dummies in the given layer.
   *
   * @param layer the layer.
   * @param layeredGraph the layered graph.
   * @see HierarchicalPortPositionProcessor.java:93
   */
  private fixCoordinates(layer: Layer, layeredGraph: LGraph): void {
    const portConstraints = layeredGraph.getProperty(LayeredOptions.PORT_CONSTRAINTS);
    if (!(portConstraints.isRatioFixed() || portConstraints.isPosFixed())) {
      // If coordinates are free to be set, we're done
      return;
    }

    const graphHeight = layeredGraph.getActualSize().y;

    // Iterate over the layer's nodes
    for (const node of layer) {
      // We only care about external port dummies...
      if (node.getType() !== NodeType.EXTERNAL_PORT) {
        continue;
      }

      // ...representing eastern or western ports.
      const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
      if (extPortSide !== PortSide.EAST && extPortSide !== PortSide.WEST) {
        continue;
      }

      let finalYCoordinate = node.getProperty(InternalProperties.PORT_RATIO_OR_POSITION);

      if (portConstraints === PortConstraints.FIXED_RATIO) {
        // finalYCoordinate is a ratio that must be multiplied with the graph's height
        finalYCoordinate *= graphHeight;
      }

      // Apply the node's new Y coordinate
      node.getPosition().y = finalYCoordinate - node.getProperty(LayeredOptions.PORT_ANCHOR).y;
      node.borderToContentAreaCoordinates(false, true);
    }
  }
}
