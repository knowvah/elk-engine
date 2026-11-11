// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import * as DoubleCompare from '../../../java/lang/DoubleCompare.js';
import { PROPERTY_RETURN_VALUE, unboxInteger } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../InternalProperties.js';
import { NodeComparator } from './NodeComparator.js';

/**
 * The sub tree sorting methods of `RelativeXPlacer` (`:405-553`) as module functions behind the facade (file-size
 * limit). The Java instance field `considerNodeModelOrder` is a parameter here. `Collections.sort` is stable, as is
 * `Array.prototype.sort`; `Collections.reverse` is `Array.prototype.reverse`; `subList(a, b)` is `slice(a, b)`.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p2relative/RelativeXPlacer.java
 */

/** Sorts a list with a {@link NodeComparator} (`Collections.sort(list, comparator)`). */
function sortWith(list: ElkNode[], comparator: NodeComparator): void {
  list.sort((x, y) => comparator.compare(x, y));
}

/**
 * The V-shape of the `else` branch of `sortSubTrees`: the deepest element gets ignored in the calculation of the
 * widths.
 *
 * @see RelativeXPlacer.java:416
 */
function splitIntoVShape(children: ElkNode[], a: ElkNode[], b: ElkNode[]): void {
  a.push(children[children.length - 1]!);
  let widthA = 0.0;
  let widthB = 0.0;
  for (let i = 1; i < children.length; i++) {
    if (widthA <= widthB) {
      a.push(children[children.length - 1 - i]!);
      widthA += children[children.length - 1 - i]!.getWidth();
    } else {
      b.push(children[children.length - 1 - i]!);
      widthB += children[children.length - 1 - i]!.getWidth();
    }
  }
  a.reverse();
}

/**
 * Sorts the subTrees in a semi-circle.
 *
 * @see RelativeXPlacer.java:405
 */
export function sortSubTrees(children: ElkNode[], considerNodeModelOrder: boolean): void {
  // first, we sort the SubTrees by the Y-coordinate of their root.
  sortWith(children, new NodeComparator(false));

  const a: ElkNode[] = [];
  const b: ElkNode[] = [];

  if (considerNodeModelOrder) {
    splitNodesWithModelOrder(children, a, b);
  } else {
    // now we need to put them in a V-shape
    splitIntoVShape(children, a, b);
  }

  sortWith(b, new NodeComparator(true));
  a.push(...b);
  for (let i = 0; i < children.length; i++) {
    children[i] = a[i]!;
  }
}

/**
 * Splits `currentGroup` with `splitGroup` and adds its two parts to the left and right lists (the Java lines
 * `:478-480` and `:490-492`).
 *
 * @see RelativeXPlacer.java:478
 */
function splitAndAddGroup(
  currentGroup: ElkNode[],
  widthLeftRight: Pair<number, number>,
  left: ElkNode[],
  right: ElkNode[],
): void {
  const finalIndexOfLeft = splitGroup(currentGroup, widthLeftRight);
  left.push(...currentGroup.slice(0, finalIndexOfLeft + 1));
  right.push(...currentGroup.slice(finalIndexOfLeft + 1, currentGroup.length));
}

/**
 * The `original.size() == 2` block of `splitNodesWithModelOrder`: model order decides which node goes into which list
 * regardless of what the height ordering says.
 *
 * @see RelativeXPlacer.java:450
 */
function addTwoByModelOrder(original: ElkNode[], left: ElkNode[], right: ElkNode[]): void {
  const first = original[0]!;
  const second = original[1]!;

  // Java unboxes both Integer operands of `>` (RelativeXPlacer.java:455-456): a null model order is an NPE there
  if (
    unboxInteger(first.getProperty(InternalProperties.NODE_MODEL_ORDER), PROPERTY_RETURN_VALUE('ElkNode')) >
    unboxInteger(second.getProperty(InternalProperties.NODE_MODEL_ORDER), PROPERTY_RETURN_VALUE('ElkNode'))
  ) {
    left.push(second);
    right.push(first);
  } else {
    left.push(first);
    right.push(second);
  }
}

