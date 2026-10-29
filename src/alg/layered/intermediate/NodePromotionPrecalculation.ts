// SPDX-License-Identifier: EPL-2.0
import * as Iterables from '../../../guava/Iterables.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { LNode } from '../graph/LNode.js';
import type { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import { BiLinkedHashMultiMap } from './BiLinkedHashMultiMap.js';
import type { NodePromotionState } from './NodePromotionState.js';

/**
 * Java `NodePromotion.MODEL_ORDER_NODE_COMPARATOR_DESC`: `o2 - o1` as `int` subtraction, 0 unless both have a model
 * order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NodePromotion.java:74
 */
export const MODEL_ORDER_NODE_COMPARATOR_DESC = (o1: LNode, o2: LNode): number => {
  if (o1.hasProperty(InternalProperties.MODEL_ORDER) && o2.hasProperty(InternalProperties.MODEL_ORDER)) {
    return Int32.sub(o2.getProperty(InternalProperties.MODEL_ORDER), o1.getProperty(InternalProperties.MODEL_ORDER));
  }
  return 0;
};

/**
 * Java `NodePromotion.MODEL_ORDER_NODE_COMPARATOR_ASC`: `o1 - o2` as `int` subtraction, 0 unless both have a model
 * order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NodePromotion.java:87
 */
export const MODEL_ORDER_NODE_COMPARATOR_ASC = (o1: LNode, o2: LNode): number => {
  if (o1.hasProperty(InternalProperties.MODEL_ORDER) && o2.hasProperty(InternalProperties.MODEL_ORDER)) {
    return Int32.sub(o1.getProperty(InternalProperties.MODEL_ORDER), o2.getProperty(InternalProperties.MODEL_ORDER));
  }
  return 0;
};

/** The three loop-carried sums of one layer in the second loop of `precalculateAndSetInformation`. */
interface LayerTotals {
  incoming: number;
  outcoming: number;
  layerSizePixel: number;
}

/**
 * Helper method for calculating needed information for the heuristic. Sets IDs for layers and nodes to grant an easier
 * access. Also calculates the difference for each node between its incoming and outgoing edges and approximates the
 * width in pixels for each (dummy) node and layer as well as the estimated width (original plus dummy nodes).
 *
 * @see NodePromotion.java:270
 */
export function precalculateAndSetInformation(s: NodePromotionState): void {
  // The sizes (in pixels) are approximated, because the layering isn't finite in this phase
  // and there might some more changes about where which edge and node might end up at last.
  // Calculate approximative addition of space for a node.
  s.nodeSizeAffix = s.masterGraph.getProperty(LayeredOptions.SPACING_NODE_NODE);
  // And calculate an approximative size of a dummy node inside the graph.
  s.dummySize = s.masterGraph.getProperty(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS);

  s.maxHeight = s.masterGraph.getLayers().length;
  s.maxWidth = 0;
  s.maxWidthPixel = 0.0;
  // Java fills both lists with `null`s that the layer loop below overwrites, every index exactly once.
  s.currentWidth = new Array<number>(s.maxHeight).fill(0);
  s.currentWidthPixel = new Array<number>(s.maxHeight).fill(0);

  const nodeID = setLayerAndNodeIds(s);

  s.layers = new Array<number>(nodeID).fill(0);
  s.degreeDiff = Array.from({ length: nodeID }, () => [0, 0, 0]); // SUPPRESS CHECKSTYLE MagicNumber
  s.nodes = [];
  s.nodesWithIncomingEdges = [];
  let dummyBaggage = 0; // Will contain number of dummy nodes between the layers.
  s.dummyNodeCount = 0;

  // Calculate difference and determine all nodes with incoming edges.
  for (const layer of s.masterGraph) {
    dummyBaggage = precalculateLayer(s, layer, dummyBaggage);
  }
}

/**
 * The first loop of `precalculateAndSetInformation`: set IDs for all layers and nodes. Layer IDs are reversed for easier
 * handling in the heuristic.
 *
 * @returns the number of nodes (Java's `nodeID` after the loop)
 * @see NodePromotion.java:292
 */
function setLayerAndNodeIds(s: NodePromotionState): number {
  let layerID = s.maxHeight - 1;
  let nodeID = 0;
  for (const layer of s.masterGraph.getLayers()) {
    layer.id = layerID;
    for (const node of layer.getNodes()) {
      node.id = nodeID;
      nodeID++;
    }
    layerID--;
  }
  return nodeID;
}

/**
 * The body of the second loop of `precalculateAndSetInformation`.
 *
 * @param dummyBaggage the number of dummy nodes between the layers before this layer
 * @returns `dummyBaggage` after this layer
 * @see NodePromotion.java:309
 */
function precalculateLayer(s: NodePromotionState, layer: Layer, dummyBaggageIn: number): number {
  let dummyBaggage = dummyBaggageIn;
  const layerID = layer.id;
  const totals: LayerTotals = { incoming: 0, outcoming: 0, layerSizePixel: 0 };
  const layerSize = layer.getNodes().length;

  for (const node of layer.getNodes()) {
    precalculateNode(s, node, totals);
  }

  dummyBaggage -= totals.incoming; // Edges that end here don't create dummy nodes in this layer.
  const nodesNdummies = layerSize + dummyBaggage; // The actual width considering original plus dummy nodes.
  totals.layerSizePixel += dummyBaggage * s.dummySize; // Add width of the dummy nodes in the layer.

  s.currentWidth[layerID] = nodesNdummies; // Setting information...
  s.currentWidthPixel[layerID] = totals.layerSizePixel;
  s.maxWidth = Math.max(s.maxWidth, nodesNdummies);
  s.maxWidthPixel = Math.max(s.maxWidthPixel, totals.layerSizePixel);
  s.dummyNodeCount += dummyBaggage; // Calculate number of dummy nodes in the graph.
  dummyBaggage += totals.outcoming; // All outgoing edges of this layer might create dummy nodes
  // in other layers, so it's necessary to keep them in mind.
  return dummyBaggage;
}

/** The body of the node loop in `precalculateLayer`. @see NodePromotion.java:316 */
function precalculateNode(s: NodePromotionState, node: LNode, totals: LayerTotals): void {
  const nodeID = node.id;
  s.layers[nodeID] = node.getLayer()!.id;
  totals.layerSizePixel += node.getSize().y + s.nodeSizeAffix; // Accumulate width of every node.
  const inDegree = Iterables.size(node.getIncomingEdges());
  const outDegree = Iterables.size(node.getOutgoingEdges());
  const diff = s.degreeDiff[nodeID]!;
  diff[0] = outDegree - inDegree;
  diff[1] = inDegree;
  diff[2] = outDegree;
  totals.incoming += inDegree; // accumulate all incoming edges of the layer
  totals.outcoming += outDegree; // and all outgoing edges
  if (inDegree > 0) {
    s.nodesWithIncomingEdges.push(node);
  }
  s.nodes.push(node);
}

/**
 * Private helper method to generate the necessary data structure and layer and node ids for model order node promotion
 * (`public` in Java).
 *
 * @see NodePromotion.java:354
 */
export function precalculateAndSetInformationModelOrder(s: NodePromotionState): void {
  // Set layer and node ids.
  s.biLayerMap = new BiLinkedHashMultiMap<number, LNode>();
  let nodeId = 0;
  let layerId = 0;
  for (const layer of s.masterGraph.getLayers()) {
    layer.id = layerId;
    for (const node of layer.getNodes()) {
      node.id = nodeId;
      nodeId++;
    }
    layerId++;
  }
  // Initialize data structure to efficiently move nodes between layers and still efficiently get the layer of
  // a node.
  const leftToRight = s.promotionStrategy === NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT;
  const modelOrderComparator = leftToRight ? MODEL_ORDER_NODE_COMPARATOR_DESC : MODEL_ORDER_NODE_COMPARATOR_ASC;
  for (const layer of s.masterGraph) {
    layer.getNodes().sort(modelOrderComparator);
    s.biLayerMap.putAll(layer.id, layer.getNodes());
  }
}
