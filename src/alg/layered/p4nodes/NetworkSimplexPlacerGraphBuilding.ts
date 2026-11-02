// SPDX-License-Identifier: EPL-2.0
import { NEdge } from '../../common/networksimplex/NEdge.js';
import { NNode } from '../../common/networksimplex/NNode.js';
import { ElkMargin } from '../../../core/math/ElkMargin.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { d2i } from '../../../java/lang/JavaMath.js';
import * as Lists from '../../../guava/Lists.js';
import * as Iterables from '../../../guava/Iterables.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import type { Layer } from '../graph/Layer.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { NodeFlexibility } from '../options/NodeFlexibility.js';
import { Spacings } from '../options/Spacings.js';
import { NODE_SIZE_WEIGHT_FLEXIBLE, NODE_SIZE_WEIGHT_STATIC } from './NetworkSimplexPlacerConstants.js';
import { EdgeRep } from './NetworkSimplexPlacerEdgeRep.js';
import { isFlexibleNode } from './NetworkSimplexPlacerFlexibleNode.js';
import { NodeRep } from './NetworkSimplexPlacerNodeRep.js';
import type { NetworkSimplexPlacerState } from './NetworkSimplexPlacerState.js';
import { getEdgeWeight, isHandledEdge } from './NetworkSimplexPlacerWeights.js';

/**
 * Builds the auxiliary graph on which the network simplex algorithm is run.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/NetworkSimplexPlacer.java
 */
export function buildInitialAuxiliaryGraph(s: NetworkSimplexPlacerState): void {
  for (const l of s.lGraph!) {
    transformLayer(s, l);
  }
  transformEdges(s);
}

/**
 * Transforms all nodes of the passed `Layer` according to their level of `PortConstraints` into their corresponding
 * `NodeRep`. Additionally adds separating edges to assert the node order within each layer and proper spacing.
 */
export function transformLayer(s: NetworkSimplexPlacerState, layer: Layer): void {
  let lastRep: NodeRep | null = null;
  for (const lNode of layer) {
    let nodeRep: NodeRep;
    if (isFlexibleNode(lNode)) {
      nodeRep = transformFixedOrderNode(s, lNode);
    } else {
      nodeRep = transformFixedPosNode(s, lNode);
    }
    s.nodeReps![lNode.id] = nodeRep;

    // if there is a previous node in the layer, we have to create a separation edge
    if (lastRep !== null) {
      let spacing =
        lastRep.origin.getMargin().bottom +
        s.spacings!.getVerticalSpacing(lastRep.origin, lNode) +
        lNode.getMargin().top;

      if (!lastRep.isFlexible) {
        // for non-flexible nodes their height must be included
        // in the minimal length of the separation edge
        spacing += lastRep.origin.getSize().y;
      }

      NEdge.of()
        .delta(d2i(Math.ceil(spacing)))
        .weight(0)
        .source(lastRep.tail)
        .target(nodeRep.head)
        .create();
    }

    // remember current elements for next iteration
    lastRep = nodeRep;
  }
}

/**
 * @return a `NodeRep` instance that basically contains two references to `LNode`.
 */
export function transformFixedPosNode(s: NetworkSimplexPlacerState, lNode: LNode): NodeRep {
  const singleNode = NNode.of().origin(lNode).type('non-flexible').create(s.nGraph!);

  // register the ports with the node
  lNode
    .getPorts()
    .filter((p) => PortSide.SIDES_EAST_WEST.has(p.getSide()))
    .forEach((p) => s.portMap.set(p, singleNode));

  return new NodeRep(lNode, false, singleNode, singleNode);
}

/**
 * @return the corners that were created for `LNode`.
 */
export function transformFixedOrderNode(s: NetworkSimplexPlacerState, lNode: LNode): NodeRep {
  // -----------------------------------
  //          corner creation
  // -----------------------------------
  const topLeft = NNode.of().origin(lNode).type('flexible-head').create(s.nGraph!);
  const bottomLeft = NNode.of().origin(lNode).type('flexible-tail').create(s.nGraph!);
  const corners = new NodeRep(lNode, true, topLeft, bottomLeft);

  // -----------------------------------
  //       weight & minimum length
  // -----------------------------------
  // the LabelAndNodeSizeProcessor ensures that any node size constraint is satisfied,
  //  i.e. the node's size is at least the specified minimum size and, if desired,
  //  the node is resized according to owned ports and labels
  // as such we can safely use the current height as minimum height
  const minHeight = lNode.getSize().y;

  const nf = NodeFlexibility.getNodeFlexibility(lNode);
  let sizeWeight = NODE_SIZE_WEIGHT_STATIC;
  if (nf.isFlexibleSize()) {
    // we are allowed to enlarge to node
    //  nevertheless, a little weight is good, otherwise the node can become arbitrarily tall
    //  especially since the edges that connect the node's do not carry nay weight
    sizeWeight = NODE_SIZE_WEIGHT_FLEXIBLE;
  }

  const nodeSizeEdge = NEdge.of()
    .weight(sizeWeight)
    .delta(d2i(Math.ceil(minHeight)))
    .source(topLeft)
    .target(bottomLeft)
    .create();

  if (nf === NodeFlexibility.NODE_SIZE_WHERE_SPACE_PERMITS) {
    s.flexibleWhereSpacePermitsEdges.add(nodeSizeEdge);
  }

  // -----------------------------------
  //          port transformation
  // -----------------------------------
  // convert the ports to NNodes, note that the list of westward ports
  // must be reversed since their original order is from bottom to top
  transformPorts(s, Lists.reverse(lNode.getPortSideView(PortSide.WEST)), corners);
  transformPorts(s, lNode.getPortSideView(PortSide.EAST), corners);

  // return the corners for further processing
  return corners;
}

