// SPDX-License-Identifier: EPL-2.0
import { LinkedList } from '../../../java/util/LinkedList.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { TEdge } from './TEdge.js';
import type { TGraph } from './TGraph.js';
import { TShape } from './TShape.js';

/**
 * The iterator of Java's anonymous `Iterator<TNode>` of {@link TNode.getParents} and {@link TNode.getChildren}: a JS
 * iterator (`next` returns `{ done, value }`) that also has Java's `remove()`, which removes the edge last returned
 * from the edge list the iterator walks.
 */
export interface TNodeIterator extends Iterator<TNode> {
  remove(): void;
}

/**
 * A node in the T graph. Some properties are maybe null.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TNode.java
 */
export class TNode extends TShape {
  /** the graph it belongs to. */
  private graph: TGraph;
  /** the node label. */
  private label: string | null = null;
  /** List of outgoing edges. */
  private outgoingEdges: LinkedList<TEdge> | null = new LinkedList<TEdge>();
  /** List of incoming edges. */
  private incomingEdges: LinkedList<TEdge> | null = new LinkedList<TEdge>();

  // CONSTRUCTORS

  /**
   * Create a new node with given label (Java `TNode(int, TGraph, String)`) or without (`TNode(int, TGraph)`, whose
   * label stays `null`).
   *
   * @param id a unique identification
   * @param graph the graph it belong s to
   * @param label the label
   */
  constructor(id: number, graph: TGraph, ...label: [] | [string | null]) {
    super(id);
    this.graph = graph;
    if (label.length > 0) {
      this.label = label[0] ?? null;
    }
  }

  // GETTERS

  override toString(): string {
    if (this.label === null || this.label.length === 0) {
      return `n_${String(this.id)}`;
    } else {
      return `n_${this.label}`;
    }
  }

  /**
   * Returns the label text of this node.
   *
   * @return the label
   */
  getLabel(): string | null {
    return this.label;
  }

  /**
   * Returns an iterable over all the parents. Parents are sources of incoming edges of this node.
   *
   * @return an iterable over all parents.
   */
  getParents(): Iterable<TNode> {
    return {
      [Symbol.iterator]: (): TNodeIterator => {
        const edgesIter = this.getIncomingEdges().listIterator();
        return {
          next: (): IteratorResult<TNode> =>
            edgesIter.hasNext()
              ? { done: false, value: edgesIter.next().getSource()! }
              : { done: true, value: undefined },
          remove: (): void => {
            edgesIter.remove();
          },
        };
      },
    };
  }

  /**
   * Returns the first parent, by taking it from outgoing edges.
   *
   * @return a single parent or null if there is none
   */
  getParent(): TNode | null {
    const edges = this.getIncomingEdges();
    if (edges.isEmpty()) {
      return null;
    }
    return edges.get(0).getSource();
  }

  /**
   * Returns the list of children, creating it from outgoing edges. Children are targets of outgoing edges of this
   * node.
   *
   * @return the list of children
   */
  getChildrenCopy(): LinkedList<TNode> {
    const children = new LinkedList<TNode>();
    for (const iEdge of this.getOutgoingEdges()) {
      children.add(iEdge.getTarget()!);
    }
    return children;
  }

  /**
   * Returns an iterable over all the children. Children are targets of outgoing edges of this node.
   *
   * @return an iterable over all children.
   */
  getChildren(): Iterable<TNode> {
    return {
      [Symbol.iterator]: (): TNodeIterator => {
        const edgesIter = this.getOutgoingEdges().listIterator();
        return {
          next: (): IteratorResult<TNode> =>
            edgesIter.hasNext()
              ? { done: false, value: edgesIter.next().getTarget()! }
              : { done: true, value: undefined },
          remove: (): void => {
            edgesIter.remove();
          },
        };
      },
    };
  }

  /**
   * Returns the list of outgoing edges, creating it if necessary.
   *
   * @return list of outgoing edges
   */
  getOutgoingEdges(): LinkedList<TEdge> {
    if (this.outgoingEdges === null) {
      this.outgoingEdges = new LinkedList<TEdge>();
    }
    return this.outgoingEdges;
  }

  /**
   * Returns the list of incoming edges, creating it if necessary.
   *
   * @return list of incoming edge
   */
  getIncomingEdges(): LinkedList<TEdge> {
    if (this.incomingEdges === null) {
      this.incomingEdges = new LinkedList<TEdge>();
    }
    return this.incomingEdges;
  }

  // SETTERS

  /**
   * Set the label text of this node.
   *
   * @param label the new label text
   */
  setLabel(label: string | null): void {
    this.label = label;
  }

  /**
   * Add a node to the list of children, by adding a appropriate dummy edge to the graph.
   *
   * @param child the child to be added
   */
  addChild(child: TNode): void {
    const newEdge = new TEdge(this, child);
    newEdge.setProperty(InternalProperties.DUMMY, true);
    this.graph.getEdges().add(newEdge);
    this.getOutgoingEdges().add(newEdge);
    child.getIncomingEdges().add(newEdge);
  }

  // ATTRIBUTES

  /**
   * Returns whether this node is a leaf.
   *
   * @return true if node is a leaf
   */
  isLeaf(): boolean {
    return this.getOutgoingEdges().isEmpty();
  }
}
