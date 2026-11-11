// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';

/** The two spacing-inflated rectangles of `overlap`: corner `1` and `2` with the sizes of the nodes plus the spacing. */
interface Boxes {
  readonly x1: number;
  readonly x2: number;
  readonly y1: number;
  readonly y2: number;
  readonly width1: number;
  readonly width2: number;
  readonly height1: number;
  readonly height2: number;
}

/** First branch of `overlap`: left upper and right lower corner overlap. */
const leftUpperRightLower = (b: Boxes): boolean =>
  b.x1 < b.x2 + b.width2 && b.x2 < b.x1 && b.y1 < b.y2 + b.height2 && b.y2 < b.y1;

/** Second branch of `overlap`: right lower and left upper corner overlap. */
const rightLowerLeftUpper = (b: Boxes): boolean =>
  b.x2 < b.x1 + b.width1 && b.x1 < b.x2 && b.y2 < b.y1 + b.height1 && b.y1 < b.y2;

/** Third branch of `overlap`: left lower and right upper corner overlap. */
const leftLowerRightUpper = (b: Boxes): boolean =>
  b.x1 < b.x2 + b.width2 && b.x2 < b.x1 && b.y1 < b.y2 && b.y2 < b.y1 + b.height1;

/** Fourth branch of `overlap`: right upper and left lower corner overlap. */
const rightUpperLeftLower = (b: Boxes): boolean =>
  b.x2 < b.x1 + b.width1 && b.x1 < b.x2 && b.y1 < b.y2 + b.height2 && b.y2 < b.y1;

/**
 * The common basis of the radius extension compactions and the overlap removal: it moves the nodes of one radius along
 * their edge to the root and tests them for overlaps.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/compaction/AbstractRadiusExtensionCompaction.java
 */
export class AbstractRadiusExtensionCompaction {
  /** The step size with which the contraction takes place. Default is one. */
  #compactionStep = 1;

  /** The spacing between nodes which has to be considered while contracting. */
  #spacing = 0;

  /** The root node of the graph. */
  #root!: ElkNode;

  /**
   * Contracts/Extends a list of nodes from the same radius by moving them along their incoming edge.
   *
   * @param layerNodes List of nodes of one radius that shall be moved.
   * @param isContracting Determines if the layer shall be contracted or extended.
   */
  contractLayer(layerNodes: readonly ElkNode[], isContracting: boolean): void {
    for (const node of layerNodes) {
      // node center
      let xPos = node.getX() + node.getWidth() / 2;
      let yPos = node.getY() + node.getHeight() / 2;

      const treeParent = this.#root;
      const parentX = treeParent.getX() + treeParent.getWidth() / 2;
      const parentY = treeParent.getY() + treeParent.getHeight() / 2;

      // vector of edge
      let x = xPos - parentX;
      let y = yPos - parentY;
      // vector length
      const length = Math.sqrt(x * x + y * y);

      // multiply with normalized vector
      x *= this.#compactionStep / length;
      y *= this.#compactionStep / length;

      if (isContracting) {
        xPos -= x;
        yPos -= y;
      } else {
        xPos += x;
        yPos += y;
      }

      node.setX(xPos - node.getWidth() / 2);
      node.setY(yPos - node.getHeight() / 2);
    }
  }

  /**
   * Move the node by the given distance in the direction of the root node to this node.
   *
   * @param node The node
   * @param distance The distance to move
   */
  moveNode(node: ElkNode, distance: number): void {
    // Move child distance into the direction of the connection to the root node
    // We have to measure from center to center since the different nodes might have different sizes.
    const root = this.#root;
    const rootX = root.getX() + root.getWidth() / 2.0;
    const rootY = root.getY() + root.getHeight() / 2.0;
    const nodeX = node.getX() + node.getWidth() / 2.0;
    const nodeY = node.getY() + node.getHeight() / 2.0;
    const differenceX = nodeX - rootX;
    const differenceY = nodeY - rootY;
    // Calculate unit vector
    const length = Math.sqrt(differenceX * differenceX + differenceY * differenceY);
    const unitX = differenceX / length;
    const unitY = differenceY / length;
    // Move node by distance in direction of uni vector.
    node.setX(node.getX() + unitX * distance);
    node.setY(node.getY() + unitY * distance);
  }

  /**
   * Calculates if two nodes overlap with each other.
   *
   * @param node1 The first node.
   * @param node2 A second node.
   * @return If a overlap exists.
   */
  overlap(node1: ElkNode, node2: ElkNode): boolean {
    const spacing = this.#spacing;
    const box: Boxes = {
      x1: node1.getX() - spacing / 2,
      x2: node2.getX() - spacing / 2,
      y1: node1.getY() - spacing / 2,
      y2: node2.getY() - spacing / 2,
      width1: node1.getWidth() + spacing,
      width2: node2.getWidth() + spacing,
      height1: node1.getHeight() + spacing,
      height2: node2.getHeight() + spacing,
    };

    // The four branches of `overlap` (Java's else-if chain) are split into one predicate each (complexity limit); all are
    // pure, so `||` in the same order evaluates exactly what the chain does.
    return leftUpperRightLower(box) || rightLowerLeftUpper(box) || leftLowerRightUpper(box) || rightUpperLeftLower(box);
  }

  /**
   * Calculate if the nodes of one radius are overlapping each other.
   *
   * @param nodes List of nodes from one radius.
   * @return If the nodes of the radius are overlapping.
   */
  overlapLayer(nodes: readonly ElkNode[]): boolean {
    let overlapping = false;
    if (nodes.length < 2) {
      return false;
    }
    for (let i = 0; i < nodes.length; i++) {
      // `|=` of Java does not short-circuit: `overlap` is evaluated first on purpose
      if (i < nodes.length - 1) {
        overlapping = this.overlap(nodes[i] as ElkNode, nodes[i + 1] as ElkNode) || overlapping;
      } else {
        overlapping = this.overlap(nodes[i] as ElkNode, nodes[0] as ElkNode) || overlapping;
      }
    }
    return overlapping;
  }

  /** The step size which was chosen for the compaction/extension. */
  getCompactionStep(): number {
    return this.#compactionStep;
  }

  /** Set the compaction step size which shall be used for the extension/compaction. */
  setCompactionStep(compactionStep: number): void {
    this.#compactionStep = compactionStep;
  }

  /** The spacing between the nodes which shall be considered while contracting. */
  getSpacing(): number {
    return this.#spacing;
  }

  setSpacing(spacing: number): void {
    this.#spacing = spacing;
  }

  /** Commit the root node of the graph to this class. */
  setRoot(root: ElkNode): void {
    this.#root = root;
  }

  /** Receive the saved root node. */
  getRoot(): ElkNode {
    return this.#root;
  }
}
