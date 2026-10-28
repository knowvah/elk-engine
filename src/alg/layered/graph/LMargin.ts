// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../../core/math/ElkMargin.js';

/**
 * A mere copycat of {@link ElkMargin}. We use it for a single reason: to make a clear distinction between ELK's
 * margin and the (intermediate) margin used during the execution of ELK Layered.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LMargin.java
 */
export class LMargin extends ElkMargin {
  /** Creates a new instance with all fields set to `0.0`. */
  constructor() {
    super();
  }
}
