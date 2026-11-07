// SPDX-License-Identifier: EPL-2.0
import type { ElkConnectableShape } from '../../graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { isElkPort } from '../../graph/ElkPort.js';
import { add, sub } from '../../java/lang/Int32.js';
import {
  getChainByAllNodes,
  getElkNode,
  requireNode,
  sortRCNodes,
  stringProperty,
} from './InteractiveLayeredGraphVisitorChains.js';
import * as JList from './InteractiveLayeredGraphVisitorLists.js';
import { LayeredOptions } from './options/LayeredOptions.js';

/**
 * The layer calculation of `InteractiveLayeredGraphVisitor` (`calcLayerNodes` and its helpers, `shiftOtherNodes`,
 * `initialLayers`), in the order of the Java methods. `List<ElkNode>` is an `ElkNode[]`; `int` arithmetic is `Int32`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java
 */

const hasLayerChoice = (node: ElkNode): boolean => node.hasProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT);
const hasPredOf = (node: ElkNode): boolean => node.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
const hasSuccOf = (node: ElkNode): boolean => node.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF);
const layerChoiceOf = (node: ElkNode): number => node.getProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT);
const layerIdOf = (node: ElkNode): number => node.getProperty(LayeredOptions.LAYERING_LAYER_ID);

/**
 * Calculates the layers the `nodes` belong to. `nodes` is the children list of the root, read only here (nothing adds or
 * removes a child during the call), so a snapshot stands in for the live list.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:151
 */
export function calcLayerNodes(nodes: readonly ElkNode[]): ElkNode[][] {
  const nodesWithoutC: ElkNode[] = [];
  const nodesWithLayerConstraint: ElkNode[] = [];
  let nodesWithRC: ElkNode[] = [];
  const nodesWithRCAndLC: ElkNode[] = [];
  // Save the nodes in corresponding lists
  for (const node of nodes) {
    if (hasLayerChoice(node) && (hasPredOf(node) || hasSuccOf(node))) {
      nodesWithRCAndLC.push(node);
    } else if (hasLayerChoice(node)) {
      nodesWithLayerConstraint.push(node);
    } else if (hasPredOf(node) || hasSuccOf(node)) {
      nodesWithRC.push(node);
    } else {
      nodesWithoutC.push(node);
    }
  }

  // Handle nodes with relative constraint and and layer constraint
  updateListsForLayerAssignment(nodesWithRCAndLC, nodes, nodesWithLayerConstraint, nodesWithRC, nodesWithoutC);

  nodesWithRC = sortRCNodes(nodesWithRC, nodes, nodesWithoutC);

  // Calculate layers for nodes without constraints based on their layerID,
  // which is set by the previous layout run.
  const layerNodes = initialLayers(nodesWithoutC);

  // Assign layers to nodes with constraints.
  const diff = assignLayersToNodesWithProperty(nodesWithLayerConstraint, layerNodes);

  // add nodes with rC to the correct layer
  assignLayersToNodesWithRC(nodesWithRC, layerNodes, nodes, diff);

  return layerNodes;
}

/**
 * Sets layer constraints for nodes that are referred by the nodes in `nodesWithRCAndLC` and adjusts the lists. The loop
 * runs over a list that grows inside the loop (`nodesWithRCAndLC.add(target)`, `:232`), as in Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:205
 */
function updateListsForLayerAssignment(
  nodesWithRCAndLC: ElkNode[],
  nodes: readonly ElkNode[],
  nodesWithLayerConstraint: ElkNode[],
  nodesWithRC: ElkNode[],
  nodesWithoutC: ElkNode[],
): void {
  for (let i = 0; i < nodesWithRCAndLC.length; i++) {
    const node = JList.get(nodesWithRCAndLC, i);
    nodesWithLayerConstraint.push(node);
    const targets: (ElkNode | null)[] = [];
    // get target nodes
    if (hasPredOf(node)) {
      targets.push(getElkNode(nodes, stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF)));
    }
    if (hasSuccOf(node)) {
      targets.push(getElkNode(nodes, stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF)));
    }

    for (const maybeTarget of targets) {
      // a missing target is the `NullPointerException` of `target.hasProperty` (`:224`)
      const target = requireNode(maybeTarget, 'target');
      updateListsForTarget(target, node, { nodesWithRCAndLC, nodesWithLayerConstraint, nodesWithRC, nodesWithoutC });
    }
  }
}

