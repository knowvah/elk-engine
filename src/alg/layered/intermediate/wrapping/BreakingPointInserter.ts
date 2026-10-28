// SPDX-License-Identifier: EPL-2.0
// @staged 7g
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';

/**
 * Staged class (L1): mission 7a references only its nested `BPInfo` type (`BreakingPointInserterBPInfo.ts`, M15);
 * mission 7g ports the processor. `process` throws until then.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointInserter.java
 */
export class BreakingPointInserter {
  process(): never {
    throw new UnsupportedOperationException('BreakingPointInserter.process is ported in mission 7g');
  }
}
