// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { UnsupportedGraphException } from '../../../core/UnsupportedGraphException.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
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

/**
 * A model order layer assigner that assumes a breadth first node ordering.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *      <dd>The graph has no cycles.</dd>
 *      <dd>Each node is a normal node and has a model order set or is a label dummy node.</dd>
 *   <dt>Postcondition:</dt>
 *      <dd>All nodes have been assigned a layer such that
 *        edges connect only nodes from layers with increasing indices.</dd>
 *      <dd>No node with a higher model order is in a layer before a node with a lower model order.</dd>
 * </dl>
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/BreadthFirstModelOrderLayerer.java
 */
export class BreadthFirstModelOrderLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #BASELINE_PROCESSING_CONFIGURATION: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Intermediate processing configuration. Built on first use, as Java builds the static field at class
   * initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that enum finishes
   * evaluating whenever the module graph is entered through a strategy enum (mission 7b, decision E1).
   */
  private static get BASELINE_PROCESSING_CONFIGURATION(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (BreadthFirstModelOrderLayerer.#BASELINE_PROCESSING_CONFIGURATION ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR));
  }

  /** the layered graph to which layers are added. */
  private layeredGraph: LGraph | null = null;

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return BreadthFirstModelOrderLayerer.BASELINE_PROCESSING_CONFIGURATION;
  }

  process(thelayeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Breadth first model order layering', 1);

    this.layeredGraph = thelayeredGraph;
    // Add first layer.
    const realNodes: LNode[] = [];
    for (const node of thelayeredGraph.getLayerlessNodes()) {
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
        'The BF model order layer assigner requires all real nodes to have a model order.',
      );
    });
    this.assignLayers(thelayeredGraph, realNodes);
    // Empty the list of unlayered nodes.
    thelayeredGraph.getLayerlessNodes().length = 0;
    this.deleteEmptyLayers(thelayeredGraph);
    monitor.done();
  }

  /** The tail of `process`: delete all empty dummy layers, then adjust the layer ids. */
  private deleteEmptyLayers(layeredGraph: LGraph): void {
    // Delete all empty dummy layers.
    const layers = layeredGraph.getLayers();
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

  /** The Java loop over the sorted real nodes: first node in the first layer, then layer by layer. */
  private assignLayers(layeredGraph: LGraph, realNodes: readonly LNode[]): void {
    let firstNode = true;
    let currentLayer = new Layer(layeredGraph);
    let currentDummyLayer: Layer | null = null;
    layeredGraph.getLayers().push(currentLayer);
    for (const node of realNodes) {
      if (firstNode) {
        // Set the first node in the first layer.
        node.setLayer(currentLayer);
        firstNode = false;
      } else {
        // Check for each incoming edge whether it connects to the current layer.
        // If this is the case, add a new dummy and normal layer.
        for (const edge of node.getIncomingEdges()) {
          if (BreadthFirstModelOrderLayerer.connectsTo(edge, currentLayer)) {
            currentDummyLayer = new Layer(layeredGraph);
            layeredGraph.getLayers().push(currentDummyLayer);
            currentLayer = new Layer(layeredGraph);
            layeredGraph.getLayers().push(currentLayer);
          }
        }
        // Add all label dummies to the dummy layer between the last layer and the current one.
        for (const edge of node.getIncomingEdges()) {
          if (
            edge.getSource()!.getNode()!.getType() === NodeType.LABEL &&
            edge.getSource()!.getNode()!.getLayer() === null
          ) {
            edge.getSource()!.getNode()!.setLayer(currentDummyLayer);
          }
        }
        // Add the node to the (potentially new) current layer.
        node.setLayer(currentLayer);
      }
    }
  }

  /**
   * The Java condition of the first incoming-edge loop (`a && b || c && d`): the edge's source is a normal node in the
   * current layer (nodes directly connected), or a label dummy whose own first predecessor is (dummy label in-between).
   */
  private static connectsTo(edge: LEdge, currentLayer: Layer): boolean {
    const source = edge.getSource()!.getNode()!;
    return (
      (source.getType() === NodeType.NORMAL && source.getLayer() === currentLayer) ||
      (source.getType() === NodeType.LABEL &&
        firstEdge(source.getIncomingEdges()).getSource()!.getNode()!.getLayer() === currentLayer)
    );
  }
}
