// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { Pair } from '../../../../core/util/Pair.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { newTreeSet } from '../../../../guava/Sets.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { BinaryIndexedTree } from './BinaryIndexedTree.js';
import { CrossMinUtil } from './CrossMinUtil.js';
import {
  end,
  getPorts,
  integerCompare,
  isInLayer,
  isPortSelfLoop,
  otherEndOf,
  portListSize,
  positionOf,
  start,
  step,
} from './CrossingsCounterConvenience.js';
import { countNorthSouthCrossingsOnPorts, initPositionsForNorthSouthCounting } from './CrossingsCounterNorthSouth.js';
import { CrossingsCounterState } from './CrossingsCounterState.js';

/**
 * In ELK Layered we distinguish three types of edge crossings that can occur:
 *
 * - Between-layer crossings (the ones everybody knows),
 * - In-layer crossings (caused by out very own in-layer edges), and
 * - North-south crossings (caused by implicit edges between `NodeType.NORTH_SOUTH_PORT` dummies and their originating
 *   `NodeType.NORMAL` node).
 *
 * All three types of crossings are counted by this class, by transferring each counting problem into counting in-layer
 * edges as described below.
 *
 * ## In-layer crossings
 *
 * First, let's explain how counting in-layer crossings works, since we transfer the other two types of crossings into
 * this case. Before usage, each port must have a unique id and each node an id unique for it's layer.
 *
 * For counting in-layer crossings with `countInLayerCrossingsOnSide`, we step through each edge and add the position of
 * the end of the edge to a sorted list. Each time we meet the same edge again, we delete it from the list again. Each
 * time we add an edge end position, the number of crossings is the index of the this position in the sorted list. The
 * implementation of this list guarantees that adding, deleting and finding indices is log n.
 *
 * ## Between-layer crossings
 *
 * Between-layer crossings become in-layer crossings if we fold and rotate the right layer downward and pretend that we
 * are in a single layer. This is used in `countCrossingsBetweenLayers`.
 *
 * ## North/south crossings
 *
 * North/south crossings are counted per layer and just as for between-layer edges we index the ports and nodes of a
 * layer such that we can simply count in-layer edge crossings. This time the rotations are a bit more intricate,
 * however. The nice things is that we can directly incorporate long edges. Thus, the top-down in-layer index order is
 * (nsl means north/south/long edge dummy):
 *
 * - northern nsl dummies with western edges north-to-south,
 * - northern ports west-to-east order
 * - northern nsl dummies with eastern edges south-to-north
 * - southern ports east-to-west order
 * - southern nsl dummies with western edges north-to-south
 * - southern nsl dummies with eastern edges south-to-north
 *
 * Facade over the section files `CrossingsCounterConvenience` and `CrossingsCounterNorthSouth` (Java is 632 lines);
 * the Java fields are the `CrossingsCounterState` they share.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/CrossingsCounter.java
 */
export class CrossingsCounter {
  private readonly s: CrossingsCounterState;

  /**
   * Create crossings counter.
   *
   * @param portPositions port position array passed to prevent frequent large array construction.
   * @see CrossingsCounter.java:151
   */
  constructor(portPositions: Int32Array) {
    this.s = new CrossingsCounterState(portPositions);
  }

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //                                  PUBLIC API
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * Count in-layer and between-layer crossings between the two given layers.
   *
   * @param leftLayerNodes left layer
   * @param rightLayerNodes right layer
   * @returns number of crossings.
   * @see CrossingsCounter.java:169
   */
  countCrossingsBetweenLayers(leftLayerNodes: LNode[], rightLayerNodes: LNode[]): number {
    const ports = this.initPortPositionsCounterClockwise(leftLayerNodes, rightLayerNodes);
    this.s.indexTree = new BinaryIndexedTree(ports.length);
    return this.countCrossingsOnPorts(ports);
  }

