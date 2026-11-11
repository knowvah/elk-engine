// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IPropertyHolder } from '../../../graph/properties/IPropertyHolder.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import type { CompoundGraphPreprocessor } from './CompoundGraphPreprocessor.js';
import { CrossHierarchyEdge } from './CrossHierarchyEdge.js';
import { ExternalPort } from './CompoundGraphPreprocessorExternalPort.js';

/*
 * The inside self loop and dummy creation methods of `CompoundGraphPreprocessor` (mission 7h, T6, H11): Java
 * `:616-684` and `:690-993`. Each function is the Java method of the same name; `self` is the processor whose two
 * fields (`crossHierarchyMap`, `dummyNodeMap`) the Java reads as `this`. Where a Java method exceeds a complexity limit
 * it is split into file-local helpers that keep the statement order (each helper names its Java lines). Java methods
 * with more than four parameters besides `self` take one args object with the Java names (the `ExternalPortDummyArgs`
 * precedent).
 */

/**
 * Java passes `null` for `portNodeSize` and `portPosition` of `LGraphUtil.createExternalPortDummy` at `:182-185`,
 * `:637-646`, `:655-664`, `:905-915` and `:923-933`. The landed `ExternalPortDummyArgs` types them as non-null `KVector`
 * (they are only read under fixed-ratio or fixed-position constraints, where Java would throw a NullPointerException
 * and TypeScript throws a TypeError); the Java `null` is passed through unchanged.
 */
export const JAVA_NULL_VECTOR = null as unknown as KVector;

////////////////////////////////////////////////////////////////////////////////////////////
// Inside Self Loop Processing

/** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java */
export function processInsideSelfLoops(self: CompoundGraphPreprocessor, nestedGraph: LGraph, node: LNode): void {
  // Check if inside self loops are enabled for the node
  if (!node.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE)) {
    return;
  }

  // Iterate over the edges and look for an inside self loop
  for (const lport of node.getPorts()) {
    // Avoid ConcurrentModificationExceptions
    const outEdges = LGraphUtil.toEdgeArray(lport.getOutgoingEdges());

    for (const outEdge of outEdges) {
      const isSelfLoop = outEdge.getTarget()!.getNode() === node;
      const isInsideSelfLoop = isSelfLoop && outEdge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);

      if (isInsideSelfLoop) {
        transformInsideSelfLoop(self, nestedGraph, outEdge);
      }
    }
  }
}

/** The body of `if (isInsideSelfLoop)` in `processInsideSelfLoops` (Java `:633-680`), split for the NLOC limit. */
function transformInsideSelfLoop(self: CompoundGraphPreprocessor, nestedGraph: LGraph, outEdge: LEdge): void {
  // Check if the ports have already been transformed into external port dummies
  const sourcePort = outEdge.getSource()!;
  const sourceExtPortDummy = insideSelfLoopPortDummy(self, nestedGraph, sourcePort, -1);

  const targetPort = outEdge.getTarget()!;
  const targetExtPortDummy = insideSelfLoopPortDummy(self, nestedGraph, targetPort, 1);

  // Create a new dummy edge
  const dummyEdge = createDummyEdge(nestedGraph, outEdge);
  dummyEdge.setSource(sourceExtPortDummy.getPorts()[0]!);
  dummyEdge.setTarget(targetExtPortDummy.getPorts()[0]!);

  // Remember the new edge
  self.crossHierarchyMap!.put(outEdge, new CrossHierarchyEdge(dummyEdge, nestedGraph, PortType.OUTPUT));

  nestedGraph.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.EXTERNAL_PORTS);
}

/**
 * The external port dummy of one end of an inside self loop: Java `:635-650` (source, net flow -1) and `:653-668`
 * (target, net flow 1), two copies of one block that differ only in the port and the net flow; called once per end in
 * the Java's order.
 */
