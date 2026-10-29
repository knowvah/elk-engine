// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import type { LinkedList } from '../../../java/util/LinkedList.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { Layer } from '../graph/Layer.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { NodePromotionStrategy } from '../options/NodePromotionStrategy.js';
import type { NodePromotionState } from './NodePromotionState.js';

/** The three results of the loop over the next layer in `modelOrderNodePromotion` (Java keeps them as locals). */
interface NextLayerVerdict {
  modelOrderAllowsPromotion: boolean;
  promoteThroughDummyLayer: boolean;
  containsLabels: boolean;
}

const MODEL_ORDER = InternalProperties.MODEL_ORDER;

/** `iterator().next()` of a Java `Iterable<LEdge>`: throws when it is empty. */
function firstEdge(edges: Iterable<LEdge>): LEdge {
  const next = edges[Symbol.iterator]().next();
  if (next.done === true) {
    throw new NoSuchElementException();
  }
  return next.value;
}

/**
 * A node that will be promoted by model order is identified if all nodes in the same layer as the node do have a
 * smaller model order and there exists a node in the next layer with a smaller model order. Nodes are only moved to a
 * higher layer (a layer with a smaller id).
 *
 * The Java method is one 130-line body; it is split at its loop bodies and conditions (`promoteLayerByModelOrder`,
 * `promoteNodeIfAllowed`, `shallBePromoted`, `analyseNextLayer`, `analyseNextLayerNode`, `labelNodeBlocksPromotion`,
 * `labelLayerBlocksPromotion`, `promoteAll`), keeping Java's order.
 *
 * @param leftToRight Whether the promotion is done left to right or not.
 * @see NodePromotion.java:385
 */
export function modelOrderNodePromotion(s: NodePromotionState, leftToRight: boolean): void {
  let somethingChanged = false;
  do {
    somethingChanged = false;
    // the bound is read afresh on every iteration, as Java does: promoting into a new layer adds a key
    for (
      let currentLayerId = leftToRight ? s.biLayerMap.keySet().size - 2 : 1;
      leftToRight ? currentLayerId >= 0 : currentLayerId < s.biLayerMap.keySet().size;
      currentLayerId += leftToRight ? -1 : 1
    ) {
      if (promoteLayerByModelOrder(s, leftToRight, currentLayerId)) {
        somethingChanged = true;
      }
    }
  } while (somethingChanged);
}

/**
 * The node loop of `modelOrderNodePromotion` for one layer.
 *
 * @returns whether a node was promoted (Java sets `somethingChanged`)
 * @see NodePromotion.java:392
 */
function promoteLayerByModelOrder(s: NodePromotionState, leftToRight: boolean, currentLayerId: number): boolean {
  let somethingChanged = false;
  const currentLayer = s.biLayerMap.getValues(currentLayerId);
  for (let nodeIndex = 0; nodeIndex < currentLayer.size(); nodeIndex++) {
    const node = currentLayer.get(nodeIndex);
    if (promoteNodeIfAllowed(s, leftToRight, currentLayerId, currentLayer, node)) {
      // Select next node.
      nodeIndex--;
      somethingChanged = true;
    }
  }
  return somethingChanged;
}

function promoteNodeIfAllowed(
  s: NodePromotionState,
  leftToRight: boolean,
  currentLayerId: number,
  currentLayer: LinkedList<LNode>,
  node: LNode,
): boolean {
  if (!isCandidate(s, currentLayerId, node)) {
    return false;
  }
  // Check whether this layer has a model order that prevents node promotion.
  if (!shallBePromoted(leftToRight, currentLayer, node)) {
    return false;
  }
  // All nodes of the current layer of the node have a smaller/bigger model order.
  // If the next layer has a node with a smaller/bigger model order. Promote the current node.
  const nextLayerId = leftToRight ? currentLayerId + 1 : currentLayerId - 1;
  const verdict = analyseNextLayer(s, leftToRight, node, s.biLayerMap.getValues(nextLayerId));
  if (verdict.containsLabels && verdict.promoteThroughDummyLayer) {
    // Check whether this is a good idea. I.e. whether the current node has a long enough edge to
    // move through the whole label layer.
    if (labelLayerBlocksPromotion(s, leftToRight, node)) {
      verdict.promoteThroughDummyLayer = false;
    }
  }
  // If either the node can be promoted from a normal or mixed layer or from a label layer it shall be
  // promoted.
  if (verdict.modelOrderAllowsPromotion || verdict.promoteThroughDummyLayer) {
    promoteAll(s, node, leftToRight);
    return true;
  }
  return false;
}

/**
 * The two `continue` conditions at the top of the node loop body: a node needs a model order, and the last (left to
 * right) or first (right to left) layer has no layer to compare it to.
 *
 * @see NodePromotion.java:396
 */
