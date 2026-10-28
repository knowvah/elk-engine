// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import * as JavaObjects from '../../../java/util/JavaObjects.js';
import type { Layer } from './Layer.js';
import { LGraphElement } from './LGraphElement.js';
import { toNodeArray } from './LGraphUtilArrays.js';
import type { LNode } from './LNode.js';
import { LPadding } from './LPadding.js';

/**
 * A layered graph has a set of layers that contain the nodes, as well as a list of nodes that are not yet assigned to
 * a layer. Layout algorithms are required to layout the graph from left to right. If another layout direction is
 * desired, it can be obtained by pre-processing and post-processing the graph. In contrast to the KGraph structure,
 * the LGraph is not EMF-based, but plain Java. It is optimized for being processed by a layer-based layout algorithm.
 *
 * `toNodeArray` calls `LGraphUtil.toNodeArray` through its section module (sections never import the facade).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraph.java
 */
export class LGraph extends LGraphElement implements Iterable<Layer> {
  /**
   * The total size of the drawing. The total size does not include padding. If the actual size, including padding,
   * is required, this can be obtained by calling {@link getActualSize}.
   */
  private readonly size = new KVector();

  /**
   * The graph's effective padding. This already includes the padding set on the imported graph by the client, as well
   * as any space required for inside node labels. These are the effective paddings returned to the client if
   * `SizeOptions.COMPUTE_PADDING` is active.
   */
  private readonly padding = new LPadding();

  /**
   * The offset that will be applied to all node positions. Adding the offset to the coordinates of child nodes
   * results in child node coordinates that are relative to the node's client area (which does not include the padding
   * around it).
   */
  private readonly offset = new KVector();

  /** Nodes that are not currently part of a layer. */
  private readonly layerlessNodes: LNode[] = [];

  /** The layers of the layered graph. */
  private readonly layers: Layer[] = [];

  /** The parent node in which this graph is nested, or `null`. */
  private parentNode: LNode | null = null;

  /**
   * Returns the size of the graph, that is the bounding box that covers the whole drawing. The size does not include
   * padding. Modifying the returned value changes the size of the graph.
   */
  getSize(): KVector {
    return this.size;
  }

  /**
   * Returns the graph's size including any borders. If the graph represents a hierarchical node, the returned size
   * represents the node's size. The returned size can be modified at will without having any influence on the graph's
   * size or the actual size returned on the next method call.
   */
  getActualSize(): KVector {
    return new KVector(
      this.size.x + this.padding.left + this.padding.right,
      this.size.y + this.padding.top + this.padding.bottom,
    );
  }

  /**
   * Returns the padding of the graph. The padding determines the amount of space between the content area and the
   * graph's actual border. Modifying the returned value changes the padding.
   */
  getPadding(): LPadding {
    return this.padding;
  }

  /**
   * Returns the offset for the graph, that is a coordinate vector that has to be added to all position values of
   * nodes and edges. It is usually used to reserve some space in the content area for additional edge routing.
   *
   * **Note:** Since many different parts of the algorithm may contribute to the offset, never set the offset to an
   * absolute value! Rather, only add to the offset!
   */
  getOffset(): KVector {
    return this.offset;
  }

  /** Returns the list of nodes that are not currently assigned to a layer. When creating a graph, put the nodes here. */
  getLayerlessNodes(): LNode[] {
    return this.layerlessNodes;
  }

  /**
   * Returns the list of layers of the graph. Layers are created automatically by the layout algorithm, so this list
   * must not be touched when the graph is created.
   */
  getLayers(): Layer[] {
    return this.layers;
  }

  /** Returns the parent node in which this graph is nested, if any. */
  getParentNode(): LNode | null {
    return this.parentNode;
  }

  /** Sets the parent node in which this graph is nested. */
  setParentNode(parentNode: LNode | null): void {
    this.parentNode = parentNode;
  }

  /** Returns an iterator over the layers. */
  [Symbol.iterator](): Iterator<Layer> {
    return this.layers[Symbol.iterator]();
  }

  /**
   * Returns a two-dimensional array representation of all nodes in the graph. The first dimension represents the
   * layers, the second dimension represents the nodes in each layer.
   */
  toNodeArray(): LNode[][] {
    const lgraphArray: LNode[][] = new Array<LNode[]>(this.layers.length);
    // Java walks a ListIterator and reads previousIndex() after next(): the index of the layer just returned
    this.layers.forEach((layer, layerIndex) => {
      lgraphArray[layerIndex] = toNodeArray(layer.getNodes());
    });

    return lgraphArray;
  }

  toString(): string {
    if (this.layers.length === 0) {
      return `G-unlayered${listToString(this.layerlessNodes)}`;
    } else if (this.layerlessNodes.length === 0) {
      return `G-layered${listToString(this.layers)}`;
    }
    return `G[layerless${listToString(this.layerlessNodes)}, layers${listToString(this.layers)}]`;
  }
}

/** Java `AbstractCollection.toString()`: `[a, b]`. */
function listToString(list: readonly unknown[]): string {
  return `[${list.map((element) => JavaObjects.toString(element)).join(', ')}]`;
}
