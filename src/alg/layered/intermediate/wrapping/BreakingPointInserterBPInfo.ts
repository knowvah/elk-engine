// SPDX-License-Identifier: EPL-2.0
// @staged 7g
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';

/**
 * Staged class (L1): Java's nested `BreakingPointInserter.BPInfo` (M15 file naming). Mission 7a references this type
 * only (`InternalProperties.BREAKING_POINT_INFO`); mission 7g ports it. Constructing one throws until then.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointInserter.java
 */
export class BPInfo {
  constructor() {
    throw new UnsupportedOperationException('BreakingPointInserter.BPInfo is ported in mission 7g');
  }
}
