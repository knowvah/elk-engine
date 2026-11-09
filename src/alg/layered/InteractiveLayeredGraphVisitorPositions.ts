// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../core/math/KVector.js';
import { Direction } from '../../core/options/Direction.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { add, mul, sub } from '../../java/lang/Int32.js';
import { d2i } from '../../java/lang/JavaMath.js';
import {
  getChainByLayerNodes,
  getElkNode,
  requireNode,
  sortRCNodes,
  stringProperty,
} from './InteractiveLayeredGraphVisitorChains.js';
import { PSEUDO_POSITION_SPACING } from './InteractiveLayeredGraphVisitorConstants.js';
import * as JList from './InteractiveLayeredGraphVisitorLists.js';
import { LayeredOptions } from './options/LayeredOptions.js';

/**
 * The position calculation of `InteractiveLayeredGraphVisitor`: the pseudo coordinate in layout direction, the order of
 * the nodes of a layer and the coordinate orthogonal to it, in the order of the Java methods. `int` arithmetic is `Int32`,
 * `double` arithmetic is plain.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java
 */

const hasPositionChoice = (node: ElkNode): boolean =>
  node.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT);
const hasPredOf = (node: ElkNode): boolean => node.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
const hasSuccOf = (node: ElkNode): boolean => node.hasProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF);
const positionChoiceOf = (node: ElkNode): number =>
  node.getProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT);

/**
 * The `UNDEFINED`/`RIGHT`/`LEFT` arms of the switch of `setCoordinateInLayoutDirection`: the x coordinate. Returns the
 * next layer's position (the Java `nextPosition`, updated only when the node's test holds). The comparisons are `double`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:484
 */
function placeNodeX(node: ElkNode, direction: Direction, position: number, nextPosition: number): number {
  node.setX(position);
  if (direction === Direction.LEFT) {
    return node.getX() <= nextPosition ? node.getX() - PSEUDO_POSITION_SPACING : nextPosition;
  }
  if (position + node.getWidth() / 2 >= nextPosition) {
    return node.getX() + node.getWidth() + PSEUDO_POSITION_SPACING;
  }
  return nextPosition;
}

/**
 * The `DOWN`/`UP` arms of the switch of `setCoordinateInLayoutDirection`: the y coordinate (see `placeNodeX`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:497
 */
function placeNodeY(node: ElkNode, direction: Direction, position: number, nextPosition: number): number {
  node.setY(position);
  if (direction === Direction.UP) {
    return node.getY() <= nextPosition ? node.getY() - PSEUDO_POSITION_SPACING : nextPosition;
  }
  if (position + node.getHeight() >= nextPosition) {
    return node.getY() + node.getHeight() + PSEUDO_POSITION_SPACING;
  }
  return nextPosition;
}

/**
 * Places `node` on the pseudo coordinate of its layer in layout direction (the switch of `:483-509`). Java's switch has no
 * default arm: an unlisted direction leaves the node and `nextPosition` alone.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:483
 */
function placeNode(node: ElkNode, direction: Direction, position: number, nextPosition: number): number {
  switch (direction) {
    case Direction.UNDEFINED:
    case Direction.RIGHT:
    case Direction.LEFT:
      return placeNodeX(node, direction, position, nextPosition);
    case Direction.DOWN:
    case Direction.UP:
      return placeNodeY(node, direction, position, nextPosition);
    default:
      return nextPosition;
  }
}

/**
 * Sets the x coordinates of the nodes in `layers` according to their layer. The height and width of a node are those of
 * the layout before the constraints, so the placement adjusts for this by a very high spacing between nodes.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:476
 */
export function setCoordinateInLayoutDirection(layers: readonly (readonly ElkNode[])[], direction: Direction): void {
  let position = 0;
  let nextPosition = 0;
  // Assign x (RIGHT, LEFT)/y (UP, DOWN) coordinate such that all nodes get a pseudo position
  // that assigns them to the correct layer if interactive mode is used.
  for (const nodesOfLayer of layers) {
    for (const node of nodesOfLayer) {
      nextPosition = placeNode(node, direction, position, nextPosition);
    }
    position = nextPosition;
  }
}