function isCandidate(s: NodePromotionState, currentLayerId: number, node: LNode): boolean {
  // Only nodes that have a model order can sensibly be promoted using model order.
  if (!node.hasProperty(MODEL_ORDER)) {
    return false;
  }
  // The last/first node shall not be promoted if no other node is there to compare it to.
  return !(
    (s.biLayerMap.isMaximalKey(currentLayerId) &&
      s.promotionStrategy === NodePromotionStrategy.MODEL_ORDER_LEFT_TO_RIGHT) ||
    (s.biLayerMap.isMinimalKey(currentLayerId) &&
      s.promotionStrategy === NodePromotionStrategy.MODEL_ORDER_RIGHT_TO_LEFT)
  );
}

/**
 * The loop over the current layer that can reset `shallBePromoted`.
 *
 * @see NodePromotion.java:407
 */
function shallBePromoted(leftToRight: boolean, currentLayer: LinkedList<LNode>, node: LNode): boolean {
  let result = true;
  // Reset iterator.
  for (let otherNodeIndex = 0; otherNodeIndex < currentLayer.size(); otherNodeIndex++) {
    const otherNode = currentLayer.get(otherNodeIndex);
    if (otherNode.hasProperty(MODEL_ORDER)) {
      if (
        (leftToRight && node.getProperty(MODEL_ORDER) < otherNode.getProperty(MODEL_ORDER)) ||
        (!leftToRight && node.getProperty(MODEL_ORDER) > otherNode.getProperty(MODEL_ORDER))
      ) {
        // If one node in the same layer as the current node exists with a bigger
        // model order the current node cannot be promoted.
        result = false;
      }
    }
  }
  return result;
}

/**
 * The loop over the next layer.
 *
 * @see NodePromotion.java:429
 */
function analyseNextLayer(
  s: NodePromotionState,
  leftToRight: boolean,
  node: LNode,
  nextLayer: LinkedList<LNode>,
): NextLayerVerdict {
  const verdict: NextLayerVerdict = {
    modelOrderAllowsPromotion: false,
    promoteThroughDummyLayer: true,
    containsLabels: false,
  };
  // I cannot iterate over the original graph since the layers are only changed at the end.
  for (const nextLayerNode of nextLayer) {
    analyseNextLayerNode(s, leftToRight, node, nextLayerNode, verdict);
  }
  return verdict;
}

/** The body of the loop over the next layer. @see NodePromotion.java:434 */
function analyseNextLayerNode(
  s: NodePromotionState,
  leftToRight: boolean,
  node: LNode,
  nextLayerNode: LNode,
  verdict: NextLayerVerdict,
): void {
  if (nextLayerNode.hasProperty(MODEL_ORDER)) {
    if (nextLayerNode.id !== node.id) {
      verdict.modelOrderAllowsPromotion ||= leftToRight
        ? nextLayerNode.getProperty(MODEL_ORDER) < node.getProperty(MODEL_ORDER)
        : nextLayerNode.getProperty(MODEL_ORDER) > node.getProperty(MODEL_ORDER);
      verdict.promoteThroughDummyLayer = false;
    }
  } else if (!verdict.modelOrderAllowsPromotion && verdict.promoteThroughDummyLayer) {
    // If the promotion status of the current node is unclear check whether the node can be
    // promoted through a label layer.

    // There are currently no dummy nodes, only label nodes.
    if (nextLayerNode.getType() === NodeType.LABEL) {
      verdict.containsLabels = true;
      if (labelNodeBlocksPromotion(s, leftToRight, node, nextLayerNode)) {
        verdict.promoteThroughDummyLayer = false;
      }
    }
  }
}

/**
 * Check whether this label node is connected to the current node and whether it cannot be moved. I.e. its target is the
 * the next layer and the node is in the previous one. The next layer is then a dummy layer; promoting the current node
 * over the label layer is possible if the connected node is more than 2 layers away.
 *
 * @returns whether Java sets `promoteThroughDummyLayer` to `false`
 * @see NodePromotion.java:452
 */
function labelNodeBlocksPromotion(
  s: NodePromotionState,
  leftToRight: boolean,
  node: LNode,
  nextLayerNode: LNode,
): boolean {
  // Check whether this label node is connected to the current node and whether it cannot
  // be moved. I.e. its target is the the next layer and the node is in the previous one.
  const nodeConnectedToNextLayer = leftToRight
    ? firstEdge(nextLayerNode.getIncomingEdges()).getSource()!.getNode()!
    : firstEdge(nextLayerNode.getOutgoingEdges()).getTarget()!.getNode()!;
  if (nodeConnectedToNextLayer !== node) {
    return false;
  }
  // The next layer is a dummy layer. Check whether it is possible to promote the
  // current node over the label layer. This is possible if the connected node is more
  // than 2 layers away.
  const connectedNode = leftToRight
    ? firstEdge(nextLayerNode.getOutgoingEdges()).getTarget()!.getNode()!
    : firstEdge(nextLayerNode.getIncomingEdges()).getSource()!.getNode()!;
  const layerDistance = leftToRight
    ? s.biLayerMap.getKey(connectedNode)! - s.biLayerMap.getKey(nodeConnectedToNextLayer)!
    : s.biLayerMap.getKey(nodeConnectedToNextLayer)! - s.biLayerMap.getKey(connectedNode)!;
  return layerDistance <= 2;
}

