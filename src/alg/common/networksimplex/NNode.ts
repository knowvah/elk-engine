// SPDX-License-Identifier: EPL-2.0
import type { NEdge } from './NEdge.js';
import { ChangeAwareArrayList } from './NNodeChangeAwareArrayList.js';
import { NNodeBuilder } from './NNodeNNodeBuilder.js';

/**
 * A node in the graph handed to the network simplex algorithm. Java's `protected` members (`internalId`, `treeNode`,
 * `unknownCutvalues`) are public here: TypeScript has no package visibility, and `NetworkSimplex` reads them.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NNode.java
 */
export class NNode {
  id = 0;
  internalId = 0;
  origin: unknown = null;
  type = '';

  layer = 0;

  // In addition to a node's incoming and outgoing edges we cache a list of the union of these two. To be able to tell
  // when we have to update this list, we listen (sort of) to changes to the two underlying lists.
  readonly #outgoingEdges = new ChangeAwareArrayList<NEdge>();
  #outgoingEdgesModCnt = -1;
  readonly #incomingEdges = new ChangeAwareArrayList<NEdge>();
  #incomingEdgesModCnt = -1;

  readonly #allEdges: NEdge[] = [];

  treeNode = false;

  unknownCutvalues: NEdge[] = [];

  /** Java's constructor is private (callable by the nested `NNodeBuilder` only); use `NNode.of()`. */
  constructor() {}

  static of(): NNodeBuilder {
    return new NNodeBuilder();
  }

  getOutgoingEdges(): ChangeAwareArrayList<NEdge> {
    return this.#outgoingEdges;
  }

  getIncomingEdges(): ChangeAwareArrayList<NEdge> {
    return this.#incomingEdges;
  }

  /** The union of incoming and outgoing edges (incoming first), cached until either list changes. */
  getConnectedEdges(): NEdge[] {
    if (
      this.#incomingEdgesModCnt !== this.#incomingEdges.getModCnt() ||
      this.#outgoingEdgesModCnt !== this.#outgoingEdges.getModCnt()
    ) {
      this.#allEdges.length = 0;
      this.#allEdges.push(...this.#incomingEdges, ...this.#outgoingEdges);

      this.#incomingEdgesModCnt = this.#incomingEdges.getModCnt();
      this.#outgoingEdgesModCnt = this.#outgoingEdges.getModCnt();
    }

    return this.#allEdges;
  }
}
