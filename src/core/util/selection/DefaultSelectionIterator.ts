// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import { isElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../../graph/ElkGraphElement.js';
import { isElkPort } from '../../../graph/ElkPort.js';
import * as Iterators from '../../../guava/Iterators.js';
import { SelectionIterator } from './SelectionIterator.js';

/**
 * A selection iterator that can optionally include ports and follows either the edge direction or
 * its reverse.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/selection/DefaultSelectionIterator.java
 */
export class DefaultSelectionIterator extends SelectionIterator {
  #addPorts: boolean;
  #followEdgeDirection: boolean;

  constructor(edge: ElkEdge, addPorts: boolean, followEdgeDirection: boolean) {
    super(edge);
    this.#addPorts = addPorts;
    this.#followEdgeDirection = followEdgeDirection;
  }

  protected override getChildren(object: unknown): Iterator<ElkGraphElement> {
    // Ensure that the visited set is properly initialized (identity-hashed, so a JS Set; P2).
    this.visited ??= new Set();

    if (!isElkEdge(object)) {
      return emptyIterator();
    }
    const connectedShape = this.#followEdgeDirection ? object.getTargets().get(0) : object.getSources().get(0);

    if (!isElkPort(connectedShape) || this.visited.has(connectedShape)) {
      // No target/source port is configured, or it has been visited already (breaks infinite loops).
      return emptyIterator();
    }

    const port = connectedShape;
    this.visited.add(port);

    // For each object visited, check all the edges connected to 'port' and visit those edges.
    const resultEdges = (this.#followEdgeDirection ? port.getOutgoingEdges() : port.getIncomingEdges()).iterator();

    if (this.#addPorts) {
      return Iterators.concat<ElkGraphElement>(Iterators.singletonIterator<ElkGraphElement>(port), resultEdges);
    }
    return resultEdges;
  }
}

function emptyIterator(): Iterator<ElkGraphElement> {
  return [][Symbol.iterator]();
}
