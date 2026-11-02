// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { Spacings } from '../../options/Spacings.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import type { NeighborhoodInformation } from './NeighborhoodInformation.js';

/**
 * Class which holds all information about a layout in one of the four direction combinations.
 *
 * Java `Double[]` arrays whose elements can be `null` (`y`, `shift`) are `(number | null)[]`; the ones always assigned
 * before they are read (`blockSize`, `innerShift`) are `number[]`. `cleanup` replaces the arrays by empty ones, as
 * TypeScript has no `null` array here and nothing reads them afterwards.
 *
 * @author jjc
 * @author uru
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKAlignedLayout.java
 */
export class BKAlignedLayout {
  /** The root node of each node in a block. */
  root: Array<LNode | null>;
  /** The size of a block. */
  blockSize: number[];
  /** The next node in a block, or the first if the current node is the last, forming a ring. */
  align: Array<LNode | null>;
  /** The value by which a node must be shifted to stay straight inside a block. */
  innerShift: number[];
  /** The root node of a class, mapped from block root nodes to class root nodes. */
  sink: Array<LNode | null>;
  /** The value by which a block must be shifted for a more compact placement. */
  shift: Array<number | null>;
  /** The y-coordinate of every node, forming the final layout. */
  y: Array<number | null>;
  /** The vertical direction of the current layout. */
  vdir: VDirection | null;
  /** The horizontal direction of the current layout. */
  hdir: HDirection | null;
  /** Flags blocks, represented by their root node, that are part of a straightened edge. */
  su: boolean[];
  /** Flags blocks, represented by their root node, that they are solely made up of dummy nodes. */
  od: boolean[];

  /** The graph to process. */
  layeredGraph: LGraph;
  /** Spacing values. */
  spacings: Spacings;

  /**
   * Basic constructor for a layout.
   *
   * @param layeredGraph the layered graph.
   * @param nodeCount number of nodes in this layout
   * @param vdir vertical traversal direction of the algorithm
   * @param hdir horizontal traversal direction of the algorithm
   */
  constructor(layeredGraph: LGraph, nodeCount: number, vdir: VDirection | null, hdir: HDirection | null) {
    this.layeredGraph = layeredGraph;
    // Initialize spacing value from layout options.
    this.spacings = layeredGraph.getProperty(InternalProperties.SPACINGS);

    this.root = new Array<LNode | null>(nodeCount).fill(null);
    this.blockSize = new Array<number>(nodeCount).fill(0);
    this.align = new Array<LNode | null>(nodeCount).fill(null);
    this.innerShift = new Array<number>(nodeCount).fill(0);
    this.sink = new Array<LNode | null>(nodeCount).fill(null);
    this.shift = new Array<number | null>(nodeCount).fill(null);
    this.y = new Array<number | null>(nodeCount).fill(null);
    this.su = new Array<boolean>(nodeCount).fill(false);
    this.od = new Array<boolean>(nodeCount).fill(true);
    this.vdir = vdir;
    this.hdir = hdir;
  }

  /** Explicitly release any allocated resources. */
  cleanup(): void {
    this.root = [];
    this.blockSize = [];
    this.align = [];
    this.innerShift = [];
    this.sink = [];
    this.shift = [];
    this.y = [];
  }

  /**
   * Calculate the layout size for comparison.
   *
   * @return The size of the layout
   */
  layoutSize(): number {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    // Prior to KIPRA-1426 the size of the layout was determined only based on y coordinates, neglecting any block
    // sizes. We now determine the maximal extend of the layout based on the minimum y coordinate of any node and the
    // maximum y coordinate _plus_ the size of any block.
    for (const layer of this.layeredGraph.getLayers()) {
      for (const n of layer.getNodes()) {
        const yMin = this.y[n.id]!;
        const yMax = yMin + this.blockSize[this.root[n.id]!.id]!;
        min = Math.min(min, yMin);
        max = Math.max(max, yMax);
      }
    }
    return max - min;
  }

  /**
   * @param src source port of the tested edge
   * @param tgt target port of the tested edge
   * @return A delta larger than 0 if the `tgt` port has a larger y coordinate than `src` and a delta smaller than zero
   *         if `src` has the larger y coordinate. This means that for `delta > 0` the target node has to be shifted
   *         upwards to straighten the edge.
   */
  calculateDelta(src: LPort, tgt: LPort): number {
    const srcPos =
      this.y[src.getNode()!.id]! + this.innerShift[src.getNode()!.id]! + src.getPosition().y + src.getAnchor().y;
    const tgtPos =
      this.y[tgt.getNode()!.id]! + this.innerShift[tgt.getNode()!.id]! + tgt.getPosition().y + tgt.getAnchor().y;
    return tgtPos - srcPos;
  }

  /**
   * Shifts the y-coordinates of all nodes of the block represented by `root` by the specified `delta`.
   *
   * @param rootNode root node of the block.
   * @param delta the delta by which the node should be move. Can be either positive or negative.
   */
  shiftBlock(rootNode: LNode, delta: number): void {
    let current: LNode = rootNode;
    do {
      const newPos = this.y[current.id]! + delta;
      this.y[current.id] = newPos;
      current = this.align[current.id]!;
    } while (current !== rootNode);
  }

