// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Sets a target width at least as high as the minimum width of the parent.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *   <dt>Postcondition:</dt>
 *     <dd>Sets the {@link InternalProperties#TARGET_WIDTH} to a size at least as high as the minimum width.</dd>
 *   <dt>Slots:</dt>
 *     <dd>After phase 1.</dd>
 *   <dt>Same-slot dependencies:</dt>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/MinSizePostProcessor.java
 */
export class MinSizePostProcessor implements ILayoutProcessor<ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/MinSizePostProcessor.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Min Size Postprocessing', 1);
    // Remove padding to get the space the algorithm can use.
    const source = PROPERTY_RETURN_VALUE('ElkNode');
    graph.setProperty(
      InternalProperties.TARGET_WIDTH,
      Math.max(
        unboxDouble(graph.getProperty(InternalProperties.TARGET_WIDTH), source),
        unboxDouble(graph.getProperty(InternalProperties.MIN_WIDTH), source),
      ),
    );
    progressMonitor.done();
  }
}
