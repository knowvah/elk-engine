// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { UnsupportedConfigurationException } from '../../../core/UnsupportedConfigurationException.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Moves nodes with layer constraints to the appropriate layers. To meet the preconditions of this processor, the
 * `EdgeAndLayerConstraintEdgeReverser` can be used.
 *
 * Precondition: a layered graph; nodes with `FIRST_SEPARATE` and `LAST_SEPARATE` were hidden from the graph and saved
 * in `InternalProperties.HIDDEN_NODES`; nodes with `FIRST` have only outgoing edges, except for edges incoming from
 * label dummy nodes; nodes with `LAST` have only incoming edges, except for edges going to label dummy nodes.
 * Postcondition: nodes hidden by `LayerConstraintPreprocessor` are restored; nodes with layer constraints are placed
 * in the appropriate layers. Slots: before phase 3. Same-slot dependencies: `HierarchicalPortConstraintProcessor`,
 * `NodePromotion`.
 *
 * Java `assert false` (restoreHiddenNodes, default arm) is omitted: no `devAssert` helper exists (translation-rules
 * 6.8) and the JVM runs without `-ea`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LayerConstraintPostprocessor.java
 */
export class LayerConstraintPostprocessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Layer constraint postprocessing', 1);

    const layers = layeredGraph.getLayers();

    // If the list of layers is non-empty, we may have FIRST and LAST nodes to move around
    if (layers.length > 0) {
      // Retrieve the current first and last layers
      const firstLayer = layers[0] as Layer;
      const lastLayer = layers[layers.length - 1] as Layer;

      // We may also need label dummy layers between the very first / last layers and the first / last layers
      const firstLabelLayer = new Layer(layeredGraph);
      const lastLabelLayer = new Layer(layeredGraph);

      // Move our nodes!
      this.moveFirstAndLastNodes(layeredGraph, firstLayer, lastLayer, firstLabelLayer, lastLabelLayer);

      // Add non-empty label layers
      if (firstLabelLayer.getNodes().length > 0) {
        layers.unshift(firstLabelLayer);
      }

      if (lastLabelLayer.getNodes().length > 0) {
        layers.push(lastLabelLayer);
      }
    }

    // Restore hidden FIRST_SEPARATE and LAST_SEPARATE nodes, if any
    if (layeredGraph.hasProperty(InternalProperties.HIDDEN_NODES)) {
      // Create the new first and last layers, in case they will be needed
      const firstSeparateLayer = new Layer(layeredGraph);
      const lastSeparateLayer = new Layer(layeredGraph);

      // Restore our nodes
      this.restoreHiddenNodes(layeredGraph, firstSeparateLayer, lastSeparateLayer);

      // Add non-empty separate layers
      if (firstSeparateLayer.getNodes().length > 0) {
        layers.unshift(firstSeparateLayer);
      }

      if (lastSeparateLayer.getNodes().length > 0) {
        layers.push(lastSeparateLayer);
      }
    }

    monitor.done();
  }

  /**
   * Moves nodes with `LayerConstraint.FIRST` and `LayerConstraint.LAST` to their respective layers and removes layers
   * that have become empty.
   */
  private moveFirstAndLastNodes(
    layeredGraph: LGraph,
    firstLayer: Layer,
    lastLayer: Layer,
    firstLabelLayer: Layer,
    lastLabelLayer: Layer,
  ): void {
    // We'll start by moving FIRST and LAST nodes (as well as connected label dummies) to their proper layers
    for (const layer of layeredGraph) {
      // Iterate through a node array to avoid ConcurrentModificationExceptions
      const nodes = LGraphUtil.toNodeArray(layer.getNodes());

      for (const node of nodes) {
        switch (node.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
          case LayerConstraint.FIRST:
            this.throwUpUnlessNoIncomingEdges(node);
            node.setLayer(firstLayer);
            this.moveLabelsToLabelLayer(node, true, firstLabelLayer);
            break;

          case LayerConstraint.LAST:
            this.throwUpUnlessNoOutgoingEdges(node);
            node.setLayer(lastLayer);
            this.moveLabelsToLabelLayer(node, false, lastLabelLayer);
            break;
        }
      }
    }

    // All the movement can cause layers to be empty. Instead of going to great lengths trying to prevent that in the
    // code above, we simply iterate over all layers and remove the empty ones
    this.removeEmptyLayers(layeredGraph);
  }

  /** The Java's inline `ListIterator` loop with `remove()`, split out for the NLOC limit. */
  private removeEmptyLayers(layeredGraph: LGraph): void {
    const graphLayers = layeredGraph.getLayers();
    let index = 0;
    while (index < graphLayers.length) {
      if ((graphLayers[index++] as Layer).getNodes().length === 0) {
        graphLayers.splice(--index, 1);
      }
    }
  }

  /**
   * Moves the label dummies coming in to the given node or going out from the given node to the given label dummy
   * layer.
   *
   * @param node the node whose adjacent label dummies to move
   * @param incoming `true` if label dummies on incoming edges should be moved, `false` if label dummies on outgoing
   *   edges should be moved
   * @param labelLayer the layer to move the label dummies to
   */
  private moveLabelsToLabelLayer(node: LNode, incoming: boolean, labelLayer: Layer): void {
    for (const edge of incoming ? node.getIncomingEdges() : node.getOutgoingEdges()) {
      const possibleLableDummy = incoming ? edge.getSource()!.getNode()! : edge.getTarget()!.getNode()!;

      if (possibleLableDummy.getType() === NodeType.LABEL) {
        possibleLableDummy.setLayer(labelLayer);
      }
    }
  }

  /** Restores nodes hidden by `LayerConstraintPreprocessor`. */
  private restoreHiddenNodes(layeredGraph: LGraph, firstSeparateLayer: Layer, lastSeparateLayer: Layer): void {
    for (const hiddenNode of layeredGraph.getProperty(InternalProperties.HIDDEN_NODES)) {
      // Add the node to the appropriate layer
      switch (hiddenNode.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)) {
        case LayerConstraint.FIRST_SEPARATE:
          hiddenNode.setLayer(firstSeparateLayer);
          break;

        case LayerConstraint.LAST_SEPARATE:
          hiddenNode.setLayer(lastSeparateLayer);
          break;

        default:
        // Only *_SEPARATE nodes should be in the list (Java: assert false)
      }

      // Restore the node's edges
      for (const hiddenEdge of hiddenNode.getConnectedEdges()) {
        // A hidden node will usually be incident only to edges that were hidden together with the node. There is one
        // exception, though: if an edge connects two hidden nodes, only one will have been responsible for hiding it.
        // Thus, we may find an edge here that is already restored!
        if (hiddenEdge.getSource() !== null && hiddenEdge.getTarget() !== null) {
          continue;
        }

        // One end point is the hidden node, the other is null
        const isOutgoing = hiddenEdge.getTarget() === null;

        const originalOppositePort = hiddenEdge.getProperty(InternalProperties.ORIGINAL_OPPOSITE_PORT);
        if (isOutgoing) {
          hiddenEdge.setTarget(originalOppositePort);
        } else {
          hiddenEdge.setSource(originalOppositePort);
        }
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Checks

  /** Check that the node has no incoming edges except from label dummies, and fail if it has any. */
  private throwUpUnlessNoIncomingEdges(node: LNode): void {
    for (const incoming of node.getIncomingEdges()) {
      if (incoming.getSource()!.getNode()!.getType() !== NodeType.LABEL) {
        throw new UnsupportedConfigurationException(
          `Node '${String(node.getDesignation())}' has its layer constraint set to FIRST, but has at least one incoming edge that ` +
            ' does not come from a FIRST_SEPARATE node. That must not happen.',
        );
      }
    }
  }

  /** Check that the node has no outgoing edges except to label dummies, and fail if it has any. */
  private throwUpUnlessNoOutgoingEdges(node: LNode): void {
    for (const outgoing of node.getOutgoingEdges()) {
      if (outgoing.getTarget()!.getNode()!.getType() !== NodeType.LABEL) {
        throw new UnsupportedConfigurationException(
          `Node '${String(node.getDesignation())}' has its layer constraint set to LAST, but has at least one outgoing edge that ` +
            ' does not go to a LAST_SEPARATE node. That must not happen.',
        );
      }
    }
  }
}
