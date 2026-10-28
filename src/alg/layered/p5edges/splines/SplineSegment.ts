// SPDX-License-Identifier: EPL-2.0
// @staged 7e
import { UnsupportedOperationException } from '../../../../java/lang/UnsupportedOperationException.js';

/**
 * Staged class (L1): mission 7a references this type only (`InternalProperties.SPLINE_ROUTE_START`); mission 7e ports
 * it. Constructing one throws until then.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineSegment.java
 */
export class SplineSegment {
  constructor() {
    throw new UnsupportedOperationException('SplineSegment is ported in mission 7e');
  }
}