/**
 * Split nodes into two lists, while maintaining a sensible model order for nodes on the same height. The Java method
 * falls through from the size 1 and size 2 cases into the group loop; so does this.
 *
 * @see RelativeXPlacer.java:441
 */
export function splitNodesWithModelOrder(original: ElkNode[], left: ElkNode[], right: ElkNode[]): void {
  // identify next subgroup (all at same y)
  // split group in it in the weighted middle (always add first half to left group, and second half to right group)
  if (original.length === 0) {
    return;
  }
  if (original.length === 1) {
    left.push(original[0]!);
  }
  if (original.length === 2) {
    addTwoByModelOrder(original, left, right);
  }

  let currentGroup: ElkNode[] = [];
  const widthLeftRight = new Pair<number, number>(0.0, 0.0);
  let current = original[0]!;
  currentGroup.push(current);
  for (let i = 1; i < original.length; i++) {
    const next = original[i]!;
    if (DoubleCompare.compare(current.getY(), next.getY()) === 0) {
      // add next node to group because it has the same height as the previous element
      currentGroup.push(next);
    } else {
      // split and add entire group
      splitAndAddGroup(currentGroup, widthLeftRight, left, right);

      // reset group
      currentGroup = [];
      currentGroup.push(next);
    }
    current = next;

    // if next element is last element split and add the current group now
    if (i === original.length - 1) {
      splitAndAddGroup(currentGroup, widthLeftRight, left, right);
    }
  }
}

/** The sum of the widths of the nodes, accumulated in order from `0` (the two summing loops of `splitGroup`). */
function sumWidths(nodes: ElkNode[]): number {
  let sum = 0;
  for (const node of nodes) {
    sum += node.getWidth();
  }
  return sum;
}

/**
 * Find a sensible splitting point to divide elements into a left and right list according to a given width of both
 * lists. The `while` loop of the Java does not advance its index (kept; with `desiredLeft < 0` it does not terminate).
 *
 * @param group the group to be split
 * @param widthLeftRight the current widths of the left and right lists
 * @returns the index position at which to split the group
 * @see RelativeXPlacer.java:503
 */
export function splitGroup(group: ElkNode[], widthLeftRight: Pair<number, number>): number {
  if (group.length === 1) {
    return 0;
  } else {
    const widthLeft = widthLeftRight.getFirst() as number;
    const widthRight = widthLeftRight.getSecond() as number;

    const totalNewWidth = sumWidths(group);

    // linear equations to find desired widths to fill both lists so that they reach equal length
    //  I: a + x = b + y
    // II: x + y = t
    // where a and b are widthLeft and widthRight, x and y are the desired additions to left and right
    // and t is the totalNewWidth
    // solution: x = (t-a+b)/2, y = t - (t-a+b)/2

    const desiredLeft = (totalNewWidth - widthLeft + widthRight) / 2;
    //            double desiredRight = totalNewWidth - desiredLeft;

    // add nodes to left side until desiredLeft is exceeded
    // remove last element and compare both solutions, take the one which is closer to the desired solution
    const i = 0;
    let newLeftWidth = 0;
    while (desiredLeft < newLeftWidth && i < group.length) {
      newLeftWidth += group[i]!.getWidth();
    }

    const exceed = newLeftWidth - desiredLeft;
    const under = desiredLeft - (newLeftWidth - group[i]!.getWidth());

    let resultIndex: number;
    if (exceed > under) {
      resultIndex = i;
    } else {
      resultIndex = i - 1;
    }

    // add new widths to accumulated widths
    widthLeftRight.setFirst(widthLeft + exceed);
    const newRightWidth = sumWidths(group.slice(resultIndex + 1));
    widthLeftRight.setSecond(widthRight + newRightWidth);

    return resultIndex;
  }
}
