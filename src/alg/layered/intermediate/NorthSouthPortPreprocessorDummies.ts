// SPDX-License-Identifier: EPL-2.0
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Whether the new or the old approach should be used. The new approach does not impose an order on the dummy nodes
 * created for northern and southern ports.
 *
 * @see NorthSouthPortPreprocessor.java:148
 */
export const USE_NEW_APPROACH = true;

/**
 * The dummy node creation section of `NorthSouthPortPreprocessor` (`:413-718`): the Java private methods
 * `createDummyNodes`, `createDummyNode`, `createSameSideSelfLoopDummyNode` and `createNorthSouthSelfLoopDummyNodes`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/NorthSouthPortPreprocessor.java
 */

/**
 * Returns a list of dummy nodes for the given ports. The list of ports must be sorted by position from left to right.
 *
 * @param layeredGraph the layered graph.
 * @param ports the list of ports to create dummy nodes for.
 * @param dummyNodes all created dummy nodes are added to this list.
 * @param opposingSideDummyNodes all dummy nodes created due to north-south self-loops for the southern side are placed
 *   in this list. When called for southern ports, this may be `null`.
 * @param barycenterAssociates dummy nodes created for anything other than self-loops are put in this list to remember
 *   to include them in the barycenter calculations later.
 * @see NorthSouthPortPreprocessor.java:413
 */
export function createDummyNodes(
  layeredGraph: LGraph,
  ports: readonly LPort[],
  dummyNodes: LNode[],
  opposingSideDummyNodes: LNode[] | null,
  barycenterAssociates: LNode[],
): void {
  // We'll assemble lists of ports with only incoming, ports with only outgoing
  // and ports with both, incoming and outgoing edges
  const inPorts: LPort[] = [];
  const outPorts: LPort[] = [];
  const inOutPorts: LPort[] = [];
  const sameSideSelfLoopEdges: LEdge[] = [];
  const northSouthSelfLoopEdges: LEdge[] = [];

  for (const port of ports) {
    collectSelfLoops(port, sameSideSelfLoopEdges, northSouthSelfLoopEdges);
  }

  // First, create the dummy nodes that handle north->south self-loops. For now,
  // we always route north->south self-loops east to the node. This could later
  // change, though.
  for (const edge of northSouthSelfLoopEdges) {
    createNorthSouthSelfLoopDummyNodes(layeredGraph, edge, dummyNodes, opposingSideDummyNodes!, PortSide.EAST);
  }

  // Second, create the dummy nodes that handle same-side self-loops
  for (const edge of sameSideSelfLoopEdges) {
    createSameSideSelfLoopDummyNode(layeredGraph, edge, dummyNodes);
  }

  // Now we iterate over the ports again, with certain self-loop edges already removed, and
  // check
  // if they are input ports, output ports, or both
  classifyPorts(ports, inPorts, outPorts, inOutPorts);

  // We will now create dummy nodes for input ports and for output ports. How we create them
  // depends on whether we're using the old approach or the new one
  createInAndOutPortDummies(layeredGraph, ports, [inPorts, outPorts], dummyNodes, barycenterAssociates);

  // in / out ports get their own dummy nodes
  for (const inOutPort of inOutPorts) {
    barycenterAssociates.push(createDummyNode(layeredGraph, inOutPort, inOutPort, dummyNodes));
  }
}

/** The classification loop of `createDummyNodes` (`:458-472`): input ports, output ports, or both. */
function classifyPorts(ports: readonly LPort[], inPorts: LPort[], outPorts: LPort[], inOutPorts: LPort[]): void {
  for (const port of ports) {
    // Find out if the port has incoming or outgoing edges
    const isIn = port.getIncomingEdges().length > 0;
    const isOut = port.getOutgoingEdges().length > 0;

    if (isIn && isOut) {
      inOutPorts.push(port);
    } else if (isIn) {
      inPorts.push(port);
    } else if (isOut) {
      outPorts.push(port);
    }
  }
}

