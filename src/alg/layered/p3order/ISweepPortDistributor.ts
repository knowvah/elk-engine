// SPDX-License-Identifier: EPL-2.0
import type { Random } from '../../../java/util/Random.js';
import type { LNode } from '../graph/LNode.js';
import type { IInitializable } from './counting/IInitializable.js';
import { GreedyPortDistributor } from './GreedyPortDistributor.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import { LayerTotalPortDistributor } from './LayerTotalPortDistributor.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

/**
 * PortDistributor to be used while sweeping in phase 3.
 *
 * Must be initialized using `IInitializable.init`!
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/ISweepPortDistributor.java
 */
export interface ISweepPortDistributor extends IInitializable {
  /**
   * Distribute ports in one layer. To be used in the context of layer sweep.
   *
   * @param order the current order of the nodes
   * @param freeLayerIndex the index of the layer the node is in
   * @param isForwardSweep whether we are sweeping forward or not.
   * @see ISweepPortDistributor.java:41
   */
  distributePortsWhileSweeping(order: LNode[][], freeLayerIndex: number, isForwardSweep: boolean): boolean;
}

/**
 * Make a port distributor. Java static interface method `ISweepPortDistributor.create`.
 *
 * @param cmt the crossing minimization type
 * @param r random number generator for this graph
 * @param currentOrder the current order of the nodes.
 * @returns the port distributor
 * @see ISweepPortDistributor.java:55
 */
export function create(cmt: CrossMinType, r: Random, currentOrder: LNode[][]): ISweepPortDistributor {
  if (cmt === CrossMinType.TWO_SIDED_GREEDY_SWITCH) {
    return new GreedyPortDistributor();
  } else if (r.nextBoolean()) {
    // Since both methods lead to different results, but neither is clearly better, we choose randomly.
    return new NodeRelativePortDistributor(currentOrder.length);
  } else {
    return new LayerTotalPortDistributor(currentOrder.length);
  }
}
