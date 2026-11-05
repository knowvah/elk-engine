// SPDX-License-Identifier: EPL-2.0
// @staged 7g
import type { KVector } from '../../../core/math/KVector.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';

const PORTED_IN_7G = 'ComponentsCompactor is ported in mission 7g';

/**
 * Staged class (L1, mission 7f decision F1): the three placers construct one only under
 * `COMPACTION_CONNECTED_COMPONENTS` (`SimpleRowGraphPlacer.java:85`, `ComponentGroupGraphPlacer.java:122`,
 * `ComponentGroupModelOrderGraphPlacer.java:134`). Mission 7g ports the class and `compaction/*`; every member the
 * placers reference throws until then.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java
 */
export class ComponentsCompactor {
  compact(_graphs: readonly LGraph[], _originalGraphsSize: KVector, _spacing: number): never {
    throw new UnsupportedOperationException(PORTED_IN_7G);
  }

  getOffset(): KVector {
    throw new UnsupportedOperationException(PORTED_IN_7G);
  }

  getGraphSize(): KVector {
    throw new UnsupportedOperationException(PORTED_IN_7G);
  }
}