/**
 * The first loop of `createDummyNodes` (`:430-452`): go through the port's outgoing edges, looking for self-loops that
 * need special handling. (The Java `continue`s at the end of the loop body are the loop's own.)
 */
function collectSelfLoops(port: LPort, sameSideSelfLoopEdges: LEdge[], northSouthSelfLoopEdges: LEdge[]): void {
  for (const edge of port.getOutgoingEdges()) {
    // Check for self loops we'd be interested in
    if (edge.getSource()!.getNode() === edge.getTarget()!.getNode()) {
      // Check which sides the ports are on
      if (port.getSide() === edge.getTarget()!.getSide()) {
        // Same side
        sameSideSelfLoopEdges.push(edge);
        continue;
      } else if (port.getSide() === PortSide.NORTH && edge.getTarget()!.getSide() === PortSide.SOUTH) {
        // North->South self-loop. Due to the SelfLoopProcessor, a
        // South->North self-loop cannot happen
        northSouthSelfLoopEdges.push(edge);
        continue;
      }
    }
  }
}

/**
 * The `USE_NEW_APPROACH` branch of `createDummyNodes` (`:480-523`): dummy nodes for the ports with only input or only
 * output edges.
 */
function createInAndOutPortDummies(
  layeredGraph: LGraph,
  ports: readonly LPort[],
  [inPorts, outPorts]: readonly [LPort[], LPort[]],
  dummyNodes: LNode[],
  barycenterAssociates: LNode[],
): void {
  if (USE_NEW_APPROACH) {
    // Give the rest of input and output ports their dummy nodes
    for (const inPort of inPorts) {
      barycenterAssociates.push(createDummyNode(layeredGraph, inPort, null, dummyNodes));
    }

    for (const outPort of outPorts) {
      barycenterAssociates.push(createDummyNode(layeredGraph, null, outPort, dummyNodes));
    }
  } else {
    createOldApproachDummies(layeredGraph, ports, [inPorts, outPorts], dummyNodes, barycenterAssociates);
  }
}

/** The `else` branch of `createInAndOutPortDummies` (`:487-521`): the old approach, dead while `USE_NEW_APPROACH`. */
function createOldApproachDummies(
  layeredGraph: LGraph,
  ports: readonly LPort[],
  [inPorts, outPorts]: readonly [LPort[], LPort[]],
  dummyNodes: LNode[],
  barycenterAssociates: LNode[],
): void {
  // Iterate through the lists of input and output ports while both lists still
  // have elements and while output ports are still located right of input ports.
  // While this is true, input and output ports may share the same dummy node
  let inPortsIndex = 0;
  let outPortsIndex = outPorts.length - 1;

  while (inPortsIndex < inPorts.length && outPortsIndex >= 0) {
    const inPort = inPorts[inPortsIndex]!;
    const outPort = outPorts[outPortsIndex]!;

    // If the out port is not right of the in port, they cannot share the same
    // dummy node anymore
    if (ports.indexOf(outPort) < ports.indexOf(inPort)) {
      break;
    }

    // Otherwise, create a dummy node for them
    barycenterAssociates.push(createDummyNode(layeredGraph, inPort, outPort, dummyNodes));

    inPortsIndex++;
    outPortsIndex--;
  }

  // Give the rest of input and output ports their dummy nodes
  while (inPortsIndex < inPorts.length) {
    barycenterAssociates.push(createDummyNode(layeredGraph, inPorts[inPortsIndex]!, null, dummyNodes));
    inPortsIndex++;
  }

  while (outPortsIndex >= 0) {
    barycenterAssociates.push(createDummyNode(layeredGraph, null, outPorts[outPortsIndex]!, dummyNodes));
    outPortsIndex--;
  }
}

