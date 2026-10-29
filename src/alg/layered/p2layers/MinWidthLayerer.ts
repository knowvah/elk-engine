// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Range from '../../../guava/Range.js';
import { MAX_VALUE as INTEGER_MAX_VALUE } from '../../../java/lang/JavaInteger.js';
import { LayeredPhases } from '../LayeredPhases.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { Layer } from '../graph/Layer.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { MinWidthLayeringComputation, type MinWidthSizes } from './MinWidthLayeringComputation.js';

/**
 * Implementation of the heuristic MinWidth for solving the NP-hard minimum-width layering problem with consideration of
 * dummy nodes. MinWidth is based on the longest-path algorithm, which finds layerings with the minimum height, but
 * doesn't consider the width of the graph. MinWidth also considers an upper bound on the width of a given graph. The
 * upper bound isn't a "bound" in a strict sense, as some layers might exceed its limit, if certain conditions are met.
 *
 * Details are described in
 * <ul>
 * <li>Nikola S. Nikolov, Alexandre Tarassov, and Jürgen Branke. 2005. In search for efficient
 * heuristics for minimum-width graph layering with consideration of dummy nodes. J. Exp.
 * Algorithmics 10, Article 2.7 (December 2005). DOI=10.1145/1064546.1180618
 * http://doi.acm.org/10.1145/1064546.1180618.</li>
 * </ul>
 *
 * MinWidth takes two additional parameters, which can be configured as a property:
 * <ul>
 * <li>Upper Bound On Width {@link LayeredOptions#UPPER_BOUND_ON_WIDTH} – Defines a loose upper bound on the width of
 * the MinWidth layerer. Defaults to -1 (special value for using both 1, 2, 3 and 4 as values and choosing the
 * narrowest layering afterwards), lower bound is 1.</li>
 * <li>Upper Layer Estimation Scaling Factor {@link LayeredOptions#UPPER_LAYER_ESTIMATION_SCALING_FACTOR} – Multiplied
 * with {@link LayeredOptions#UPPER_BOUND_ON_WIDTH} for defining an upper bound on the width of layers which haven't
 * been placed yet, but whose maximum width had been (roughly) estimated by the MinWidth algorithm. Compensates for too
 * high estimations. Defaults to -1 (special value for using both 1 and 2 as values and choosing the narrowest layering
 * afterwards), lower bound is 1.</li>
 * </ul>
 *
 * This version of the algorithm, however, differs from the one described in the paper as it considers the actual size
 * of the nodes of the graph in order to handle real world use cases of graphs a little bit better. The approach is
 * based on Marc Adolf's version in his implementation of the heuristic {@link StretchWidthLayerer}. Some changes
 * include:
 * <ul>
 * <li>estimating the sizes of dummy nodes by taking the edge spacing of the {@link LGraph} into account,</li>
 * <li>finding the narrowest real node of the graph and normalizing all the widths of the nodes of the graph (real and
 * dummy) in relation to this node,</li>
 * <li>computing the average size of all real nodes (we don't know the number of dummy nodes in advance),</li>
 * <li>using this average as a factor for the ubw-value given by the user in order to adjust the boundary to our new
 * approach (using the result of this multiplication instead of the given value of ubw thus changes the condition to
 * start a new layer from the paper slightly).</li>
 * </ul>
 *
 * <dl>
 * <dt>Precondition:</dt>
 * <dd>the graph has no cycles, but might contain self-loops</dd>
 * <dt>Postcondition:</dt>
 * <dd>all nodes have been assigned a layer such that edges connect only nodes from layers with
 * increasing indices</dd>
 * </dl>
 *
 * Facade of the P1 split: `computeMinWidthLayering` and `selectNode` live in `MinWidthLayeringComputation`. AD-10: the
 * `HashSet` of `precalcSuccessors` (Java `:284`) is only read by `containsAll`, never iterated observably; it is a
 * `Set`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p2layers/MinWidthLayerer.java
 */
