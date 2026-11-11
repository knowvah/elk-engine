// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkPort } from '../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { fuzzyCompare, fuzzyEquals } from '../../guava/DoubleMath.js';
import * as Iterables from '../../guava/Iterables.js';

/**
 * A class for smaller, independent calculation units.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/RadialUtil.java
 */
export class RadialUtil {
  /** Constant for 2*PI. */
  private static readonly TWO_PI = 2 * Math.PI;
  /** Constant for fuzzy compare. */
  private static readonly EPSILON = 1e-10;

  /** Constructor should not be public visible. */
  private constructor() {
    // Do nothing
  }

  /**
   * The nodes which succedes the given node in the tree. These are defined by the targets of all outgoing edges of the
   * node.
   *
   * @param node A node.
   * @return List of neighbors with outgoing edges.
   */
  static getSuccessors(node: ElkNode): ElkNode[] {
    const successors: ElkNode[] = [];
    // AD-10 / TR3: identity-hashed HashSet (RadialUtil.java:56), lookup only
    const children = new Set<ElkNode>(node.getChildren());
    for (const outgoingEdge of ElkGraphUtil.allOutgoingEdges(node)) {
      if (!isElkPort(outgoingEdge.getSources().get(0))) {
        const target = ElkGraphUtil.connectableShapeToNode(outgoingEdge.getTargets().get(0)) as ElkNode;
        if (!children.has(target)) {
          successors.push(target);
        }
      }
    }
    return successors;
  }

  /**
   * The nodes which succedes the given node in the tree. These are defined by the targets of all outgoing edges of the
   * node.
   *
   * @param node A node.
   * @return Set of neighbors with outgoing edges.
   */
  static getSuccessorSet(node: ElkNode): Set<ElkNode> {
    // AD-10 / TR3 I30: identity-hashed HashSet (RadialUtil.java:78 is the lookup-only `children`, :77 this set); the
    // TS Set iterates in insertion order
    const successors = new Set<ElkNode>();
    const children = new Set<ElkNode>(node.getChildren());
    for (const outgoingEdge of ElkGraphUtil.allOutgoingEdges(node)) {
      if (!isElkPort(outgoingEdge.getSources().get(0))) {
        const target = ElkGraphUtil.connectableShapeToNode(outgoingEdge.getTargets().get(0)) as ElkNode;
        if (!children.has(target)) {
          successors.add(target);
        }
      }
    }
    return successors;
  }

  /**
   * Computes the root node of a graph. That means in this case the root of a tree and not the surrounding root. A
   * hierarchical graph is always a tree.
   *
   * @param graph
   * @return Root node of graph.
   */
  static findRoot(graph: ElkNode): ElkNode | null {
    for (const child of graph.getChildren()) {
      const incomingEdges: Iterable<ElkEdge> = ElkGraphUtil.allIncomingEdges(child);
      if (Iterables.isEmpty(incomingEdges)) {
        return child;
      }
    }
    return null;
  }

  /**
   * Given a node of the tree, calculate the root of the tree.
   *
   * @param elkNode
   */
  static findRootOfNode(elkNode: ElkNode): ElkNode {
    const parent = RadialUtil.getTreeParent(elkNode);
    if (parent === null) {
      return elkNode;
    } else {
      return RadialUtil.findRootOfNode(parent);
    }
  }

  /**
   * Computes the number of leaves that a node has.
   *
   * @param node
   * @return number of leaves.
   */
  static getNumberOfLeaves(node: ElkNode): number {
    let leafs = 0;
    const successors = RadialUtil.getSuccessors(node);
    if (successors.length === 0) {
      return 1;
    } else {
      for (const child of successors) {
        leafs += RadialUtil.getNumberOfLeaves(child);
      }
    }
    return leafs;
  }

  /**
   * Comparator for sorting a node by polar coordinates. Offset is set between 0 and 2*Pi. 0 starts the sorting in the
   * right middle of a node and sorts clockwise.
   *
   * A node without the POSITION option makes `position1.x` throw a `TypeError` (Java's NullPointerException,
   * RadialUtil.java:154: the property has no default).
   *
   * @param radialOffset
   * @param nodeOffsetY
   * @return Comparator for polar sorting.
   */
  static createPolarComparator(radialOffset: number, nodeOffsetY: number): (node1: ElkNode, node2: ElkNode) => number {
    return (node1, node2) => {
      const position1 = node1.getProperty(CoreOptions.POSITION);

      const xPos1 = position1.x;
      const yPos1 = position1.y + nodeOffsetY;
      let arc1 = Math.atan2(yPos1, xPos1);
      if (arc1 < 0) {
        arc1 += RadialUtil.TWO_PI;
      }
      arc1 += radialOffset;
      if (arc1 > RadialUtil.TWO_PI) {
        arc1 -= RadialUtil.TWO_PI;
      }

      const position2 = node2.getProperty(CoreOptions.POSITION);

      const xPos2 = position2.x;
      const yPos2 = position2.y + nodeOffsetY;
      let arc2 = Math.atan2(yPos2, xPos2);
      if (arc2 < 0) {
        arc2 += RadialUtil.TWO_PI;
      }
      arc2 += radialOffset;
      if (arc2 > RadialUtil.TWO_PI) {
        arc2 -= RadialUtil.TWO_PI;
      }

      return fuzzyCompare(arc1, arc2, RadialUtil.EPSILON);
    };
  }

