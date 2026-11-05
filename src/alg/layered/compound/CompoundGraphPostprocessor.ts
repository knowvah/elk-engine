// SPDX-License-Identifier: EPL-2.0
// @staged 7h
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';

/**
 * Staged class (L1, mission 7f decisions F1, F2): `ElkLayered.doCompoundLayout` constructs one; mission 7h ports it.
 * `process` throws until then, so the hierarchical path of the driver stops here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java
 */
export class CompoundGraphPostprocessor implements ILayoutProcessor<LGraph> {
  process(_graph: LGraph, _monitor: IElkProgressMonitor): never {
    throw new UnsupportedOperationException('CompoundGraphPostprocessor is ported in mission 7h');
  }
}
