// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { VertiFlexOptions } from '../options/VertiFlexOptions.js';
import { castToElkNode } from '../p2relative/RelativeXPlacerChildren.js';

/** One suspended activation of `setYLevels` (NodeYPlacer.java:64-67). */
interface YLevelFrame {
  readonly node: ElkNode;
  readonly newMinHeight: number;
  i: number;
}

/**
 * Node placer to position nodes vertically. Nodes that have a vertical constraint are placed according to that
 * constraint and other nodes are positioned automatically according to their position in the tree.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p1yplacement/NodeYPlacer.java
 */
export class NodeYPlacer implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  private layerDistance: number = 0;
  private nodeNodeSpacing: number = 0;

  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('YPlacer', 1);

    this.layerDistance = graph.getProperty(VertiFlexOptions.LAYER_DISTANCE);
    this.nodeNodeSpacing = graph.getProperty(CoreOptions.SPACING_NODE_NODE);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);
      this.setYLevels(parent, 0.0);
    }

    progressMonitor.done();
  }

  /**
   * A Method to set the absolute Y coordinates of the nodes. Uses a default distance between the nodes.
   *
   * @param node and it's children are getting updated Y-coords.
   * @param minHeight Node gets minimum this height. (Java reassigns the parameter; so does this.)
   *
   * The recursive call of NodeYPlacer.java:66 is a frame push. AC6 (#67): explicit stack, same visit, side-effect and
   * accumulation order. A frame is one suspended Java activation: the node, its `newMinHeight` and the loop index `i`;
   * the loop bound `getOutgoingEdges().size()` is re-read per step, as the Java `for` condition is. `i` is advanced when
   * the child's frame is pushed rather than when it returns: nothing reads it in between. The stack is depth-checked
   * after each push (`checkStackDepth` on its length): Java's `StackOverflowError` on a recursion without end.
   * @see NodeYPlacer.java:46
   */
  private setYLevels(node: ElkNode, minHeight: number): void {
    const stack: YLevelFrame[] = [this.enterYLevel(node, minHeight)];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.i < frame.node.getOutgoingEdges().size()) {
        const child = castToElkNode(frame.node.getOutgoingEdges().get(frame.i).getTargets().get(0)!);
        frame.i++;
        stack.push(this.enterYLevel(child, frame.newMinHeight));
        checkStackDepth(stack.length);
      } else {
        stack.pop();
      }
    }
  }

  /** One activation of `setYLevels` up to its loop (NodeYPlacer.java:57-63): places the node and returns its frame. */
  private enterYLevel(node: ElkNode, minHeight: number): YLevelFrame {
    if (node.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT)) {
      minHeight = node.getProperty(VertiFlexOptions.VERTICAL_CONSTRAINT);
    }
    node.setY(minHeight);
    const newMinHeight =
      minHeight +
      this.layerDistance +
      node.getHeight() +
      Math.max(node.getProperty(CoreOptions.MARGINS).bottom, this.nodeNodeSpacing);
    return { node, newMinHeight, i: 0 };
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }
}
