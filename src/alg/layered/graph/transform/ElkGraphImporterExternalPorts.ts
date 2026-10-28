// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { ElkUtil } from '../../../../core/util/ElkUtil.js';
import type { ElkEdge } from '../../../../graph/ElkEdge.js';
import type { ElkLabel } from '../../../../graph/ElkLabel.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import * as Strings from '../../../../guava/Strings.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import type { LGraph } from '../LGraph.js';
import { LGraphUtil } from '../LGraphUtil.js';
import type { LNode } from '../LNode.js';
import type { LPort } from '../LPort.js';
import type { NodeAndPortMap } from './ElkGraphImporterMap.js';
import { transformLabel } from './ElkGraphImporterLabels.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// External Port Transformation

/**
 * Counts, for one port, the incident edges that make it an external port, stopping after the second one.
 * Split out of `checkExternalPorts`' loop body (complexity limits); the statements are Java's.
 */
function countExternalPortEdges(elkgraph: ElkNode, elkport: ElkPort, enableSelfLoops: boolean): number {
  // Find out if there are edges connected to external ports of the graph (this is the case
  // for inside self loops as well as for edges connected to children)
  let externalPortEdges = 0;

  for (const elkedge of ElkGraphUtil.allIncidentEdges(elkport)) {
    const isInsideSelfLoop =
      enableSelfLoops && elkedge.isSelfloop() && elkedge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
    const connectsToChild = elkedge.getSources().contains(elkport)
      ? elkgraph === (ElkGraphUtil.connectableShapeToNode(elkedge.getTargets().get(0)) as ElkNode).getParent()
      : elkgraph === (ElkGraphUtil.connectableShapeToNode(elkedge.getSources().get(0)) as ElkNode).getParent();

    if (isInsideSelfLoop || connectsToChild) {
      externalPortEdges++;
      if (externalPortEdges > 1) {
        break;
      }
    }
  }
  return externalPortEdges;
}

/**
 * Checks if external ports processing should be active. This is the case if the parent node has
 * ports and at least one of the following conditions is true:
 *
 * - Port label placement is set to `INSIDE` and at least one of the ports has a label.
 * - At least one of the ports has an edge that connects to the insides of the parent node.
 * - There is a self-loop that should be routed inside the node.
 *
 * @param elkgraph a KGraph we want to check for external ports.
 * @param graphProperties the set of graph properties to store our results in.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function checkExternalPorts(elkgraph: ElkNode, graphProperties: EnumSet<GraphProperties>): void {
  const enableSelfLoops = elkgraph.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE);
  const portLabelPlacement = elkgraph.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT);

  // We're iterating over the ports until we've determined that we have both external ports and
  // hyperedges, or if there are no more ports left
  let hasExternalPorts = false;
  let hasHyperedges = false;

  const portIterator = elkgraph.getPorts().iterator();
  let next = portIterator.next();
  while (next.done !== true && (!hasExternalPorts || !hasHyperedges)) {
    const elkport = next.value;
    const externalPortEdges = countExternalPortEdges(elkgraph, elkport, enableSelfLoops);

    // External ports?
    if (externalPortEdges > 0) {
      hasExternalPorts = true;
    } else if (portLabelPlacement.contains(PortLabelPlacement.INSIDE) && elkport.getLabels().size() > 0) {
      hasExternalPorts = true;
    }

    // Hyperedges, even?
    if (externalPortEdges > 1) {
      hasHyperedges = true;
    }
    next = portIterator.next();
  }

  // Update graph properties
  if (hasExternalPorts) {
    graphProperties.add(GraphProperties.EXTERNAL_PORTS);
  }

  if (hasHyperedges) {
    graphProperties.add(GraphProperties.HYPEREDGES);
  }
}

/**
 * Infers the port border offset of an external port that has none, as `transformExternalPort` does first.
 */
function ensurePortBorderOffset(elkport: ElkPort, portSide: PortSide): void {
  // If we don't have a port offset, infer one
  if (!elkport.getAllProperties().containsKey(LayeredOptions.PORT_BORDER_OFFSET)) {
    let portOffset: number;
    // if port coordinates are (0,0), we default to port offset 0 to make the common case frustration-free
    if (elkport.getX() === 0.0 && elkport.getY() === 0.0) {
      portOffset = 0.0;
    } else {
      portOffset = ElkUtil.calcPortOffset(elkport, portSide);
    }
    elkport.setProperty(LayeredOptions.PORT_BORDER_OFFSET, portOffset);
  }
}

/**
 * The part of an outside-placed port label that lies inside the node (`insidePart` of `transformExternalPort`).
 */
