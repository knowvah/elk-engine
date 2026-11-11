// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { processCompoundGraphPostprocessor } from './CompoundGraphPostprocessorSections.js';

/**
 * Postprocess a compound graph by restoring cross-hierarchy edges that have previously been split by the
 * `CompoundGraphPreprocessor`.
 *
 * Precondition: a compound graph with no layers and no cross-hierarchy edges, but with external ports and with fully
 * specified layout. Postcondition: a compound graph with no layers and with the original cross-hierarchy edges; the
 * layout applied to these edges conforms to the rules of the ElkGraph meta model.
 *
 * The logic lives in `CompoundGraphPostprocessorSections.ts` (mission 7h, H11).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compound/CompoundGraphPostprocessor.java
 */
export class CompoundGraphPostprocessor implements ILayoutProcessor<LGraph> {
  process(graph: LGraph, monitor: IElkProgressMonitor): void {
    processCompoundGraphPostprocessor(graph, monitor);
  }
}