  /**
   * Only count in-layer crossings on the given side.
   *
   * @param nodes order of nodes in layer in question.
   * @param side the side
   * @returns number of crossings.
   * @see CrossingsCounter.java:185
   */
  countInLayerCrossingsOnSide(nodes: LNode[], side: PortSide): number {
    const ports = this.initPortPositionsForInLayerCrossings(nodes, side);
    return this.countInLayerCrossingsOnPorts(ports);
  }

  /**
   * Count crossings between edges connected to north/south ports of the passed layer's nodes. Also counts crossings of
   * these edges with long edges spanning the passed layer.
   *
   * @param layer a layer of the layering
   * @returns number of crossings.
   * @see CrossingsCounter.java:198
   */
  countNorthSouthPortCrossingsInLayer(layer: LNode[]): number {
    const ports = initPositionsForNorthSouthCounting(this.s, layer);
    this.s.indexTree = new BinaryIndexedTree(ports.length);
    return countNorthSouthCrossingsOnPorts(this.s, ports);
  }

  /**
   * Count crossings caused between edges incident to upperPort and lowerPort and when the order of these two is
   * switched. Initialize before use with `initForCountingBetween` when not on either end of a graph. If you do want to
   * use this to the left of the leftmost or to the right of the rightmost layer, use
   * `initPortPositionsForInLayerCrossings`.
   *
   * @param upperPort the upper port
   * @param lowerPort the lower port
   * @returns `Pair` of integers where `getFirst()` returns the crossings in the unswitched and `getSecond()` in the
   *   switched order.
   * @see CrossingsCounter.java:217
   */
  countCrossingsBetweenPortsInBothOrders(upperPort: LPort, lowerPort: LPort): Pair<number, number> {
    const ports = this.connectedPortsSortedByPosition(upperPort, lowerPort);
    const upperLowerCrossings = this.countCrossingsOnPorts(ports);
    // Since we might add endpositions of ports which are not in the ports list, we need to explicitly clear
    // the index tree.
    this.s.indexTree.clear();
    this.switchPorts(upperPort, lowerPort);
    ports.sort((a, b) => integerCompare(positionOf(this.s, a), positionOf(this.s, b)));
    const lowerUpperCrossings = this.countCrossingsOnPorts(ports);
    this.s.indexTree.clear();
    this.switchPorts(lowerPort, upperPort);
    return Pair.of(upperLowerCrossings, lowerUpperCrossings);
  }

  /**
   * Count crossings caused between edges incident to upperNode and lowerNode and when the order of these two is
   * switched. Initialize before use with `initPortPositionsForInLayerCrossings`.
   *
   * @param upperNode the upper node
   * @param lowerNode the lower node
   * @param side the side on which to count
   * @returns `Pair` of integers where `getFirst()` returns the crossings in the unswitched and `getSecond()` in the
   *   switched order.
   * @see CrossingsCounter.java:245
   */
  countInLayerCrossingsBetweenNodesInBothOrders(
    upperNode: LNode,
    lowerNode: LNode,
    side: PortSide,
  ): Pair<number, number> {
    const ports = this.connectedInLayerPortsSortedByPosition(upperNode, lowerNode, side);
    const upperLowerCrossings = this.countInLayerCrossingsOnPorts(ports);
    this.switchNodes(upperNode, lowerNode, side);
    // Since we might add endpositions of ports which are not in the ports list, we need to explicitly clear
    // the index tree.
    this.s.indexTree.clear();
    ports.sort((a, b) => integerCompare(positionOf(this.s, a), positionOf(this.s, b)));
    const lowerUpperCrossings = this.countInLayerCrossingsOnPorts(ports);
    this.switchNodes(lowerNode, upperNode, side);
    this.s.indexTree.clear();
    return Pair.of(upperLowerCrossings, lowerUpperCrossings);
  }