  /**
   * Search for the largest diameter of all nodes.
   *
   * @param graph
   */
  static findLargestNodeInGraph(graph: ElkNode): number {
    let largestChildSize = 0;

    for (const child of graph.getChildren()) {
      const width = child.getWidth();
      const height = child.getHeight();
      const diameter = Math.sqrt(width * width + height * height);
      largestChildSize = Math.max(diameter, largestChildSize);

      const largestChild = RadialUtil.findLargestNodeInGraph(child);
      largestChildSize = Math.max(largestChild, largestChildSize);
    }
    return largestChildSize;
  }

  /**
   * Returns the next level of successor from a list of nodes.
   *
   * @param nodes
   */
  static getNextLevelNodes(nodes: readonly ElkNode[]): ElkNode[] {
    const successors: ElkNode[] = [];
    for (const node of nodes) {
      const nextLevelNodes = RadialUtil.getSuccessors(node);
      successors.push(...nextLevelNodes);
    }
    return successors;
  }

  /**
   * Get set of the nodes in the next level.
   *
   * @param nodes The nodes in the current level
   * @return The next nodes
   */
  static getNextLevelNodeSet(nodes: readonly ElkNode[]): Set<ElkNode> {
    // AD-10 / TR3 I30: RadialUtil.java:224 identity-hashed HashSet whose iteration order is observable (the overlap
    // removal's `nodes.get(0)` and recursion order); the TS Set iterates in insertion order
    const successors = new Set<ElkNode>();
    for (const node of nodes) {
      const nextLevelSet = RadialUtil.getSuccessorSet(node);
      for (const successor of nextLevelSet) {
        successors.add(successor);
      }
    }
    return successors;
  }

  /**
   * Returns the next level of successor from a list of nodes.
   *
   * @param nodes
   */
  static getLastLevelNodes(nodes: readonly ElkNode[]): (ElkNode | null)[] {
    const parents: (ElkNode | null)[] = [];
    for (const node of nodes) {
      const parent = RadialUtil.getTreeParent(node);
      parents.push(parent);
    }
    return parents;
  }

  /**
   * Shift a node such that it is centered on the radius.
   *
   * @param node A node to center.
   * @param xPos The nodes new x Position on the radius.
   * @param yPos The nodes new y Position on the radius.
   */
  static centerNodesOnRadi(node: ElkNode, xPos: number, yPos: number): void {
    const xPosition = xPos - node.getWidth() / 2;
    const yPosition = yPos - node.getHeight() / 2;

    node.setX(xPosition);
    node.setY(yPosition);
  }

  /**
   * Shift nodes such that the edge closest to the parent node, is closest now.
   *
   * @param node A node to shift.
   * @param xPos The nodes new x Position.
   * @param yPos The nodes new y Position.
   */
  static shiftClosestEdgeToRadi(node: ElkNode, xPos: number, yPos: number): void {
    // center root
    if (fuzzyEquals(xPos, 0, RadialUtil.EPSILON) && fuzzyEquals(yPos, 0, RadialUtil.EPSILON)) {
      node.setX(xPos - node.getWidth() / 2);
      node.setY(yPos - node.getHeight() / 2);
    } else {
      if (xPos < 0) {
        if (yPos < 0) {
          // lower left rectangle
          node.setX(xPos - node.getWidth());
          node.setY(yPos);
        } else {
          // upper left rectangle
          node.setX(xPos - node.getWidth());
          node.setY(yPos + node.getHeight());
        }
      } else {
        if (yPos < 0) {
          // lower right rectangle
          node.setX(xPos);
          node.setY(yPos);
        } else {
          // upper right rectangle
          node.setX(xPos);
          node.setY(yPos + node.getHeight());
        }
      }
    }
  }

  /**
   * Computes the nodes which is the predecessor in the tree.
   *
   * @param node
   */
  static getTreeParent(node: ElkNode): ElkNode | null {
    const iterator = ElkGraphUtil.allIncomingEdges(node);
    if (!Iterables.isEmpty(iterator)) {
      const edgeFromParent = Iterables.get(iterator, 0);
      return ElkGraphUtil.connectableShapeToNode(edgeFromParent.getSources().get(0));
    } else {
      return null;
    }
  }
}
