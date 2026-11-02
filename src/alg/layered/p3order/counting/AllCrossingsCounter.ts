// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../../java/lang/Int32.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import type { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { CrossingsCounter } from './CrossingsCounter.js';
import { HyperedgeCrossingsCounter } from './HyperedgeCrossingsCounter.js';
import type { IInitializable, InitAtEdgeLevelArgs } from './IInitializable.js';

/**
 * Counts all crossings in a graph. Must be initialized using `IInitializable.init`!
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/AllCrossingsCounter.java
 */
export class AllCrossingsCounter implements IInitializable {
  private crossingCounter!: CrossingsCounter;
  private hasHyperEdgesEastOfIndex: boolean[];
  private hyperedgeCrossingsCounter!: HyperedgeCrossingsCounter;

  /** For Initialization. */
  private inLayerEdgeCounts: Int32Array;
  private hasNorthSouthPorts: boolean[];
  private nPorts: number;

  /**
   * Returns crossings counter. Must be initialized using `IInitializable.init`!
   *
   * @param graph the current node order
   * @see AllCrossingsCounter.java:47
   */
  constructor(graph: LNode[][]) {
    this.inLayerEdgeCounts = new Int32Array(graph.length);
    this.hasNorthSouthPorts = new Array<boolean>(graph.length).fill(false);
    this.hasHyperEdgesEastOfIndex = new Array<boolean>(graph.length).fill(false);
    this.nPorts = 0;
  }

  /**
   * Count all crossings.
   *
   * @param currentOrder the current node order
   * @returns the number of crossings in the graph
   * @see AllCrossingsCounter.java:61
   */
  countAllCrossings(currentOrder: LNode[][]): number {
    if (currentOrder.length === 0) {
      return 0;
    }
    let crossings = this.crossingCounter.countInLayerCrossingsOnSide(currentOrder[0]!, PortSide.WEST);
    crossings = Int32.add(
      crossings,
      this.crossingCounter.countInLayerCrossingsOnSide(currentOrder[currentOrder.length - 1]!, PortSide.EAST),
    );
    for (let layerIndex = 0; layerIndex < currentOrder.length; layerIndex++) {
      crossings = Int32.add(crossings, this.countCrossingsAt(layerIndex, currentOrder));
    }
    return crossings;
  }

  /** @see AllCrossingsCounter.java:73 */
  private countCrossingsAt(layerIndex: number, currentOrder: LNode[][]): number {
    let totalCrossings = 0;
    const leftLayer = currentOrder[layerIndex]!;
    if (layerIndex < currentOrder.length - 1) {
      const rightLayer = currentOrder[layerIndex + 1]!;
      if (this.hasHyperEdgesEastOfIndex[layerIndex]) {
        totalCrossings = this.hyperedgeCrossingsCounter.countCrossings(leftLayer, rightLayer);
        totalCrossings = Int32.add(
          totalCrossings,
          this.crossingCounter.countInLayerCrossingsOnSide(leftLayer, PortSide.EAST),
        );
        totalCrossings = Int32.add(
          totalCrossings,
          this.crossingCounter.countInLayerCrossingsOnSide(rightLayer, PortSide.WEST),
        );
      } else {
        totalCrossings = this.crossingCounter.countCrossingsBetweenLayers(leftLayer, rightLayer);
      }
    }

    if (this.hasNorthSouthPorts[layerIndex]) {
      totalCrossings = Int32.add(totalCrossings, this.crossingCounter.countNorthSouthPortCrossingsInLayer(leftLayer));
    }

    return totalCrossings;
  }

  /** @see AllCrossingsCounter.java:95 */
  initAtNodeLevel(l: number, n: number, nodeOrder: LNode[][]): void {
    const node = nodeOrder[l]![n]!;
    this.hasNorthSouthPorts[l] = this.hasNorthSouthPorts[l]! || node.getType() === NodeType.NORTH_SOUTH_PORT;
  }

  /** @see AllCrossingsCounter.java:101 */
  initAtPortLevel(l: number, n: number, p: number, nodeOrder: LNode[][]): void {
    const port = nodeOrder[l]![n]!.getPorts()[p]!;
    port.id = this.nPorts++;
    if (port.getOutgoingEdges().length + port.getIncomingEdges().length > 1) {
      if (port.getSide() === PortSide.EAST) {
        this.hasHyperEdgesEastOfIndex[l] = true;
      } else if (port.getSide() === PortSide.WEST && l > 0) {
        this.hasHyperEdgesEastOfIndex[l - 1] = true;
      }
    }
  }

  /** @see AllCrossingsCounter.java:114 */
  initAtEdgeLevel(...args: InitAtEdgeLevelArgs): void {
    const [l, n, p, , edge, nodeOrder] = args;
    const port = nodeOrder[l]![n]!.getPorts()[p]!;
    if (
      edge.getSource() === port &&
      edge.getSource()!.getNode()!.getLayer() === edge.getTarget()!.getNode()!.getLayer()
    ) {
      this.inLayerEdgeCounts[l] = this.inLayerEdgeCounts[l]! + 1;
    }
  }

  /** @see AllCrossingsCounter.java:124 */
  initAfterTraversal(): void {
    const portPos = new Int32Array(this.nPorts);
    this.hyperedgeCrossingsCounter = new HyperedgeCrossingsCounter(
      this.inLayerEdgeCounts,
      this.hasNorthSouthPorts,
      portPos,
    );
    this.crossingCounter = new CrossingsCounter(portPos);
  }
}
