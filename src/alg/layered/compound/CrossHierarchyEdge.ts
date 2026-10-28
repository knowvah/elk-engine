// SPDX-License-Identifier: EPL-2.0
// @staged 7h
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';

/**
 * Staged class (L1): mission 7a references this type only (`InternalProperties.CROSS_HIERARCHY_MAP`); mission 7h
 * ports it. Constructing one throws until then.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CrossHierarchyEdge.java
 */
export class CrossHierarchyEdge {
  constructor() {
    throw new UnsupportedOperationException('CrossHierarchyEdge is ported in mission 7h');
  }
}
