// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import type { IRadialCompactor } from './IRadialCompactor.js';

/**
 * The layout processor for compaction. Sets up logging and creates the compactor selected by the COMPACTOR option.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/compaction/GeneralCompactor.java
 */
export class GeneralCompactor implements ILayoutProcessor<ElkNode> {
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('General Compactor', 1);
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(graph, 'Before');
    }
    // elkjs-exclude-end
    const compactor: IRadialCompactor = graph.getProperty(RadialOptions.COMPACTOR).create();
    compactor.compact(graph);
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(graph, 'After');
    }
    // elkjs-exclude-end
  }
}
