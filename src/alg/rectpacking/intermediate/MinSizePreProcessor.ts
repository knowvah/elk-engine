// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { ElkUtil } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ElkGraphAdapters } from '../../../core/util/adapters/ElkGraphAdapters.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { NodeLabelAndSizeCalculator } from '../../common/nodespacing/NodeLabelAndSizeCalculator.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * Sets the minimum width and height of the parent since this influences decisions based on the aspect ratio.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *   <dt>Postcondition:</dt>
 *     <dd>The minimum width and height on the graph.</dd>
 *   <dt>Slots:</dt>
 *     <dd>Before phase 1.</dd>
 *   <dt>Same-slot dependencies:</dt>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/MinSizePreProcessor.java
 */
export class MinSizePreProcessor implements ILayoutProcessor<ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/intermediate/MinSizePreProcessor.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Min Size Preprocessing', 1);
    // Get minimum size based on children.
    const minSize = ElkUtil.effectiveMinSizeConstraintFor(graph);

    // Get minimum size based on labels.
    const parent = graph.getParent();
    if (parent !== null) {
      // only possible if a parent exists.
      const graphAdapter = ElkGraphAdapters.adapt(parent);
      const nodeAdapter = ElkGraphAdapters.adaptSingleNode(graph);

      const minSize2 = NodeLabelAndSizeCalculator.process(graphAdapter, nodeAdapter, false, true);
      minSize.x = Math.max(minSize.x, minSize2.x);
      minSize.y = Math.max(minSize.y, minSize2.y);
    }
    graph.setProperty(InternalProperties.MIN_WIDTH, minSize.x);
    graph.setProperty(InternalProperties.MIN_HEIGHT, minSize.y);
    progressMonitor.done();
  }
}
