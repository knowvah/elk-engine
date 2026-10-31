// SPDX-License-Identifier: EPL-2.0
import * as Int32 from '../../../../java/lang/Int32.js';
import type { Comparable } from '../../../../java/lang/Comparable.js';
import type { HyperedgeCrossingsCounterHyperedge } from './HyperedgeCrossingsCounterHyperedge.js';
import { HyperedgeCrossingsCounterHyperedgeCornerType as Type } from './HyperedgeCrossingsCounterHyperedgeCornerType.js';

/**
 * The upper left, lower left, upper right, or lower right corner of a hyperedge. Java's private static nested
 * `HyperedgeCrossingsCounter.HyperedgeCorner` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java:99
 */
export class HyperedgeCrossingsCounterHyperedgeCorner implements Comparable<HyperedgeCrossingsCounterHyperedgeCorner> {
  hyperedge: HyperedgeCrossingsCounterHyperedge;
  position: number;
  oppositePosition: number;
  type: Type;

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java:105 */
  constructor(hyperedge: HyperedgeCrossingsCounterHyperedge, position: number, oppositePosition: number, type: Type) {
    this.hyperedge = hyperedge;
    this.position = position;
    this.oppositePosition = oppositePosition;
    this.type = type;
  }

  /**
   * The identity hash code tie-break (`this.hyperedge.hashCode() - other.hyperedge.hashCode()`) is 0 under the
   * oracle's `-XX:hashCode=2`; see `HyperedgeCrossingsCounterHyperedge.compareTo`.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java:119
   */
  compareTo(other: HyperedgeCrossingsCounterHyperedgeCorner): number {
    if (this.position < other.position) {
      return -1;
    } else if (this.position > other.position) {
      return 1;
    } else if (this.oppositePosition < other.oppositePosition) {
      return -1;
    } else if (this.oppositePosition > other.oppositePosition) {
      return 1;
    } else if (this.hyperedge !== other.hyperedge) {
      return 0; // hyperedge.hashCode() - other.hyperedge.hashCode() under -XX:hashCode=2
    } else if (this.type === Type.UPPER && other.type === Type.LOWER) {
      return -1;
    } else if (this.type === Type.LOWER && other.type === Type.UPPER) {
      return 1;
    }
    return 0;
  }
}
