// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import * as DoubleToString from '../../../java/lang/DoubleToString.js';
import { NEdgeBuilder } from './NEdgeNEdgeBuilder.js';
import type { NNode } from './NNode.js';

/**
 * An edge in the graph handed to the network simplex algorithm. Java's `protected` members (`internalId`,
 * `treeEdge`) are public here: TypeScript has no package visibility, and `NetworkSimplex` reads them.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NEdge.java
 */
export class NEdge {
  id = 0;
  internalId = 0;
  origin: unknown = null;
  source: NNode | null = null;
  target: NNode | null = null;
  weight = 0;
  delta = 1;

  treeEdge = false;

  /** Java's `of()`. */
  static of(): NEdgeBuilder;
  /** Java's `of(Object origin)`: the origin is ignored, exactly as in the Java. */
  static of(origin: unknown): NEdgeBuilder;
  static of(_origin?: unknown): NEdgeBuilder {
    return new NEdgeBuilder();
  }

  getSource(): NNode | null {
    return this.source;
  }

  getTarget(): NNode | null {
    return this.target;
  }

  /** The node at the other end of this edge; throws if `some` is neither end. */
  getOther(some: NNode): NNode | null {
    if (some === this.source) {
      return this.target;
    } else if (some === this.target) {
      return this.source;
    } else {
      throw new IllegalArgumentException(`Node ${some.toString()} not part of edge ${this.toString()}`);
    }
  }

  /** Reverses this edge, updating the incoming and outgoing edge lists of both nodes. */
  reverse(): NEdge {
    const tmp = this.source;
    this.source = this.target;
    this.target = tmp;

    // Java dereferences both ends here: a `null` end throws (there, a NullPointerException).
    const source = this.source as NNode;
    const target = this.target as NNode;

    target.getOutgoingEdges().remove(this);
    target.getIncomingEdges().add(this);

    source.getIncomingEdges().remove(this);
    source.getOutgoingEdges().add(this);
    return this;
  }

  toString(): string {
    return `NEdge[id=${this.id} w=${DoubleToString.toString(this.weight)} d=${this.delta}]`;
  }
}
