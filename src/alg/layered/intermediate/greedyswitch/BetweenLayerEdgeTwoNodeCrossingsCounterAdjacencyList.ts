// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';
import type { LPort } from '../../graph/LPort.js';
import { CrossMinUtil } from '../../p3order/counting/CrossMinUtil.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency as Adjacency } from './BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency.js';

/**
 * The adjacency list of a node holds the position of connected ports in a neighboring layer on the given side. Since
 * we want to save it for further use, the remove operation does not actually delete the entries in the adjacency
 * list. Instead we use currentIndex, currentSize and currentCardinality (in the inner class) to show the current state
 * of the list. Use reset() to reset to the original state.
 *
 * Java's inner `BetweenLayerEdgeTwoNodeCrossingsCounter.AdjacencyList` (M15 file naming); it reads the outer
 * instance's `portPositions`, which is the constructor's third argument here. The Java fields `size`, `currentSize`
 * and `currentIndex` are `#`-private so that the method `size()` can keep its name.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.java:238
 */
export class BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList {
  readonly #node: LNode;
  readonly #adjacencyList: Adjacency[];
  readonly #side: PortSide;
  readonly #portPositions: ReadonlyMap<LPort, number>;
  #size = 0;
  #currentSize = 0;
  #currentIndex = 0;

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:246 */
  constructor(node: LNode, side: PortSide, portPositions: ReadonlyMap<LPort, number>) {
    this.#node = node;
    this.#side = side;
    this.#portPositions = portPositions;
    this.#adjacencyList = [];
    this.getAdjacenciesSortedByPosition();
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:253 */
  private getAdjacenciesSortedByPosition(): void {
    this.iterateTroughEdgesCollectingAdjacencies();

    // Collections.sort: stable, in place
    this.#adjacencyList.sort((a, b) => a.compareTo(b));
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:259 */
  private iterateTroughEdgesCollectingAdjacencies(): void {
    const ports = CrossMinUtil.inNorthSouthEastWestOrder(this.#node, this.#side);
    for (const port of ports) {
      const edges = this.getEdgesConnectedTo(port);
      for (const edge of edges) {
        if (!edge.isSelfLoop() && this.isNotInLayer(edge)) {
          this.addAdjacencyOf(edge);
          this.#size++;
          this.#currentSize++;
        }
      }
    }
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:273 */
  private getEdgesConnectedTo(port: LPort): LEdge[] {
    return this.#side === PortSide.WEST ? port.getIncomingEdges() : port.getOutgoingEdges();
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:277 */
  private isNotInLayer(edge: LEdge): boolean {
    return edge.getSource()!.getNode()!.getLayer() !== edge.getTarget()!.getNode()!.getLayer();
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:281 */
  private addAdjacencyOf(edge: LEdge): void {
    const adjacentPort = this.adjacentPortOf(edge, this.#side);
    // Java unboxes the map value: every port of the neighbouring layer was put by setPortPositionsForLayer
    const adjacentPortPosition = this.#portPositions.get(adjacentPort)!;
    const lastIndex = this.#adjacencyList.length - 1;
    if (this.#adjacencyList.length !== 0 && this.#adjacencyList[lastIndex]!.position === adjacentPortPosition) {
      this.#adjacencyList[lastIndex]!.cardinality++;
      this.#adjacencyList[lastIndex]!.currentCardinality++;
    } else {
      this.#adjacencyList.push(new Adjacency(adjacentPortPosition, adjacentPort));
    }
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:294 */
  private adjacentPortOf(e: LEdge, s: PortSide): LPort {
    return s === PortSide.WEST ? e.getSource()! : e.getTarget()!;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:298 */
  reset(): void {
    this.#currentIndex = 0;
    this.#currentSize = this.#size;
    if (!this.isEmpty()) {
      this.currentAdjacency().reset();
    }
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:306 */
  countAdjacenciesBelowNodeOfFirstPort(): number {
    return this.#currentSize - this.currentAdjacency().currentCardinality;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:310 */
  removeFirst(): void {
    if (this.isEmpty()) {
      return;
    }
    const currentEntry = this.currentAdjacency();
    if (currentEntry.currentCardinality === 1) {
      this.incrementCurrentIndex();
    } else {
      currentEntry.currentCardinality--;
    }

    this.#currentSize--;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:324 */
  private incrementCurrentIndex(): void {
    this.#currentIndex++;
    // reset Adjacency for reuse
    if (this.#currentIndex < this.#adjacencyList.length) {
      this.currentAdjacency().reset();
    }
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:332 */
  isEmpty(): boolean {
    return this.#currentSize === 0;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:336 */
  first(): number {
    return this.currentAdjacency().position;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:340 */
  size(): number {
    return this.#currentSize;
  }

  /**
   * Java `adjacencyList.get(currentIndex)`: an index past the end is an `IndexOutOfBoundsException` there; it cannot
   * be reached because `currentSize` is zero exactly when every adjacency has been consumed, and every caller checks
   * for emptiness first.
   *
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:344
   */
  private currentAdjacency(): Adjacency {
    return this.#adjacencyList[this.#currentIndex]!;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:349 */
  toString(): string {
    return `AdjacencyList [node=${this.#node.toString()}, adjacencies= [${this.#adjacencyList.map((a) => a.toString()).join(', ')}]]`;
  }
}
