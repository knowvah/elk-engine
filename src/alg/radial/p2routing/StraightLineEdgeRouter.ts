// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { ElkMath } from '../../../core/math/ElkMath.js';
import { KVector } from '../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { isElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../InternalProperties.js';
import type { RadialLayoutPhases } from '../RadialLayoutPhases.js';
import type { IRadialEdgeRouter } from './IRadialEdgeRouter.js';

/**
 * Edge routing phase that draws edges as straight lines from node center to node center, clipped at the node borders.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p2routing/StraightLineEdgeRouter.java
 */
export class StraightLineEdgeRouter implements ILayoutPhase<RadialLayoutPhases, ElkNode>, IRadialEdgeRouter {
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Straight Line Edge Routing', 1);
    progressMonitor.logGraph(graph, 'Before');
    const root = graph.getProperty(InternalProperties.ROOT_NODE) as ElkNode;
    this.routeEdges(root);
    progressMonitor.logGraph(graph, 'After');
  }

  /**
   * Route edges from node center to node center. Then clip it, to not cross the node.
   */
  routeEdges(node: ElkNode): void {
    for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
      if (!isElkPort(edge.getSources().get(0))) {
        // a null target (Java NPE) surfaces as a TypeError at the first member access below
        const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;
        if (!edge.isHierarchical()) {
          StraightLineEdgeRouter.routeClipped(node, target, edge);
          this.routeEdges(target);
        }
      }
    }
  }

  /** The body of the hierarchy check of `routeEdges` up to the section (split off for the complexity limits). */
  private static routeClipped(node: ElkNode, target: ElkNode, edge: ElkEdge): void {
    let sourceX = node.getX() + node.getWidth() / 2;
    let sourceY = node.getY() + node.getHeight() / 2;

    let targetX = target.getX() + target.getWidth() / 2;
    let targetY = target.getY() + target.getHeight() / 2;

    // Clipping
    const vector = new KVector();
    vector.x = targetX - sourceX;
    vector.y = targetY - sourceY;
    const sourceClip = new KVector(vector.x, vector.y);
    ElkMath.clipVector(sourceClip, node.getWidth(), node.getHeight());
    vector.x -= sourceClip.x;
    vector.y -= sourceClip.y;

    sourceX = targetX - vector.x;
    sourceY = targetY - vector.y;

    const targetClip = new KVector(vector.x, vector.y);
    ElkMath.clipVector(targetClip, target.getWidth(), target.getHeight());
    vector.x -= targetClip.x;
    vector.y -= targetClip.y;

    targetX = sourceX + vector.x;
    targetY = sourceY + vector.y;

    const section = ElkGraphUtil.firstEdgeSection(edge, true, true);
    section.setStartLocation(sourceX, sourceY);
    section.setEndLocation(targetX, targetY);
  }

  getLayoutProcessorConfiguration(_graph: ElkNode): LayoutProcessorConfiguration<RadialLayoutPhases, ElkNode> | null {
    return null;
  }
}
