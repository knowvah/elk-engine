// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from './LEdge.js';
import type { LNode } from './LNode.js';
import type { LPort } from './LPort.js';

/**
 * The array-conversion section of `LGraphUtil` (`:56-78`, before "Node Resizing"). `LGraph.toNodeArray` uses it, so
 * it is a section module that never imports the facade. Java's `Collection.toArray` copies into a new array.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */

/**
 * Create a new array by copying the content of the given node collection.
 *
 * @param nodes a collection of nodes
 * @return an array of nodes
 */
export function toNodeArray(nodes: Iterable<LNode>): LNode[] {
  return Array.from(nodes);
}

/**
 * Create a new array by copying the content of the given edge collection.
 *
 * @param edges a collection of edges
 * @return an array of edges
 */
export function toEdgeArray(edges: Iterable<LEdge>): LEdge[] {
  return Array.from(edges);
}

/**
 * Create a new array by copying the content of the given port collection.
 *
 * @param ports a collection of ports
 * @return an array of ports
 */
export function toPortArray(ports: Iterable<LPort>): LPort[] {
  return Array.from(ports);
}
