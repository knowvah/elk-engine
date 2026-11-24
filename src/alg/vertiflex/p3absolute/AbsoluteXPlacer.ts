// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { checkStackDepth } from '../../../java/lang/StackDepth.js';
import { InternalProperties } from '../InternalProperties.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { castToElkNode } from '../p2relative/RelativeXPlacerChildren.js';

/** One suspended `findMinimalX` activation with children (AbsoluteXPlacer.java:50-57). */
interface MinimalXFrame {
  readonly tree: ElkNode;
  readonly numOfChildren: number;
  i: number;
  minSubtreeX: number;
}

/** One suspended `absoluteTreeCoords` activation (AbsoluteXPlacer.java:62-70). */
interface TreeCoordsFrame {
  readonly tree: ElkNode;
  readonly numOfChildren: number;
  i: number;
}

/**
 * Computes absolute x coordinates from the previously computed relative coordinates.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p3absolute/AbsoluteXPlacer.java
 */
export class AbsoluteXPlacer implements ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    // Upstream text "AbsolutPlacer" (AbsoluteXPlacer.java:32): a prose typo in a task name, corrected (CLAUDE.md carve-out).
    progressMonitor.begin('AbsolutePlacer', 1);

    if (!graph.getChildren().isEmpty()) {
      const parent = graph.getProperty(InternalProperties.ROOT_NODE);

      // first, move the root
      parent.setX(parent.getX() - this.findMinimalX(parent));
      // now we update the whole tree to absolute X
      this.absoluteTreeCoords(parent);
    }

    progressMonitor.done();
  }

  /**
   * Find leftmost subtree.
   *
   * The recursive call of AbsoluteXPlacer.java:54 is a frame push. AC6 (#67): explicit stack, same visit, side-effect
   * and accumulation order. A frame is one suspended Java activation with children: the node, its `numOfChildren` (read
   * once, as the Java local is), the loop index `i` and `minSubtreeX`; a finished activation's value is handed to its
   * caller's frame as `testX` (`returned`), and a leaf's activation returns at entry without a frame. The stack is
   * depth-checked after each push (`checkStackDepth` on its length, in `enterMinimalX`; a leaf is not counted): Java's
   * `StackOverflowError` on a recursion without end.
   * @see AbsoluteXPlacer.java:42
   */
  private findMinimalX(tree: ElkNode): number {
    const stack: MinimalXFrame[] = [];
    let returned = this.enterMinimalX(tree, stack);
    for (;;) {
      const frame = stack[stack.length - 1];
      if (frame === undefined) {
        // the outermost activation has returned
        return returned!;
      }
      if (returned !== null) {
        const testX = returned;
        returned = null;
        frame.minSubtreeX = testX < frame.minSubtreeX ? testX : frame.minSubtreeX;
        frame.i++;
      }
      if (frame.i < frame.numOfChildren) {
        returned = this.enterMinimalX(
          castToElkNode(frame.tree.getOutgoingEdges().get(frame.i).getTargets().get(0)!),
          stack,
        );
      } else {
        stack.pop();
        returned = frame.minSubtreeX + frame.tree.getX();
      }
    }
  }

  /**
   * Entry of one `findMinimalX` activation (AbsoluteXPlacer.java:47-52): a leaf returns its x at once; otherwise a frame
   * for the child loop is pushed, depth-checked (`checkStackDepth`: Java's `StackOverflowError` on a recursion without
   * end), and `null` returned.
   */
  private enterMinimalX(tree: ElkNode, stack: MinimalXFrame[]): number | null {
    const numOfChildren = tree.getOutgoingEdges().size();
    if (numOfChildren === 0) {
      return tree.getX();
    }
    stack.push({ tree, numOfChildren, i: 0, minSubtreeX: 0.0 });
    checkStackDepth(stack.length);
    return null;
  }

  /**
   * The recursive call of AbsoluteXPlacer.java:68 is a frame push. AC6 (#67): explicit stack, same visit, side-effect
   * and accumulation order. A frame is one suspended Java activation: the node, its `numOfChildren` (read once at entry,
   * as the Java local is) and the loop index `i`; a node without children loops zero times, as the Java's `if` skips
   * its loop. `i` is advanced when the child's frame is pushed rather than when it returns: nothing reads it in between.
   * The stack is depth-checked after each push (`checkStackDepth` on its length): Java's `StackOverflowError` on a
   * recursion without end.
   * @see AbsoluteXPlacer.java:56
   */
  private absoluteTreeCoords(tree: ElkNode): void {
    const stack: TreeCoordsFrame[] = [{ tree, numOfChildren: tree.getOutgoingEdges().size(), i: 0 }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.i < frame.numOfChildren) {
        const child = castToElkNode(frame.tree.getOutgoingEdges().get(frame.i).getTargets().get(0)!);
        child.setX(child.getX() + frame.tree.getX());
        frame.i++;
        stack.push({ tree: child, numOfChildren: child.getOutgoingEdges().size(), i: 0 });
        checkStackDepth(stack.length);
      } else {
        stack.pop();
      }
    }
  }

  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<VertiFlexLayoutPhases, ElkNode> | null {
    return null;
  }
}
