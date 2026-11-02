// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../graph/LNode.js';
import type { IInitializable } from './counting/IInitializable.js';

/**
 * Determines the node order of a given free layer. Uses heuristic methods to find an ordering that minimizes edge
 * crossings between the given free layer and a neighboring layer with fixed node order. Given constraints are to be
 * respected, possibly by the use of an `IConstraintResolver`.
 *
 * Must be initialized using `IInitializable.init`!
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/ICrossingMinimizationHeuristic.java
 */
export interface ICrossingMinimizationHeuristic extends IInitializable {
  /**
   * Determines whether the heuristic always improves.
   *
   * @see ICrossingMinimizationHeuristic.java:36
   */
  alwaysImproves(): boolean;

  /**
   * Set the order in the first fixed layer visited in the sweep according to how the heuristic works. As an example,
   * `BarycenterHeuristic.setFirstLayerOrder` randomizes order, while `GreedySwitchHeuristic` does nothing.
   *
   * @param order the current order of the nodes.
   * @param forwardSweep whether we are sweeping forward or not.
   * @see ICrossingMinimizationHeuristic.java:48
   */
  setFirstLayerOrder(order: LNode[][], forwardSweep: boolean): boolean;

  /**
   * Minimize crossings in the layer as indicated by freeLayerIndex.
   *
   * @param order the current order of the nodes.
   * @param freeLayerIndex the index of the layer being reorderd
   * @param forwardSweep whether we are sweeping forward or not.
   * @param isFirstSweep whether this is the first sweep or not.
   * @see ICrossingMinimizationHeuristic.java:59
   */
  minimizeCrossings(order: LNode[][], freeLayerIndex: number, forwardSweep: boolean, isFirstSweep: boolean): boolean;

  /**
   * Determines whether the heuristic is deterministic or has random decisions.
   *
   * @see ICrossingMinimizationHeuristic.java:65
   */
  isDeterministic(): boolean;
}
