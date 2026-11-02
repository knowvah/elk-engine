// SPDX-License-Identifier: EPL-2.0
import type { Pair } from '../../../../core/util/Pair.js';
import * as JavaInteger from '../../../../java/lang/JavaInteger.js';
import { d2i } from '../../../../java/lang/JavaMath.js';
import * as Lists from '../../../../guava/Lists.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { Layer } from '../../graph/Layer.js';
import type { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { BKNodePlacer } from './BKNodePlacer.js';
import type { NeighborhoodInformation } from './NeighborhoodInformation.js';

/**
 * For documentation see `BKNodePlacer`. Java imports `BKNodePlacer.getBlocks` and `BKNodePlacer.getEdge` statically;
 * they are called through the class here, inside method bodies only, so the import cycle with `BKNodePlacer` is
 * harmless.
 *
 * @author jjc
 * @author uru
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKAligner.java
 */
export class BKAligner {
  /** The graph to process. */
  private layeredGraph: LGraph;
  /** Information about a node's neighbors and index within its layer. */
  private ni: NeighborhoodInformation;

  /**
   * @param layeredGraph the graph to handle.
   * @param ni the precalculated neighbor information
   */
  constructor(layeredGraph: LGraph, ni: NeighborhoodInformation) {
    this.layeredGraph = layeredGraph;
    this.ni = ni;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Block Building and Inner Shifting

  /**
   * The graph is traversed in the given directions and nodes a grouped into blocks. The nodes in these blocks will
   * later be placed such that the edges connecting them will be straight lines.
   *
   * Type 1 conflicts are resolved, so that the dummy nodes of a long edge share the same block if possible, such that
   * the long edge is drawn straightly.
   *
   * @param bal One of the four layouts which shall be used in this step
   * @param markedEdges List with all edges that were marked as type 1 conflicts
   */
  verticalAlignment(bal: BKAlignedLayout, markedEdges: ReadonlySet<LEdge>): void {
    // Initialize root and align maps
    for (const layer of this.layeredGraph.getLayers()) {
      for (const v of layer.getNodes()) {
        bal.root[v.id] = v;
        bal.align[v.id] = v;
        bal.innerShift[v.id] = 0.0;
      }
    }

    let layers: Iterable<Layer> = this.layeredGraph.getLayers();

    // If the horizontal direction is LEFT, the layers are traversed from
    // right to left, thus a reverse iterator is needed
    if (bal.hdir === HDirection.LEFT) {
      layers = Lists.reverse(this.layeredGraph.getLayers());
    }

    for (const layer of layers) {
      this.alignLayer(bal, markedEdges, layer);
    }
  }

  /** The body of the layer loop of `verticalAlignment` (`BKAligner.java:88`), split from it for the complexity limits. */
  private alignLayer(bal: BKAlignedLayout, markedEdges: ReadonlySet<LEdge>, layer: Layer): void {
    // r denotes the position in layer order where the last block was found
    // It is initialized with -1, since nothing is found and the ordering starts with 0
    let r = -1;
    let nodes: Iterable<LNode> = layer.getNodes();

    if (bal.vdir === VDirection.UP) {
      // If the alignment direction is UP, the nodes in a layer are traversed
      // reversely, thus we start at INT_MAX and with the reversed list of nodes.
      r = JavaInteger.MAX_VALUE;
      nodes = Lists.reverse(layer.getNodes());
    }

    // Variable names here are again taken from the paper mentioned above.
    // i denotes the index of the layer and k the position of the node within the layer.
    // m denotes the position of a neighbor in the neighbor list of a node.
    for (const v_i_k of nodes) {
      let neighbors: Array<Pair<LNode, LEdge>>;
      if (bal.hdir === HDirection.LEFT) {
        neighbors = this.ni.rightNeighbors[v_i_k.id]!;
      } else {
        neighbors = this.ni.leftNeighbors[v_i_k.id]!;
      }

      if (neighbors.length > 0) {
        if (bal.vdir === VDirection.UP) {
          r = this.alignUp(bal, markedEdges, v_i_k, neighbors, r);
        } else {
          r = this.alignDown(bal, markedEdges, v_i_k, neighbors, r);
        }
      }
    }
  }

  /**
   * When a node has many upper neighbors, consider only the (two) nodes in the middle: `low` and `high`
   * (`BKAligner.java:114-118`, computed before the direction test there and here at the top of each branch).
   */
  private static middleNeighbors(d: number): { low: number; high: number } {
    return { low: d2i(Math.floor((d + 1.0) / 2.0)) - 1, high: d2i(Math.ceil((d + 1.0) / 2.0)) - 1 };
  }

  /**
   * The `VDirection.UP` branch of `verticalAlignment` (`BKAligner.java:121`): check, whether `v_i_k` can be added to a
   * block of its upper/lower neighbor(s). Split from it for the complexity limits.
   *
   * @return the new value of `r`
   */
  private alignUp(
    bal: BKAlignedLayout,
    markedEdges: ReadonlySet<LEdge>,
    v_i_k: LNode,
    neighbors: Array<Pair<LNode, LEdge>>,
    rIn: number,
  ): number {
    const { low, high } = BKAligner.middleNeighbors(neighbors.length);
    let r = rIn;
    for (let m = high; m >= low; m--) {
      if (bal.align[v_i_k.id] === v_i_k) {
        const u_m_pair = neighbors[m]!;
        const u_m = u_m_pair.getFirst()!;

        // Again, getEdge won't return null because the neighbor relationship
        // ensures that at least one edge exists
        if (!markedEdges.has(u_m_pair.getSecond()!) && r > this.ni.nodeIndex![u_m.id]!) {
          bal.align[u_m.id] = v_i_k;
          bal.root[v_i_k.id] = bal.root[u_m.id]!;
          bal.align[v_i_k.id] = bal.root[v_i_k.id]!;
          bal.od[bal.root[v_i_k.id]!.id] = bal.od[bal.root[v_i_k.id]!.id]! && v_i_k.getType() === NodeType.LONG_EDGE;

          r = this.ni.nodeIndex![u_m.id]!;
        }
      }
    }
    return r;
  }

  /**
   * The `VDirection.DOWN` branch of `verticalAlignment` (`BKAligner.java:141`): check, whether vik can be added to a
   * block of its upper/lower neighbor(s). Split from it for the complexity limits.
   *
   * @return the new value of `r`
   */
  private alignDown(
    bal: BKAlignedLayout,
    markedEdges: ReadonlySet<LEdge>,
    v_i_k: LNode,
    neighbors: Array<Pair<LNode, LEdge>>,
    rIn: number,
  ): number {
    const { low, high } = BKAligner.middleNeighbors(neighbors.length);
    let r = rIn;
    for (let m = low; m <= high; m++) {
      if (bal.align[v_i_k.id] === v_i_k) {
        const um_pair = neighbors[m]!;
        const um = um_pair.getFirst()!;

        if (!markedEdges.has(um_pair.getSecond()!) && r < this.ni.nodeIndex![um.id]!) {
          bal.align[um.id] = v_i_k;
          bal.root[v_i_k.id] = bal.root[um.id]!;
          bal.align[v_i_k.id] = bal.root[v_i_k.id]!;
          bal.od[bal.root[v_i_k.id]!.id] = bal.od[bal.root[v_i_k.id]!.id]! && v_i_k.getType() === NodeType.LONG_EDGE;

          r = this.ni.nodeIndex![um.id]!;
        }
      }
    }
    return r;
  }

  /**
   * This phase moves the nodes inside a block, ensuring that all edges inside a block can be drawn as straight lines.
   * It is not included in the original algorithm and adds port and node size handling.
   *
   * @param bal One of the four layouts which shall be used in this step
   */
  insideBlockShift(bal: BKAlignedLayout): void {
    const blocks = BKNodePlacer.getBlocks(bal);
    for (const root of blocks.keys()) {
      // For each block, we place the top left corner of the root node at coordinate (0,0). We
      // then calculate the space required above the top left corner (due to other nodes placed
      // above and to top margins of nodes, including the root node) and the space required below
      // the top left corner. The sum of both becomes the block size, and the y coordinate of each
      // node relative to the block's top border becomes the inner shift of that node.

      // Reserve space for the root node
      let spaceAbove = root!.getMargin().top;
      let spaceBelow = root!.getSize().y + root!.getMargin().bottom;
      bal.innerShift[root!.id] = 0.0;

      // Iterate over all other nodes of the block
      let current: LNode = root!;
      let next: LNode;
      while ((next = bal.align[current.id]!) !== root) {
        // Find the edge between the current and the next node
        const edge = BKNodePlacer.getEdge(current, next)!;

        // The current node already has an inner shift value that we need to use as the basis
        // to calculate the next node's inner shift
        const nextInnerShift = bal.innerShift[current.id]! + BKAligner.portPosDiff(bal, edge);
        bal.innerShift[next.id] = nextInnerShift;

        // Update the space required above and below the root node's top left corner
        spaceAbove = Math.max(spaceAbove, next.getMargin().top - nextInnerShift);
        spaceBelow = Math.max(spaceBelow, nextInnerShift + next.getSize().y + next.getMargin().bottom);

        // The next node is the current node in the next iteration
        current = next;
      }

      // Adjust each node's inner shift by the space required above the root node's top left
      // corner (which the inner shifts are relative to at the moment)
      current = root!;
      do {
        bal.innerShift[current.id] = bal.innerShift[current.id]! + spaceAbove;
        current = bal.align[current.id]!;
      } while (current !== root);

      // Remember the block size
      bal.blockSize[root!.id] = spaceAbove + spaceBelow;
    }
  }

  /**
   * Calculate the y coordinate difference between the two nodes required to straighten the edge (`BKAligner.java:199`,
   * split from `insideBlockShift` for the complexity limits).
   */
  private static portPosDiff(bal: BKAlignedLayout, edge: LEdge): number {
    let portPosDiff = 0.0;
    if (bal.hdir === HDirection.LEFT) {
      portPosDiff =
        edge.getTarget()!.getPosition().y +
        edge.getTarget()!.getAnchor().y -
        edge.getSource()!.getPosition().y -
        edge.getSource()!.getAnchor().y;
    } else {
      portPosDiff =
        edge.getSource()!.getPosition().y +
        edge.getSource()!.getAnchor().y -
        edge.getTarget()!.getPosition().y -
        edge.getTarget()!.getAnchor().y;
    }
    return portPosDiff;
  }
}