function computeLabelInsidePart(elkgraph: ElkNode, elkport: ElkPort, elklabel: ElkLabel, portSide: PortSide): number {
  let insidePart = 0;
  if (PortLabelPlacement.isFixed(elkgraph.getProperty(LayeredOptions.PORT_LABELS_PLACEMENT))) {
    // We use 0 as port border offset here, as we only want the label part that is
    // inside the node "after" the port.
    insidePart = ElkUtil.computeInsidePart(
      new KVector(elklabel.getX(), elklabel.getY()),
      new KVector(elklabel.getWidth(), elklabel.getHeight()),
      new KVector(elkport.getWidth(), elkport.getHeight()),
      0,
      portSide,
    );
  }
  return insidePart;
}

/**
 * Transforms all of the external port's labels onto the dummy's port. If the compound node wants to have its port
 * labels placed on the inside, we need to leave enough space for them by creating an LLabel for the KLabels. If the
 * compound node wants to have its port labels placed on the outside, we still need to leave enough space for them so
 * the port placement does not cause problems on the outside, but we also don't want to waste space inside. Thus, for
 * east and west ports, we reduce the label width to zero, otherwise we reduce the label height to zero.
 */
function transformExternalPortLabels(elkgraph: ElkNode, elkport: ElkPort, dummyPort: LPort, portSide: PortSide): void {
  const insidePortLabels = elkgraph
    .getProperty(LayeredOptions.PORT_LABELS_PLACEMENT)
    .contains(PortLabelPlacement.INSIDE);

  for (const elklabel of elkport.getLabels()) {
    if (!elklabel.getProperty(LayeredOptions.NO_LAYOUT) && !Strings.isNullOrEmpty(elklabel.getText())) {
      const llabel = transformLabel(elklabel);
      dummyPort.getLabels().push(llabel);

      // If port labels are placed outside, modify the size
      // If the port labels are fixed, we should consider the part that is inside the node and not 0.
      if (!insidePortLabels) {
        const insidePart = computeLabelInsidePart(elkgraph, elkport, elklabel, portSide);
        switch (portSide) {
          case PortSide.EAST:
          case PortSide.WEST:
            llabel.getSize().x = insidePart;
            break;

          case PortSide.NORTH:
          case PortSide.SOUTH:
            llabel.getSize().y = insidePart;
            break;
        }
      }
    }
  }
}

/**
 * Copies the relevant label spacings onto the dummy. It's not the spacings in the graph, but in the parent.
 */
function copyLabelSpacings(elkgraph: ElkNode, dummy: LNode): void {
  // Java dereferences the parent unconditionally (NullPointerException for a top-level graph; replay rows
  // import external ports only below the root, see the T1 `target` field).
  const parent = elkgraph.getParent() as ElkNode;
  dummy.setProperty(
    LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL,
    parent.getProperty(LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL),
  );
  dummy.setProperty(
    LayeredOptions.SPACING_LABEL_PORT_VERTICAL,
    parent.getProperty(LayeredOptions.SPACING_LABEL_PORT_VERTICAL),
  );
  dummy.setProperty(LayeredOptions.SPACING_LABEL_LABEL, parent.getProperty(LayeredOptions.SPACING_LABEL_LABEL));
}

/**
 * Transforms the given external port into a dummy node.
 *
 * @param map the importer's map between ElkGraph elements and the LGraph elements created for them
 * @param elkgraph the original KGraph
 * @param lgraph the corresponding layered graph
 * @param elkport the port to be transformed
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function transformExternalPort(map: NodeAndPortMap, elkgraph: ElkNode, lgraph: LGraph, elkport: ElkPort): void {
  // We need some information about the port
  const elkportPosition = new KVector(
    elkport.getX() + elkport.getWidth() / 2.0,
    elkport.getY() + elkport.getHeight() / 2.0,
  );
  const netFlow = calculateNetFlow(elkport);
  const portConstraints: PortConstraints = elkgraph.getProperty(LayeredOptions.PORT_CONSTRAINTS);

  // If we don't have a proper port side, calculate one
  const portSide = elkport.getProperty(LayeredOptions.PORT_SIDE);
  // (Java: assert portSide != PortSide.UNDEFINED; no devAssert helper exists, the JVM runs without -ea)

  ensurePortBorderOffset(elkport, portSide);

  // Create the external port dummy node
  const graphSize = new KVector(elkgraph.getWidth(), elkgraph.getHeight());
  const dummy = LGraphUtil.createExternalPortDummy({
    propertyHolder: elkport,
    portConstraints,
    portSide,
    netFlow,
    portNodeSize: graphSize,
    portPosition: elkportPosition,
    portSize: new KVector(elkport.getWidth(), elkport.getHeight()),
    layoutDirection: lgraph.getProperty(LayeredOptions.DIRECTION),
    layeredGraph: lgraph,
  });
  dummy.setProperty(InternalProperties.ORIGIN, elkport);

  // The dummy only has one port
  const dummyPort = dummy.getPorts()[0] as LPort;
  dummyPort.setConnectedToExternalNodes(isConnectedToExternalNodes(elkport));
  dummy.setProperty(LayeredOptions.PORT_LABELS_PLACEMENT, PortLabelPlacement.outside());

  // Transform all of the port's labels
  transformExternalPortLabels(elkgraph, elkport, dummyPort, portSide);

  // Remember the relevant spacings that will apply to the labels here. It's not the spacings in the graph, but
  // in the parent
  copyLabelSpacings(elkgraph, dummy);

  // Put the external port dummy into our graph and associate it with the original KPort
  lgraph.getLayerlessNodes().push(dummy);
  map.set(elkport, dummy);
}

/** The edges' vote of one port, split out of `calculateNetFlow` per Java loop. */
interface Votes {
  output: number;
  input: number;
}

