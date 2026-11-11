// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { TEdge } from '../graph/TEdge.js';

/**
 * A comparator for edge targets that uses the given property. Java `OrderBalance.SortTEdgeTargetProperty implements
 * Comparator<TEdge>`; the nested class lives in its own file (one class per file, the `ElkLayered.TestExecutionState`
 * precedent) and `OrderBalance` re-exposes it as a static member.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/p2order/OrderBalance.java
 */
export class OrderBalanceSortTEdgeTargetProperty {
  private property: IProperty<number>;

  /** Package-private in Java. */
  constructor(property: IProperty<number>) {
    this.property = property;
  }

  /**
   * The compare method.
   *
   * @param t1 The first edge
   * @param t2 The second edge
   * @return The difference for the property (`int` subtraction, wrapping at 32 bits)
   */
  compare(t1: TEdge, t2: TEdge): number {
    return Int32.sub(t2.getTarget()!.getProperty(this.property), t1.getTarget()!.getProperty(this.property));
  }
}