/**
 * Creates a dummy node for the given ports. Edges going into `inPort` are rerouted to the dummy node's input port.
 * Edges leaving the `outPort` are rerouted to the dummy node's output port. Both arguments may refer to the same port.
 * The dummy's port have their `ORIGIN` property set to the port whose edges have been rerouted to them.
 *
 * Java asserts (`:564`, `:587`) that each given port has edges; assertions are disabled by default (translation-rules
 * 6.8) and are omitted.
 *
 * @param inPort the input port whose edges to reroute. May be `null`.
 * @param outPort the output port whose edges to reroute. May be `null`.
 * @param dummyNodes list the created dummy node should be added to.
 * @returns the created dummy node.
 * @see NorthSouthPortPreprocessor.java:552
 */
export function createDummyNode(
  layeredGraph: LGraph,
  inPort: LPort | null,
  outPort: LPort | null,
  dummyNodes: LNode[],
): LNode {
  const dummy = new LNode(layeredGraph);
  dummy.setType(NodeType.NORTH_SOUTH_PORT);
  dummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);

  let crossingHint = 0;

  // Input port
  if (inPort !== null) {
    createInputPortOfDummy(dummy, inPort);

    crossingHint++;
  }

  // Output port
  if (outPort !== null) {
    createOutputPortOfDummy(dummy, outPort);

    crossingHint++;
  }

  // Set the crossing hint used for cross counting later
  dummy.setProperty(InternalProperties.CROSSING_HINT, crossingHint);

  dummyNodes.push(dummy);

  return dummy;
}

/** The input port block of `createDummyNode` (`:563-583`). */
function createInputPortOfDummy(dummy: LNode, inPort: LPort): void {
  const dummyInputPort = new LPort();
  dummyInputPort.setProperty(InternalProperties.ORIGIN, inPort);
  dummy.setProperty(InternalProperties.ORIGIN, inPort.getNode());
  dummyInputPort.setSide(PortSide.WEST);
  dummyInputPort.setNode(dummy);

  // Reroute edges
  const edgeArray = LGraphUtil.toEdgeArray(inPort.getIncomingEdges());
  for (const edge of edgeArray) {
    edge.setTarget(dummyInputPort);
  }

  // Make sure the inPort knows about the dummy node
  inPort.setProperty(InternalProperties.PORT_DUMMY, dummy);
}

/** The output port block of `createDummyNode` (`:586-606`). */
function createOutputPortOfDummy(dummy: LNode, outPort: LPort): void {
  const dummyOutputPort = new LPort();
  dummy.setProperty(InternalProperties.ORIGIN, outPort.getNode());
  dummyOutputPort.setProperty(InternalProperties.ORIGIN, outPort);
  dummyOutputPort.setSide(PortSide.EAST);
  dummyOutputPort.setNode(dummy);

  // Reroute edges
  const edgeArray = LGraphUtil.toEdgeArray(outPort.getOutgoingEdges());
  for (const edge of edgeArray) {
    edge.setSource(dummyOutputPort);
  }

  // Make sure the outPort knows about the dummy node
  outPort.setProperty(InternalProperties.PORT_DUMMY, dummy);
}

/**
 * Creates a dummy node for the given non-north-south self-loop edge. The dummy node's `ORIGIN` property is set to the
 * edge. The dummy node has two ports, one for each port the node was connected to. Their `ORIGIN` property is set
 * accordingly.
 *
 * @param selfLoop the self-loop edge.
 * @param dummyNodes list the created dummy node should be added to.
 * @see NorthSouthPortPreprocessor.java:627
 */