/**
 * The `spacing` computation of the port loop in `transformPorts` (Java `:529-541`), split out to meet the complexity
 * limit.
 */
function spacingBefore(lastPort: LPort | null, portSurrounding: ElkMargin, portSpacing: number): number {
  let spacing = 0;
  if (lastPort === null) {
    spacing = portSurrounding.top;
  } else {
    spacing = portSpacing;
    spacing += lastPort.getSize().y;
    // TODO only if PORT_LABELS is set?
    // + lastPort.getMargin().bottom
    // + port.getMargin().top;
  }
  return spacing;
}

/**
 * The `portSurrounding` lookup at the start of `transformPorts` (Java `:521-526`), split out to meet the complexity
 * limit.
 */
function portSurroundingOf(origin: LNode): ElkMargin {
  const portSurrounding: ElkMargin | null = Spacings.getIndividualOrDefault(
    origin,
    LayeredOptions.SPACING_PORTS_SURROUNDING,
  );
  if (portSurrounding === null) {
    // No additional port spacing set
    return new ElkMargin();
  }
  return portSurrounding;
}

export function transformPorts(s: NetworkSimplexPlacerState, ports: Iterable<LPort>, corners: NodeRep): void {
  if (Iterables.isEmpty(ports)) {
    // nothing to do ...
    // the top and bottom border of the node are already safely spaced apart
    return;
  }

  const portSpacing = Spacings.getIndividualOrDefault(corners.origin, LayeredOptions.SPACING_PORT_PORT);
  const portSurrounding = portSurroundingOf(corners.origin);

  let lastNNode = corners.head;
  let lastPort: LPort | null = null;
  for (const port of ports) {
    // spacing between the current pair of ports (or to the top border of the node)
    const spacing = spacingBefore(lastPort, portSurrounding, portSpacing);

    // create NNode for the port
    const nNode = NNode.of().origin(port).type('port').create(s.nGraph!);
    s.portMap.set(port, nNode);

    // connect with previous NNode
    NEdge.of()
      .weight(0)
      .delta(d2i(Math.ceil(spacing)))
      .source(lastNNode)
      .target(nNode)
      .create();

    lastPort = port;
    lastNNode = nNode;
  }

  // and connect to the bottom border
  NEdge.of()
    .weight(0)
    .delta(d2i(Math.ceil(portSurrounding.bottom + lastPort!.getSize().y)))
    .source(lastNNode)
    .target(corners.tail)
    .create();
}

export function transformEdges(s: NetworkSimplexPlacerState): void {
  s.lGraph!.getLayers()
    .flatMap((layer) => layer.getNodes())
    .flatMap((node) => [...node.getOutgoingEdges()])
    .filter((e) => isHandledEdge(e))
    .forEach((e) => transformEdge(s, e));
}

/**
 * The offset of a port's anchor, relative to the node's position for non-flexible nodes (Java `:581-590`, once per
 * end of the edge); split out to meet the complexity limit.
 */
function portOffset(rep: NodeRep, port: LPort): number {
  let offset = port.getAnchor().y;
  // for non-flexible nodes, ports are relative to node positions
  if (!rep.isFlexible) {
    offset += port.getPosition().y;
  }
  return offset;
}

export function transformEdge(s: NetworkSimplexPlacerState, lEdge: LEdge): void {
  // a dummy node
  const dummy = NNode.of().type('edge').create(s.nGraph!);

  // calculate port offsets
  const srcRep = s.nodeReps![lEdge.getSource()!.getNode()!.id]!;
  const tgtRep = s.nodeReps![lEdge.getTarget()!.getNode()!.id]!;
  const srcPort = lEdge.getSource()!;
  const tgtPort = lEdge.getTarget()!;

  const srcOffset = portOffset(srcRep, srcPort);
  const tgtOffset = portOffset(tgtRep, tgtPort);
  // The Java `assert DoubleMath.fuzzyEquals(srcOffset - tgtOffset, Math.round(srcOffset - tgtOffset), EPSILON)`
  // ("Port positions must be integral", NetworkSimplexPlacer.java:592) is omitted (N5).

  const tgtDelta = d2i(Math.max(0, srcOffset - tgtOffset));
  const srcDelta = d2i(Math.max(0, tgtOffset - srcOffset));

  const weight = getEdgeWeight(lEdge);

  // an edge to the source
  const left = NEdge.of(lEdge)
    .weight(weight)
    .delta(srcDelta)
    .source(dummy)
    .target(s.portMap.get(lEdge.getSource()!)!)
    .create();

  // an edge to the target
  const right = NEdge.of(lEdge)
    .weight(weight)
    .delta(tgtDelta)
    .source(dummy)
    .target(s.portMap.get(lEdge.getTarget()!)!)
    .create();

  // remember
  const edgeRep = new EdgeRep(lEdge, dummy, left, right);
  s.edgeReps![lEdge.id] = edgeRep;
}
