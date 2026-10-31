// SPDX-License-Identifier: EPL-2.0

/**
 * Adjacency containing only the position and number of ports with the same position. Java's nested
 * `AdjacencyList.Adjacency` (M15 file naming); the fields are private to `AdjacencyList` in Java, which is the only
 * class that reads or changes them, and are public here because the nested classes are separate files.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.java:356
 */
export class BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency {
  /** The position of the port. */
  readonly position: number;
  /** The number of adjacencies with the same position. */
  cardinality: number;
  /** The current number of adjacencies with the same position. */
  currentCardinality: number;

  /**
   * @param adjacentPortPosition the position of the adjacent port
   * @param _port the adjacent port (unused in Java as well)
   * @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:364
   */
  constructor(adjacentPortPosition: number, _port: unknown) {
    this.position = adjacentPortPosition;
    this.cardinality = 1;
    this.currentCardinality = 1;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:370 */
  reset(): void {
    this.currentCardinality = this.cardinality;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:375 */
  compareTo(o: BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency): number {
    return this.position < o.position ? -1 : this.position === o.position ? 0 : 1;
  }

  /** @see BetweenLayerEdgeTwoNodeCrossingsCounter.java:380 */
  toString(): string {
    return (
      `Adjacency [position=${String(this.position)}, cardinality=${String(this.cardinality)}, ` +
      `currentCardinality=${String(this.currentCardinality)}]`
    );
  }
}
