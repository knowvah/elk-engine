// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';

/**
 * The port-list sorting section of `NorthSouthPortPreprocessor` (`:309-392`); the facade never reaches into it beyond
 * these two functions.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NorthSouthPortPreprocessor.java
 */

/**
 * Sorts the list of northern and southern ports such that ports with only incoming edges end up left, ports with only
 * outgoing edges end up right, and ports with both end up in between. Ports on the eastern and western sides are left
 * untouched.
 *
 * @param node the node whose ports to sort.
 * @see NorthSouthPortPreprocessor.java:317
 */
export function sortPortList(node: LNode): void {
  const ports = node.getPorts().length;

  // Next IDs for ports with a given configuration of input and output edges. The choice of
  // initial IDs ensures that port IDs will be unique
  let inPorts = 0;
  let inOutPorts = ports;
  let outPorts = 2 * ports;

  // Iterate over the list of ports and set their IDs
  for (const port of node.getPorts()) {
    switch (port.getSide()) {
      case PortSide.EAST:
      case PortSide.WEST:
        port.id = -1;
        break;

      case PortSide.NORTH:
      case PortSide.SOUTH: {
        const incoming = port.getIncomingEdges().length;
        const outgoing = port.getOutgoingEdges().length;

        if (incoming > 0 && outgoing > 0) {
          port.id = inOutPorts++;
        } else if (incoming > 0) {
          port.id = inPorts++;
        } else if (outgoing > 0) {
          port.id = outPorts++;
        } else {
          // Unconnected ports are placed between input ports...
          port.id = inPorts++;
        }

        break;
      }
    }
  }

  // With all IDs assigned, sort the port list (`Collections.sort` is stable, as is `Array.prototype.sort`)
  node.getPorts().sort((port1, port2) => {
    const side1 = port1.getSide();
    const side2 = port2.getSide();

    if (side1 !== side2) {
      // sort according to the node side
      return side1.ordinal() - side2.ordinal();
    } else {
      if (port1.id === port2.id) {
        // Eastern and western ports have the same ID and have to retain their order
        return 0;
      } else {
        if (side1 === PortSide.NORTH) {
          return port1.id - port2.id;
        } else {
          return port2.id - port1.id;
        }
      }
    }
  });
}

/**
 * Reverses the incoming ports. The Java builds `incoming` (ports with an incoming edge) and `outgoing` (all others) and
 * calls `Lists.reverse(incoming).addAll(outgoing)` before returning `incoming`: `Lists.reverse` is a write-through view
 * (Guava Javadoc), so appending the outgoing ports to the end of the view prepends them, reversed, to `incoming`. The
 * returned list is therefore `reverse(outgoing) ++ incoming`, which is what this builds (`ReverseList` has no
 * `addAll`).
 *
 * @see NorthSouthPortPreprocessor.java:377,389
 */
export function modelOrderNorthSouthInputReversing(portList: readonly LPort[], _node: LNode): LPort[] {
  // Reverse port list if edges are incoming edges.
  const incoming: LPort[] = [];
  const outgoing: LPort[] = [];
  for (const port of portList) {
    if (port.getIncomingEdges().length !== 0) {
      // Incoming edge
      incoming.push(port);
    } else {
      outgoing.push(port);
    }
  }
  incoming.unshift(...outgoing.reverse());
  return incoming;
}
