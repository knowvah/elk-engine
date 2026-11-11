// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { RadialOptions } from '../options/RadialOptions.js';

/**
 * Calculates the angle of each edge connected to the root and stores it on the target node.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/EdgeAngleCalculator.java
 */
export class EdgeAngleCalculator implements ILayoutProcessor<ElkNode> {
  /**
   * For each of edges connected to the root node we calculate its angle and store that information on the
   * connected target node. This node can then later use that information as basis to align its own layout
   * to the incoming edge. Because this sets an option on child nodes, this is only useful when laying the
   * graph out in a top-down manner (or possibly in multiple layout runs).
   */
  process(graph: ElkNode, _progressMonitor: IElkProgressMonitor): void {
    const root = graph.getProperty(InternalProperties.ROOT_NODE) as ElkNode;
    for (const edge of root.getOutgoingEdges()) {
      const start = new KVector(edge.getSections().get(0).getStartX(), edge.getSections().get(0).getStartY());
      const end = new KVector(edge.getSections().get(0).getEndX(), edge.getSections().get(0).getEndY());

      const edgeVector = KVector.diff(end, start);
      const angle = Math.atan2(edgeVector.y, edgeVector.x);

      edge.getTargets().get(0).setProperty(RadialOptions.ROTATION_TARGET_ANGLE, angle);
    }
  }
}
