// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../../graph/LNode.js';
import type { GraphInfoHolder } from '../../p3order/GraphInfoHolder.js';
import type { ICrossingMinimizationHeuristic } from '../../p3order/ICrossingMinimizationHeuristic.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { CrossingMatrixFiller } from './CrossingMatrixFiller.js';
import { SwitchDecider } from './SwitchDecider.js';
import { SwitchDeciderCrossingCountSide as CrossingCountSide } from './SwitchDeciderCrossingCountSide.js';

/**
 * Implements the greedy switch heuristic: For two neighboring nodes, check to see if by exchanging their positions
 * ("switching" them) the number of crossings is reduced. If it is, switch them, if it is not, don't. This principle
 * is continued throughout the graph for all nodes in each layer.
 *
 * Configuration depends on the `CrossMinType` set on the graph:
 *
 * - `ONE_SIDED_GREEDY_SWITCH`: fixes the order of one layer and changes the order in a neighboring layer using the
 *   number of crossings to this neighboring layer. To prevent increasing the number of crosses, after each forward
 *   and backward sweep the number of crossings in the graph are recounted.
 * - `TWO_SIDED_GREEDY_SWITCH`: If one sided is not false, it sets a layer as free and counts crossings to both
 *   neighboring layers.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/GreedySwitchHeuristic.java
 */
export class GreedySwitchHeuristic implements ICrossingMinimizationHeuristic {
  private readonly greedySwitchType: CrossMinType;
  private currentNodeOrder!: LNode[][];
  private switchDecider!: SwitchDecider;
  private portPositions!: Int32Array;
  private readonly graphData: GraphInfoHolder;
  private nPorts = 0;

  /**
   * Create GreedySwitchHeuristic.
   *
   * @param greedyType The greedy switch type.
   * @param graphData Graph information holder for crossing minimization.
   * @see GreedySwitchHeuristic.java:57
   */
  constructor(greedyType: CrossMinType, graphData: GraphInfoHolder) {
    this.graphData = graphData;
    this.greedySwitchType = greedyType;
  }

  /** @see GreedySwitchHeuristic.java:63 */
  minimizeCrossings(order: LNode[][], freeLayerIndex: number, forwardSweep: boolean, _isFirstSweep: boolean): boolean {
    this.setUp(order, freeLayerIndex, forwardSweep);
    return this.continueSwitchingUntilNoImprovementInLayer(freeLayerIndex);
  }

  /** @see GreedySwitchHeuristic.java:70 */
  setFirstLayerOrder(currentOrder: LNode[][], isForwardSweep: boolean): boolean {
    const startIndex = this.startIndex(isForwardSweep, currentOrder.length);
    this.setUp(currentOrder, startIndex, isForwardSweep);
    return this.sweepDownwardInLayer(startIndex);
  }

  /** @see GreedySwitchHeuristic.java:76 */
  private setUp(order: LNode[][], freeLayerIndex: number, forwardSweep: boolean): void {
    this.currentNodeOrder = order;
    const side = forwardSweep ? CrossingCountSide.WEST : CrossingCountSide.EAST;
    this.switchDecider = this.getNewSwitchDecider(freeLayerIndex, side);
  }

  /** @see GreedySwitchHeuristic.java:83 */
  private getNewSwitchDecider(freeLayerIndex: number, side: CrossingCountSide): SwitchDecider {
    const crossingMatrixFiller = new CrossingMatrixFiller(
      this.greedySwitchType,
      this.currentNodeOrder,
      freeLayerIndex,
      side,
    );
    return new SwitchDecider(freeLayerIndex, this.currentNodeOrder, crossingMatrixFiller, this.portPositions, {
      graphData: this.graphData,
      oneSided: this.greedySwitchType === CrossMinType.ONE_SIDED_GREEDY_SWITCH,
    });
  }

  /** @see GreedySwitchHeuristic.java:90 */
  private continueSwitchingUntilNoImprovementInLayer(freeLayerIndex: number): boolean {
    let improved = false;
    let continueSwitching: boolean;
    do {
      continueSwitching = this.sweepDownwardInLayer(freeLayerIndex);
      improved ||= continueSwitching;
    } while (continueSwitching);
    return improved;
  }

  /** @see GreedySwitchHeuristic.java:100 */
  private sweepDownwardInLayer(layerIndex: number): boolean {
    let continueSwitching = false;
    const lengthOfFreeLayer = this.currentNodeOrder[layerIndex]!.length;
    for (let upperNodeIndex = 0; upperNodeIndex < lengthOfFreeLayer - 1; upperNodeIndex++) {
      const lowerNodeIndex = upperNodeIndex + 1;

      // Java `|=` is not short-circuiting: switchIfImproves always runs
      continueSwitching = this.switchIfImproves(layerIndex, upperNodeIndex, lowerNodeIndex) || continueSwitching;
    }
    return continueSwitching;
  }

  /** @see GreedySwitchHeuristic.java:111 */
  private switchIfImproves(layerIndex: number, upperNodeIndex: number, lowerNodeIndex: number): boolean {
    let continueSwitching = false;

    if (this.switchDecider.doesSwitchReduceCrossings(upperNodeIndex, lowerNodeIndex)) {
      this.exchangeNodes(upperNodeIndex, lowerNodeIndex, layerIndex);

      continueSwitching = true;
    }
    return continueSwitching;
  }

  /** @see GreedySwitchHeuristic.java:122 */
  private exchangeNodes(indexOne: number, indexTwo: number, layerIndex: number): void {
    this.switchDecider.notifyOfSwitch(
      this.currentNodeOrder[layerIndex]![indexOne]!,
      this.currentNodeOrder[layerIndex]![indexTwo]!,
    );
    const layer = this.currentNodeOrder[layerIndex]!;
    const temp = layer[indexTwo]!;
    layer[indexTwo] = layer[indexOne]!;
    layer[indexOne] = temp;
  }

  /** @see GreedySwitchHeuristic.java:131 */
  private startIndex(isForwardSweep: boolean, length: number): number {
    return isForwardSweep ? 0 : length - 1;
  }

  /** @see GreedySwitchHeuristic.java:136 */
  alwaysImproves(): boolean {
    return !(this.greedySwitchType === CrossMinType.ONE_SIDED_GREEDY_SWITCH);
  }

  /** @see GreedySwitchHeuristic.java:141 */
  isDeterministic(): boolean {
    return true;
  }

  /** @see GreedySwitchHeuristic.java:146 */
  initAtPortLevel(_l: number, _n: number, _p: number, _nodeOrder: LNode[][]): void {
    this.nPorts++;
  }

  /** @see GreedySwitchHeuristic.java:151 */
  initAtLayerLevel(l: number, nodeOrder: LNode[][]): void {
    nodeOrder[l]![0]!.getLayer()!.id = l;
  }

  /** @see GreedySwitchHeuristic.java:156 */
  initAfterTraversal(): void {
    this.portPositions = new Int32Array(this.nPorts);
  }
}
