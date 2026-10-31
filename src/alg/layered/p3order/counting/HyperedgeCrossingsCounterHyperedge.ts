// SPDX-License-Identifier: EPL-2.0
import type { Comparable } from '../../../../java/lang/Comparable.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LPort } from '../../graph/LPort.js';

/**
 * Hyperedge representation. Java's private static nested `HyperedgeCrossingsCounter.Hyperedge` (M15 file naming);
 * the fields are package-visible here because the counter reads and writes them, as the Java outer class does.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java:73
 */
export class HyperedgeCrossingsCounterHyperedge implements Comparable<HyperedgeCrossingsCounterHyperedge> {
  edges: LEdge[] = [];
  ports: LPort[] = [];
  upperLeft = 0;
  lowerLeft = 0;
  upperRight = 0;
  lowerRight = 0;

  /**
   * The last tie-break is `this.hashCode() - other.hashCode()`, the identity hash code (`Object.hashCode`). The oracle
   * runs under `-XX:hashCode=2`, where every identity hash is the same constant (AD-10 convention, see
   * `tools/vectors/layered-order-vectors.sh`), so that subtraction is always 0 and the stable `Arrays.sort` keeps the
   * array order; the port returns 0 for the same reason (a creation-order counter would reorder ties).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java:82
   */
  compareTo(other: HyperedgeCrossingsCounterHyperedge): number {
    if (this.upperLeft < other.upperLeft) {
      return -1;
    } else if (this.upperLeft > other.upperLeft) {
      return 1;
    } else if (this.upperRight < other.upperRight) {
      return -1;
    } else if (this.upperRight > other.upperRight) {
      return 1;
    }
    return 0; // this.hashCode() - other.hashCode() under -XX:hashCode=2
  }
}
