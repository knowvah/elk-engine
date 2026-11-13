// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../core/alg/LayoutProcessorConfiguration.js';
import type { ElkPadding } from '../../core/math/ElkPadding.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../java/lang/Int32.js';
import type { GridElkNode } from './GridElkNode.js';
import type { TopdownPackingPhases } from './TopdownPackingPhases.js';

/**
 * Java `List.get(index)` on a grid row or column (an `ArrayList`): an index outside `[0, size)` throws
 * `IndexOutOfBoundsException` (a JS array yields `undefined`). The message is the JVM's text as `topdownpacking.json`
 * records it (`throws/p2AllNullRow`; the Javadoc leaves it unspecified).
 */
function listGet<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index]!;
}

/**
 * If there is additional space in the last row, the nodes are widened by an equal factor and shifted to the right to
 * make use of that space.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/BottomRowEqualWhitespaceEliminator.java
 */
export class BottomRowEqualWhitespaceEliminator implements ILayoutPhase<TopdownPackingPhases, GridElkNode> {
  process(layoutGraph: GridElkNode, progressMonitor: IElkProgressMonitor): void {
    // Start progress monitor
    progressMonitor.begin('Whitespace elimination', 1);
    progressMonitor.log(`Whitespace elimination began for node ${String(layoutGraph.getIdentifier())}`);

    if (layoutGraph.getWidth() === 0 || layoutGraph.getColumns() === 0) {
      progressMonitor.log('Parent node has no width, skipping phase');
      progressMonitor.done();
      return;
    }

    const padding = layoutGraph.getProperty(CoreOptions.PADDING);

    this.eliminateRowWhitespace(layoutGraph, padding, progressMonitor);

    this.eliminateVerticalWhitespace(layoutGraph, padding, progressMonitor);

    progressMonitor.logGraph(layoutGraph, 'Graph after whitespace elimination');
    progressMonitor.done();
  }

  /**
   * The row loop of `process` (BottomRowEqualWhitespaceEliminator.java:50-75), split out of `process` for the
   * function-size limit; statements and their order unchanged.
   */
  private eliminateRowWhitespace(
    layoutGraph: GridElkNode,
    padding: ElkPadding,
    progressMonitor: IElkProgressMonitor,
  ): void {
    // for each row check whether there is white space, if there is expand and shift nodes
    // TODO: optimization chance here, if parent width matches predicted width, we can skip directly to the last row
    for (let i = 0; i < layoutGraph.getRows(); i++) {
      const row = layoutGraph.getRow(i);
      // check for whitespace next to last node
      let last: ElkNode | null = null;
      let lastIndex = row.length;
      while (last === null) {
        lastIndex = Int32.sub(lastIndex, 1);
        last = listGet(row, lastIndex);
      }
      const rightBorder = last.getX() + last.getWidth();

      if (rightBorder + padding.right < layoutGraph.getWidth()) {
        progressMonitor.log(`Eliminate white space in row ${String(i)}`);
        const extraSpace = layoutGraph.getWidth() - (rightBorder + padding.right);
        const extraSpacePerNode = extraSpace / Int32.add(lastIndex, 1);
        let accumulatedShift = 0;
        // go through all nodes in row, shift and enlargen them
        for (let j = 0; j <= lastIndex; j++) {
          // Java dereferences each entry; a null before the last node is a NullPointerException (D10: TypeError)
          const node = listGet(row, j)!;
          node.setX(node.getX() + accumulatedShift);
          node.setWidth(node.getWidth() + extraSpacePerNode);
          accumulatedShift += extraSpacePerNode;
        }
      }
    }
  }

  /**
   * The vertical part of `process` (BottomRowEqualWhitespaceEliminator.java:77-100), split out of `process` for the
   * function-size limit; statements and their order unchanged.
   */
  private eliminateVerticalWhitespace(
    layoutGraph: GridElkNode,
    padding: ElkPadding,
    progressMonitor: IElkProgressMonitor,
  ): void {
    // check whether there is vertical white space
    const col = layoutGraph.getColumn(0);
    // check for whitespace below first column and expand all columns accordingly,
    // to prevent expanding into same space as horizontal expansion
    // Java dereferences the entry; a null is a NullPointerException (D10: TypeError)
    const last = listGet(col, Int32.sub(col.length, 1))!;
    const bottomBorder = last.getY() + last.getHeight();
    const extraSpace = layoutGraph.getHeight() - (bottomBorder + padding.bottom);
    const extraSpacePerNode = extraSpace / Int32.add(col.length, 1);
    let accumulatedShift = 0;
    progressMonitor.log('Eliminate vertical white space');
    if (bottomBorder + padding.bottom < layoutGraph.getHeight()) {
      for (let i = 0; i < layoutGraph.getRows(); i++) {
        const row = layoutGraph.getRow(i);
        // go through all nodes in row, shift and enlarge them
        for (const node of row) {
          if (node === null) {
            break;
          }
          node.setY(node.getY() + accumulatedShift);
          node.setHeight(node.getHeight() + extraSpacePerNode);
          accumulatedShift += extraSpacePerNode;
        }
      }
    }
  }

  getLayoutProcessorConfiguration(graph: GridElkNode): LayoutProcessorConfiguration<TopdownPackingPhases, GridElkNode> {
    return LayoutProcessorConfiguration.create<TopdownPackingPhases, GridElkNode>();
  }
}
