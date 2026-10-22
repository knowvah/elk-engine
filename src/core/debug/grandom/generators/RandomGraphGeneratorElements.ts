// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import { PortSide } from '../../../options/PortSide.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { connect } from './RandomGraphGeneratorConnect.js';
import { RandomGraphGenerator } from './RandomGraphGenerator.js';

/** The number of ports on the north, east, south and west side of a node. */
type SideCounts = readonly [north: number, east: number, south: number, west: number];

/**
 * Creates an independent set of nodes.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param n the number of nodes
 * @returns the list of created nodes
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function createIndependentSet(gen: RandomGraphGenerator, parent: ElkNode, n: number): ElkNode[] {
  const nodes: ElkNode[] = [];
  for (let i = 0; i < n; ++i) {
    const node = createNode(gen, parent);
    nodes.push(node);
  }
  return nodes;
}

/**
 * Creates a clique.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param n the number of nodes
 * @returns the list of created nodes
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function createClique(gen: RandomGraphGenerator, parent: ElkNode, n: number): ElkNode[] {
  const nodes = createIndependentSet(gen, parent, n);
  for (let i = 0; i < n - 1; ++i) {
    for (let j = i + 1; j < n; ++j) {
      connect(gen, nodes[i] as ElkNode, nodes[j] as ElkNode);
    }
  }
  return nodes;
}

/**
 * Creates a node.
 *
 * @param gen the generator
 * @param parent the parent node
 * @returns the node
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function createNode(gen: RandomGraphGenerator, parent: ElkNode): ElkNode {
  const node = ElkGraphUtil.createNode(null);
  const hypernodeChance = gen.get(GeneratorOptions.HYPERNODE_CHANCE);
  if (hypernodeChance > 0.0 && gen.random.nextFloat() < hypernodeChance) {
    node.setProperty(CoreOptions.HYPERNODE, true);
  }

  // create label and identifier
  const nodeid = String(gen.nodeLabelCounter++);
  if (gen.get(GeneratorOptions.CREATE_NODE_LABELS)) {
    ElkGraphUtil.createLabelWithText('N' + nodeid, node);
  }
  node.setIdentifier('n' + nodeid);

  // set size of the node
  if (gen.get(GeneratorOptions.SET_NODE_SIZE)) {
    node.setWidth(gen.get(GeneratorOptions.NODE_WIDTH).floatVal(gen.random));
    node.setHeight(gen.get(GeneratorOptions.NODE_HEIGHT).floatVal(gen.random));
  }

  // set port constraints
  const portConstraints = gen.get(GeneratorOptions.PORT_CONSTRAINTS);
  if (portConstraints !== PortConstraints.UNDEFINED) {
    node.setProperty(CoreOptions.PORT_CONSTRAINTS, portConstraints);
  }

  parent.getChildren().add(node);
  return node;
}

/**
 * Reads the four side probabilities of ports (north, east, south, west) and draws a side. Java
 * inlines this in `createPort`; the split keeps TS within the function-length limit and leaves the
 * order of reads and the single `nextInt` draw unchanged.
 */
function randomPortSide(gen: RandomGraphGenerator, source: boolean): PortSide {
  let northProb: number, eastProb: number, southProb: number, westProb: number;
  if (source) {
    northProb = gen.get(GeneratorOptions.OUTGOING_NORTH_SIDE);
    eastProb = gen.get(GeneratorOptions.OUTGOING_EAST_SIDE);
    southProb = gen.get(GeneratorOptions.OUTGOING_SOUTH_SIDE);
    westProb = gen.get(GeneratorOptions.OUTGOING_WEST_SIDE);
  } else {
    northProb = gen.get(GeneratorOptions.INCOMING_NORTH_SIDE);
    eastProb = gen.get(GeneratorOptions.INCOMING_EAST_SIDE);
    southProb = gen.get(GeneratorOptions.INCOMING_SOUTH_SIDE);
    westProb = gen.get(GeneratorOptions.INCOMING_WEST_SIDE);
  }
  const p = gen.random.nextInt(northProb + eastProb + southProb + westProb);
  let portSide: PortSide;
  if (p < northProb) {
    portSide = PortSide.NORTH;
  } else if (p < northProb + eastProb) {
    portSide = PortSide.EAST;
  } else if (p < northProb + eastProb + southProb) {
    portSide = PortSide.SOUTH;
  } else {
    portSide = PortSide.WEST;
  }
  return portSide;
}