function insideSelfLoopPortDummy(
  self: CompoundGraphPreprocessor,
  nestedGraph: LGraph,
  port: LPort,
  netFlow: number,
): LNode {
  let extPortDummy = self.dummyNodeMap.get(port) ?? null;
  if (extPortDummy === null) {
    extPortDummy = LGraphUtil.createExternalPortDummy({
      propertyHolder: port,
      portConstraints: PortConstraints.FREE,
      portSide: port.getSide(),
      netFlow,
      portNodeSize: JAVA_NULL_VECTOR,
      portPosition: JAVA_NULL_VECTOR,
      portSize: port.getSize(),
      layoutDirection: nestedGraph.getProperty(LayeredOptions.DIRECTION),
      layeredGraph: nestedGraph,
    });
    extPortDummy.setProperty(InternalProperties.ORIGIN, port);
    self.dummyNodeMap.set(port, extPortDummy);
    nestedGraph.getLayerlessNodes().push(extPortDummy);
  }
  return extPortDummy;
}

////////////////////////////////////////////////////////////////////////////////////////////
// General Hierarchical Edge Segment Processing

/** The parameters of `introduceHierarchicalEdgeSegment`, named as in Java. */
export interface HierarchicalEdgeSegmentArgs {
  /** the layered graph. */
  readonly graph: LGraph;
  /** the graph's parent node (every Java caller passes a non-null one). */
  readonly parentNode: LNode;
  /** the hierarchy-crossing edge that is being broken. */
  readonly origEdge: LEdge;
  /** the port that will be one of the two end points of the new segment. */
  readonly oppositePort: LPort;
  /** the type of the port to create as one of the segment's edge points. */
  readonly portType: PortType;
  /** a default external port we can reuse if external ports should be merged, or `null`. */
  readonly defaultExternalPort: ExternalPort | null;
}

/**
 * Does the actual work of creating a new hierarchical edge segment between an external port and a given opposite
 * port. The external port used for the segment is returned. The dummy edge is associated with the original
 * hierarchy-crossing edge in the cross hierarchy map.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function introduceHierarchicalEdgeSegment(
  self: CompoundGraphPreprocessor,
  args: HierarchicalEdgeSegmentArgs,
): ExternalPort {
  const { graph, parentNode, origEdge, portType } = args;

  // check if external ports are to be merged
  const mergeExternalPorts = graph.getProperty(LayeredOptions.MERGE_HIERARCHY_EDGES);

  // check if the edge connects to the parent node instead of to the outside world; if so, the
  // parentEndPort will be non-null
  let parentEndPort: LPort | null = null;
  if (portType === PortType.INPUT && origEdge.getSource()!.getNode() === parentNode) {
    parentEndPort = origEdge.getSource();
  } else if (portType === PortType.OUTPUT && origEdge.getTarget()!.getNode() === parentNode) {
    parentEndPort = origEdge.getTarget();
  }

  // only create a new external port if the current one is null or if ports are not to be merged
  // or if the connection actually ends at the parent node
  let externalPort = args.defaultExternalPort;
  if (externalPort === null || !mergeExternalPorts || parentEndPort !== null) {
    externalPort = createNewExternalPort(self, args, parentEndPort);
  } else {
    // we use an existing external port, so simply add the original edge to its list of
    // original edges
    externalPort.origEdges.push(origEdge);

    // merge the properties of the original edges
    const thickness = Math.max(
      externalPort.newEdge.getProperty(LayeredOptions.EDGE_THICKNESS),
      origEdge.getProperty(LayeredOptions.EDGE_THICKNESS),
    );
    externalPort.newEdge.setProperty(LayeredOptions.EDGE_THICKNESS, thickness);
  }

  self.crossHierarchyMap!.put(origEdge, new CrossHierarchyEdge(externalPort.newEdge, graph, portType));

  return externalPort;
}

/**
 * The side of a new external port in `introduceHierarchicalEdgeSegment` (Java `:752-762`), split from
 * {@link createNewExternalPort} for the NLOC limit.
 */
