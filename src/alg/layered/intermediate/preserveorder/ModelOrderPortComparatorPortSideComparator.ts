// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../../../core/options/PortSide.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Orders port sides by ordinal. Java's private inner `ModelOrderPortComparator.PortSideComparator` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/preserveorder/ModelOrderPortComparator.java:426
 */
export class ModelOrderPortComparatorPortSideComparator {
  /** @see ModelOrderPortComparator.java:432 */
  compare(ps1: PortSide, ps2: PortSide): number {
    return integerCompare(ps1.ordinal(), ps2.ordinal());
  }
}
