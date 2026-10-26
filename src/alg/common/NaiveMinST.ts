// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../core/math/KVector.js';
import * as Lists from '../../guava/Lists.js';
import * as Maps from '../../guava/Maps.js';
import * as Sets from '../../guava/Sets.js';
import { compare as doubleCompare } from '../../java/lang/DoubleCompare.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { hashable } from '../../java/util/HashStrategy.js';
import type { JavaHashMap } from '../../java/util/JavaHashMap.js';
import type { ICostFunction } from './ICostFunction.js';
import { TEDGE_STRATEGY } from './TEdge.js';
import type { TEdge } from './TEdge.js';
import { Tree } from './Tree.js';
import { SVGImage } from './utils/SVGImage.js';

/** Key protocol of the `KVector`-keyed `treeNodes` map: `KVector.hashCode` and `KVector.equals`. */
const KVECTOR_STRATEGY = hashable<KVector>();

/** The edge chosen in one round together with its new node and the node already in the tree. */
interface NextEdge {
  readonly edge: TEdge;
  readonly nextNode: KVector;
  readonly nodeInTree: KVector;
}

/**
 * The weight of an edge (Java unboxes `weight.get(edge)`, which would throw a `NullPointerException` for a
 * missing key).
 */
function weightOf(weight: JavaHashMap<TEdge, number>, edge: TEdge): number {
  const w = weight.get(edge);
  if (w === undefined) {
    throw new IllegalStateException('No weight recorded for an edge');
  }
  return w;
}

/**
 * Simple minimum spanning tree calculation.
 * This class expects a list of edges that are pairs of vertices, a cost function for these edges, and a
 * root vertex to start the spanning tree.
 * <p>precondition: The edge list E represents a connected graph (V,E) where V={w|(u,w) \in E or (w,v) \in E}
 * and root \in V.</p>
 * <p>postcondition: The returned tree structure connects all vertices in V once.</p>
 *
 * The overloads `createSpanningTree(tEdges, root, costFunction, debugOutputFile)` and
 * `createSpanningTree(tEdges, root, costFunction)` are one function with an optional last parameter.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/NaiveMinST.java
 */
export class NaiveMinST {
  /** Hidden constructor. */
  private constructor() {}

  /**
   * Creates a minimum spanning tree for a graph using the cost function specified in the constructor.
   *
   * @param tEdges the edges of the graph, in iteration order
   * @param root the root node to start the spanning tree
   * @param costFunction a function returning a cost value for a {@link TEdge}
   * @param debugOutputFile file name for debug SVG. Debug output will be deactivated if this is null.
   * @returns the spanning tree
   */
  static createSpanningTree(
    tEdges: Iterable<TEdge>,
    root: KVector,
    costFunction: ICostFunction,
    debugOutputFile: string | null = null,
  ): Tree<KVector> {
    // determine edge weights
    const weight = NaiveMinST.determineEdgeWeights(tEdges, costFunction);

    // sort edges by weight
    const edgeList: TEdge[] = Lists.newArrayList(tEdges);
    // Collections.sort and Array.prototype.sort are both stable: ties keep the HashSet iteration order
    edgeList.sort((e1: TEdge, e2: TEdge) => doubleCompare(weightOf(weight, e1), weightOf(weight, e2)));
    const edges: Set<TEdge> = Sets.newLinkedHashSet(edgeList); // preserves order

    // iteratively add cheapest edge where one node is contained in current tree and one is new
    const minST = new Tree<KVector>(root);
    const treeNodes = Maps.newHashMap<KVector, Tree<KVector>>(KVECTOR_STRATEGY);
    treeNodes.put(root, minST);

    const svg = new SVGImage(debugOutputFile);
    NaiveMinST.debugEdges(svg, edges, weight);

    while (edges.size > 0) {
      const next = NaiveMinST.findNextEdge(edges, weight, treeNodes);

      // Since the underlying graph is connected, the spanning tree is complete if no edge can be found that
      // connects a new node to the tree.
      if (next === null) {
        break;
      }

      // add the new node to the spanning tree
      const subTree = new Tree<KVector>(next.nextNode);
      NaiveMinST.treeNode(treeNodes, next.nodeInTree).children.push(subTree);
      treeNodes.put(next.nextNode, subTree);
      edges.delete(next.edge);

      NaiveMinST.debugAddedEdge(svg, next.edge);
    }

    return minST;
  }

  /** The first debug section of the Java method (`// elkjs-exclude-start` ... `// elkjs-exclude-end`). */
  private static debugEdges(svg: SVGImage, edges: Set<TEdge>, weight: JavaHashMap<TEdge, number>): void {
    svg.addGroups('e', 't');
    for (const e of edges) {
      svg.g('e').addLine(e.u.x, e.u.y, e.v.x, e.v.y, 'stroke="black" stroke-width="1"');
      // Java: String.format("%.2f", ...); only ever written to the (disabled) debug image
      svg
        .g('t')
        .addElementStr(
          `<text x="${doubleToString((e.u.x + e.v.x) / 2)}" y="${doubleToString((e.u.y + e.v.y) / 2)}" fill="blue" font-size="20px">` +
            `${weightOf(weight, e).toFixed(2)}</text>`,
        );
    }
    svg.isave();
  }

  /** The `// determine edge weights` section of the Java method. */
  private static determineEdgeWeights(
    tEdges: Iterable<TEdge>,
    costFunction: ICostFunction,
  ): JavaHashMap<TEdge, number> {
    const weight = Maps.newHashMap<TEdge, number>(TEDGE_STRATEGY);
    for (const edge of tEdges) {
      weight.put(edge, costFunction.cost(edge));
    }
    return weight;
  }

  /** The debug output at the end of each round of the Java `while` loop. */
  private static debugAddedEdge(svg: SVGImage, edge: TEdge): void {
    svg.g('e').addLine(edge.u.x, edge.u.y, edge.v.x, edge.v.y, 'stroke="red" stroke-width="3"');
    svg.isave();
  }

  /**
   * The inner `for` loop of the Java `while` loop: the first (cheapest) edge that connects a node of the tree to a
   * new node.
   */
  private static findNextEdge(
    edges: Set<TEdge>,
    weight: JavaHashMap<TEdge, number>,
    treeNodes: JavaHashMap<KVector, Tree<KVector>>,
  ): NextEdge | null {
    const minWeight = Number.POSITIVE_INFINITY;
    for (const edge of edges) {
      if (weightOf(weight, edge) <= minWeight) {
        if (treeNodes.containsKey(edge.u) && !treeNodes.containsKey(edge.v)) {
          return { edge, nextNode: edge.v, nodeInTree: edge.u }; // because edges is sorted we don't have to look any further
        }
        if (treeNodes.containsKey(edge.v) && !treeNodes.containsKey(edge.u)) {
          return { edge, nextNode: edge.u, nodeInTree: edge.v }; // because edges is sorted we don't have to look any further
        }
      }
    }
    return null;
  }

  /** `treeNodes.get(node)`, which Java dereferences without a null check. */
  private static treeNode(treeNodes: JavaHashMap<KVector, Tree<KVector>>, node: KVector): Tree<KVector> {
    const tree = treeNodes.get(node);
    if (tree === undefined) {
      throw new IllegalStateException('No tree node recorded for a vertex');
    }
    return tree;
  }
}