/** The lists of `setCoordinatesOrthogonalToLayoutDirection` (`nodesWithOneRC` is replaced by `sortRCNodes`). */
interface LayerLists {
  readonly allNodes: ElkNode[];
  readonly nodesWithoutC: ElkNode[];
  readonly nodesWithPCAndRC: ElkNode[];
  readonly nodesWithPC: ElkNode[];
  nodesWithOneRC: ElkNode[];
  readonly nodesWithBothRC: ElkNode[];
}

/**
 * Separates the nodes of a layer with and without constraints (`:534-551`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:527
 */
function classifyLayerNodes(nodesOfLayer: readonly ElkNode[]): LayerLists {
  const lists: LayerLists = {
    allNodes: [],
    nodesWithoutC: [],
    nodesWithPCAndRC: [],
    nodesWithPC: [],
    nodesWithOneRC: [],
    nodesWithBothRC: [],
  };
  for (const node of nodesOfLayer) {
    lists.allNodes.push(node);
    if (hasPositionChoice(node) && (hasPredOf(node) || hasSuccOf(node))) {
      lists.nodesWithPCAndRC.push(node);
    } else if (hasPositionChoice(node)) {
      lists.nodesWithPC.push(node);
    } else if (hasPredOf(node) && hasSuccOf(node)) {
      lists.nodesWithBothRC.push(node);
    } else if (hasPredOf(node) || hasSuccOf(node)) {
      lists.nodesWithOneRC.push(node);
    } else {
      lists.nodesWithoutC.push(node);
    }
  }
  return lists;
}

const positionIdOf = (node: ElkNode): number => node.getProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID);

/**
 * Each node should only have one relative constraint: a pred constraint is translated to a succ constraint for the node
 * it refers to. The loop runs over a list that grows inside it (`add(n + 1, target)`, `:578`), as in Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:560
 */
function translateNodesWithBothRC(lists: LayerLists): void {
  const { allNodes, nodesWithoutC, nodesWithPCAndRC, nodesWithOneRC, nodesWithBothRC } = lists;
  for (let n = 0; n < nodesWithBothRC.length; n++) {
    // pred cons is translated to succ cons for the following node
    const node = JList.get(nodesWithBothRC, n);
    const t = stringProperty(node, LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF);
    // a missing target is the `NullPointerException` of `target.hasProperty` (`:566`)
    const target = requireNode(getElkNode(allNodes, t), 'target');
    node.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF, null);
    if (hasPositionChoice(target)) {
      const posCosTarget = positionChoiceOf(target);
      node.setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT, sub(posCosTarget, 1));
      nodesWithPCAndRC.push(node);
    } else {
      target.setProperty(LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF, node.getIdentifier());
      nodesWithOneRC.push(node);
      if (!hasPredOf(target)) {
        JList.remove(nodesWithoutC, target);
        nodesWithOneRC.push(target);
      } else {
        JList.remove(nodesWithOneRC, target);
        JList.addAt(nodesWithBothRC, n + 1, target);
      }
    }
  }
}

/**
 * The target nodes and position constraints a node with pos and rel cons hands on (`:687-704`): the pred target gets
 * `val + 1`, the succ target `val - 1`; both relative constraints are removed from the node.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:687
 */
function collectTargets(
  node: ElkNode,
  allNodes: readonly ElkNode[],
): { readonly targets: (ElkNode | null)[]; readonly vals: number[] } {
  const targets: (ElkNode | null)[] = [];
  const vals: number[] = [];
  const val = positionChoiceOf(node);
  if (hasPredOf(node)) {
    // pred is defined
    const nodeProp = LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF;
    targets.push(getElkNode(allNodes, stringProperty(node, nodeProp)));
    vals.push(add(val, 1));
    node.setProperty(nodeProp, null);
  }
  if (hasSuccOf(node)) {
    // succ is defined
    const nodeProp = LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF;
    targets.push(getElkNode(allNodes, stringProperty(node, nodeProp)));
    vals.push(sub(val, 1));
    node.setProperty(nodeProp, null);
  }
  return { targets, vals };
}

/**
 * Handles nodes with pos and rel cons by adding pos cons to all nodes that are connected to them by rel cons. The loop
 * runs over a list that grows inside it (`nodesWithPCAndRC.add(target)`, `:715`), as in Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:680
 */