/** The four lists `updateListsForLayerAssignment` keeps in step. */
interface AssignmentLists {
  readonly nodesWithRCAndLC: ElkNode[];
  readonly nodesWithLayerConstraint: ElkNode[];
  readonly nodesWithRC: ElkNode[];
  readonly nodesWithoutC: ElkNode[];
}

/** The body of the inner `for` loop of `updateListsForLayerAssignment`. @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:222 */
function updateListsForTarget(target: ElkNode, node: ElkNode, lists: AssignmentLists): void {
  // set layer constraint of target node
  if (!hasLayerChoice(target)) {
    const val = layerChoiceOf(node);
    target.setProperty(LayeredOptions.LAYERING_LAYER_CHOICE_CONSTRAINT, val);
    // node should be in the correct lists
    if (!JList.contains(lists.nodesWithRC, target)) {
      lists.nodesWithLayerConstraint.push(target);
      JList.remove(lists.nodesWithoutC, target);
    } else {
      lists.nodesWithRCAndLC.push(target);
      JList.remove(lists.nodesWithRC, target);
    }
  }
}

/**
 * The layer a referenced node is in: its layer choice constraint or, without one, its layer id.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:271
 */
function layerOfReferenced(node: ElkNode): number {
  return hasLayerChoice(node) ? layerChoiceOf(node) : layerIdOf(node);
}

/**
 * Assign the nodes with relative constraints to layers.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:250
 */
function assignLayersToNodesWithRC(
  nodesWithRC: readonly ElkNode[],
  layering: ElkNode[][],
  allNodes: readonly ElkNode[],
  diff: number,
): void {
  for (let i = 0; i < nodesWithRC.length; i++) {
    const node = JList.get(nodesWithRC, i);
    let succNode: ElkNode | null = null;
    let predNode: ElkNode | null = null;
    // the names are crossed in Java: `succName` reads PRED_OF, `predName` reads SUCC_OF
    const succName = stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
    const predName = stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF);
    if (succName !== null) {
      succNode = getElkNode(allNodes, succName);
    }
    if (predName !== null) {
      predNode = getElkNode(allNodes, predName);
    }

    if (succNode !== null && predNode !== null) {
      assignChainLayers(node, { succNode, predNode }, layering, allNodes);
    } else {
      assignSingleLayer(node, { succNode, predNode }, layering, diff);
    }
  }
}

/** `succNode`/`predNode` of `assignLayersToNodesWithRC`. */
interface Referenced<N extends ElkNode | null> {
  readonly succNode: N;
  readonly predNode: N;
}

/**
 * The `succNode != null && predNode != null` arm: if both rel cons are set, it may be that the layer ids of some nodes of
 * the chain must be updated too.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:267
 */
function assignChainLayers(
  node: ElkNode,
  referenced: Referenced<ElkNode>,
  layering: ElkNode[][],
  allNodes: readonly ElkNode[],
): void {
  const chain = getChainByAllNodes(node, allNodes);
  const succVal = layerOfReferenced(referenced.succNode);
  const predVal = layerOfReferenced(referenced.predNode);
  const val = succVal > predVal ? succVal : predVal;
  // update layer ids
  for (const n of chain) {
    const oldVal = layerIdOf(n);
    if (oldVal !== val) {
      n.setProperty(LayeredOptions.LAYERING_LAYER_ID, val);
      shiftOtherNodes(n, val, layering, true);
      shiftOtherNodes(n, val, layering, false);
    }
    JList.remove(JList.get(layering, oldVal), n);
    JList.get(layering, val).push(n);
  }
}

