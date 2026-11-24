// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { checkStackDepth } from '../../../../java/lang/StackDepth.js';
import { RadialUtil } from '../../RadialUtil.js';
import type { IAnnulusWedgeCriteria } from './IAnnulusWedgeCriteria.js';

/**
 * One suspended activation of the Java `calculateWedgeSpace`: its successors, its own diagonal, the loop position and the
 * running sum.
 */
interface WedgeFrame {
  readonly successors: readonly ElkNode[];
  readonly nodeSize: number;
  next: number;
  childSpace: number;
}

/**
 * Determine the annulus wedge size by calculating the diameter of an node.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/wedge/AnnulusWedgeByNodeSpace.java
 */
export class AnnulusWedgeByNodeSpace implements IAnnulusWedgeCriteria {
  /**
   * Determine the space a node needs for its wedge by calculating the diagonal.
   *
   * The recursive call of `AnnulusWedgeByNodeSpace.java:39` (`childSpace += calculateWedgeSpace(child)`) runs on a frame stack.
   * AC6 (#67): explicit stack, same visit, side-effect and accumulation order: each frame adds its children's spaces to its
   * `childSpace` left to right, each after the child's own value is final, and ends with `Math.max(childSpace, nodeSize)`.
   * The stack is depth-checked (`checkStackDepth`: Java's `StackOverflowError` on a recursion without end).
   */
  calculateWedgeSpace(node: ElkNode): number {
    const stack: WedgeFrame[] = [AnnulusWedgeByNodeSpace.enter(node)];
    let result = 0;
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      if (frame.next < frame.successors.length) {
        stack.push(AnnulusWedgeByNodeSpace.enter(frame.successors[frame.next++]!));
        checkStackDepth(stack.length);
      } else {
        stack.pop();
        result = Math.max(frame.childSpace, frame.nodeSize);
        if (stack.length > 0) {
          stack[stack.length - 1]!.childSpace += result;
        }
      }
    }
    return result;
  }

  /**
   * The prologue of one Java activation (`AnnulusWedgeByNodeSpace.java:32-37`). `RadialUtil.getSuccessors` returns a fresh
   * list per call, so holding it in the frame is equivalent to the Java's for-each over it.
   */
  private static enter(node: ElkNode): WedgeFrame {
    const successors = RadialUtil.getSuccessors(node);
    const height = node.getHeight();
    const width = node.getWidth();
    const nodeSize = Math.sqrt(height * height + width * width);
    return { successors, nodeSize, next: 0, childSpace: 0 };
  }
}
