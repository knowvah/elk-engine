// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { CrossMinUtil } from '../../p3order/counting/CrossMinUtil.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList as AdjacencyList } from './BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.js';

/**
 * Calculates the number of crossings for edges incident to two nodes. In the case where there is free port order and
 * two edges go into one port, this crossing counter can in some cases count to few crossings. See the ignored test in
 * the test class.
 *
 * The inner class `AdjacencyList` and its inner class `Adjacency` are
 * `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList` and `...AdjacencyListAdjacency` (M15). The three `HashMap`s
 * are identity-keyed (`LPort`, `LNode`) and only looked up, never iterated, so a plain `Map` is exact (AD-10).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.java
 */
export class BetweenLayerEdgeTwoNodeCrossingsCounter {
  private upperLowerCrossings = 0;
  private lowerUpperCrossings = 0;
  private upperAdjacencies!: AdjacencyList;
  private lowerAdjacencies!: AdjacencyList;
  private readonly currentNodeOrder: LNode[][];
  private readonly freeLayerIndex: number;
  private readonly portPositions: Map<LPort, number>;
  private readonly easternAdjacencies: Map<LNode, AdjacencyList>;
  private readonly westernAdjacencies: Map<LNode, AdjacencyList>;

  /**
   * Create `BetweenLayerEdgeTwoNodeCrossingsCounter`. Naming assumes a left-right layer ordering.
   *
   * @param currentNodeOrder Currently considered node ordering.
   * @param freeLayerIndex Index of free layer.
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:55
   */
  constructor(currentNodeOrder: LNode[][], freeLayerIndex: number) {
    this.portPositions = new Map();
    this.easternAdjacencies = new Map();
    this.westernAdjacencies = new Map();
    this.currentNodeOrder = currentNodeOrder;
    this.freeLayerIndex = freeLayerIndex;
    this.setPortPositionsForNeighbouringLayers();
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:64 */
  private setPortPositionsForNeighbouringLayers(): void {
    if (this.freeLayerIsNotFirstLayer()) {
      this.setPortPositionsForLayer(this.freeLayerIndex - 1, PortSide.EAST);
    }
    if (this.freeLayerIsNotLastLayer()) {
      this.setPortPositionsForLayer(this.freeLayerIndex + 1, PortSide.WEST);
    }
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:73 */
  private freeLayerIsNotFirstLayer(): boolean {
    return this.freeLayerIndex > 0;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:77 */
  private freeLayerIsNotLastLayer(): boolean {
    return this.freeLayerIndex < this.currentNodeOrder.length - 1;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:81 */
  private setPortPositionsForLayer(layerIndex: number, portSide: PortSide): void {
    let portId = 0;
    for (const node of this.currentNodeOrder[layerIndex]!) {
      const ports = CrossMinUtil.inNorthSouthEastWestOrder(node, portSide);
      for (const port of ports) {
        this.portPositions.set(port, portId++);
      }
    }
  }

  /**
   * Calculates the number of crossings for incident edges coming from the west to the nodes. The crossing numbers can
   * be received with getCrossingForOrderUpperLower and getCrossingForOrderLowerUpper for the order upperNode ->
   * lowerNode or lowerNode -> upperNode respectively.
   *
   * @param upperNode Upper node assuming left-right layout.
   * @param lowerNode Lower node assuming left-right layout
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:102
   */
  countEasternEdgeCrossings(upperNode: LNode, lowerNode: LNode): void {
    this.resetCrossingCount();
    if (upperNode === lowerNode) {
      return;
    }
    this.addEasternCrossings(upperNode, lowerNode);
  }

  /**
   * Calculates the number of crossings for incident edges coming from the east to the nodes. The crossing numbers can
   * be received with getCrossingForOrderUpperLower and getCrossingForOrderLowerUpper for the order upperNode ->
   * lowerNode or lowerNode -> upperNode respectively.
   *
   * @param upperNode Upper node assuming left-right layout.
   * @param lowerNode Lower node assuming left-right layout
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:121
   */
  countWesternEdgeCrossings(upperNode: LNode, lowerNode: LNode): void {
    this.resetCrossingCount();
    if (upperNode === lowerNode) {
      return;
    }
    this.addWesternCrossings(upperNode, lowerNode);
  }

  /**
   * Calculates the number of crossings for incident edges coming from the both sides to the nodes. The crossing
   * numbers can be received with getCrossingForOrderUpperLower and getCrossingForOrderLowerUpper for the order
   * upperNode -> lowerNode or lowerNode -> upperNode respectively.
   *
   * @param upperNode Upper node assuming left-right layout.
   * @param lowerNode Lower node assuming left-right layout
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:140
   */
  countBothSideCrossings(upperNode: LNode, lowerNode: LNode): void {
    this.resetCrossingCount();
    if (upperNode === lowerNode) {
      return;
    }
    this.addWesternCrossings(upperNode, lowerNode);
    this.addEasternCrossings(upperNode, lowerNode);
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:149 */
  private resetCrossingCount(): void {
    this.upperLowerCrossings = 0;
    this.lowerUpperCrossings = 0;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:154 */
  private addEasternCrossings(upperNode: LNode, lowerNode: LNode): void {
    this.upperAdjacencies = this.getAdjacencyFor(upperNode, PortSide.EAST, this.easternAdjacencies);
    this.lowerAdjacencies = this.getAdjacencyFor(lowerNode, PortSide.EAST, this.easternAdjacencies);
    if (this.upperAdjacencies.size() === 0 || this.lowerAdjacencies.size() === 0) {
      return;
    }
    this.countCrossingsByMergingAdjacencyLists();
  }

  /**
   * Since calculating adjacencies is a little expensive, it is only done once for each configuration and the sorted
   * adjacencies saved in Maps.
   *
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:167
   */
  private getAdjacencyFor(node: LNode, side: PortSide, adjacencies: Map<LNode, AdjacencyList>): AdjacencyList {
    if (adjacencies.size === 0) {
      for (const n of this.currentNodeOrder[this.freeLayerIndex]!) {
        adjacencies.set(n, new AdjacencyList(n, side, this.portPositions));
      }
    }
    // Java: a node outside the free layer is a NullPointerException on `aL.reset()`; callers pass free-layer nodes
    const aL = adjacencies.get(node)!;
    aL.reset();
    return aL;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:180 */
  private addWesternCrossings(upperNode: LNode, lowerNode: LNode): void {
    this.upperAdjacencies = this.getAdjacencyFor(upperNode, PortSide.WEST, this.westernAdjacencies);
    this.lowerAdjacencies = this.getAdjacencyFor(lowerNode, PortSide.WEST, this.westernAdjacencies);
    if (this.upperAdjacencies.size() === 0 || this.lowerAdjacencies.size() === 0) {
      return;
    }
    this.countCrossingsByMergingAdjacencyLists();
  }

  /**
   * The main algorithm. Adjacency Lists are lists of ports connected to a node. If a connected node has no fixed port
   * ordering all ports have the same position value. By merging adjacency lists, both the number of between-layer
   * crossings for the order upper - lower and for the opposite order can be found. Consider:
   *
   * ```
   * A   p0
   *  \\/
   *  /\\
   * B   p1
   * ```
   *
   * - The adjacency list La for A is: p1, p1
   * - The adjacency list Lb for B is: p0
   *
   * Since p1 is below p0, edge (B, p0) is crossed by all edges from A and can p0 can be removed. If the next
   * adjacencies in both lists have the same position value p we add to upperLowerCrossings the number of remaining
   * adjacencies upperAdjacencies below the current node. We do the same for lowerUpperCrossings.
   *
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:210
   */
  private countCrossingsByMergingAdjacencyLists(): void {
    while (!this.upperAdjacencies.isEmpty() && !this.lowerAdjacencies.isEmpty()) {
      if (this.isBelow(this.upperAdjacencies.first(), this.lowerAdjacencies.first())) {
        this.upperLowerCrossings += this.upperAdjacencies.size();
        this.lowerAdjacencies.removeFirst();
      } else if (this.isBelow(this.lowerAdjacencies.first(), this.upperAdjacencies.first())) {
        this.lowerUpperCrossings += this.lowerAdjacencies.size();
        this.upperAdjacencies.removeFirst();
      } else {
        this.upperLowerCrossings += this.upperAdjacencies.countAdjacenciesBelowNodeOfFirstPort();
        this.lowerUpperCrossings += this.lowerAdjacencies.countAdjacenciesBelowNodeOfFirstPort();
        this.upperAdjacencies.removeFirst();
        this.lowerAdjacencies.removeFirst();
      }
    }
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:227 */
  private isBelow(firstPort: number, secondPort: number): boolean {
    return firstPort > secondPort;
  }

  /**
   * @returns the upperLowerCrossings
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:390
   */
  getUpperLowerCrossings(): number {
    return this.upperLowerCrossings;
  }

  /**
   * @returns the lowerUpperCrossings
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:397
   */
  getLowerUpperCrossings(): number {
    return this.lowerUpperCrossings;
  }
}
