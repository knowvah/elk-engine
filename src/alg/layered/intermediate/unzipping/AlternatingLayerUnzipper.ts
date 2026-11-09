// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../../../core/util/Pair.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { Layer } from '../../graph/Layer.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { shiftNode } from './AlternatingLayerUnzipperShift.js';

/** Java `Integer.MAX_VALUE`, the start of `getLayerSplitProperty`'s minimum. */
const INT_MAX_VALUE = 2147483647;

/** The layer-pass state `process` threads through its per-layer split (Java locals `insertionLayerOffset`, `newLayers`). */
interface SplitState {
  insertionLayerOffset: number;
  readonly newLayers: Pair<Layer, number>[];
}

/**
 * Divides nodes up between layers to create a more compact final layout. Reads the property of each layer to determine
 * how many sub-layers it should be split into.
 *
 * Preconditions: a layered graph whose node order has been decided. Postconditions: layers are split up into multiple
 * layers with the nodes alternating between them. For example, if layerSplit is set to 3 and there are 5 nodes in a
 * layer, then node 1 is placed in sublayer 1, node 2 in sublayer 2, node 3 in sublayer 3, node 4 in sublayer 1 and node
 * 5 in sublayer 2. Slots: before phase 4. Same-slot dependencies: none.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
 */
export class AlternatingLayerUnzipper implements ILayoutProcessor<LGraph> {
  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java */
  process(graph: LGraph, _progressMonitor: IElkProgressMonitor): void {
    const state: SplitState = { insertionLayerOffset: 1, newLayers: [] };
    for (let i = 0; i < graph.getLayers().length; i++) {
      this.splitLayer(graph, i, state);
    }
    for (const newLayer of state.newLayers) {
      graph.getLayers().splice(newLayer.getSecond() as number, 0, newLayer.getFirst() as Layer);
    }

    // remove unconnected placeholder nodes
    for (const layer of graph.getLayers()) {
      const nodeIterator = new ArrayListIterator<LNode>(layer.getNodes());
      while (nodeIterator.hasNext()) {
        const node = nodeIterator.next();
        if (node.getType() === NodeType.PLACEHOLDER || node.getType() === NodeType.NONSHIFTING_PLACEHOLDER) {
          nodeIterator.remove();
        }
      }
    }
  }

  /**
   * The body of `process`' per-layer loop (`:64-135`): the properties of layer `i`, the edge-length heuristic and the
   * split itself.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
   */
  private splitLayer(graph: LGraph, i: number, state: SplitState): void {
    const layer = graph.getLayers()[i] as Layer;
    // the defaults of the three properties are non-null (2, true, false), so no unboxing can fail
    const N = this.getLayerSplitProperty(layer);
    const resetOnLongEdges = this.getResetOnLongEdgesProperty(layer);
    const minimizeEdgeLength = this.getMinimizeEdgeLengthProperty(layer);

    if (minimizeEdgeLength && this.heuristicSkips(graph, layer)) {
      // skip this layer and do not split it
      return;
    }

    // only split if there enough nodes to fill the resulting sub-layers
    // an alternative would be to reduce N for this layer, this may or may
    // not be desirable
    if (layer.getNodes().length >= N) {
      const subLayers: Layer[] = [];
      // add current layer as first sub-layer
      subLayers.push(layer);
      for (let j = 0; j < N - 1; j++) {
        const newLayer = new Layer(graph);
        state.newLayers.push(new Pair<Layer, number>(newLayer, i + j + state.insertionLayerOffset));
        subLayers.push(newLayer);
      }
      state.insertionLayerOffset += N - 1;

      this.distributeNodes(graph, subLayers, N, resetOnLongEdges);
    }
  }