export function createSameSideSelfLoopDummyNode(layeredGraph: LGraph, selfLoop: LEdge, dummyNodes: LNode[]): void {
  const dummy = new LNode(layeredGraph);
  dummy.setType(NodeType.NORTH_SOUTH_PORT);
  dummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
  dummy.setProperty(InternalProperties.ORIGIN, selfLoop);

  // Input port
  const dummyInputPort = new LPort();
  dummyInputPort.setProperty(InternalProperties.ORIGIN, selfLoop.getTarget());
  dummyInputPort.setSide(PortSide.WEST);
  dummyInputPort.setNode(dummy);

  // Output port
  const dummyOutputPort = new LPort();
  dummyOutputPort.setProperty(InternalProperties.ORIGIN, selfLoop.getSource());
  dummyOutputPort.setSide(PortSide.EAST);
  dummyOutputPort.setNode(dummy);

  // Make sure the ports know about the dummy node
  selfLoop.getSource()!.setProperty(InternalProperties.PORT_DUMMY, dummy);
  selfLoop.getTarget()!.setProperty(InternalProperties.PORT_DUMMY, dummy);

  // Disconnect the edge
  selfLoop.setSource(null);
  selfLoop.setTarget(null);

  dummyNodes.push(dummy);

  // Set the crossing hint used for cross counting later
  dummy.setProperty(InternalProperties.CROSSING_HINT, 2);
}

/** The north dummy block of `createNorthSouthSelfLoopDummyNodes` (`:684-697`): the dummy and its output port. */
function createNorthDummy(layeredGraph: LGraph, selfLoop: LEdge, portSide: PortSide): [LNode, LPort] {
  const northDummy = new LNode(layeredGraph);
  northDummy.setType(NodeType.NORTH_SOUTH_PORT);
  northDummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
  northDummy.setProperty(InternalProperties.ORIGIN, selfLoop.getSource()!.getNode());

  const northDummyOutputPort = new LPort();
  northDummyOutputPort.setProperty(InternalProperties.ORIGIN, selfLoop.getSource());
  northDummyOutputPort.setSide(portSide);
  northDummyOutputPort.setNode(northDummy);

  selfLoop.getSource()!.setProperty(InternalProperties.PORT_DUMMY, northDummy);
  return [northDummy, northDummyOutputPort];
}

/** The south dummy block of `createNorthSouthSelfLoopDummyNodes` (`:699-712`): the dummy and its input port. */
function createSouthDummy(layeredGraph: LGraph, selfLoop: LEdge, portSide: PortSide): [LNode, LPort] {
  const southDummy = new LNode(layeredGraph);
  southDummy.setType(NodeType.NORTH_SOUTH_PORT);
  southDummy.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
  southDummy.setProperty(InternalProperties.ORIGIN, selfLoop.getTarget()!.getNode());

  const southDummyInputPort = new LPort();
  southDummyInputPort.setProperty(InternalProperties.ORIGIN, selfLoop.getTarget());
  southDummyInputPort.setSide(portSide);
  southDummyInputPort.setNode(southDummy);

  selfLoop.getTarget()!.setProperty(InternalProperties.PORT_DUMMY, southDummy);
  return [southDummy, southDummyInputPort];
}

/**
 * Creates two dummy nodes for the given north-south self-loop edge. Each dummy node has only one port, on the specified
 * side of the node. Their `ORIGIN` property is set accordingly.
 *
 * @param selfLoop the self-loop edge.
 * @param northDummyNodes list the created northern dummy node should be added to.
 * @param southDummyNodes list the created southern dummy node should be added to.
 * @param portSide on which sides on the dummy nodes the self-loop ports should be placed.
 * @see NorthSouthPortPreprocessor.java:677
 */
export function createNorthSouthSelfLoopDummyNodes(
  layeredGraph: LGraph,
  selfLoop: LEdge,
  northDummyNodes: LNode[],
  southDummyNodes: LNode[],
  portSide: PortSide,
): void {
  // North dummy
  const [northDummy, northDummyOutputPort] = createNorthDummy(layeredGraph, selfLoop, portSide);

  // South dummy
  const [southDummy, southDummyInputPort] = createSouthDummy(layeredGraph, selfLoop, portSide);

  // Reroute the edge
  selfLoop.setSource(northDummyOutputPort);
  selfLoop.setTarget(southDummyInputPort);

  northDummyNodes.unshift(northDummy);
  southDummyNodes.push(southDummy);

  // Set the crossing hints used for cross counting later
  northDummy.setProperty(InternalProperties.CROSSING_HINT, 1);
  southDummy.setProperty(InternalProperties.CROSSING_HINT, 1);
}
