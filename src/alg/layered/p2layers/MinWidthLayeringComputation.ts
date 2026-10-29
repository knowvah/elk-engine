// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import type { LNode } from '../graph/LNode.js';

/**
 * The per-graph sizes `MinWidthLayerer.process` computes and `computeMinWidthLayering` reads (the Java instance
 * fields `dummySize`, `normSize`, `avgSize`, `inDegree` and `outDegree`).
 */
export interface MinWidthSizes {
  readonly dummySize: number;
  readonly normSize: readonly number[];
  readonly avgSize: number;
  readonly inDegree: readonly number[];
  readonly outDegree: readonly number[];
}

/**
 * Section of `MinWidthLayerer` (P1 facade/section split): `computeMinWidthLayering` (Java `:299-430`) and
 * `selectNode` (`:432-454`), whose locals are the fields of this class so that the Java method can be split below
 * the complexity limits. `unplacedNodes` is a `LinkedHashSet` in Java and iterated by `selectNode` in insertion order;
 * the two `HashSet`s (`:345`, `:346`) are only read by `containsAll`, `addAll` and `clear` and are `Set`s here (AD-10).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/MinWidthLayerer.java
 */
export class MinWidthLayeringComputation {
  private layers: LNode[][] = [];
  private readonly unplacedNodes: Set<LNode>;

  // One of the deviations from the paper is, that our upper bound is taking node sizes into account:
  private readonly ubwConsiderSize: number;

  // in- and out-degree of the currently considered node, see while-loop below
  private outDeg = 0;

  // In the Paper the first Set contains all nodes, which have already been placed (in this version we consider only
  // the nodes already placed in the current layer), and the second contains all nodes already placed in layers which
  // have been determined before the currentLayer.
  private readonly alreadyPlacedInCurrentLayer = new Set<LNode>();
  private readonly alreadyPlacedInOtherLayers = new Set<LNode>();

  // Set up the first layer (algorithm is bottom up, so the List layer is going to be reversed at the end.
  private currentLayer: LNode[] = [];

  // Initial values for the width of the current layer and the estimated width of the coming layers
  private widthCurrent = 0;
  private widthUp = 0;

  // Parameters needed for computing the width of a layering including dummy nodes:
  private maxWidth = 0;
  private realWidth = 0;
  // Number of "started" edges that did not "finish" yet (now multiplied with the normalized dummy size to consider
  // actual node sizes)
  private currentSpanningEdges = 0;
  private goingOutFromThisLayer = 0;
  // No need for a variable "comingIntoThisLayer" as "widthUp" already gets the job done.

  private constructor(
    private readonly sizes: MinWidthSizes,
    private readonly upperBoundOnWidth: number,
    private readonly compensator: number,
    nodes: Iterable<LNode>,
    private readonly nodeSuccessors: readonly ReadonlySet<LNode>[],
  ) {
    this.unplacedNodes = new Set(nodes);
    this.ubwConsiderSize = upperBoundOnWidth * sizes.avgSize;
  }

  /**
   * Computes a layering (as a List of Lists) for a given Iterable of {@link LNode} according to the MinWidth-heuristic
   * and considering actual node sizes.
   *
   * @param sizes the sizes and degrees `MinWidthLayerer.process` computed
   * @param upperBoundOnWidth Defines a loose upper bound on the width of the MinWidth layerer. Uses integer values as
   *            in the original approach described in the paper, as this bound will automatically be multiplied
   *            internally with the average normalized node size as part of the new approach considering the actual
   *            sizes of nodes.
   * @param compensator Multiplied with `upperBoundOnWidth` for defining an upper bound on the width of layers which
   *            haven't been determined yet, but whose maximum width had been (roughly) estimated by the MinWidth
   *            algorithm. Compensates for too high estimations.
   * @param nodes Iterable of all nodes of the Graph. The `id` of the nodes have to be set to the index where the
   *            respective Set of successor-nodes are stored in the List `nodeSuccessors`.
   * @param nodeSuccessors precomputed List of Set of successor-nodes of the elements in the Iterable `nodes`.
   * @return a pair of a double representing the maximum width of the resulting layering (normalized by the smallest
   *         real node) and the layering itself as a list of list of nodes
   */
  static computeMinWidthLayering(
    sizes: MinWidthSizes,
    upperBoundOnWidth: number,
    compensator: number,
    nodes: Iterable<LNode>,
    nodeSuccessors: readonly ReadonlySet<LNode>[],
  ): Pair<number, LNode[][]> {
    return new MinWidthLayeringComputation(sizes, upperBoundOnWidth, compensator, nodes, nodeSuccessors).run();
  }