  /**
   * Initializes the counter for counting crosses on a specific side of two layers. Use this method if only if you do
   * not need to count all crossings, such as with `countCrossingsBetweenPortsInBothOrders`.
   *
   * @param leftLayerNodes Nodes in western layer.
   * @param rightLayerNodes Nodes in eastern layer.
   * @see CrossingsCounter.java:269
   */
  initForCountingBetween(leftLayerNodes: LNode[], rightLayerNodes: LNode[]): void {
    const ports = this.initPortPositionsCounterClockwise(leftLayerNodes, rightLayerNodes);
    this.s.indexTree = new BinaryIndexedTree(ports.length);
  }

  /**
   * Initializes the counter for counting in-layer crossings on a specific side of a single layer. Use this method if
   * only if you do not need to count all in layer crossings, such as with `countCrossingsBetweenPortsInBothOrders` on
   * one end of a graph or `countInLayerCrossingsBetweenNodesInBothOrders` in the middle.
   *
   * @param nodes The order of the nodes in the layer
   * @param side The side to initialize
   * @returns the ports on which to count crossings on
   * @see CrossingsCounter.java:286
   */
  initPortPositionsForInLayerCrossings(nodes: LNode[], side: PortSide): LPort[] {
    const ports: LPort[] = [];
    this.initPositions(nodes, ports, side, true, true);
    this.s.indexTree = new BinaryIndexedTree(ports.length);
    return ports;
  }

  /**
   * Notify counter of port switch.
   *
   * @param topPort The port previously further north.
   * @param bottomPort The port previously further south.
   * @see CrossingsCounter.java:301
   */
  switchPorts(topPort: LPort, bottomPort: LPort): void {
    const portPositions = this.s.portPositions;
    const topPortPos = portPositions[topPort.id]!;
    portPositions[topPort.id] = portPositions[bottomPort.id]!;
    portPositions[bottomPort.id] = topPortPos;
  }

  /**
   * This method should be used as soon as neighboring nodes have been switched. Use the first parameter to pass which
   * node was the upper node before a switch and the second to pass the former lower node. We assume a left-right
   * layout.
   *
   * @param wasUpperNode The node which was the upper node before switching.
   * @param wasLowerNode The node which was the lower node before switching.
   * @param side The side on which the crossings are currently being counted.
   * @see CrossingsCounter.java:319
   */
  switchNodes(wasUpperNode: LNode, wasLowerNode: LNode, side: PortSide): void {
    const portPositions = this.s.portPositions;
    let ports: Iterable<LPort> = CrossMinUtil.inNorthSouthEastWestOrder(wasUpperNode, side);
    for (const port of ports) {
      portPositions[port.id] = Int32.add(positionOf(this.s, port), this.s.nodeCardinalities[wasLowerNode.id]!);
    }

    ports = CrossMinUtil.inNorthSouthEastWestOrder(wasLowerNode, side);
    for (const port of ports) {
      portPositions[port.id] = Int32.sub(positionOf(this.s, port), this.s.nodeCardinalities[wasUpperNode.id]!);
    }
  }

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //                                  PRIVATE API
  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * C8: Java's `new TreeSet<>(comparator)` filled by `add` is `Sets.newTreeSet(elements, comparator)` over the same
   * insertion sequence (comparator-equal duplicates dropped, first wins); the Java `TreeSet` is built here (`:337`) and
   * copied by `Lists.newArrayList(ports)` (`:350`), so the snapshot set is exact.
   *
   * @see CrossingsCounter.java:335
   */
  private connectedInLayerPortsSortedByPosition(upperNode: LNode, lowerNode: LNode, side: PortSide): LPort[] {
    const added: LPort[] = [];
    for (const node of [upperNode, lowerNode]) {
      for (const port of CrossMinUtil.inNorthSouthEastWestOrder(node, side)) {
        for (const edge of port.getConnectedEdges()) {
          if (!edge.isSelfLoop()) {
            added.push(port);
            if (isInLayer(edge)) {
              added.push(otherEndOf(edge, port));
            }
          }
        }
      }
    }
    const ports = newTreeSet(added, (a: LPort, b: LPort) =>
      integerCompare(positionOf(this.s, a), positionOf(this.s, b)),
    );
    return [...ports];
  }