/**
 * The `else` arm: determine the layer of the referenced node and update the layer id of the current node.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:287
 */
function assignSingleLayer(
  node: ElkNode,
  referenced: Referenced<ElkNode | null>,
  layering: ElkNode[][],
  diff: number,
): void {
  // determine layer of referenced node
  let succVal = -1;
  if (referenced.succNode !== null) {
    succVal = layerOfReferenced(referenced.succNode);
  }
  let predVal = -1;
  if (referenced.predNode !== null) {
    predVal = layerOfReferenced(referenced.predNode);
  }

  // update layer id of the current node
  const val = succVal > predVal ? succVal : predVal;
  node.setProperty(LayeredOptions.LAYERING_LAYER_ID, sub(val, diff));
  shiftOtherNodes(node, sub(val, diff), layering, true);
  shiftOtherNodes(node, sub(val, diff), layering, false);
  JList.get(layering, sub(val, diff)).push(node);
}

/**
 * Adds the nodes with a layer constraint to the already assigned layered nodes based on their layer constraint.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:318
 */
function assignLayersToNodesWithProperty(nodesWithLayerConstraint: ElkNode[], layering: ElkNode[][]): number {
  // Sort nodes with constraint based on their layer (`a - b` is an `int` subtraction).
  nodesWithLayerConstraint.sort((a, b) => sub(layerChoiceOf(a), layerChoiceOf(b)));

  // Add the nodes with constraints to the their desired layer.

  // diff keeps track of the difference between the layer the node should
  // be in and the layer the node is really in.
  // This way nodes with the same layer constraint go in the same layer
  // although it may not be the layer that is specified by the constraint.
  let diff = 0;
  for (const node of nodesWithLayerConstraint) {
    const currentLayer = sub(layerChoiceOf(node), diff);
    if (currentLayer < layering.length && currentLayer >= 0) {
      const nodesOfLayer = JList.get(layering, currentLayer);
      // Shift nodes to remove in-layer edges.
      shiftOtherNodes(node, currentLayer, layering, true);
      shiftOtherNodes(node, currentLayer, layering, false);
      nodesOfLayer.push(node);
    } else if (currentLayer === -1) {
      layering.unshift([node]);
    } else {
      diff = sub(add(diff, currentLayer), layering.length);
      layering.push([node]);
    }
  }
  return diff;
}

/** The edges of `movedNode`'s parent that end (`incoming`) or start at `movedNode` or one of its ports, per target. */
export function collectEdges(movedNode: ElkNode, incoming: boolean): ElkEdge[] {
  const edges: ElkEdge[] = [];
  // a node of the root's children always has a parent
  const root = movedNode.getParent() as ElkNode;
  for (const edge of root.getContainedEdges()) {
    // `incoming`: `getTargets()`; otherwise `getSources()`: the two Java loops differ only in this list
    for (const target of incoming ? edge.getTargets() : edge.getSources()) {
      if (target === movedNode || (isElkPort(target) && target.getParent() === movedNode)) {
        edges.push(edge);
      }
    }
  }
  return edges;
}

/** The shape of the first end (`getSources().get(0)` or `getTargets().get(0)`) as the node it belongs to, or null. */
export function connectedNode(edge: ElkEdge, incoming: boolean): ElkNode | null {
  const first: ElkConnectableShape = incoming ? edge.getSources().get(0) : edge.getTargets().get(0);
  if (isElkPort(first)) {
    return first.getParent();
  } else if (isElkNode(first)) {
    return first;
  }
  return null;
}