export class MinWidthLayerer implements ILayoutPhase<LayeredPhases, LGraph> {
  /**
   * Recommended values for the algorithm suggested bei Nikolov et al. after a parameter study,
   * see:
   *
   * <ul>
   * <li>Alexandre Tarassov, Nikola S. Nikolov, and Jürgen Branke. 2004. A Heuristic for
   * Minimum-Width Graph Layering with Consideration of Dummy Nodes. Experimental and Efficient
   * Algorithms, Third International Workshop, WEA 2004, Lecture Notes in Computer Science 3059.
   * Springer-Verlag, New York, 570-583. DOI=10.1007/978-3-540-24838-5_42
   * http://dx.doi.org/10.1007/978-3-540-24838-5_42.</li>
   * </ul>
   */
  private static readonly UPPERBOUND_ON_WIDTH_RANGE = Range.closed(1, 4);
  private static readonly COMPENSATOR_RANGE = Range.closed(1, 2);

  // Some variables used for considering real node sizes, see below.
  private dummySize = 0;
  private minimumNodeSize = 0;
  private normSize: number[] = [];
  private avgSize = 0;

  // Degrees of nodes without self loops, indexed by node.id
  private inDegree: number[] = [];
  private outDegree: number[] = [];

  getLayoutProcessorConfiguration(_graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return LayoutProcessorConfiguration.create<LayeredPhases, LGraph>()
      .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER)
      .addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR)
      .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR);
  }

  process(layeredGraph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('MinWidth layering', 1);

    const layers = layeredGraph.getLayers();
    const notInserted = layeredGraph.getLayerlessNodes();

    this.initializeSizes(layeredGraph, notInserted);

    // Precalculate the successors of all nodes (as a Set) and put them in a list.
    const nodeSuccessors = this.precalcSuccessors(notInserted);

    // Guarantee ConditionSelect from the paper, which states that nodes with maximum out-degree
    // should be preferred during layer placement, by ordering the nodes by descending maximum
    // out-degree in advance.
    // `Collections.reverseOrder(new MinOutgoingEdgesComparator())`, a stable sort of the live list
    notInserted.sort((o1, o2) => this.compareMinOutgoingEdges(o2, o1));

    const candidateLayering = this.chooseLayering(layeredGraph, notInserted, nodeSuccessors);

    // Finally, add the winning layering to the Klay layered data structures.
    for (const layerList of candidateLayering) {
      const currentLayer = new Layer(layeredGraph);
      for (const node of layerList) {
        node.setLayer(currentLayer);
      }
      layers.push(currentLayer);
    }

    // The algorithm constructs the layering bottom up, but ElkLayered expects the list of
    // layers to be ordered top down.
    layers.reverse();
    // After the algorithm, there should be no nodes left to be put in a layer, so we're gonna
    // delete them.
    notInserted.length = 0;

    progressMonitor.done();
  }

  /** The first part of `process`: the sizes, normalized sizes and degrees of the not yet inserted nodes. */
  private initializeSizes(layeredGraph: LGraph, notInserted: readonly LNode[]): void {
    // First step to consider the real size of nodes: Initialize the dummy size with the spacing
    // properties
    this.dummySize = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);

    // Compute the minimum nodes size (of the real nodes). We're going to use this value in the
    // next step to normalize the different node sizes.
    this.minimumNodeSize = Number.POSITIVE_INFINITY;
    for (const node of notInserted) {
      if (node.getType() !== NodeType.NORMAL) {
        continue;
      }
      const size = node.getSize().y;
      this.minimumNodeSize = Math.min(this.minimumNodeSize, size);
    }
    // The minimum nodes size might be zero. If This is the case, then simply don't normalize the
    // node sizes.
    this.minimumNodeSize = Math.max(1, this.minimumNodeSize);

    // We initialize the nodes' id and use it to refer to its in- and out-degree stored each in
    // an array. We also compute the size of each node in relation to the smallest real node in
    // the graph (normalized size) and store it in the same way.
    const numOfNodes = notInserted.length;
    this.inDegree = new Array<number>(numOfNodes).fill(0);
    this.outDegree = new Array<number>(numOfNodes).fill(0);
    this.normSize = new Array<number>(numOfNodes).fill(0);
    let i = 0;
    this.avgSize = 0;
    for (const node of notInserted) {
      // Warning: LNode.id is being redefined here!
      node.id = i++;
      this.inDegree[node.id] = this.countEdgesExceptSelfLoops(node.getIncomingEdges());
      this.outDegree[node.id] = this.countEdgesExceptSelfLoops(node.getOutgoingEdges());
      this.normSize[node.id] = node.getSize().y / this.minimumNodeSize;
      // The average size of a node will also be based on the normalized size.
      this.avgSize += this.normSize[node.id]!;
    }
    // normalize dummy size, too:
    this.dummySize /= this.minimumNodeSize;
    // Divide sum of normalized node sizes by the number of nodes to get an actual mean.
    this.avgSize /= numOfNodes;
  }

  /**
   * The middle part of `process`: the layering with the narrowest maximum width (then fewest layers) over the
   * parameter ranges, as a list of lists of nodes.
   */
  private chooseLayering(
    layeredGraph: LGraph,
    notInserted: readonly LNode[],
    nodeSuccessors: readonly ReadonlySet<LNode>[],
  ): LNode[][] {
    // The algorithm requires DAG G = (V, E). In this version self-loops are allowed (as we're
    // going to filter them). Additional properties as described above (called UBW and c in the
    // original paper):
    const upperBoundOnWidth = layeredGraph.getProperty(LayeredOptions.LAYERING_MIN_WIDTH_UPPER_BOUND_ON_WIDTH);
    const compensator = layeredGraph.getProperty(
      LayeredOptions.LAYERING_MIN_WIDTH_UPPER_LAYER_ESTIMATION_SCALING_FACTOR,
    );

    // minimum width of a layer of maximum size in a computed layering (primary criterion used
    // for comparison, if more than one layering is computed). It's a double as it takes in
    // account the actual width based on the normalized size of the nodes.
    let minWidth = Number.POSITIVE_INFINITY;
    // minimum number of layers in a computed layering {@code minWidth} (secondary
    // criterion used for comparison, if more than one layering is computed).
    let minNumOfLayers = INTEGER_MAX_VALUE;
    // holding the currently chosen candidate for the final layering as a List
    let candidateLayering: LNode[][] | null = null;

    const { ubwStart, ubwEnd, cStart, cEnd } = MinWidthLayerer.parameterRanges(upperBoundOnWidth, compensator);

    const sizes = this.currentSizes();

    // … Depending on the start- and end-values, this nested for-loop will last for up to 8
    // iterations resulting in one, two, four or eight different layerings.
    for (let ubw = ubwStart; ubw <= ubwEnd; ubw++) {
      for (let c = cStart; c <= cEnd; c++) {
        const result = MinWidthLayeringComputation.computeMinWidthLayering(sizes, ubw, c, notInserted, nodeSuccessors);
        const newWidth = result.getFirst()!;
        const layering = result.getSecond()!;

        // Important if more than one layering is computed: replace the current candidate
        // layering with a newly computed one, if it is narrower or has the same maximum
        // width but less layers.
        const newNumOfLayers = layering.length;
        if (newWidth < minWidth || (newWidth === minWidth && newNumOfLayers < minNumOfLayers)) {
          minWidth = newWidth;
          minNumOfLayers = newNumOfLayers;
          candidateLayering = layering;
        }
      }
    }
    // the Java iterates the (possibly null) candidate next and throws a NullPointerException then
    return candidateLayering!;
  }

  /** The sizes and degrees the Java instance fields hold, as the section file reads them. */
  private currentSizes(): MinWidthSizes {
    return {
      dummySize: this.dummySize,
      normSize: this.normSize,
      avgSize: this.avgSize,
      inDegree: this.inDegree,
      outDegree: this.outDegree,
    };
  }

  /** The Java section that turns the two properties into the start and end values of the nested loops. */
  private static parameterRanges(
    upperBoundOnWidth: number,
    compensator: number,
  ): { ubwStart: number; ubwEnd: number; cStart: number; cEnd: number } {
    // At first blindly set the parameters for the loose upper bound and the compensator to the
    // exact values, which have been configured via their respective properties, so that only
    // one layering will be computed …
    let ubwStart = upperBoundOnWidth;
    let ubwEnd = upperBoundOnWidth;
    let cStart = compensator;
    let cEnd = compensator;

    // ... then check, whether any special values (i.e. negative values, which aren't valid) have
    // been used for the properties. In that case use the recommended ranges described above …
    if (upperBoundOnWidth < 0) {
      ubwStart = MinWidthLayerer.UPPERBOUND_ON_WIDTH_RANGE.lowerEndpoint();
      ubwEnd = MinWidthLayerer.UPPERBOUND_ON_WIDTH_RANGE.upperEndpoint();
    }
    if (compensator < 0) {
      cStart = MinWidthLayerer.COMPENSATOR_RANGE.lowerEndpoint();
      cEnd = MinWidthLayerer.COMPENSATOR_RANGE.upperEndpoint();
    }
    return { ubwStart, ubwEnd, cStart, cEnd };
  }

  /**
   * Calculates for a given Collection of {@link LNode} all its successors (i.e. a Set of {@link LNode}s) without
   * self-loops.
   *
   * @param nodes a Collection of {@link LNode}
   * @return List of Set of successor {@link LNode}s in order of the given nodes
   */
  private precalcSuccessors(nodes: readonly LNode[]): Set<LNode>[] {
    const successors: Set<LNode>[] = [];

    for (const node of nodes) {
      const outNodes = new Set<LNode>();
      const outEdges = node.getOutgoingEdges();

      for (const edge of outEdges) {
        if (!this.isSelfLoopTest(edge)) {
          outNodes.add(edge.getTarget()!.getNode()!);
        }
      }

      successors.push(outNodes);
    }

    return successors;
  }

  /**
   * Returns the number of {@link LEdge} edges in the given Iterable, but ignores self-loops.
   *
   * @param edges Iterable whose edges without self-loops are to be counted
   * @return number of {@link LEdge} edges without self-loops
   */
  private countEdgesExceptSelfLoops(edges: Iterable<LEdge>): number {
    let i = 0;
    for (const edge of edges) {
      if (!this.isSelfLoopTest(edge)) {
        i++;
      }
    }
    return i;
  }

  /**
   * Checks whether an edge is a self-loop (i.e. source node == target node). Used internally, as ELK Layered doesn't
   * remove self-loops in its cycle breaking phase, but MinWidth expects only real directed acyclic graphs (DAGs).
   * (The Java `SelfLoopPredicate.apply`.)
   */
  private isSelfLoopTest(input: LEdge): boolean {
    return input.getSource()!.getNode() === input.getTarget()!.getNode();
  }

  /**
   * Comparator for determining whether a {@link LNode} has less outgoing edges than another one. Requires the LNode
   * property {@link LNode#id} to be set to the number of outgoing edges of the node. (The Java
   * `MinOutgoingEdgesComparator.compare`.)
   */
  private compareMinOutgoingEdges(o1: LNode, o2: LNode): number {
    const outs1 = this.outDegree[o1.id]!;
    const outs2 = this.outDegree[o2.id]!;

    if (outs1 < outs2) {
      return -1;
    }
    if (outs1 === outs2) {
      return 0;
    }
    return 1;
  }
}
