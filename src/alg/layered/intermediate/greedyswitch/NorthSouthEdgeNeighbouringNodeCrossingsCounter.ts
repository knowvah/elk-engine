// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import type { LPort } from '../../graph/LPort.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { CrossMinUtil } from '../../p3order/counting/CrossMinUtil.js';

/**
 * Counts the crossings caused by the order of north south port dummies when their respective normal node in the same
 * layer has a fixed port order. Also counts crossings between north south edges and long edge dummies.
 *
 * The `HashMap<LPort, Integer>` is identity-keyed and only looked up, so a plain `Map` is exact (AD-10).
 *
 * @author alan
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounter.java
 */
export class NorthSouthEdgeNeighbouringNodeCrossingsCounter {
  private upperLowerCrossings = 0;
  private lowerUpperCrossings = 0;
  private readonly portPositions: Map<LPort, number>;
  private readonly layer: LNode[];

  /**
   * Creates a counter for north south port crossings.
   *
   * @param nodes the order of nodes in the layer in question.
   * @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:48
   */
  constructor(nodes: LNode[]) {
    this.layer = nodes;
    this.portPositions = new Map<LPort, number>();
    this.initializePortPositions();
  }

  /**
   * Since accessing the index of a port is linear, the positions are saved. To prevent dependency problems, they are
   * saved in a field of this Object. Ports are numbered as they are in the list returned by getPorts().
   *
   * @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:59
   */
  private initializePortPositions(): void {
    for (const node of this.layer) {
      this.setPortIdsOn(node, PortSide.SOUTH);
      this.setPortIdsOn(node, PortSide.NORTH);
    }
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:66 */
  private setPortIdsOn(node: LNode, side: PortSide): void {
    const ports = CrossMinUtil.inNorthSouthEastWestOrder(node, side);
    let portId = 0;
    for (const port of ports) {
      this.portPositions.set(port, portId++);
    }
  }

  /**
   * Counts north south port crossings and crossings between north south ports and dummy nodes, for uppperNode and
   * lowerNode.
   *
   * @param upperNode The first node.
   * @param lowerNode The second node.
   * @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:83
   */
  countCrossings(upperNode: LNode, lowerNode: LNode): void {
    this.upperLowerCrossings = 0;
    this.lowerUpperCrossings = 0;

    this.processIfTwoNorthSouthNodes(upperNode, lowerNode);

    this.processIfNorthSouthLongEdgeDummyCrossing(upperNode, lowerNode);

    this.processIfNormalNodeWithNSPortsAndLongEdgeDummy(upperNode, lowerNode);
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:94 */
  private processIfTwoNorthSouthNodes(upperNode: LNode, lowerNode: LNode): void {
    if (
      this.isNorthSouth(upperNode) &&
      this.isNorthSouth(lowerNode) &&
      !this.haveDifferentOrigins(upperNode, lowerNode)
    ) {
      if (this.isNorthOfNormalNode(upperNode)) {
        this.countCrossingsOfTwoNorthSouthDummies(upperNode, lowerNode);
      } else {
        this.countCrossingsOfTwoNorthSouthDummies(lowerNode, upperNode);
      }
    }
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:104 */
  private countCrossingsOfTwoNorthSouthDummies(furtherFromNormalNode: LNode, closerToNormalNode: LNode): void {
    if (this.originPortPositionOf(furtherFromNormalNode) > this.originPortPositionOf(closerToNormalNode)) {
      const closerEastPorts = closerToNormalNode.getPortSideView(PortSide.EAST);
      this.upperLowerCrossings = closerEastPorts.length === 0 ? 0 : closerEastPorts[0]!.getDegree();
      const furtherWestPorts = furtherFromNormalNode.getPortSideView(PortSide.WEST);
      this.lowerUpperCrossings = furtherWestPorts.length === 0 ? 0 : furtherWestPorts[0]!.getDegree();
    } else {
      const closerWestPorts = closerToNormalNode.getPortSideView(PortSide.WEST);
      this.upperLowerCrossings = closerWestPorts.length === 0 ? 0 : closerWestPorts[0]!.getDegree();
      const furtherEastPorts = furtherFromNormalNode.getPortSideView(PortSide.EAST);
      this.lowerUpperCrossings = furtherEastPorts.length === 0 ? 0 : furtherEastPorts[0]!.getDegree();
    }
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:119 */
  private processIfNorthSouthLongEdgeDummyCrossing(upperNode: LNode, lowerNode: LNode): void {
    if (this.isNorthSouth(upperNode) && this.isLongEdgeDummy(lowerNode)) {
      if (this.isNorthOfNormalNode(upperNode)) {
        this.upperLowerCrossings = 1;
      } else {
        this.lowerUpperCrossings = 1;
      }
    } else if (this.isNorthSouth(lowerNode) && this.isLongEdgeDummy(upperNode)) {
      if (this.isNorthOfNormalNode(lowerNode)) {
        this.lowerUpperCrossings = 1;
      } else {
        this.upperLowerCrossings = 1;
      }
    }
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:136 */
  private processIfNormalNodeWithNSPortsAndLongEdgeDummy(upperNode: LNode, lowerNode: LNode): void {
    if (this.isNormal(upperNode) && this.isLongEdgeDummy(lowerNode)) {
      this.upperLowerCrossings = this.numberOfNorthSouthEdges(upperNode, PortSide.SOUTH);
      this.lowerUpperCrossings = this.numberOfNorthSouthEdges(upperNode, PortSide.NORTH);
    }
    if (this.isNormal(lowerNode) && this.isLongEdgeDummy(upperNode)) {
      this.upperLowerCrossings = this.numberOfNorthSouthEdges(lowerNode, PortSide.NORTH);
      this.lowerUpperCrossings = this.numberOfNorthSouthEdges(lowerNode, PortSide.SOUTH);
    }
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:149 */
  private numberOfNorthSouthEdges(node: LNode, side: PortSide): number {
    let numberOfEdges = 0;
    for (const port of node.getPortSideView(side)) {
      numberOfEdges += this.hasConnectedNorthSouthEdge(port) ? 1 : 0;
    }
    return numberOfEdges;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:157 */
  private hasConnectedNorthSouthEdge(port: LPort): boolean {
    return port.getProperty(InternalProperties.PORT_DUMMY) !== null;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:161 */
  private haveDifferentOrigins(upperNode: LNode, lowerNode: LNode): boolean {
    return this.originOf(upperNode) !== this.originOf(lowerNode);
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:165 */
  private originPortPositionOf(node: LNode): number {
    const origin = this.originPortOf(node);
    const port = origin;
    // Java unboxes the map value; every origin port of a layer node's north/south side was put by
    // initializePortPositions
    return this.portPositions.get(port)!;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:171 */
  private originPortOf(node: LNode): LPort {
    const port = node.getPorts()[0]!;
    const origin = port.getProperty(InternalProperties.ORIGIN) as LPort;
    return origin;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:177 */
  private isNorthOfNormalNode(upperNode: LNode): boolean {
    return this.originPortOf(upperNode).getSide() === PortSide.NORTH;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:181 */
  private originOf(node: LNode): LNode {
    return node.getProperty(InternalProperties.ORIGIN) as LNode;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:185 */
  private isLongEdgeDummy(node: LNode): boolean {
    return node.getType() === NodeType.LONG_EDGE;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:189 */
  private isNorthSouth(node: LNode): boolean {
    return node.getType() === NodeType.NORTH_SOUTH_PORT;
  }

  /** @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:193 */
  private isNormal(node: LNode): boolean {
    return node.getType() === NodeType.NORMAL;
  }

  /**
   * Get crossing count.
   *
   * @returns the crossings between when ordered upper - lower.
   * @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:202
   */
  getUpperLowerCrossings(): number {
    return this.upperLowerCrossings;
  }

  /**
   * Get crossing count.
   *
   * @returns the crossings between when ordered lower - upper.
   * @see NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:212
   */
  getLowerUpperCrossings(): number {
    return this.lowerUpperCrossings;
  }
}
