// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import * as JList from './InteractiveLayeredGraphVisitorLists.js';
import { LayeredOptions } from './options/LayeredOptions.js';

/**
 * Chains of relative constraints (`inLayerPredOf`, `inLayerSuccOf`) of `InteractiveLayeredGraphVisitor`: the node lookup
 * by identifier, the circle-breaking sort and the two chain searches, in the order of the Java methods.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java
 */

/**
 * A `String` property value that Java reads without a null check: unset means `null` (the option has no default).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java
 */
export function stringProperty(node: ElkNode, property: IProperty<string>): string | null {
  return node.getProperty(property) as string | null;
}

/**
 * Java dereferences a `null` here (a `NullPointerException`): a missing node is a `TypeError`, as in
 * `SortByInputModelProcessor.ts:128-131`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java
 */
export function requireNode(node: ElkNode | null, what: string): ElkNode {
  if (node === null) {
    throw new TypeError(`Cannot dereference ${what}: no node has the referenced identifier`);
  }
  return node;
}

/**
 * Gets the ElkNode with `id` as identifier, or null if it could not be found. A `null` id is the `NullPointerException`
 * of `id.equals(...)`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:882
 */
export function getElkNode(nodes: readonly ElkNode[], id: string | null): ElkNode | null {
  if (id === null) {
    throw new TypeError('Cannot compare to a null identifier');
  }
  for (const eN of nodes) {
    if (id === eN.getIdentifier()) {
      return eN;
    }
  }
  return null;
}

/**
 * Sorts `nodesWithRC` such that referred nodes that have also relative constraints come first. A circle loses one
 * constraint: the node becomes a node without constraints.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:780
 */
export function sortRCNodes(nodesWithRC: ElkNode[], allNodes: readonly ElkNode[], nodesWithoutC: ElkNode[]): ElkNode[] {
  const nodes: ElkNode[] = [];
  while (nodesWithRC.length > 0) {
    let circle = true;
    for (let i = 0; i < nodesWithRC.length; i++) {
      if (moveIfReferenceIsSorted(i, nodesWithRC, allNodes, nodes)) {
        i--;
        circle = false;
      }
    }

    // if relative constraints create a circle, remove one of the constraints
    if (circle) {
      breakCircle(nodesWithRC, nodesWithoutC);
    }
  }
  return nodes;
}

/**
 * The body of the `for` loop of `sortRCNodes`: moves `nodesWithRC[i]` to `nodes` when the node it refers to is no longer
 * in `nodesWithRC` (the caller then runs `i--` and clears `circle`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:786
 */
function moveIfReferenceIsSorted(
  i: number,
  nodesWithRC: ElkNode[],
  allNodes: readonly ElkNode[],
  nodes: ElkNode[],
): boolean {
  const cur = JList.get(nodesWithRC, i);
  if (cur.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF)) {
    // predecessor is defined
    const target = getElkNode(allNodes, stringProperty(cur, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF));
    if (!JList.contains(nodesWithRC, target)) {
      nodes.push(cur);
      JList.removeAt(nodesWithRC, i);
      return true;
    }
  } else {
    // successor is defined
    const target = getElkNode(allNodes, stringProperty(cur, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF));
    if (!JList.contains(nodesWithRC, target)) {
      nodes.push(cur);
      JList.removeAt(nodesWithRC, i);
      return true;
    }
  }
  return false;
}

/** The `if (circle)` block of `sortRCNodes`. @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:811 */
function breakCircle(nodesWithRC: ElkNode[], nodesWithoutC: ElkNode[]): void {
  const cur = JList.get(nodesWithRC, 0);
  if (cur.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF)) {
    cur.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF, null);
  } else {
    cur.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF, null);
  }
  JList.removeAt(nodesWithRC, 0);
  nodesWithoutC.push(cur);
}

/**
 * Determines the nodes that are connected to `node` by relative constraints. The returned list of nodes is sorted based on
 * the position of the nodes.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:898
 */
export function getChainByLayerNodes(node: ElkNode, layerNodes: readonly ElkNode[]): ElkNode[] {
  const pos = JList.indexOf(layerNodes, node);
  const chainNodes: ElkNode[] = [node];

  // from node to the start
  for (let i = pos - 1; i >= 0; i--) {
    if (
      JList.get(layerNodes, i).hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF) ||
      JList.get(layerNodes, i + 1).hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF)
    ) {
      chainNodes.unshift(JList.get(layerNodes, i));
    } else {
      break;
    }
  }

  // count from node to the end
  for (let i = pos + 1; i < layerNodes.length; i++) {
    if (
      JList.get(layerNodes, i).hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF) ||
      JList.get(layerNodes, i - 1).hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF)
    ) {
      chainNodes.push(JList.get(layerNodes, i));
    } else {
      break;
    }
  }

  return chainNodes;
}

/**
 * Determines nodes that are connected to `node` by relative constraints (unsorted). The second loop advances with
 * `IN_LAYER_PRED_OF` of `predNode` (`:950`), not `IN_LAYER_SUCC_OF`, as in Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:934
 */
export function getChainByAllNodes(node: ElkNode, allNodes: readonly ElkNode[]): ElkNode[] {
  const chain: ElkNode[] = [node];

  let succName = stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
  let predName = stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF);
  while (succName !== null) {
    // Java adds a missing node (null) to the list and dereferences it on the next line
    const succNode = requireNode(getElkNode(allNodes, succName), 'succNode');
    chain.push(succNode);
    succName = stringProperty(succNode, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
  }
  while (predName !== null) {
    const predNode = requireNode(getElkNode(allNodes, predName), 'predNode');
    chain.push(predNode);
    predName = stringProperty(predNode, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
  }

  return chain;
}
