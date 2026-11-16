// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';

/**
 * Implements edge routing that includes bendpoints when straight edges would cross nodes.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p4edgerouting/BendEdgeRouter.java
 */
export class BendEdgeRouter implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('BendEdgeRouter', 1);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);

      this.routeEdges(parent);
    }

    progressMonitor.done();
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }

  /** Route the edges with bendpoints. @see BendEdgeRouter.java:46 */
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

      // Java auto-unboxes the Double property: a node the placer never visited has none, a NullPointerException
      // (D10: TypeError), where TypeScript arithmetic would treat null as 0.
      const boxedBendHeight = target.getProperty(InternalProperties.EDGE_BEND_HEIGHT) as number | null;
      if (boxedBendHeight === null) {
        throw new TypeError('Cannot unbox a null Double (EDGE_BEND_HEIGHT)');
      }
      const bendheight = boxedBendHeight;
      const epsilon = 0.0001;
      // if the node is low place a bendpoint above it
      if (
        Math.abs(bendheight - (endY - target.getParent()!.getProperty(CoreOptions.SPACING_NODE_NODE) / 2)) > epsilon
      ) {
        ElkGraphUtil.createBendPoint(section, endX, bendheight);
      }
      this.routeEdges(target);
    }
  }
}
