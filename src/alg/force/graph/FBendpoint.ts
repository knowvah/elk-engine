// SPDX-License-Identifier: EPL-2.0
import type { FEdge } from './FEdge.js';
import { FParticle } from './FParticle.js';

/**
 * A bend point of an edge in the force graph.
 *
 * @author tmn
 * @author owo
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/graph/FBendpoint.java
 */
export class FBendpoint extends FParticle {
  /** The edge this bend point belongs to. */
  private readonly edge: FEdge;

  /**
   * Construct a new bend point on the given edge. The bend point is also put into the edge's list of bend points.
   *
   * @param edge the edge this bend point belongs to
   */
  constructor(edge: FEdge) {
    super();
    this.edge = edge;
    edge.getBendpoints().push(this);
  }

  /**
   * The Java `if (edge != null)` guard is always true (the constructor dereferences `edge`, `FBendpoint.java:40`), so
   * its fallback `"b_" + hashCode()` (`FBendpoint.java:53`) is unreachable and not ported.
   */
  override toString(): string {
    // edge cannot be null: the constructor calls edge.getBendpoints() (FBendpoint.java:40)
    const index = this.edge.getBendpoints().indexOf(this);
    if (index >= 0) {
      return `b${String(index)}[${this.edge.toString()}]`;
    } else {
      return `b[${this.edge.toString()}]`;
    }
  }

  /**
   * Returns the edge this bend point belongs to.
   *
   * @return the corresponding edge
   */
  getEdge(): FEdge {
    return this.edge;
  }
}
