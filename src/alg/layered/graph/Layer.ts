// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import * as JavaObjects from '../../../java/util/JavaObjects.js';
import type { LGraph } from './LGraph.js';
import { LGraphElement } from './LGraphElement.js';
import type { LNode } from './LNode.js';

/**
 * A layer in a layered graph. A layer contains a list of nodes, which are drawn in one column.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/Layer.java
 */
export class Layer extends LGraphElement implements Iterable<LNode> {
  /** the owning layered graph. */
  private readonly owner: LGraph;
  /** the size of the layer as drawn horizontally. */
  private readonly size = new KVector();
  /** the nodes of the layer. */
  private readonly nodes: LNode[] = [];

  /**
   * Creates a layer for the given layered graph. The layer is not added to the given graph yet; the graph is just
   * saved as the layer's owner.
   *
   * @param graph the owning layered graph
   */
  constructor(graph: LGraph) {
    super();
    this.owner = graph;
  }

  /** Returns the size of the layer, that is the height of the stacked nodes and the maximal width of the nodes. */
  getSize(): KVector {
    return this.size;
  }

  /**
   * Returns the list of nodes. The order of nodes in this list corresponds to the order in which they are drawn inside
   * the layer: the first node is drawn topmost. This order is affected during crossing minimization.
   */
  getNodes(): LNode[] {
    return this.nodes;
  }

  /** Returns an iterator over the contained nodes. */
  [Symbol.iterator](): Iterator<LNode> {
    return this.nodes[Symbol.iterator]();
  }

  /** Returns the layered graph that owns this layer. */
  getGraph(): LGraph {
    return this.owner;
  }

  /**
   * Returns the index of this layer in the global list of layers. Note that this method has linear running time in
   * the number of layers, so use it with caution.
   */
  getIndex(): number {
    return this.owner.getLayers().indexOf(this);
  }

  toString(): string {
    return `L_${this.getIndex()}${listToString(this.nodes)}`;
  }
}

/** Java `AbstractCollection.toString()`: `[a, b]`. */
function listToString(list: readonly unknown[]): string {
  return `[${list.map((element) => JavaObjects.toString(element)).join(', ')}]`;
}