function externalPortSideOf(args: HierarchicalEdgeSegmentArgs, parentEndPort: LPort | null): PortSide {
  let externalPortSide = PortSide.UNDEFINED;
  if (parentEndPort !== null) {
    externalPortSide = parentEndPort.getSide();
  } else {
    // We try to infer the port side from the port type if its node has its port constraints
    // set to at least FIXED_SIDE; this may produce strange effects, so the safest thing is
    // for people to set compound node port constraints to FREE
    if (args.parentNode.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
      externalPortSide = args.portType === PortType.INPUT ? PortSide.WEST : PortSide.EAST;
    }
  }
  return externalPortSide;
}

/**
 * The new-external-port arm of `introduceHierarchicalEdgeSegment` (Java `:751-785`), split for the NLOC and CCN
 * limits; statement order unchanged.
 */
function createNewExternalPort(
  self: CompoundGraphPreprocessor,
  args: HierarchicalEdgeSegmentArgs,
  parentEndPort: LPort | null,
): ExternalPort {
  const { graph, parentNode, origEdge, oppositePort, portType } = args;
  // create a dummy node that will represent the external port
  const externalPortSide = externalPortSideOf(args, parentEndPort);
  const dummyNode = createExternalPortDummy(self, {
    graph,
    parentNode,
    portType,
    portSide: externalPortSide,
    edge: origEdge,
  });

  // create a dummy edge to be connected to the port
  const dummyEdge = createDummyEdge(parentNode.getGraph()!, origEdge);
  connectNewDummyEdge(dummyEdge, dummyNode, oppositePort, portType);

  // create the external port (the port is to be exported if the connection is not just to the
  // parent node)
  return new ExternalPort({
    origEdge,
    newEdge: dummyEdge,
    dummyNode,
    dummyPort: dummyNode.getProperty(InternalProperties.ORIGIN) as LPort,
    portType,
    exported: parentEndPort === null,
  });
}

/** The connection of the new dummy edge in `introduceHierarchicalEdgeSegment` (Java `:769-779`), split for the NLOC limit. */
function connectNewDummyEdge(dummyEdge: LEdge, dummyNode: LNode, oppositePort: LPort, portType: PortType): void {
  if (portType === PortType.INPUT) {
    // if the external port is an input port, the source of the edge must be connected to
    // the new dummy node
    dummyEdge.setSource(dummyNode.getPorts()[0]!);
    dummyEdge.setTarget(oppositePort);
  } else {
    // if the external port is an output port, the target of the edge must be connected to
    // the new dummy node
    dummyEdge.setSource(oppositePort);
    dummyEdge.setTarget(dummyNode.getPorts()[0]!);
  }
}

/**
 * Creates and initializes a new dummy edge for the given original hierarchy-crossing edge. All that remains to be done
 * afterwards is to properly connect the edge. Nice! (Java never reads `graph`; the parameter is kept.)
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function createDummyEdge(_graph: LGraph, origEdge: LEdge): LEdge {
  const dummyEdge = new LEdge();
  dummyEdge.copyProperties(origEdge);
  dummyEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
  return dummyEdge;
}

/**
 * Adapted from `ElkGraphImporter`. Count how many edges want the port to be an output port of the parent and how many
 * want it to be an input port. The result returned by this method is the so-called net flow as fed into
 * `createExternalPortDummy(..)`. The Java `int` counters use `Int32` ops (F11).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function calculateNetFlow(port: LPort): number {
  const node = port.getNode()!;
  const insideSelfLoopsEnabled = node.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE);

  let outputPortVote = 0;
  let inputPortVote = 0;

  // Iterate over outgoing edges
  for (const outgoingEdge of port.getOutgoingEdges()) {
    if (outgoingEdgeVotesInput(outgoingEdge, node, insideSelfLoopsEnabled)) {
      inputPortVote = Int32.add(inputPortVote, 1);
    } else {
      outputPortVote = Int32.add(outputPortVote, 1);
    }
  }

  // Iterate over incoming edges
  for (const incomingEdge of port.getIncomingEdges()) {
    if (incomingEdgeVotesOutput(incomingEdge, node, insideSelfLoopsEnabled)) {
      outputPortVote = Int32.add(outputPortVote, 1);
    } else {
      inputPortVote = Int32.add(inputPortVote, 1);
    }
  }

  return Int32.sub(outputPortVote, inputPortVote);
}

/**
 * The branch chain of the outgoing loop of `calculateNetFlow` (Java `:837-850`), split for the CCN limit: true where
 * the Java increments `inputPortVote`, false where it increments `outputPortVote`.
 */
