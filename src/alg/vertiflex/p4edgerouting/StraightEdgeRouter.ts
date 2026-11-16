// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';

/**
 * An edge router that draws straight edges between nodes.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p4edgerouting/StraightEdgeRouter.java
 */
export class StraightEdgeRouter implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  private myProgressMonitor: IElkProgressMonitor | null = null;

  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    this.myProgressMonitor = progressMonitor;
    this.myProgressMonitor.begin('StraightEdgeRouter', 1);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);

      this.routeEdges(parent);
    }

    this.myProgressMonitor.done();
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }

  /** Route the edges with with straight edges. @see StraightEdgeRouter.java:52 */
  private routeEdges(node: ElkNode): void {
    for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
      const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)!)!;
      const section = ElkGraphUtil.firstEdgeSection(edge, true, true);

      const startX = node.getX() + node.getWidth() / 2;
      const startY = node.getY() + node.getHeight();
      const endX = target.getX() + target.getWidth() / 2;
      const endY = target.getY();

      section.setStartLocation(startX, startY);
      section.setEndLocation(endX, endY);
      this.routeEdges(target);
    }
  }
}