  /**
   * The edge-length heuristic of `:78-106`: whether the layer is skipped.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
   */
  private heuristicSkips(graph: LGraph, layer: Layer): boolean {
    // get maximum node width and average node height
    let maxWidth = 0.0;
    let averageHeight = 0.0;

    for (const node of layer) {
      maxWidth = Math.max(maxWidth, node.getSize().x);
      averageHeight += node.getSize().y;
    }

    averageHeight /= layer.getNodes().length;

    // add spacings for heuristic to get closer to zero spacing situation
    maxWidth += Math.max(
      2 * graph.getProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS),
      Math.max(
        layer.getNodes().length * graph.getProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS),
        graph.getProperty(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS),
      ),
    );

    averageHeight += Math.max(
      graph.getProperty(LayeredOptions.SPACING_NODE_NODE),
      graph.getProperty(LayeredOptions.SPACING_EDGE_NODE),
    );

    // apply heuristic
    // this heuristic is for the decision between N=1 and N=2, it shouldn't be used with N > 2
    //
    // the intuition behind this heuristic is that there is a growth term S_n, determined mostly by
    // the growth of the vertical edge segments as more nodes are added to a layer
    // S_n grows roughly like n^2 / 4 and the cross-over point where splitting becomes favorable lies
    // approximately at box_width / box_height = S_n / n, the approximation is more accurate for larger n
    return maxWidth / averageHeight >= layer.getNodes().length / 4.0;
  }

  /**
   * The node loop of `:117-134`: moves each node of the first sub-layer to its target sub-layer.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
   */
  private distributeNodes(graph: LGraph, subLayers: readonly Layer[], N: number, resetOnLongEdges: boolean): void {
    const firstLayer = subLayers[0] as Layer;
    const nodesInLayer = firstLayer.getNodes().length;
    for (let j = 0, nodeIndex = 0, targetLayer = 0; j < nodesInLayer; j++, nodeIndex++, targetLayer++) {
      const node = firstLayer.getNodes()[nodeIndex] as LNode;
      if (node.getType() !== NodeType.NONSHIFTING_PLACEHOLDER) {
        nodeIndex = Int32.add(
          nodeIndex,
          shiftNode({ graph, subLayers, targetLayer: Int32.rem(targetLayer, N), nodeIndex }),
        );
      } else {
        j -= 1;
        targetLayer -= 1;
      }
      if (resetOnLongEdges && node.getType() === NodeType.LONG_EDGE) {
        // reset next iterations target layer to 0
        targetLayer = -1;
      }
    }
  }

  /**
   * Checks all nodes of a layer for the layerSplit property and returns the lowest set value.
   *
   * @param layer The layer to determine the layerSplit property for
   * @returns the layerSplit value
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
   */
  private getLayerSplitProperty(layer: Layer): number {
    let layerSplit = INT_MAX_VALUE;
    let propertyUnset = true;
    for (let i = 0; i < layer.getNodes().length; i++) {
      const node = layer.getNodes()[i] as LNode;
      if (node.hasProperty(LayeredOptions.LAYER_UNZIPPING_LAYER_SPLIT)) {
        propertyUnset = false;
        const nodeValue = node.getProperty(LayeredOptions.LAYER_UNZIPPING_LAYER_SPLIT);
        layerSplit = layerSplit < nodeValue ? layerSplit : nodeValue;
      }
    }
    if (propertyUnset) {
      layerSplit = LayeredOptions.LAYER_UNZIPPING_LAYER_SPLIT.getDefault();
    }
    return layerSplit;
  }

  /**
   * Checks all nodes of a layer for the resetOnLongEdges property and if any sets the value to false, returns false.
   *
   * @param layer The layer to determine the resetOnLongEdges property for.
   * @returns the resetOnLongEdges value
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
   */
  private getResetOnLongEdgesProperty(layer: Layer): boolean {
    for (let i = 0; i < layer.getNodes().length; i++) {
      const node = layer.getNodes()[i] as LNode;
      if (node.hasProperty(LayeredOptions.LAYER_UNZIPPING_RESET_ON_LONG_EDGES)) {
        if (!node.getProperty(LayeredOptions.LAYER_UNZIPPING_RESET_ON_LONG_EDGES)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Checks all nodes of a layer for the minimizeEdgeLength property and if any sets the value to true, returns true.
   *
   * @param layer The layer to determine the minimizeEdgeLength property for.
   * @returns the minimizeEdgeLength value
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.java
   */
  private getMinimizeEdgeLengthProperty(layer: Layer): boolean {
    for (let i = 0; i < layer.getNodes().length; i++) {
      const node = layer.getNodes()[i] as LNode;
      if (node.hasProperty(LayeredOptions.LAYER_UNZIPPING_MINIMIZE_EDGE_LENGTH)) {
        if (node.getProperty(LayeredOptions.LAYER_UNZIPPING_MINIMIZE_EDGE_LENGTH)) {
          return true;
        }
      }
    }
    return false;
  }
}
