// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { NEdge } from './NEdge.js';
import type { NNode } from './NNode.js';

/**
 * Java's public nested class `NEdge.NEdgeBuilder`, split into its own file (M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NEdge.java
 */
export class NEdgeBuilder {
  readonly #edge: NEdge = new NEdge();

  id(id: number): NEdgeBuilder {
    this.#edge.id = id;
    return this;
  }

  origin(origin: unknown): NEdgeBuilder {
    this.#edge.origin = origin;
    return this;
  }

  weight(weight: number): NEdgeBuilder {
    this.#edge.weight = weight;
    return this;
  }

  delta(delta: number): NEdgeBuilder {
    this.#edge.delta = delta;
    return this;
  }

  source(source: NNode): NEdgeBuilder {
    this.#edge.source = source;
    return this;
  }

  target(target: NNode): NEdgeBuilder {
    this.#edge.target = target;
    return this;
  }

  create(): NEdge {
    const edge = this.#edge;
    if (edge.source === null || edge.target === null) {
      throw new IllegalStateException('NEdge must have a source and target NNode specified.');
    }

    if (edge.source === edge.target) {
      throw new IllegalStateException(
        `Network simplex does not support self-loops: ${edge.toString()} ${edge.source.toString()} ${edge.target.toString()}`,
      );
    }

    edge.source.getOutgoingEdges().add(edge);
    edge.target.getIncomingEdges().add(edge);

    return edge;
  }
}