function handleNodesWithPCAndRC(
  allNodes: readonly ElkNode[],
  nodes: ElkNode[],
  nodesWithRC: ElkNode[],
  nodesWithPositionConstraint: ElkNode[],
  nodesWithPCAndRC: ElkNode[],
): void {
  for (let i = 0; i < nodesWithPCAndRC.length; i++) {
    const node = JList.get(nodesWithPCAndRC, i);
    nodesWithPositionConstraint.push(node);

    const { targets, vals } = collectTargets(node, allNodes);

    // targets should be in the correct lists
    for (let t = 0; t < targets.length; t++) {
      // a missing target is the `NullPointerException` of `target.setProperty` (`:710`)
      const target = requireNode(JList.get(targets, t), 'target');
      if (!JList.contains(nodesWithPositionConstraint, target)) {
        target.setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT, JList.get(vals, t));
        if (!JList.contains(nodesWithRC, target)) {
          nodesWithPositionConstraint.push(target);
          JList.remove(nodes, target);
        } else {
          nodesWithPCAndRC.push(target);
          JList.remove(nodesWithRC, target);
        }
      }
    }
  }
}

/**
 * Sorts the `nodesWithPositionConstraint` according their position constraint and `nodes` according to the relevant
 * coordinate (y for left, right, x for up, down); `(int) (a.getY() - b.getY())` is a saturating `d2i`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:836
 */
function sortNodesInLayer(nodesWithPositionConstraint: ElkNode[], nodes: ElkNode[], direction: Direction): void {
  // Sort nodes with constraint by their position constraint.
  nodesWithPositionConstraint.sort((a, b) => sub(positionChoiceOf(a), positionChoiceOf(b)));
  // Sort other nodes based on their y(RIGHT/LEFT)/x(DOWN/UP) coordinate.
  nodes.sort((a, b) => {
    switch (direction) {
      case Direction.UNDEFINED:
      case Direction.RIGHT:
      case Direction.LEFT:
        return d2i(a.getY() - b.getY());
      case Direction.DOWN:
      case Direction.UP:
        return d2i(a.getX() - b.getX());
      default:
        return 0;
    }
  });
}

/**
 * The body of the inner loop of `addNodesWithOneRC` for the target `t` (0: pred, 1: succ): the node follows or precedes the
 * target in `nodesWithoutC`, or takes a position constraint next to a target that has one.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:606
 */
function addNodeNextToTarget(node: ElkNode, t: number, target: ElkNode, lists: LayerLists): void {
  const { nodesWithoutC, nodesWithPC } = lists;
  if (!hasPositionChoice(target)) {
    // add node at correct position
    const index = t === 0 ? JList.indexOf(nodesWithoutC, target) : add(JList.indexOf(nodesWithoutC, target), 1);
    JList.addAt(nodesWithoutC, index, node);
  } else {
    // set pos cons on node because target has pos cons
    const val = positionChoiceOf(target);
    const value = t === 0 ? sub(val, 1) : add(val, 1);
    const nodeProp =
      t === 0
        ? LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF
        : LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF;
    node.setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT, value);
    node.setProperty(nodeProp, null);
    nodesWithPC.push(node);
  }
}

/**
 * The loop over `nodesWithOneRC` (`:592-624`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:591
 */
function addNodesWithOneRC(lists: LayerLists): void {
  const { allNodes } = lists;
  for (const node of lists.nodesWithOneRC) {
    const targets: (ElkNode | null)[] = [null, null];

    if (hasPredOf(node)) {
      // pred is defined
      const nodeProp = LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_PRED_OF;
      targets[0] = getElkNode(allNodes, stringProperty(node, nodeProp));
    } else {
      // succ is defined
      const nodeProp = LayeredOptions.CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF;
      targets[1] = getElkNode(allNodes, stringProperty(node, nodeProp));
    }

    for (let t = 0; t < targets.length; t++) {
      const target = targets[t] ?? null;
      if (target !== null) {
        addNodeNextToTarget(node, t, target, lists);
      }
    }
  }
}

/**
 * Add the nodes with position constraint at the desired position in their layer (`:626-643`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:626
 */
function addNodesWithPC(nodesWithPC: ElkNode[], nodesWithoutC: ElkNode[]): void {
  // Sort nodes with constraint by their position constraint.
  nodesWithPC.sort((a, b) => sub(positionChoiceOf(a), positionChoiceOf(b)));

  for (const node of nodesWithPC) {
    const pos = positionChoiceOf(node);
    if (pos < nodesWithoutC.length) {
      if (pos > 0) {
        swapNodes(nodesWithoutC, pos);
      }
      JList.addAt(nodesWithoutC, pos, node);
    } else {
      nodesWithoutC.push(node);
    }
  }
}

