// SPDX-License-Identifier: EPL-2.0
import type { LNode } from '../graph/LNode.js';

/** Java `Comparator<LNode>`. */
export type LNodeComparator = (n1: LNode, n2: LNode) => number;

/**
 * The part of `ModelOrderBarycenterHeuristic` that `insertionSort` resets. `BarycenterHeuristic` calls the sort with
 * the cast `(ModelOrderBarycenterHeuristic) this`; this structural type is that cast's target, so the base class does
 * not import its subclass (an import cycle would make the module evaluation order matter).
 */
export interface ClearsTransitiveOrdering {
  clearTransitiveOrdering(): void;
}

/**
 * Sorts the layer by the given comparator with insertion sort to ensure that transitive ordering constraints are
 * respected. The usual quick sorting algorithm used by java does not do well here since the partial ordering defined by
 * the model order and the ordering of the barycenter values is prone to create a conflicting ordering. Insertion sort
 * can deal with that since no real node is moved past another real node if the model order forbids it. However, the
 * placement of dummy nodes and, therefore, long edges might suffer a little.
 *
 * @param layer The layer to order. It is assumed that all "real" nodes which are here all nodes that have a model
 *   order are already ordered as intended.
 * @param comparator A comparator that uses a full ordering (barycenter values) and a partial ordering, which has a
 *   higher priority, (model order of real nodes) at the same time.
 * @param barycenterHeuristic The instance of this class to reset the transitive ordering associations.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/ModelOrderBarycenterHeuristic.java:227
 */
export function insertionSort(
  layer: LNode[],
  comparator: LNodeComparator,
  barycenterHeuristic: ClearsTransitiveOrdering,
): void {
  for (let i = 1; i < layer.length; i++) {
    const temp = layer[i]!;
    let j = i;
    while (j > 0 && comparator(layer[j - 1]!, temp) > 0) {
      layer[j] = layer[j - 1]!;
      j--;
    }
    layer[j] = temp;
  }
  barycenterHeuristic.clearTransitiveOrdering();
}