/** One activation of the Java recursion `shiftOtherNodes(movedNode, layer, layerNodes, incoming)`. */
interface ShiftFrame {
  readonly layer: number;
  readonly nodesOfLayer: ElkNode[];
  readonly edges: readonly ElkEdge[];
  readonly incoming: boolean;
  index: number;
  /** The two recursive calls (`false`, then `true`) the last shifted node still has to make. */
  pending: { readonly node: ElkNode; readonly incoming: boolean }[];
}

function openFrame(movedNode: ElkNode, layer: number, layerNodes: ElkNode[][], incoming: boolean): ShiftFrame {
  const nodesOfLayer = JList.get(layerNodes, layer);
  return { layer, nodesOfLayer, edges: collectEdges(movedNode, incoming), incoming, index: 0, pending: [] };
}

/** The loop body for one edge of a frame: shifts the connected node to the next layer, queueing the recursive calls. */
function shiftEdge(frame: ShiftFrame, edge: ElkEdge, layerNodes: ElkNode[][]): void {
  // get connected node
  const node = connectedNode(edge, frame.incoming);
  // shift node to the next layer
  // `contains(null)` is false: a first end that is neither port nor node never shifts
  if (node !== null && JList.contains(frame.nodesOfLayer, node)) {
    JList.remove(frame.nodesOfLayer, node);
    node.setProperty(LayeredOptions.LAYERING_LAYER_ID, add(frame.layer, 1));
    if (add(frame.layer, 1) < layerNodes.length) {
      const newLayer = JList.get(layerNodes, add(frame.layer, 1));
      newLayer.push(node);
      // the connected nodes in the layer the node is shifted to must be shifted too
      frame.pending = [
        { node, incoming: false },
        { node, incoming: true },
      ];
    } else {
      layerNodes.push([node]);
    }
  }
}

/**
 * Shifts nodes to the right such that edges in the same layer do not exist. The Java method recurses into the layer a node
 * is shifted to (`:415-416`); the activations live on an explicit stack (F11) so that a long chain cannot overflow the call
 * stack, and the visiting order is the recursion's (a frame finishes both pending calls before its next edge).
 *
 * @param incoming Determines if incoming or outgoing edges should be considered. True: incoming edges.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:363
 */
export function shiftOtherNodes(movedNode: ElkNode, layer: number, layerNodes: ElkNode[][], incoming: boolean): void {
  const stack: ShiftFrame[] = [openFrame(movedNode, layer, layerNodes, incoming)];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1] as ShiftFrame;
    const call = frame.pending.shift();
    if (call !== undefined) {
      stack.push(openFrame(call.node, add(frame.layer, 1), layerNodes, call.incoming));
    } else if (frame.index < frame.edges.length) {
      shiftEdge(frame, frame.edges[frame.index++] as ElkEdge, layerNodes);
    } else {
      stack.pop();
    }
  }
}

/**
 * Sorts the `nodes` in layers based on their layerID that was set via the `ConstraintsPostProcessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:430
 */
export function initialLayers(nodes: ElkNode[]): ElkNode[][] {
  // Sort by layerID.
  nodes.sort((a, b) => sub(layerIdOf(a), layerIdOf(b)));

  const layerNodes: ElkNode[][] = [];
  let nodesOfLayer: ElkNode[] = [];
  let layerId = 0;
  let currentLayer = -1;
  // Assign nodes to layers.
  for (const node of nodes) {
    const layer = layerIdOf(node);
    if (layer > currentLayer) {
      // Check if a node is added to a new layer.
      if (nodesOfLayer.length > 0) {
        layerNodes.push(nodesOfLayer);
        layerId++;
      }
      nodesOfLayer = [];
      currentLayer = layer;
    }

    // Nodes with layer constraint should be ignored, since they are added later.
    if (!hasLayerChoice(node)) {
      node.setProperty(LayeredOptions.LAYERING_LAYER_ID, layerId);
      nodesOfLayer.push(node);
    }
  }
  if (nodesOfLayer.length > 0) {
    // Add the last layer nodes.
    layerNodes.push(nodesOfLayer);
  }
  return layerNodes;
}
