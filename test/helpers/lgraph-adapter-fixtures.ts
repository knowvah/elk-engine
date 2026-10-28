// SPDX-License-Identifier: EPL-2.0
import type { GraphAdapters } from '../../src/core/util/adapters/GraphAdapters.js';
import type { Layer } from '../../src/alg/layered/graph/Layer.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';

/** A node of `type` placed in `layer` (not in the layerless list). */
export function nodeInLayer(graph: LGraph, layer: Layer, type: NodeType = NodeType.NORMAL): LNode {
  const node = new LNode(graph);
  node.setType(type);
  node.setLayer(layer);
  return node;
}

/** The elements of an adapter iterable as an array. */
export function toArray<T>(iterable: Iterable<T>): T[] {
  return [...iterable];
}

/** The wrapped LGraph element of each adapter in iteration order, read through the adapter's volatile id. */
export function volatileIds(adapters: Iterable<GraphAdapters.GraphElementAdapter<unknown>>): number[] {
  return toArray(adapters).map((a) => a.getVolatileId());
}
