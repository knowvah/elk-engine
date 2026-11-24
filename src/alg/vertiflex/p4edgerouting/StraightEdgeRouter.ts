// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';

/** One suspended `routeEdges` activation (StraightEdgeRouter.java:59-71). */
interface RouteFrame {
  readonly node: ElkNode;
  readonly edges: Iterator<ElkEdge>;
}

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

  /**
   * Route the edges with with straight edges.
   *
   * The recursive call of StraightEdgeRouter.java:70 is a frame push. AC6 (#67): explicit stack, same visit, side-effect
   * and accumulation order. A frame is one suspended Java activation: the node and the live iterator of its for-each
   * over `allOutgoingEdges(node)`, opened at activation entry as the Java loop opens it. The stack is depth-checked after
   * each push (`checkStackDepth` on its length): Java's `StackOverflowError` on a recursion without end.
   * @see StraightEdgeRouter.java:52
   */
  private routeEdges(node: ElkNode): void {
    const stack: RouteFrame[] = [{ node, edges: ElkGraphUtil.allOutgoingEdges(node)[Symbol.iterator]() }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        stack.pop();
      } else {
        const target = this.routeEdge(frame.node, next.value);
        stack.push({ node: target, edges: ElkGraphUtil.allOutgoingEdges(target)[Symbol.iterator]() });
        checkStackDepth(stack.length);
      }
    }
  }

  /**
   * The loop body of one `routeEdges` activation up to its recursive call (StraightEdgeRouter.java:59-69): sets the
   * edge's straight section and returns the target the Java recurses into.
   */
  private routeEdge(node: ElkNode, edge: ElkEdge): ElkNode {
    const target = ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)!)!;
    const section = ElkGraphUtil.firstEdgeSection(edge, true, true);

    const startX = node.getX() + node.getWidth() / 2;
    const startY = node.getY() + node.getHeight();
    const endX = target.getX() + target.getWidth() / 2;
    const endY = target.getY();

    section.setStartLocation(startX, startY);
    section.setEndLocation(endX, endY);
    return target;
  }
}