  /**
   * C8, as for `connectedInLayerPortsSortedByPosition`: the `TreeSet` is built at `:354` and copied at `:363`.
   *
   * @see CrossingsCounter.java:353
   */
  private connectedPortsSortedByPosition(upperPort: LPort, lowerPort: LPort): LPort[] {
    const added: LPort[] = [];
    for (const port of [upperPort, lowerPort]) {
      added.push(port);
      for (const edge of port.getConnectedEdges()) {
        if (!isPortSelfLoop(edge)) {
          added.push(otherEndOf(edge, port));
        }
      }
    }
    const ports = newTreeSet(added, (a: LPort, b: LPort) =>
      integerCompare(positionOf(this.s, a), positionOf(this.s, b)),
    );
    return [...ports];
  }

  /** @see CrossingsCounter.java:366 */
  private countCrossingsOnPorts(ports: Iterable<LPort>): number {
    const s = this.s;
    let crossings = 0;
    for (const port of ports) {
      s.indexTree.removeAll(positionOf(s, port));
      // First get crossings for all edges.
      for (const edge of port.getConnectedEdges()) {
        const endPosition = positionOf(s, otherEndOf(edge, port));
        if (endPosition > positionOf(s, port)) {
          crossings = Int32.add(crossings, s.indexTree.rank(endPosition));
          s.ends.push(endPosition);
        }
      }
      // Then add end points.
      while (s.ends.length > 0) {
        s.indexTree.add(s.ends.pop()!);
      }
    }

    return crossings;
  }

  /** @see CrossingsCounter.java:387 */
  private countInLayerCrossingsOnPorts(ports: Iterable<LPort>): number {
    const s = this.s;
    let crossings = 0;
    for (const port of ports) {
      s.indexTree.removeAll(positionOf(s, port));
      let numBetweenLayerEdges = 0;
      // First get crossings for all edges.
      for (const edge of port.getConnectedEdges()) {
        if (isInLayer(edge)) {
          const endPosition = positionOf(s, otherEndOf(edge, port));
          if (endPosition > positionOf(s, port)) {
            crossings = Int32.add(crossings, s.indexTree.rank(endPosition));
            s.ends.push(endPosition);
          }
        } else {
          numBetweenLayerEdges++;
        }
      }
      crossings = Int32.add(crossings, Int32.mul(s.indexTree.size(), numBetweenLayerEdges));
      // Then add end points.
      while (s.ends.length > 0) {
        s.indexTree.add(s.ends.pop()!);
      }
    }
    return crossings;
  }

  /** @see CrossingsCounter.java:460 */
  private initPositions(
    nodes: LNode[],
    ports: LPort[],
    side: PortSide,
    topDown: boolean,
    getCardinalities: boolean,
  ): void {
    const s = this.s;
    let numPorts = ports.length;
    if (getCardinalities) {
      s.nodeCardinalities = new Int32Array(nodes.length);
    }
    for (let i = start(nodes, topDown); end(i, topDown, nodes); i += step(topDown)) {
      const node = nodes[i]!;
      const nodePorts = getPorts(node, side, topDown);
      if (getCardinalities) {
        s.nodeCardinalities[node.id] = portListSize(nodePorts);
      }
      for (const port of nodePorts) {
        s.portPositions[port.id] = numPorts++;
      }
      ports.push(...nodePorts);
    }
  }

  /** @see CrossingsCounter.java:479 */
  private initPortPositionsCounterClockwise(leftLayerNodes: LNode[], rightLayerNodes: LNode[]): LPort[] {
    const ports: LPort[] = [];
    this.initPositions(leftLayerNodes, ports, PortSide.EAST, true, false);
    this.initPositions(rightLayerNodes, ports, PortSide.WEST, false, false);
    return ports;
  }
}