/** The first loop of `calculateNetFlow`: outgoing edges. */
function voteOutgoing(elkport: ElkPort, elkgraph: ElkNode, insideSelfLoopsEnabled: boolean, votes: Votes): void {
  for (const outgoingEdge of elkport.getOutgoingEdges()) {
    const isSelfLoop = outgoingEdge.isSelfloop();
    const isInsideSelfLoop =
      isSelfLoop && insideSelfLoopsEnabled && outgoingEdge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
    const targetNode = ElkGraphUtil.connectableShapeToNode(outgoingEdge.getTargets().get(0)) as ElkNode;

    if (isSelfLoop && isInsideSelfLoop) {
      votes.input++;
    } else if (isSelfLoop && !isInsideSelfLoop) {
      votes.output++;
    } else if (targetNode.getParent() === elkgraph || targetNode === elkgraph) {
      votes.input++;
    } else {
      votes.output++;
    }
  }
}

/** The second loop of `calculateNetFlow`: incoming edges. */
function voteIncoming(elkport: ElkPort, elkgraph: ElkNode, insideSelfLoopsEnabled: boolean, votes: Votes): void {
  for (const incomingEdge of elkport.getIncomingEdges()) {
    const isSelfLoop = incomingEdge.isSelfloop();
    const isInsideSelfLoop =
      isSelfLoop && insideSelfLoopsEnabled && incomingEdge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO);
    const sourceNode = ElkGraphUtil.connectableShapeToNode(incomingEdge.getSources().get(0)) as ElkNode;

    if (isSelfLoop && isInsideSelfLoop) {
      votes.output++;
    } else if (isSelfLoop && !isInsideSelfLoop) {
      votes.input++;
    } else if (sourceNode.getParent() === elkgraph || sourceNode === elkgraph) {
      votes.output++;
    } else {
      votes.input++;
    }
  }
}

/**
 * Count how many edges want the port to be an output port of the parent and how many want it to
 * be an input port. An edge coming into the port from the inside votes for the port to be an
 * output port of the parent, as does an edge leaving the port for the outside. The result returned
 * by this method is the so-called net flow as fed into `createExternalPort(..)`.
 *
 * @param elkport the port to look at.
 * @return the port's net flow.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function calculateNetFlow(elkport: ElkPort): number {
  const elkgraph = elkport.getParent() as ElkNode;
  const insideSelfLoopsEnabled = elkgraph.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE);

  const votes: Votes = { output: 0, input: 0 };

  // Iterate over outgoing edges
  voteOutgoing(elkport, elkgraph, insideSelfLoopsEnabled, votes);

  // Iterate over incoming edges
  voteIncoming(elkport, elkgraph, insideSelfLoopsEnabled, votes);

  return votes.output - votes.input;
}

/**
 * Checks whether the given (external) port has connections to the outside (that is, to non-descendants).
 */
function isConnectedToExternalNodes(elkport: ElkPort): boolean {
  const parent = elkport.getParent() as ElkNode;

  for (const outEdge of elkport.getOutgoingEdges() as Iterable<ElkEdge>) {
    const targetNode = ElkGraphUtil.connectableShapeToNode(outEdge.getTargets().get(0)) as ElkNode;

    if (!ElkGraphUtil.isDescendant(targetNode, parent)) {
      return true;
    }
  }

  for (const inEdge of elkport.getIncomingEdges() as Iterable<ElkEdge>) {
    const sourceNode = ElkGraphUtil.connectableShapeToNode(inEdge.getSources().get(0)) as ElkNode;

    if (!ElkGraphUtil.isDescendant(sourceNode, parent)) {
      return true;
    }
  }

  return false;
}
