// SPDX-License-Identifier: EPL-2.0
import type { NGraph } from './NGraph.js';
import { NNode } from './NNode.js';

/**
 * Java's public nested class `NNode.NNodeBuilder`, split into its own file (M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NNode.java
 */
export class NNodeBuilder {
  readonly #node: NNode = new NNode();

  id(id: number): NNodeBuilder {
    this.#node.id = id;
    return this;
  }

  origin(origin: unknown): NNodeBuilder {
    this.#node.origin = origin;
    return this;
  }

  type(type: string): NNodeBuilder {
    this.#node.type = type;
    return this;
  }

  create(graph: NGraph): NNode {
    graph.nodes.push(this.#node);
    return this.#node;
  }
}