  private run(): Pair<number, LNode[][]> {
    // The actual algorithm from the paper begins here:
    while (this.unplacedNodes.size > 0) {
      // Find a node, whose edges only point to nodes in the Set alreadyPlacedInOtherLayers;
      // will return {@code null} if such a node doesn't exist.
      const currentNode = this.selectNode();

      // If a node is found in the previous step:
      if (currentNode !== null) {
        this.place(currentNode);
      }

      if (this.goesToNextLayer(currentNode)) {
        this.finishLayer();
      }
    }

    return Pair.of(this.maxWidth, this.layers);
  }

  /** The Java `if (currentNode != null)` block of the while-loop. */
  private place(currentNode: LNode): void {
    this.unplacedNodes.delete(currentNode);
    this.currentLayer.push(currentNode);
    this.alreadyPlacedInCurrentLayer.add(currentNode);

    const { normSize, outDegree, inDegree, dummySize } = this.sizes;
    this.outDeg = outDegree[currentNode.id]!;
    // Take node sizes in account: use the normalized size of current node and the
    // normalized dummy size for each edge
    this.widthCurrent += normSize[currentNode.id]! - this.outDeg * dummySize;

    const inDeg = inDegree[currentNode.id]!;
    // Take node sizes in account: use the normalized normalized dummy size for each
    // edge
    this.widthUp += inDeg * dummySize;

    this.goingOutFromThisLayer += this.outDeg * dummySize;

    this.realWidth += normSize[currentNode.id]!;
  }

  /**
   * Go to the next layer if,
   * 1) no current node has been selected,
   * 2) there are no unplaced nodes left (last iteration of the while-loop),
   * 3) The conditionGoUp from the paper (with the difference of ubw being multiplied with the average normalized node
   * size) is satisfied, i.e.
   * 3.1) the width of the current layer is greater than the upper bound on the width and the number of dummy nodes in
   * the layer can't be reduced, as only nodes with no outgoing edges are left for being considered for the current
   * layer; or:
   * 3.2) The estimated width of the not yet determined layers is greater than the scaling factor/compensator times the
   * upper bound on the width.
   */
  private goesToNextLayer(currentNode: LNode | null): boolean {
    return (
      currentNode === null ||
      this.unplacedNodes.size === 0 ||
      (this.widthCurrent >= this.ubwConsiderSize &&
        this.sizes.normSize[currentNode.id]! > this.outDeg * this.sizes.dummySize) ||
      this.widthUp >= this.compensator * this.ubwConsiderSize
    );
  }

  /** The Java body of the `if` that goes to the next layer. */
  private finishLayer(): void {
    this.layers.push(this.currentLayer);
    this.currentLayer = [];
    for (const placed of this.alreadyPlacedInCurrentLayer) {
      this.alreadyPlacedInOtherLayers.add(placed);
    }
    this.alreadyPlacedInCurrentLayer.clear();

    // Remove all edges from the dummy node count, which are starting at a node placed
    // in this layer …
    this.currentSpanningEdges -= this.goingOutFromThisLayer;
    // … Now we have the actual dummy node count (or rather the sum of their widths) for
    // this layer and can add it to the real nodes for comparing the width.
    this.maxWidth = Math.max(this.maxWidth, this.currentSpanningEdges * this.sizes.dummySize + this.realWidth);
    // In the next iteration we have to consider new dummy nodes from edges coming into
    // the layer we've just finished.
    this.currentSpanningEdges += this.widthUp;

    this.widthCurrent = this.widthUp;
    this.widthUp = 0;
    this.goingOutFromThisLayer = 0;
    this.realWidth = 0;
  }

  /**
   * Returns the first {@link LNode} in the given Set, whose outgoing edges end only in nodes of the Set `targets`.
   * Self-loops are ignored.
   *
   * Warning: Returns `null`, if such a node doesn't exist. Here the Set is `unplacedNodes` and the targets are
   * `alreadyPlacedInOtherLayers`.
   *
   * @return chosen {@link LNode} from `unplacedNodes`, whose outgoing edges all end in a node contained in the
   *         targets. Returns `null`, if such a node doesn't exist.
   */
  private selectNode(): LNode | null {
    for (const node of this.unplacedNodes) {
      // `targets.containsAll(successors.get(node.id))`
      if ([...this.nodeSuccessors[node.id]!].every((succ) => this.alreadyPlacedInOtherLayers.has(succ))) {
        return node;
      }
    }
    return null;
  }
}
