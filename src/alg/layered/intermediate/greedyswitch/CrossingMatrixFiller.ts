// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { BetweenLayerEdgeTwoNodeCrossingsCounter } from './BetweenLayerEdgeTwoNodeCrossingsCounter.js';
import { SwitchDeciderCrossingCountSide as CrossingCountSide } from './SwitchDeciderCrossingCountSide.js';

/**
 * This class manages the crossing matrix and fills it on demand. It needs to be reinitialized for each free layer. For
 * each layer the node.id fields MUST be set from 0 to layer.getSize() - 1!
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/CrossingMatrixFiller.java
 */
export class CrossingMatrixFiller {
  private readonly isCrossingMatrixFilled: boolean[][];
  private readonly crossingMatrix: Int32Array[];
  private readonly inBetweenLayerCrossingCounter: BetweenLayerEdgeTwoNodeCrossingsCounter;
  private readonly direction: CrossingCountSide;
  private readonly oneSided: boolean;

  /**
   * Constructs class which manages the crossing matrix.
   *
   * @see CrossingMatrixFiller.java:36
   */
  constructor(greedySwitchType: CrossMinType, graph: LNode[][], freeLayerIndex: number, direction: CrossingCountSide) {
    this.direction = direction;
    this.oneSided = greedySwitchType === CrossMinType.ONE_SIDED_GREEDY_SWITCH;

    const freeLayer = graph[freeLayerIndex]!;
    this.isCrossingMatrixFilled = Array.from({ length: freeLayer.length }, () =>
      new Array<boolean>(freeLayer.length).fill(false),
    );
    this.crossingMatrix = Array.from({ length: freeLayer.length }, () => new Int32Array(freeLayer.length));

    this.inBetweenLayerCrossingCounter = new BetweenLayerEdgeTwoNodeCrossingsCounter(graph, freeLayerIndex);
  }

  /**
   * Returns entry for crossings between edges incident to two nodes, where upperNode is above lowerNode in the layer.
   *
   * @see CrossingMatrixFiller.java:53
   */
  getCrossingMatrixEntry(upperNode: LNode, lowerNode: LNode): number {
    if (!this.isCrossingMatrixFilled[upperNode.id]![lowerNode.id]) {
      this.fillCrossingMatrix(upperNode, lowerNode);
      this.isCrossingMatrixFilled[upperNode.id]![lowerNode.id] = true;
      this.isCrossingMatrixFilled[lowerNode.id]![upperNode.id] = true;
    }
    return this.crossingMatrix[upperNode.id]![lowerNode.id]!;
  }

  /** @see CrossingMatrixFiller.java:62 */
  private fillCrossingMatrix(upperNode: LNode, lowerNode: LNode): void {
    if (this.oneSided) {
      switch (this.direction) {
        case CrossingCountSide.EAST:
          this.inBetweenLayerCrossingCounter.countEasternEdgeCrossings(upperNode, lowerNode);
          break;
        case CrossingCountSide.WEST:
          this.inBetweenLayerCrossingCounter.countWesternEdgeCrossings(upperNode, lowerNode);
      }
    } else {
      this.inBetweenLayerCrossingCounter.countBothSideCrossings(upperNode, lowerNode);
    }
    this.crossingMatrix[upperNode.id]![lowerNode.id] = this.inBetweenLayerCrossingCounter.getUpperLowerCrossings();
    this.crossingMatrix[lowerNode.id]![upperNode.id] = this.inBetweenLayerCrossingCounter.getLowerUpperCrossings();
  }
}
