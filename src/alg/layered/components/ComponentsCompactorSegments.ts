// SPDX-License-Identifier: EPL-2.0
import type { KVector } from '../../../core/math/KVector.js';
import type { Pair } from '../../../core/util/Pair.js';

/**
 * Internal collector for inner and outer segments.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:804
 */
export class ComponentsCompactorSegments {
  innerSegments: Pair<KVector, KVector>[] = [];
  outerSegment!: Pair<KVector, KVector>;
}
