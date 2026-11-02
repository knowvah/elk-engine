// SPDX-License-Identifier: EPL-2.0
import * as Lists from '../../../../guava/Lists.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import type { Layer } from '../../graph/Layer.js';
import { EdgeStraighteningStrategy } from '../../options/EdgeStraighteningStrategy.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { Spacings } from '../../options/Spacings.js';
import type { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { BKCompactorClassNode as ClassNode } from './BKCompactorClassNode.js';
import type { ICompactor } from './ICompactor.js';
import type { NeighborhoodInformation } from './NeighborhoodInformation.js';
import type { ThresholdStrategy } from './ThresholdStrategy.js';
import { ThresholdStrategyNullThresholdStrategy as NullThresholdStrategy } from './ThresholdStrategyNullThresholdStrategy.js';
import { ThresholdStrategySimpleThresholdStrategy as SimpleThresholdStrategy } from './ThresholdStrategySimpleThresholdStrategy.js';

/**
 * The state `placeBlock` keeps per activation: the Java locals of one call (N6). `neighbor` and `neighborRoot` are
 * only meaningful while `descended` is set or between `findNeighbor` and the use of both.
 */
interface PlaceBlockFrame {
  readonly root: LNode;
  currentNode: LNode;
  thresh: number;
  isInitialAssignment: boolean;
  neighbor: LNode | null;
  neighborRoot: LNode | null;
  /** The recursive `placeBlock(neighborRoot, bal)` call of the Java was issued; resume after it. */
  descended: boolean;
}

/**
 * For documentation see `BKNodePlacer`.
 *
 * As opposed to the default `BKCompactor` this version trades maximal compactness with straight edges. In other
 * words, where possible it favors additional straight edges over compactness.
 *
 * `placeBlock` is an explicit-stack loop (N6): the Java recurses into the root of the neighbouring block, which is as
 * deep as the longest chain of blocks that wait for each other; `BKCompactor.test.ts` proves it equal to a verbatim
 * recursive twin. `sinkNodes` is an insertion-ordered `Map` where Java has a `HashMap` (N7, AD-10): it is iterated in
 * `placeClasses`, and under the oracle's `-XX:hashCode=2` an identity-hashed map iterates in insertion order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKCompactor.java
 */
export class BKCompactor implements ICompactor {
  /** The graph to process. */
  private layeredGraph: LGraph;
  /** Specific `ThresholdStrategy` to be used for execution. */
  private threshStrategy: ThresholdStrategy;
  /** Information about a node's neighbors and index within its layer. */
  private ni: NeighborhoodInformation;
  /** Spacings. */
  private spacings: Spacings;
  /** Representation of the class graph. */
  private sinkNodes: Map<LNode, ClassNode> = new Map<LNode, ClassNode>();

  /**
   * @param layeredGraph the graph to handle.
   * @param ni precalculated information about a node's neighbors.
   */
  constructor(layeredGraph: LGraph, ni: NeighborhoodInformation) {
    this.layeredGraph = layeredGraph;
    this.ni = ni;
    this.spacings = layeredGraph.getProperty(InternalProperties.SPACINGS);

    // configure the requested threshold strategy
    if (
      layeredGraph.getProperty(LayeredOptions.NODE_PLACEMENT_BK_EDGE_STRAIGHTENING) ===
      EdgeStraighteningStrategy.IMPROVE_STRAIGHTNESS
    ) {
      this.threshStrategy = new SimpleThresholdStrategy();
    } else {
      // mimics the original compaction strategy without additional straightening
      this.threshStrategy = new NullThresholdStrategy();
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Block Placement

  /**
   * In this step, actual coordinates are calculated for blocks and its nodes.
   *
   * First, all blocks are placed, trying to avoid any crossing of the blocks. Then, the blocks are shifted towards each
   * other if there is any space for compaction.
   *
   * @param bal One of the four layouts which shall be used in this step
   */
  horizontalCompaction(bal: BKAlignedLayout): void {
    // Initialize fields with basic values, partially depending on the direction
    for (const layer of this.layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        bal.sink[node.id] = node;
        bal.shift[node.id] = bal.vdir === VDirection.UP ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
      }
    }
    // clear any previous sinks
    this.sinkNodes.clear();

    // If the horizontal direction is LEFT, the layers are traversed from right to left, thus a reverse iterator is
    // needed (note that this does not change the original list of layers)
    let layers: Iterable<Layer> = this.layeredGraph.getLayers();
    if (bal.hdir === HDirection.LEFT) {
      layers = Lists.reverse(this.layeredGraph.getLayers());
    }

    // init threshold strategy
    this.threshStrategy.init(bal, this.ni);
    // mark all blocks as unplaced
    bal.y.fill(null);

    this.placeInitialBlocks(bal, layers);

    // Try to compact classes by shifting them towards each other if there is space between them.
    // Other than the original algorithm we use a "class graph" here in conjunction with a longest
    // path layering based on previously calculated separations between any pair of adjacent classes.
    // This allows to have different node sizes and disconnected graphs.
    this.placeClasses(bal);

    // apply final coordinates
    this.applyFinalCoordinates(bal, layers);

    // all blocks were placed, shift latecomers
    this.threshStrategy.postProcess();
  }

  /** The loop over the layers that places every block (`BKCompactor.java:112`), split for the complexity limits. */
  private placeInitialBlocks(bal: BKAlignedLayout, layers: Iterable<Layer>): void {
    for (const layer of layers) {
      // As with layers, we need a reversed iterator for blocks for different directions
      let nodes: Iterable<LNode> = layer.getNodes();
      if (bal.vdir === VDirection.UP) {
        nodes = Lists.reverse(layer.getNodes());
      }

      // Do an initial placement for all blocks
      for (const v of nodes) {
        if (bal.root[v.id] === v) {
          this.placeBlock(v, bal);
        }
      }
    }
  }

  /** The "apply final coordinates" loop of `horizontalCompaction` (`BKCompactor.java:133`), split for the same reason. */
  private applyFinalCoordinates(bal: BKAlignedLayout, layers: Iterable<Layer>): void {
    for (const layer of layers) {
      for (const v of layer.getNodes()) {
        bal.y[v.id] = bal.y[bal.root[v.id]!.id]!;

        // If this is the root node of the block, check if the whole block can be shifted to
        // further compact the drawing (the block's non-root nodes will be processed later by
        // this loop and will thus use the updated y position calculated here)
        if (v === bal.root[v.id]) {
          const sinkShift = bal.shift[bal.sink[v.id]!.id]!;

          if (
            (bal.vdir === VDirection.UP && sinkShift > Number.NEGATIVE_INFINITY) ||
            (bal.vdir === VDirection.DOWN && sinkShift < Number.POSITIVE_INFINITY)
          ) {
            bal.y[v.id] = bal.y[v.id]! + sinkShift;
          }
        }
      }
    }
  }

  /**
   * Blocks are placed based on their root node. This is done by going through all layers the block occupies and
   * moving the whole block upwards / downwards if there are blocks that it overlaps with.
   *
   * The Java method calls itself for the root of the neighbouring block (`BKCompactor.java:208`, inside the loop over
   * the block's nodes). Here that call pushes a frame and the loop resumes the suspended frame afterwards, in the same
   * order, so the Java activation order and the order of `threshStrategy` calls are unchanged (N6). The splits
   * `enterBlock`, `findNeighbor`, `placeAgainstNeighbor`, `placeInSameClass` and `placeAcrossClasses` are made for the
   * complexity limits and follow the Java statement order.
   *
   * @param root The root node of the block (usually called `v`)
   * @param bal One of the four layouts which shall be used in this step
   */
  private placeBlock(root: LNode, bal: BKAlignedLayout): void {
    const stack: PlaceBlockFrame[] = [];
    const first = this.enterBlock(root, bal);
    if (first !== null) {
      stack.push(first);
    }

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;

      if (!frame.descended) {
        if (!this.findNeighbor(frame, bal)) {
          frame.thresh = this.threshStrategy.calculateThreshold(frame.thresh, frame.root, frame.currentNode);
          this.advance(frame, bal, stack);
          continue;
        }
        // Ensure the neighbor was already placed
        const next = this.enterBlock(frame.neighborRoot!, bal);
        if (next !== null) {
          frame.descended = true;
          stack.push(next);
          continue;
        }
      }

      this.placeAgainstNeighbor(frame, bal);
      frame.descended = false;
      this.advance(frame, bal, stack);
    }
  }

  /**
   * The start of `placeBlock`: nothing to do if the block was already placed, otherwise a new frame for it.
   */
  private enterBlock(root: LNode, bal: BKAlignedLayout): PlaceBlockFrame | null {
    // Skip if the block was already placed
    if (bal.y[root.id] !== null) {
      return null;
    }

    // Initial placement
    // As opposed to the original algorithm we cannot rely on the fact that
    //  0.0 as initial block position is always feasible. This is due to
    //  the inside shift allowing for negative block positions in conjunction with
    //  a RIGHT (bottom-to-top) traversal direction. Computing the minimum with
    //  an initial position of 0.0 thus leads to wrong results.
    // The wrong behavior is documented in KIPRA-1426
    bal.y[root.id] = 0.0;

    // Iterate through block and determine, where the block can be placed (until we arrive at the
    // block's root node again)
    return {
      root,
      currentNode: root,
      thresh: bal.vdir === VDirection.DOWN ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      isInitialAssignment: true,
      neighbor: null,
      neighborRoot: null,
      descended: false,
    };
  }

  /**
   * The condition of the loop body: if the node is the top or bottom node of its layer, it can be placed safely since
   * it is the first to be placed in its layer. If it's not, we'll have to check its neighbours; this finds the node
   * which is above / below the current node as well as the root of its block.
   *
   * @return whether the current node has such a neighbour (stored in the frame)
   */
  private findNeighbor(frame: PlaceBlockFrame, bal: BKAlignedLayout): boolean {
    const currentNode = frame.currentNode;
    const currentIndexInLayer = this.ni.nodeIndex![currentNode.id]!;
    const currentLayerSize = currentNode.getLayer()!.getNodes().length;

    if (
      (bal.vdir === VDirection.DOWN && currentIndexInLayer > 0) ||
      (bal.vdir === VDirection.UP && currentIndexInLayer < currentLayerSize - 1)
    ) {
      let neighbor: LNode;
      if (bal.vdir === VDirection.UP) {
        neighbor = currentNode.getLayer()!.getNodes()[currentIndexInLayer + 1]!;
      } else {
        neighbor = currentNode.getLayer()!.getNodes()[currentIndexInLayer - 1]!;
      }
      frame.neighbor = neighbor;
      frame.neighborRoot = bal.root[neighbor.id]!;
      return true;
    }
    return false;
  }

  /** The loop body after the recursive call: threshold, class membership and the block's position. */
  private placeAgainstNeighbor(frame: PlaceBlockFrame, bal: BKAlignedLayout): void {
    const root = frame.root;
    const neighborRoot = frame.neighborRoot!;

    // calculate threshold value for additional straight edges
    // this call has to be _after_ place block, otherwise the
    // order of the elements in the postprocessing queue is wrong
    frame.thresh = this.threshStrategy.calculateThreshold(frame.thresh, root, frame.currentNode);

    // Note that the two nodes and their blocks form a unit called class in the original
    // algorithm. These are combinations of blocks which play a role in the final compaction
    if (bal.sink[root.id] === root) {
      bal.sink[root.id] = bal.sink[neighborRoot.id]!;
    }

    // Check if the blocks of the two nodes are members of the same class
    if (bal.sink[root.id] === bal.sink[neighborRoot.id]) {
      // They are part of the same class
      this.placeInSameClass(frame, bal);
    } else {
      // CLASSES
      this.placeAcrossClasses(frame, bal);
    }
  }

  /** The "same class" branch of `placeBlock`: determines the block's final position. */
  private placeInSameClass(frame: PlaceBlockFrame, bal: BKAlignedLayout): void {
    // The minimal spacing between the two nodes depends on their node type
    const spacing = this.spacings.getVerticalSpacing(frame.currentNode, frame.neighbor!);

    // Determine the block's final position
    if (bal.vdir === VDirection.UP) {
      BKCompactor.placeUp(frame, bal, spacing);
    } else {
      // DOWN
      BKCompactor.placeDown(frame, bal, spacing);
    }
  }

  /** The `UP` half of `placeInSameClass` (`BKCompactor.java:229`), split for the complexity limits. */
  private static placeUp(frame: PlaceBlockFrame, bal: BKAlignedLayout, spacing: number): void {
    const root = frame.root;
    const currentNode = frame.currentNode;
    const neighbor = frame.neighbor!;
    const neighborRoot = frame.neighborRoot!;

    const currentBlockPosition = bal.y[root.id]!;
    const newPosition =
      bal.y[neighborRoot.id]! +
      bal.innerShift[neighbor.id]! -
      neighbor.getMargin().top -
      spacing -
      currentNode.getMargin().bottom -
      currentNode.getSize().y -
      bal.innerShift[currentNode.id]!;

    if (frame.isInitialAssignment) {
      frame.isInitialAssignment = false;
      bal.y[root.id] = Math.min(newPosition, frame.thresh);
    } else {
      bal.y[root.id] = Math.min(currentBlockPosition, Math.min(newPosition, frame.thresh));
    }
  }

  /** The `DOWN` half of `placeInSameClass` (`BKCompactor.java:248`), split for the complexity limits. */
  private static placeDown(frame: PlaceBlockFrame, bal: BKAlignedLayout, spacing: number): void {
    const root = frame.root;
    const currentNode = frame.currentNode;
    const neighbor = frame.neighbor!;
    const neighborRoot = frame.neighborRoot!;

    const currentBlockPosition = bal.y[root.id]!;
    const newPosition =
      bal.y[neighborRoot.id]! +
      bal.innerShift[neighbor.id]! +
      neighbor.getSize().y +
      neighbor.getMargin().bottom +
      spacing +
      currentNode.getMargin().top -
      bal.innerShift[currentNode.id]!;

    if (frame.isInitialAssignment) {
      frame.isInitialAssignment = false;
      bal.y[root.id] = Math.max(newPosition, frame.thresh);
    } else {
      bal.y[root.id] = Math.max(currentBlockPosition, Math.max(newPosition, frame.thresh));
    }
  }

  /**
   * The "CLASSES" branch of `placeBlock`: the two blocks are not members of the same class. Compute how the two
   * classes can be compacted later. Hence we determine a minimal required space between the two classes relative two
   * the two class sinks.
   */
  private placeAcrossClasses(frame: PlaceBlockFrame, bal: BKAlignedLayout): void {
    const root = frame.root;
    const currentNode = frame.currentNode;
    const neighbor = frame.neighbor!;
    const neighborRoot = frame.neighborRoot!;

    const spacing = this.layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE);

    const sinkNode = this.getOrCreateClassNode(bal.sink[root.id]!, bal);
    const neighborSink = this.getOrCreateClassNode(bal.sink[neighborRoot.id]!, bal);

    if (bal.vdir === VDirection.UP) {
      //  possible setup:
      //  root         --> currentNode
      //  neighborRoot --> neighbor
      const requiredSpace =
        bal.y[root.id]! +
        bal.innerShift[currentNode.id]! +
        currentNode.getSize().y +
        currentNode.getMargin().bottom +
        spacing -
        (bal.y[neighborRoot.id]! + bal.innerShift[neighbor.id]! - neighbor.getMargin().top);

      // add an edge to the class graph
      sinkNode.addEdge(neighborSink, requiredSpace);

      // original algorithms procedure here:
      // bal.shift[bal.sink[neighborRoot.id].id] =
      // Math.max(bal.shift[bal.sink[neighborRoot.id].id], requiredSpace);
    } else {
      // DOWN
      //  possible setup:
      //  neighborRoot --> neighbor
      //  root         --> currentNode
      const requiredSpace =
        bal.y[root.id]! +
        bal.innerShift[currentNode.id]! -
        currentNode.getMargin().top -
        bal.y[neighborRoot.id]! -
        bal.innerShift[neighbor.id]! -
        neighbor.getSize().y -
        neighbor.getMargin().bottom -
        spacing;

      // add an edge to the class graph
      sinkNode.addEdge(neighborSink, requiredSpace);

      // original algorithms procedure here:
      // bal.shift[bal.sink[neighborRoot.id].id] =
      // Math.min(bal.shift[bal.sink[neighborRoot.id].id], requiredSpace);
    }
  }

  /**
   * The end of one loop iteration: get the next node in the block; when the loop wraps around to the root the block is
   * finished and its frame is dropped.
   */
  private advance(frame: PlaceBlockFrame, bal: BKAlignedLayout, stack: PlaceBlockFrame[]): void {
    frame.currentNode = bal.align[frame.currentNode.id]!;
    if (frame.currentNode === frame.root) {
      this.threshStrategy.finishBlock(frame.root);
      stack.pop();
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Class Placement

  private placeClasses(bal: BKAlignedLayout): void {
    // collect sinks of the class graph
    const sinks: ClassNode[] = Lists.newLinkedList<ClassNode>();
    for (const n of this.sinkNodes.values()) {
      if (n.indegree === 0) {
        sinks.push(n);
      }
    }

    // propagate shifts in a longest path layering fashion
    while (sinks.length > 0) {
      const n = sinks.shift()!;

      // position the root of the class node tree
      if (n.classShift === null) {
        n.classShift = 0;
      }

      for (const e of n.outgoing) {
        // initial position of a target does not depend on previous positions
        // (we need this as we cannot assume the top-most position to be 0)
        if (e.target.classShift === null) {
          e.target.classShift = n.classShift + e.separation;
        } else if (bal.vdir === VDirection.DOWN) {
          e.target.classShift = Math.min(e.target.classShift, n.classShift + e.separation);
        } else {
          e.target.classShift = Math.max(e.target.classShift, n.classShift + e.separation);
        }

        e.target.indegree--;

        if (e.target.indegree === 0) {
          sinks.push(e.target);
        }
      }
    }

    // remember final shifts for all classes such that they
    // can be applied as absolute coordinates
    for (const n of this.sinkNodes.values()) {
      bal.shift[n.node.id] = n.classShift;
    }
  }

  private getOrCreateClassNode(sinkNode: LNode, _bal: BKAlignedLayout): ClassNode {
    let node = this.sinkNodes.get(sinkNode);
    if (node === undefined) {
      node = new ClassNode();
      node.node = sinkNode;
      this.sinkNodes.set(node.node, node);
    }
    return node;
  }
}