/**
 * Set the y/x positions according to the order of the nodes (`:645-664`). `nodesWithoutC.get(0)` throws the Java
 * `IndexOutOfBoundsException` on an empty list; the `x` offset is `2 * layerId * PSEUDO_POSITION_SPACING` in `int`
 * arithmetic, added to a `double`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:645
 */
function setPositionsInOrder(nodesWithoutC: readonly ElkNode[], layerId: number, direction: Direction): void {
  switch (direction) {
    case Direction.UNDEFINED:
    case Direction.RIGHT:
    case Direction.LEFT: {
      let yPos = JList.get(nodesWithoutC, 0).getY();
      for (const node of nodesWithoutC) {
        node.setProperty(LayeredOptions.POSITION, new KVector(node.getX(), yPos));
        yPos += node.getHeight() + PSEUDO_POSITION_SPACING;
      }
      break;
    }
    case Direction.DOWN:
    case Direction.UP: {
      let xPos = JList.get(nodesWithoutC, 0).getX() + mul(mul(2, layerId), PSEUDO_POSITION_SPACING);
      for (const node of nodesWithoutC) {
        node.setProperty(LayeredOptions.POSITION, new KVector(xPos, node.getY()));
        xPos += node.getWidth() + PSEUDO_POSITION_SPACING;
      }
      break;
    }
    default:
      // Java's switch has no default arm
      break;
  }
}

/**
 * Sets the positions of the nodes in their layer.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:524
 */
export function setCoordinatesOrthogonalToLayoutDirection(
  nodesOfLayer: readonly ElkNode[],
  layerId: number,
  direction: Direction,
): void {
  // Separate nodes with and without constraints.
  const lists = classifyLayerNodes(nodesOfLayer);

  // Sort nodes with constraint by their position id.
  lists.nodesWithPC.sort((a, b) => sub(positionIdOf(a), positionIdOf(b)));

  translateNodesWithBothRC(lists);

  // handle nodes with relative and position constraint
  // all nodes the are connected to the ones with the pos cons through relative constraints get also a pc
  handleNodesWithPCAndRC(
    lists.allNodes,
    lists.nodesWithoutC,
    lists.nodesWithOneRC,
    lists.nodesWithPC,
    lists.nodesWithPCAndRC,
  );

  // Determine the order of the nodes.
  lists.nodesWithOneRC = sortRCNodes(lists.nodesWithOneRC, lists.allNodes, lists.nodesWithoutC);
  sortNodesInLayer(lists.nodesWithPC, lists.nodesWithoutC, direction);

  // Add nodes with relative constraint
  addNodesWithOneRC(lists);

  addNodesWithPC(lists.nodesWithPC, lists.nodesWithoutC);

  setPositionsInOrder(lists.nodesWithoutC, layerId, direction);
}

/**
 * Swaps nodes such that a node that should be placed at `position` does not interrupt nodes that are connected with a
 * relative constraint.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/InteractiveLayeredGraphVisitor.java:730
 */
export function swapNodes(nodes: ElkNode[], position: number): void {
  // Get surrounding nodes for node put at the given position.
  const pred = JList.get(nodes, position - 1);
  const succ = JList.get(nodes, position);

  // Get all nodes that are connected by relative constraints to the predecessor.
  let chain = getChainByLayerNodes(pred, nodes);
  if (JList.contains(chain, succ)) {
    // Nodes only must be shifted if a relation between pred and succ exists

    // Number nodes that must be swapped
    const count = JList.indexOf(chain, succ);
    // End of relative constraints chain
    let end = position + (chain.length - count);

    // Determine nodes to swap
    const swapNodeList: ElkNode[] = [];
    for (let i = 0; i < count; i++) {
      if (end >= nodes.length) {
        break;
      }
      const currentNode = JList.get(nodes, end);
      chain = getChainByLayerNodes(currentNode, nodes);
      // Check whether the number of nodes linked by relative constraints
      if (chain.length + i <= count) {
        JList.removeAll(nodes, chain);
        swapNodeList.push(...chain);
        i += chain.length - 1;
      } else {
        // skip chains of relative constraints
        end += chain.length;
      }
    }

    // add swapNodes
    JList.addAllAt(nodes, position - count, swapNodeList);
  }
}