function outgoingEdgeVotesInput(outgoingEdge: LEdge, node: LNode, insideSelfLoopsEnabled: boolean): boolean {
  const isSelfLoop = outgoingEdge.isSelfLoop();
  const isInsideSelfLoop =
    isSelfLoop && insideSelfLoopsEnabled && outgoingEdge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
  const targetNode = outgoingEdge.getTarget()!.getNode()!;

  if (isSelfLoop && isInsideSelfLoop) {
    return true;
  } else if (isSelfLoop && !isInsideSelfLoop) {
    return false;
  } else if (targetNode.getGraph()!.getParentNode() === node) {
    return true;
  } else {
    return false;
  }
}

/**
 * The branch chain of the incoming loop of `calculateNetFlow` (Java `:855-868`), split for the CCN limit: true where
 * the Java increments `outputPortVote`, false where it increments `inputPortVote`.
 */
function incomingEdgeVotesOutput(incomingEdge: LEdge, node: LNode, insideSelfLoopsEnabled: boolean): boolean {
  const isSelfLoop = incomingEdge.isSelfLoop();
  const isInsideSelfLoop =
    isSelfLoop && insideSelfLoopsEnabled && incomingEdge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
  const sourceNode = incomingEdge.getSource()!.getNode()!;

  if (isSelfLoop && isInsideSelfLoop) {
    return true;
  } else if (isSelfLoop && !isInsideSelfLoop) {
    return false;
  } else if (sourceNode.getGraph()!.getParentNode() === node) {
    return true;
  } else {
    return false;
  }
}

/** The parameters of `createExternalPortDummy` besides `self`, named as in Java. */
export interface ExternalPortDummyRequest {
  /** the graph. */
  readonly graph: LGraph;
  /** the graph's parent node. */
  readonly parentNode: LNode;
  /** the type of the new external port. */
  readonly portType: PortType;
  /** the side of the new external port. */
  readonly portSide: PortSide;
  /** the edge that will be connected to the external port. */
  readonly edge: LEdge;
}

