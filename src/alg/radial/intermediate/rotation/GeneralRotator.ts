// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { IRadialRotator } from './IRadialRotator.js';
import { AngleRotation } from './AngleRotation.js';

/**
 * The layout processor for rotation. Sets up logging and calls the angle rotation implementation.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/rotation/GeneralRotator.java
 */
export class GeneralRotator implements ILayoutProcessor<ElkNode> {
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // Upstream text "General 'Rotator" (GeneralRotator.java:30): a stray quote in a task name, corrected (CLAUDE.md carve-out).
    progressMonitor.begin('General Rotator', 1);
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(graph, 'Before');
    }
    // elkjs-exclude-end
    const rotator: IRadialRotator = new AngleRotation();
    rotator.rotate(graph);
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(graph, 'After');
    }
    // elkjs-exclude-end
  }
}