  /**
   * Checks whether a block with root node `blockRoot` can be shifted upwards by `delta` without overlapping any of the
   * block's nodes upper neighbors.
   *
   * @param blockRoot root node of a block
   * @param delta a positive value
   * @return A value smaller or equal to `delta` indicating the maximal distance the block can be moved upward.
   */
  checkSpaceAbove(blockRoot: LNode, delta: number, ni: NeighborhoodInformation): number {
    let availableSpace = delta;
    const rootNode = blockRoot;
    // iterate through the block
    let current: LNode = rootNode;
    do {
      current = this.align[current.id]!;
      // get minimum possible position of the current node
      const minYCurrent = this.getMinY(current);

      const neighbor = this.getUpperNeighbor(current, ni);
      if (neighbor !== null) {
        const maxYNeighbor = this.getMaxY(neighbor);
        // minimal position at which the current block node could validly be placed
        availableSpace = Math.min(
          availableSpace,
          minYCurrent - (maxYNeighbor + this.spacings.getVerticalSpacing(current, neighbor)),
        );
      }
      // until we wrap around
    } while (rootNode !== current);

    return availableSpace;
  }

  /**
   * Checks whether a block with root node `blockRoot` can be shifted downwards by `delta` without overlapping any of
   * the block's nodes lower neighbors.
   *
   * @param blockRoot root node of a block
   * @param delta a positive value
   * @return A value smaller or equal to `delta` indicating the maximal distance the block can be moved upward.
   */
  checkSpaceBelow(blockRoot: LNode, delta: number, ni: NeighborhoodInformation): number {
    let availableSpace = delta;
    const rootNode = blockRoot;
    // iterate through the block
    let current: LNode = rootNode;
    do {
      current = this.align[current.id]!;
      // get maximum possible position of the current node
      const maxYCurrent = this.getMaxY(current);

      // get the lower neighbor and check its position allows shifting
      const neighbor = this.getLowerNeighbor(current, ni);
      if (neighbor !== null) {
        const minYNeighbor = this.getMinY(neighbor);

        // minimal position at which the current block node could validly be placed
        availableSpace = Math.min(
          availableSpace,
          minYNeighbor - (maxYCurrent + this.spacings.getVerticalSpacing(current, neighbor)),
        );
      }
      // until we wrap around
    } while (rootNode !== current);

    return availableSpace;
  }

  /**
   * Returns the minimum position of node `n` and its margins, that is, `node.y + node.innerShift - node.margin.top`.
   * Note that no spacing is accounted for.
   *
   * @param n a node
   * @return the minimum position.
   */
  getMinY(n: LNode): number {
    // node size + margins + inside shift etc
    const rootNode = this.root[n.id]!;
    return this.y[rootNode.id]! + this.innerShift[n.id]! - n.getMargin().top;
  }

  /**
   * Returns the maximum position of node `n` and its margins, that is,
   * `node.y + node.innerShift + node.size + node.margin.bottom`. Note that no spacing is accounted for.
   *
   * @param n a node
   * @return the minimum position.
   */
  getMaxY(n: LNode): number {
    // node size + margins + inside shift etc
    const rootNode = this.root[n.id]!;
    return this.y[rootNode.id]! + this.innerShift[n.id]! + n.getSize().y + n.getMargin().bottom;
  }

  /**
   * @param n the node for which the neighbor is requested.
   * @param ni the `NeighborhoodInformation` of `n`.
   * @return the node with a **larger** y than `n` within `n`'s layer if it exists, otherwise `null`.
   */
  private getLowerNeighbor(n: LNode, ni: NeighborhoodInformation): LNode | null {
    const l = n.getLayer()!;
    const layerIndex = ni.nodeIndex![n.id]!;
    if (layerIndex < l.getNodes().length - 1) {
      return l.getNodes()[layerIndex + 1]!;
    }
    return null;
  }

  /**
   * @param n the node for which the neighbor is requested.
   * @param ni the `NeighborhoodInformation` of `n`.
   * @return the node with a **smaller** y than `n` within `n`'s layer if it exists, otherwise `null`.
   */
  private getUpperNeighbor(n: LNode, ni: NeighborhoodInformation): LNode | null {
    const l = n.getLayer()!;
    const layerIndex = ni.nodeIndex![n.id]!;
    if (layerIndex > 0) {
      return l.getNodes()[layerIndex - 1]!;
    }
    return null;
  }

  toString(): string {
    let result = '';
    if (this.hdir === HDirection.RIGHT) {
      result += 'RIGHT';
    } else if (this.hdir === HDirection.LEFT) {
      result += 'LEFT';
    }
    if (this.vdir === VDirection.DOWN) {
      result += 'DOWN';
    } else if (this.vdir === VDirection.UP) {
      result += 'UP';
    } else {
      result += 'BALANCED';
    }
    return result;
  }
}