/**
 * Retrieves a dummy node to be used to represent a new external port of the parent node and to connect a new segment
 * of the given hierarchical edge to. A proper dummy node might already have been created; if so, that one is returned.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function createExternalPortDummy(self: CompoundGraphPreprocessor, request: ExternalPortDummyRequest): LNode {
  const { graph, parentNode, portType, edge } = request;
  let dummyNode: LNode | null = null;

  // find the port on the outside of its parent node that the edge connects to
  const outsidePort = portType === PortType.INPUT ? edge.getSource()! : edge.getTarget()!;
  const layoutDirection = LGraphUtil.getDirection(graph);

  // check if the edge connects to the parent node or to something way outside...
  if (outsidePort.getNode() === parentNode) {
    dummyNode = parentPortDummy(self, request, outsidePort, layoutDirection);
  } else {
    dummyNode = outsideDummy(self, request, layoutDirection);
  }

  // set a few graph properties
  graph.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.EXTERNAL_PORTS);
  if (graph.getProperty(LayeredOptions.PORT_CONSTRAINTS).isSideFixed()) {
    graph.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
  } else {
    graph.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
  }

  return dummyNode;
}

/** The parent-node arm of `createExternalPortDummy` (Java `:900-918`), split for the NLOC limit. */
function parentPortDummy(
  self: CompoundGraphPreprocessor,
  request: ExternalPortDummyRequest,
  outsidePort: LPort,
  layoutDirection: Direction,
): LNode {
  const { graph, parentNode, portSide } = request;
  // we need to check if a dummy node has already been created for the port
  let dummyNode = self.dummyNodeMap.get(outsidePort) ?? null;
  if (dummyNode === null) {
    // Ticket #160 explains why we need to pass on a position here. While that works fine to determine port
    // orders, the exact port positions might yet need to be adjusted for some inside paddings
    dummyNode = LGraphUtil.createExternalPortDummy({
      propertyHolder: outsidePort,
      portConstraints: parentNode.getProperty(LayeredOptions.PORT_CONSTRAINTS),
      portSide,
      netFlow: calculateNetFlow(outsidePort),
      portNodeSize: JAVA_NULL_VECTOR,
      portPosition: outsidePort.getPosition(),
      portSize: outsidePort.getSize(),
      layoutDirection,
      layeredGraph: graph,
    });
    dummyNode.setProperty(InternalProperties.ORIGIN, outsidePort);
    self.dummyNodeMap.set(outsidePort, dummyNode);
  }
  return dummyNode;
}

/** The way-outside arm of `createExternalPortDummy` (Java `:920-936`), split for the NLOC limit. */
function outsideDummy(
  self: CompoundGraphPreprocessor,
  request: ExternalPortDummyRequest,
  layoutDirection: Direction,
): LNode {
  const { graph, parentNode, portType, portSide } = request;
  // We create a new dummy node in any case, and since there is no port yet we have to create one as well. We
  // do need to pass a position vector to keep an NPE from being thrown (#160), but it is questionable
  // whether this part of the code should actually be used with anything other than fixed port constraints.
  const dummyNode = LGraphUtil.createExternalPortDummy({
    propertyHolder: createExternalPortProperties(graph),
    portConstraints: parentNode.getProperty(LayeredOptions.PORT_CONSTRAINTS),
    portSide,
    netFlow: portType === PortType.INPUT ? -1 : 1,
    portNodeSize: JAVA_NULL_VECTOR,
    portPosition: new KVector(),
    portSize: new KVector(0, 0), // A dummy port is not considered to have a size (#766)
    layoutDirection,
    layeredGraph: graph,
  });
  const dummyPort = createPortForDummy(dummyNode, parentNode, portType);
  dummyNode.setProperty(InternalProperties.ORIGIN, dummyPort);
  self.dummyNodeMap.set(dummyPort, dummyNode);
  return dummyNode;
}

/**
 * Create suitable port properties for dummy external ports.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function createExternalPortProperties(graph: LGraph): IPropertyHolder {
  const propertyHolder = new MapPropertyHolder();
  // FIXME No idea why ...
  const offset = graph.getProperty(LayeredOptions.SPACING_EDGE_EDGE) / 2;
  propertyHolder.setProperty(LayeredOptions.PORT_BORDER_OFFSET, offset);
  return propertyHolder;
}

/**
 * Create a port for an existing external port dummy node.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPreprocessor.java
 */
export function createPortForDummy(dummyNode: LNode, parentNode: LNode, type: PortType): LPort {
  const graph = parentNode.getGraph()!;
  const layoutDirection = LGraphUtil.getDirection(graph);
  const port = new LPort();
  port.setNode(parentNode);
  switch (type) {
    case PortType.INPUT:
      port.setSide(PortSide.fromDirection(layoutDirection).opposed());
      break;
    case PortType.OUTPUT:
      port.setSide(PortSide.fromDirection(layoutDirection));
      break;
  }
  port.setProperty(LayeredOptions.PORT_BORDER_OFFSET, dummyNode.getProperty(LayeredOptions.PORT_BORDER_OFFSET));
  return port;
}