/**
 * The `containsLabels && promoteThroughDummyLayer` block: whether the current node has no edge long enough to move
 * through the whole label layer.
 *
 * @returns whether Java sets `promoteThroughDummyLayer` to `false`
 * @see NodePromotion.java:481
 */
function labelLayerBlocksPromotion(s: NodePromotionState, leftToRight: boolean, node: LNode): boolean {
  const connectedNode = leftToRight
    ? firstEdge(node.getOutgoingEdges()).getTarget()!.getNode()!
    : firstEdge(node.getIncomingEdges()).getSource()!.getNode()!;
  const layerDistance = leftToRight
    ? s.biLayerMap.getKey(connectedNode)! - s.biLayerMap.getKey(node)!
    : s.biLayerMap.getKey(node)! - s.biLayerMap.getKey(connectedNode)!;
  return layerDistance <= 2 && connectedNode.getType() === NodeType.NORMAL;
}

/**
 * Promote nodes to promote, which again create other nodes to promote until all nodes are promoted.
 *
 * @see NodePromotion.java:498
 */
function promoteAll(s: NodePromotionState, node: LNode, leftToRight: boolean): void {
  // a `LinkedHashSet`: insertion order, a removed element is appended again when re-added, as in a JS `Set`
  const nodesToPromote = promoteNodeByModelOrder(s, node, leftToRight);
  while (nodesToPromote.size > 0) {
    const nodeToPromote: LNode = nodesToPromote.values().next().value!;
    nodesToPromote.delete(nodeToPromote);
    for (const added of promoteNodeByModelOrder(s, nodeToPromote, leftToRight)) {
      nodesToPromote.add(added);
    }
  }
}

/**
 * Promotes a node and recursively promotes connected nodes if necessary. Used by the model order node promotion.
 *
 * @param node The node
 * @param leftToRight Whether the node is promoted left to right.
 * @see NodePromotion.java:522
 */
export function promoteNodeByModelOrder(s: NodePromotionState, node: LNode, leftToRight: boolean): Set<LNode> {
  // Promote the node
  const oldLayerId = s.biLayerMap.getKey(node)!;
  if (leftToRight) {
    s.biLayerMap.put(oldLayerId + 1, node);
  } else {
    s.biLayerMap.put(oldLayerId - 1, node);
  }
  // Recursively promote connected nodes if necessary.
  const nodesToPromote = new Set<LNode>();
  for (const edge of leftToRight ? node.getOutgoingEdges() : node.getIncomingEdges()) {
    const nextNode = leftToRight ? edge.getTarget()!.getNode()! : edge.getSource()!.getNode()!;
    // If the current node is now in the same layer as a node connected to it promote the connected node.
    // Java `:541` compares the two `Integer` keys by reference (`==`). `node`'s key is the box `put` just created from
    // `oldLayerId ± 1` (`BiLinkedHashMultiMap` stores the key object it is given), so the comparison holds only for the
    // cached object of an equal value in -128..127; above that the Java cascade stops, and the port must stop too (E2).
    if (JavaInteger.sameValueOfBox(s.biLayerMap.getKey(nextNode)!, s.biLayerMap.getKey(node)!)) {
      nodesToPromote.add(nextNode);
    }
  }
  return nodesToPromote;
}

/**
 * Helper method for setting the layering after the model order promotion has finished.
 *
 * @param layeredGraph The graph to which the calculated new layering is applied.
 * @see NodePromotion.java:731
 */
export function setNewLayeringModelOrder(s: NodePromotionState, layeredGraph: LGraph): void {
  const layerList: Layer[] = [];
  layeredGraph.getLayers().length = 0;
  // Get the layer indices.
  const keySet = [...s.biLayerMap.keySet()].sort((a, b) => a - b);
  for (const layerIndex of keySet) {
    // Get node of layer.
    const layerNodes = s.biLayerMap.getValues(layerIndex);
    // Create new layer.
    if (!layerNodes.isEmpty()) {
      const newLayer = new Layer(layeredGraph);
      layerList.push(newLayer);
      newLayer.id = layerIndex;
      for (const node of layerNodes) {
        node.setLayer(newLayer);
      }
    }
  }
  // Apply new layering.
  for (const layer of layerList) {
    layeredGraph.getLayers().push(layer);
  }
}
