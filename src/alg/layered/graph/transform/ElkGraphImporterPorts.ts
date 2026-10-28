// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../../core/options/Direction.js';
import type { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { ElkConnectableShape } from '../../../../graph/ElkConnectableShape.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import * as Strings from '../../../../guava/Strings.js';
import type { EnumSet } from '../../../../java/util/EnumSet.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LGraphUtil } from '../LGraphUtil.js';
import { LPort } from '../LPort.js';
import type { LNode } from '../LNode.js';
import { transformLabel } from './ElkGraphImporterLabels.js';
import type { NodeAndPortMap } from './ElkGraphImporterMap.js';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Port Transformation

/**
 * What `transformPort` needs to know about the node and graph the port lands in: Java's `graphProperties`,
 * `layoutDirection` and `portConstraints` parameters (grouped for the five-parameter limit).
 */
export interface PortTransformContext {
  /** the graph properties of the graph the transformed port will be part of; modified depending on the port. */
  readonly graphProperties: EnumSet<GraphProperties>;
  /** the layout direction in the graph the port will be part of. */
  readonly layoutDirection: Direction;
  /** the port constraints of the port's node. */
  readonly portConstraints: PortConstraints;
}

/** Whether any of the shapes is a descendant of the port's parent node (the three `anyMatch` stream tails). */
function anyDescendant(shapes: Iterable<ElkConnectableShape>, parent: ElkNode | null): boolean {
  for (const shape of shapes) {
    if (ElkGraphUtil.isDescendant(ElkGraphUtil.connectableShapeToNode(shape) as ElkNode, parent as ElkNode)) {
      return true;
    }
  }
  return false;
}

/** All targets of each edge of the port's outgoing edges. */
function* outgoingTargets(elkport: ElkPort): Generator<ElkConnectableShape> {
  for (const edge of elkport.getOutgoingEdges()) {
    yield* edge.getTargets();
  }
}

/** All sources of each edge of the port's incoming edges. */
function* incomingSources(elkport: ElkPort): Generator<ElkConnectableShape> {
  for (const edge of elkport.getIncomingEdges()) {
    yield* edge.getSources();
  }
}

/** Whether the port has connections to or from descendants of its node, or inside self loops. */
function hasConnectionsToDescendants(elkport: ElkPort): boolean {
  // check if the original port has any outgoing connections to descendants of its node
  let connectionsToDescendants = anyDescendant(outgoingTargets(elkport), elkport.getParent());

  // there could be yet incoming connections from descendants
  if (!connectionsToDescendants) {
    // check if the original port has any incoming connections from descendants of its node
    connectionsToDescendants = anyDescendant(incomingSources(elkport), elkport.getParent());
  }

  // if there are still no connections to descendants, there might yet be inside self loops involved
  if (!connectionsToDescendants) {
    for (const edge of elkport.getOutgoingEdges()) {
      if (edge.isSelfloop() && edge.getProperty(LayeredOptions.INSIDE_SELF_LOOPS_YO)) {
        connectionsToDescendants = true;
        break;
      }
    }
  }
  return connectionsToDescendants;
}

/** The final `switch (layoutDirection)` of `transformPort`. */
function markNorthSouthPorts(lport: LPort, context: PortTransformContext): void {
  const side = lport.getSide();
  const { graphProperties, layoutDirection } = context;
  switch (layoutDirection) {
    case Direction.LEFT:
    case Direction.RIGHT:
      if (side === PortSide.NORTH || side === PortSide.SOUTH) {
        graphProperties.add(GraphProperties.NORTH_SOUTH_PORTS);
      }
      break;
    case Direction.UP:
    case Direction.DOWN:
      if (side === PortSide.EAST || side === PortSide.WEST) {
        graphProperties.add(GraphProperties.NORTH_SOUTH_PORTS);
      }
      break;
  }
}

/** Creates the port's labels. */
function transformPortLabels(elkport: ElkPort, lport: LPort): void {
  for (const elklabel of elkport.getLabels()) {
    if (!elklabel.getProperty(LayeredOptions.NO_LAYOUT) && !Strings.isNullOrEmpty(elklabel.getText())) {
      lport.getLabels().push(transformLabel(elklabel));
    }
  }
}

/**
 * Transforms the given port. The new port will be added to the given node and will be
 * registered with the `nodeAndPortMap`.
 *
 * @param map the importer's map between ElkGraph elements and the LGraph elements created for them
 * @param elkport the port to transform.
 * @param parentLNode the node the port should be added to.
 * @param context the graph properties (modified depending on the port's properties), layout direction and port
 *                constraints of the graph and node the port is part of.
 * @return the transformed port.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export function transformPort(
  map: NodeAndPortMap,
  elkport: ElkPort,
  parentLNode: LNode,
  context: PortTransformContext,
): LPort {
  // create layered port, copying its position
  const lport = new LPort();
  lport.copyProperties(elkport);
  lport.setSide(elkport.getProperty(LayeredOptions.PORT_SIDE));
  lport.setProperty(InternalProperties.ORIGIN, elkport);
  lport.setNode(parentLNode);

  const portSize = lport.getSize();
  portSize.x = elkport.getWidth();
  portSize.y = elkport.getHeight();

  const portPos = lport.getPosition();
  portPos.x = elkport.getX();
  portPos.y = elkport.getY();

  map.set(elkport, lport);

  // if we have found connections to / from descendants, mark the port accordingly
  lport.setProperty(InternalProperties.INSIDE_CONNECTIONS, hasConnectionsToDescendants(elkport));

  // initialize the port's side, offset, and anchor point
  LGraphUtil.initializePort(
    lport,
    context.portConstraints,
    context.layoutDirection,
    elkport.getProperty(LayeredOptions.PORT_ANCHOR),
  );

  // create the port's labels
  transformPortLabels(elkport, lport);

  markNorthSouthPorts(lport, context);

  return lport;
}