/**
 * Creates a port.
 *
 * @param gen the generator
 * @param node the containing node
 * @param source `true` if the port will be used as a source port, `false` if it will be used as a
 *     target port.
 * @returns the port
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function createPort(gen: RandomGraphGenerator, node: ElkNode, source: boolean): ElkPort {
  const port = ElkGraphUtil.createPort(null);
  node.getPorts().add(port);

  // create label and identifier
  const portId = String(gen.portLabelCounter++);
  if (gen.get(GeneratorOptions.CREATE_PORT_LABELS)) {
    ElkGraphUtil.createLabelWithText('P' + portId, port);
  }
  port.setIdentifier('p' + portId);

  // set size of the port
  if (gen.get(GeneratorOptions.SET_PORT_SIZE)) {
    port.setWidth(gen.get(GeneratorOptions.PORT_WIDTH).floatVal(gen.random));
    port.setHeight(gen.get(GeneratorOptions.PORT_HEIGHT).floatVal(gen.random));
  }

  if (gen.get(GeneratorOptions.PORT_CONSTRAINTS).isSideFixed()) {
    // determine a random node side
    port.setProperty(CoreOptions.PORT_SIDE, randomPortSide(gen, source));
  }

  return port;
}

/** Counts the ports on each side of the node (the first loop of Java `distributePorts`). */
function countPortsPerSide(node: ElkNode): SideCounts {
  let northCount = 0,
    eastCount = 0,
    southCount = 0,
    westCount = 0;
  for (const port of node.getPorts()) {
    switch (port.getProperty(CoreOptions.PORT_SIDE)) {
      case PortSide.NORTH:
        northCount++;
        break;
      case PortSide.EAST:
        eastCount++;
        break;
      case PortSide.SOUTH:
        southCount++;
        break;
      case PortSide.WEST:
        westCount++;
        break;
    }
  }
  return [northCount, eastCount, southCount, westCount];
}

/** `(count + 1) * (portSize + PORT_SEPARATION)` in `float` arithmetic (an `int` widens to `float`). */
function requiredExtent(count: number, portSize: number): number {
  return Math.fround(Math.fround(portSize + RandomGraphGenerator.PORT_SEPARATION) * (count + 1));
}

/** Makes sure the node is big enough to contain all ports (draws the port width, then height). */
function ensureNodeSize(gen: RandomGraphGenerator, node: ElkNode, counts: SideCounts): void {
  const [northCount, eastCount, southCount, westCount] = counts;
  const portWidth = gen.get(GeneratorOptions.PORT_WIDTH).floatVal(gen.random);
  const portHeight = gen.get(GeneratorOptions.PORT_HEIGHT).floatVal(gen.random);
  if (node.getWidth() < requiredExtent(northCount, portWidth)) {
    node.setWidth(requiredExtent(northCount, portWidth));
  }
  if (node.getWidth() < requiredExtent(southCount, portWidth)) {
    node.setWidth(requiredExtent(southCount, portWidth));
  }
  if (node.getHeight() < requiredExtent(eastCount, portHeight)) {
    node.setHeight(requiredExtent(eastCount, portHeight));
  }
  if (node.getHeight() < requiredExtent(westCount, portHeight)) {
    node.setHeight(requiredExtent(westCount, portHeight));
  }
}

/** The distance between ports on the north, east, south and west side (doubles, in Java `distributePorts`). */
function sideDeltas(node: ElkNode, counts: SideCounts): SideCounts {
  const [northCount, eastCount, southCount, westCount] = counts;
  return [
    node.getWidth() / (northCount + 1),
    node.getHeight() / (eastCount + 1),
    node.getWidth() / (southCount + 1),
    node.getHeight() / (westCount + 1),
  ];
}

/** Distributes the ports on each node side (the last part of Java `distributePorts`). */
function placePorts(node: ElkNode, counts: SideCounts): void {
  const [northDelta, eastDelta, southDelta, westDelta] = sideDeltas(node, counts);
  let northPos = 0,
    eastPos = 0,
    southPos = 0,
    westPos = 0;
  for (const port of node.getPorts()) {
    switch (port.getProperty(CoreOptions.PORT_SIDE)) {
      case PortSide.NORTH:
        northPos += northDelta;
        port.setLocation(northPos - port.getWidth() / 2, -port.getHeight());
        break;
      case PortSide.EAST:
        eastPos += eastDelta;
        port.setLocation(node.getWidth(), eastPos - port.getHeight() / 2);
        break;
      case PortSide.SOUTH:
        southPos += southDelta;
        port.setLocation(southPos - port.getWidth() / 2, node.getHeight());
        break;
      case PortSide.WEST:
        westPos += westDelta;
        port.setLocation(-port.getWidth(), westPos - port.getHeight() / 2);
        break;
    }
  }
}

/**
 * Distribute all ports on the border of the given node.
 *
 * @param gen the generator
 * @param node a node
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function distributePorts(gen: RandomGraphGenerator, node: ElkNode): void {
  // count the ports on each side of the node
  const counts = countPortsPerSide(node);

  // make sure the node is big enough to contain all ports
  ensureNodeSize(gen, node, counts);

  // distribute the ports on each node side
  placePorts(node, counts);
}
