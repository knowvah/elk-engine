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
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { InternalProperties } from '../InternalProperties.js';
import type { RadialLayoutPhases } from '../RadialLayoutPhases.js';
import type { IRadialEdgeRouter } from './IRadialEdgeRouter.js';

/** One suspended activation of the Java `routeEdges`: its node and the live iterator of its for-each. */
interface RouteFrame {
  readonly node: ElkNode;
  readonly edges: Iterator<ElkEdge>;
}

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
   *
   * The recursive call of `StraightLineEdgeRouter.java:82` (`routeEdges(target)`) runs on a frame stack. AC6 (#67): explicit
   * stack, same visit, side-effect and accumulation order: each frame holds its node's live outgoing-edge iterator (Java's
   * for-each), and a target's frame starts right after its edge's section is written, before the node's next edge. The
   * stack is depth-checked (`checkStackDepth`: Java's `StackOverflowError` on a recursion without end).
   */
  routeEdges(node: ElkNode): void {
    const stack: RouteFrame[] = [StraightLineEdgeRouter.enter(node)];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        stack.pop();
      } else {
        const target = StraightLineEdgeRouter.routeEdge(frame.node, next.value);
        if (target !== null) {
          stack.push(StraightLineEdgeRouter.enter(target));
          checkStackDepth(stack.length);
        }
      }
    }
  }

  /** The start of one Java activation of `routeEdges`: the for-each's iterator over the node's outgoing edges. */
  private static enter(node: ElkNode): RouteFrame {
    return { node, edges: ElkGraphUtil.allOutgoingEdges(node)[Symbol.iterator]() };
  }

  /**
   * The loop body of `routeEdges` (`StraightLineEdgeRouter.java:50-81`) for one edge: routes it and returns the target to
   * recurse into, or `null` when the edge starts at a port or is hierarchical (no recursion).
   */
  private static routeEdge(node: ElkNode, edge: ElkEdge): ElkNode | null {
    if (!isElkPort(edge.getSources().get(0))) {
      // a null target (Java NPE) surfaces as a TypeError at the first member access in routeClipped
      const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode;
      if (!edge.isHierarchical()) {
        StraightLineEdgeRouter.routeClipped(node, target, edge);
        return target;
      }
    }
    return null;
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
