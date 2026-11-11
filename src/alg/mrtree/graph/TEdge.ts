// SPDX-License-Identifier: EPL-2.0
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { identityHashCode } from '../../../java/lang/IdentityHashCode.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { TGraphElement } from './TGraphElement.js';
import type { TLabel } from './TLabel.js';
import type { TNode } from './TNode.js';

/**
 * A edge for the T graph.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TEdge.java
 */
export class TEdge extends TGraphElement {
  /** the labels of the edge. */
  private readonly labels: LinkedList<TLabel> = new LinkedList<TLabel>();
  /** the source node of the edge. */
  private source: TNode | null;
  /** the target node of the edge. */
  private target: TNode | null;
  /** The inner bend points of the edge, without the source and target point. */
  private readonly bendPoints: KVectorChain = new KVectorChain();

  /**
   * Constructor for setting up a TEdge object.
   *
   * @param source the source node of the edge
   * @param target the target node of the edge
   */
  constructor(source: TNode | null, target: TNode | null) {
    super();
    this.source = source;
    this.target = target;
  }

  /**
   * The `hashCode()` of the fallback text is `Object.hashCode()`, the identity hash. It follows the landed identity-hash
   * text precedent (`identityHashCode`, as in `CNode.toString`): a stable per-object counter, not the JVM's value (TR9).
   */
  override toString(): string {
    if (this.source !== null && this.target !== null) {
      return `${this.source.toString()}->${this.target.toString()}`;
    } else {
      return `e_${String(identityHashCode(this))}`;
    }
  }

  /**
   * Returns the source node.
   *
   * @return the source node
   */
  getSource(): TNode | null {
    return this.source;
  }

  /**
   * Sets the source node and update it's outgoing list accordingly.
   *
   * @param theSource the source node set to
   */
  setSource(theSource: TNode | null): void {
    if (this.source !== theSource) {
      if (this.source !== null && this.source.getOutgoingEdges().contains(this)) {
        this.source.getOutgoingEdges().remove(this);
      }
      if (theSource !== null && !theSource.getOutgoingEdges().contains(this)) {
        theSource.getOutgoingEdges().add(this);
      }
      this.source = theSource;
    }
  }

  /**
   * Returns the target node.
   *
   * @return the target node
   */
  getTarget(): TNode | null {
    return this.target;
  }

  /**
   * Sets the target node and update it's incoming list accordingly.
   *
   * @param theTarget the target node
   */
  setTarget(theTarget: TNode | null): void {
    if (this.target !== theTarget) {
      if (this.target !== null && this.target.getIncomingEdges().contains(this)) {
        this.target.getIncomingEdges().remove(this);
      }
      if (theTarget !== null && !theTarget.getIncomingEdges().contains(this)) {
        theTarget.getIncomingEdges().add(this);
      }
      this.target = theTarget;
    }
  }

  /**
   * Returns the list of labels associated with this edge.
   *
   * @return list of labels
   */
  getLabels(): LinkedList<TLabel> {
    return this.labels;
  }

  /**
   * @return The inner bend points of the edge, WITHOUT the source and target point.
   */
  getBendPoints(): KVectorChain {
    return this.bendPoints;
  }
}
