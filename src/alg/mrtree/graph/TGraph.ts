// SPDX-License-Identifier: EPL-2.0
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import type { TEdge } from './TEdge.js';
import type { TNode } from './TNode.js';

/**
 * A graph for the T layouter. It consists of node, edges and labels.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TGraph.java
 */
export class TGraph extends MapPropertyHolder {
  /** All nodes of this graph. */
  private nodes: LinkedList<TNode> = new LinkedList<TNode>();
  /** All edges of this graph. */
  private edges: LinkedList<TEdge> = new LinkedList<TEdge>();

  /** Default constructor that creates an empty graph. */
  constructor() {
    super();
    this.nodes = new LinkedList<TNode>();
    this.edges = new LinkedList<TEdge>();
  }

  /**
   * Kept upstream oddity: `tmp` starts as `null`, so Java string concatenation makes the text start with "null", and
   * an empty graph returns `null` (typed `string` here because `Object.toString()` is).
   */
  override toString(): string {
    let tmp: string | null = null;
    for (const tNode of this.nodes) {
      tmp = `${String(tmp)}${tNode.toString()}\n`;
    }
    for (const tEdge of this.edges) {
      tmp = `${String(tmp)}${tEdge.toString()}\n`;
    }
    // the empty graph yields Java's null result; the cast is the only way to keep it under Object.toString()'s type
    return tmp as string;
  }

  /**
   * Returns the list of edges for this graph.
   *
   * @return the edges
   */
  getEdges(): LinkedList<TEdge> {
    return this.edges;
  }

  /**
   * Returns the list of nodes for this graph.
   *
   * @return the nodes
   */
  getNodes(): LinkedList<TNode> {
    return this.nodes;
  }
}
