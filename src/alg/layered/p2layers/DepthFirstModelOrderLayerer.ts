// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { UnsupportedGraphException } from '../../../core/UnsupportedGraphException.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/** `edges.iterator().next()`: the first edge; Java throws `NoSuchElementException` on an empty iterable. */
function firstEdge(edges: Iterable<LEdge>): LEdge {
  const next = edges[Symbol.iterator]().next();
  if (next.done === true) {
    throw new NoSuchElementException();
  }
  return next.value;
}

/** `edges.iterator().hasNext()`. */
function hasEdges(edges: Iterable<LEdge>): boolean {
  return edges[Symbol.iterator]().next().done !== true;
}

/** `List.get(index)`: Java throws `IndexOutOfBoundsException` for an index outside the list. */
function layerAt(layers: readonly Layer[], index: number): Layer {
  if (index < 0 || index >= layers.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(layers.length)}`);
  }
  return layers[index]!;
}

/**
 * A model order layer assigner that assumes a depth first node ordering. Places nodes depth first by model order in
 * strips as seen below.
 * 1 -> 2 -> 3
 *        \
 *      4 -> 5 -> 6
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>The graph has no cycles.</dd>
 *      <dd>Each node is a normal node and has a model order set or is a label dummy node.</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>All nodes have been assigned a layer such that
 *        edges connect only nodes from layers with increasing indices.</dd>
 * </dl>
 *
 * `process` is split along the Java branches (first node, connected node, new strip, finish) for the complexity
 * limits.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/DepthFirstModelOrderLayerer.java
 */
export class DepthFirstModelOrderLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #BASELINE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get BASELINE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (DepthFirstModelOrderLayerer.#BASELINE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR));
  }

  /** The layered graph to which layers are added. */
  private layeredGraph!: LGraph;

  /** The current layer without the nodesToPlace. */
  private currentLayer!: Layer;

  /** The current layer id. */
  private currentLayerId = 0;

  /** The current dummy layer without the nodesToPlace. */
  private currentDummyLayer: Layer | null = null;

  /**
   * Holds nodes that will be placed once a new strip is connected to the rest of the graph. The node id holds the
   * currently desired layer.
   */
  private nodesToPlace: LNode[] = [];

  /**
   * Saves the maximum layer the nodes that still have to be assigned to a layer will be placed in. This is necessary to
   * determine the actual offset of the nodes to place.
   */
  private maxToPlace = 0;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return DepthFirstModelOrderLayerer.BASELINE_PROCESSING_CONFIGURATION;
  }

  process(thelayeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Depth first model order layering', 1);

    this.layeredGraph = thelayeredGraph;
    const realNodes = this.sortedRealNodes();
    let firstNode = true;
    this.currentLayer = new Layer(this.layeredGraph);
    this.currentDummyLayer = null;
    this.layeredGraph.getLayers().push(this.currentLayer);
    this.currentLayer.id = 0;
    this.currentLayerId = 0;
    this.nodesToPlace = [];
    for (const node of realNodes) {
      if (firstNode) {
        // Set the first node in the first layer.
        node.setLayer(this.currentLayer);
        firstNode = false;
      } else if (this.isConnectedToCurrentLayer(node)) {
        // Check whether the current node connects to the current layer.
        // If this is the case, place it in the layer after the current one (and add a dummy layer).
        this.placeConnectedNode(node);
      } else {
        // If not, begin a new "strip" based on the incoming connection of the node.
        this.beginStrip(node);
      }
    }
    // Finish the last
    if (this.nodesToPlace.length > 0) {
      this.placeNodesToPlace();
    }
    this.finish();
    monitor.done();
  }

  /** The first part of `process`: the real nodes of the layerless list, sorted by model order. */
  private sortedRealNodes(): LNode[] {
    // Add first layer.
    const realNodes: LNode[] = [];
    for (const node of this.layeredGraph.getLayerlessNodes()) {
      if (node.getType() === NodeType.NORMAL) {
        realNodes.push(node);
      }
    }
    // Sort real nodes by model order.
    realNodes.sort((n1, n2) => {
      if (n1.hasProperty(InternalProperties.MODEL_ORDER) && n2.hasProperty(InternalProperties.MODEL_ORDER)) {
        return integerCompare(
          n1.getProperty(InternalProperties.MODEL_ORDER),
          n2.getProperty(InternalProperties.MODEL_ORDER),
        );
      }
      throw new UnsupportedGraphException(
        'The DF model order layer assigner requires all real nodes to have a model order.',
      );
    });
    return realNodes;
  }

  /** The Java branch of `process` for a node that connects to the current layer. */
  private placeConnectedNode(node: LNode): void {
    // Check whether there are incoming edges to layers higher than currendLayer.id + 2
    let maxLayer = this.currentLayerId;
    maxLayer = this.getMaxConnectedLayer(maxLayer, node);
    const desiredLayer = Int32.add(maxLayer, 2);
    const layerDiff = Int32.sub(maxLayer, this.currentLayerId);
    // Move all nodes that where not already placed by the layer difference.
    if (this.nodesToPlace.length === 0) {
      this.addNodeToLayer(desiredLayer, node);
    } else if (layerDiff > 0) {
      // Case some dependency to the existing graph was found add all nodes to their layers.
      for (const toPlace of this.nodesToPlace) {
        toPlace.id = Int32.add(toPlace.id, Int32.sub(maxLayer, this.maxToPlace));
      }
      this.placeNodesToPlace();
      // Remove all nodes since they are now placed correctly.
      this.nodesToPlace.length = 0;
      this.addNodeToLayer(desiredLayer, node);
    } else {
      // Case nodes cannot be placed without the need to move them later.
      this.nodesToPlace.push(node);
      node.id = desiredLayer;
      this.maxToPlace = Math.max(this.maxToPlace, desiredLayer);
      // Add dummy nodes and give them their desired layer id.
      for (const edge of node.getIncomingEdges()) {
        if (
          edge.getSource()!.getNode()!.getLayer() === null &&
          edge.getSource()!.getNode()!.getType() === NodeType.LABEL
        ) {
          this.nodesToPlace.push(edge.getSource()!.getNode()!);
          edge.getSource()!.getNode()!.id = Int32.sub(desiredLayer, 1);
        }
      }
      // Update the current layer id.
      this.currentLayerId = desiredLayer;
    }
  }

  /** The Java `else` branch of `process`: "Case a new strip has to begin." */
  private beginStrip(node: LNode): void {
    this.placeNodesToPlace();
    this.nodesToPlace.length = 0;

    // Find the layer for the first element of the strip.
    // If it has no incoming connections it is placed in the first layer.
    // Once a node with a connection to the previous strip is added previous nodes move to be moved,
    // therefore, we need to safe the dependent nodes.
    // If it has an incoming connection, it has to be to an already placed node and hence the new node
    // Should be placed in the current layer after the connected node.
    let desiredLayer = 0;
    if (!hasEdges(node.getIncomingEdges())) {
      // Case no incoming connections, save the node to be placed.
      this.nodesToPlace.push(node);
      node.id = 0; // Save the layer the node will be placed in.
      this.maxToPlace = Math.max(this.maxToPlace, 0);
      this.currentLayer = layerAt(this.layeredGraph.getLayers(), 0);
      this.currentLayerId = 0;
    } else {
      // Find the last layer the node is connected to.
      let maxLayer = 0;
      maxLayer = this.getMaxConnectedLayer(maxLayer, node);
      desiredLayer = Int32.add(maxLayer, 2);
      // Add node to desired layer.
      this.addNodeToLayer(desiredLayer, node);
    }
  }

  /** The tail of `process`: empty the layerless nodes, delete empty dummy layers, adjust the layer ids. */
  private finish(): void {
    // Empty the list of unlayered nodes.
    this.layeredGraph.getLayerlessNodes().length = 0;
    // Delete all empty dummy layers.
    const layers = this.layeredGraph.getLayers();
    const toDelete: Layer[] = [];
    for (const layer of layers) {
      if (layer.getNodes().length === 0) {
        toDelete.push(layer);
      }
    }
    // `List.removeAll(toDelete)`, in place
    for (let i = layers.length - 1; i >= 0; i--) {
      if (toDelete.includes(layers[i]!)) {
        layers.splice(i, 1);
      }
    }
    // Adjust layer ids
    let layerId = 0;
    for (const layer of layers) {
      layer.id = layerId;
      layerId++;
    }
  }

  /**
   * Returns true if a node is connected (directly or by label dummy) to the current layer.
   *
   * @param node The node
   * @return True if the node is connected to the current layer.
   */
  private isConnectedToCurrentLayer(node: LNode): boolean {
    for (const edge of node.getIncomingEdges()) {
      const source = edge.getSource()!.getNode()!;
      let directlyConnected: boolean;
      let connectedViaLabelDummy: boolean;
      if (this.nodesToPlace.length === 0) {
        directlyConnected = this.isDirectlyConnectedToPlaced(source);
        connectedViaLabelDummy = this.isConnectedViaPlacedLabelDummy(source);
      } else {
        // Case the node to check might not be placed yet and the node id holds its desired layer.
        directlyConnected = source.getType() === NodeType.NORMAL && source.id === this.currentLayerId;
        connectedViaLabelDummy =
          source.getType() === NodeType.LABEL &&
          firstEdge(source.getIncomingEdges()).getSource()!.getNode()!.id === this.currentLayerId;
      }
      if (directlyConnected || connectedViaLabelDummy) {
        return true;
      }
    }
    return false;
  }

  /** `directlyConnected` of the Java case "the node to check already has a layer" (`nodesToPlace` is empty). */
  private isDirectlyConnectedToPlaced(source: LNode): boolean {
    // Case the node to check already has a layer.
    // This may case an NPE if getLayer is null;
    return (
      source.getType() === NodeType.NORMAL &&
      source.getLayer() !== null &&
      source.getLayer()!.id === this.currentLayerId
    );
  }

  /** `connectedViaLabelDummy` of the same Java case. */
  private isConnectedViaPlacedLabelDummy(source: LNode): boolean {
    if (hasEdges(source.getIncomingEdges())) {
      const connectedLayerViaDummy = firstEdge(source.getIncomingEdges()).getSource()!.getNode()!.getLayer();
      return (
        source.getType() === NodeType.LABEL &&
        connectedLayerViaDummy !== null &&
        connectedLayerViaDummy.id === this.currentLayerId
      );
    }
    return false;
  }

  /**
   * Adds a node and its label dummies to the desired layer.
   *
   * @param layerId The id of the desired layer.
   * @param node The node.
   */
  private addNodeToLayer(layerId: number, node: LNode): void {
    if (layerId < this.layeredGraph.getLayers().length) {
      // Case the layers already exist.
      this.currentLayer = layerAt(this.layeredGraph.getLayers(), layerId);
      this.currentDummyLayer = layerAt(this.layeredGraph.getLayers(), Int32.sub(layerId, 1));
      this.currentLayerId = layerId;
    } else {
      // Case the layers need to be added.
      this.currentDummyLayer = new Layer(this.layeredGraph);
      this.currentDummyLayer.id = Int32.sub(layerId, 1);
      this.layeredGraph.getLayers().push(this.currentDummyLayer);
      this.currentLayer = new Layer(this.layeredGraph);
      this.currentLayer.id = layerId;
      this.layeredGraph.getLayers().push(this.currentLayer);
      this.currentLayerId = layerId;
    }
    // Add node
    node.setLayer(this.currentLayer);
    // Add dummy node
    for (const edge of node.getIncomingEdges()) {
      if (
        edge.getSource()!.getNode()!.getLayer() === null &&
        edge.getSource()!.getNode()!.getType() === NodeType.LABEL
      ) {
        edge.getSource()!.getNode()!.setLayer(this.currentDummyLayer);
      }
    }
  }

  /**
   * Returns the highest layer id a node is connected to.
   *
   * @param layerId The currently highest layer id.
   * @param node The node.
   * @return The highest layer id the node is connected to.
   */
  private getMaxConnectedLayer(layerId: number, node: LNode): number {
    let maxLayer = layerId;
    for (const edge of node.getIncomingEdges()) {
      const layer = edge.getSource()!.getNode()!.getLayer();
      if (layer !== null) {
        maxLayer = Math.max(maxLayer, layer.id);
      }
    }
    return maxLayer;
  }

  /**
   * Places the nodes to place in their desired layer.
   */
  placeNodesToPlace(): void {
    this.maxToPlace = 0;
    for (const nodeToPlace of this.nodesToPlace) {
      if (nodeToPlace.id >= this.layeredGraph.getLayers().length) {
        // Add a normal and a dummy layer.
        const dummyLayer = new Layer(this.layeredGraph);
        dummyLayer.id = Int32.sub(nodeToPlace.id, 1);
        this.layeredGraph.getLayers().push(dummyLayer);
        const newLayer = new Layer(this.layeredGraph);
        newLayer.id = nodeToPlace.id;
        this.layeredGraph.getLayers().push(newLayer);
      }
      nodeToPlace.setLayer(layerAt(this.layeredGraph.getLayers(), nodeToPlace.id));
    }
  }
}
