// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';

/**
 * After the `EndLabelPreprocessor` has done all the major work for us, each node may have a list of label cells full of
 * edge end labels associated with it, along with proper label cell coordinates. The problem is that when the
 * preprocessor was run, the final coordinates of all the nodes (and with that, the final coordinates of all the edges)
 * were not known yet. Now they are, so the label cell coordinates can be offset accordingly and label coordinates can
 * be applied.
 *
 * Precondition: a layered graph; end labels of all edges are contained in label cells associated with nodes; label
 * cells have correct sizes and settings and are placed relative to their node's upper left corner. Postcondition: end
 * labels have proper coordinates assigned to them. Slot: after phase 5; same-slot dependency: `EndLabelSorter`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/EndLabelPostprocessor.java
 */
export class EndLabelPostprocessor implements ILayoutProcessor<LGraph> {
  /** @see EndLabelPostprocessor.java:53 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('End label post-processing', 1);

    // We iterate over each node's label cells and offset and place them
    for (const layer of layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        if (
          (node.getType() === NodeType.NORMAL || node.getType() === NodeType.EXTERNAL_PORT) &&
          node.hasProperty(InternalProperties.END_LABELS)
        ) {
          this.processNode(node);
        }
      }
    }

    monitor.done();
  }

  /** @see EndLabelPostprocessor.java:65 */
  private processNode(node: LNode): void {
    // Java `assert node.hasProperty(END_LABELS)` and `assert !endLabelCells.isEmpty()`: disabled without -ea
    // (translation rules 6.8; no devAssert helper)

    // The node should have a non-empty list of label cells, or something went TERRIBLY WRONG!!!
    const endLabelCells = node.getProperty(InternalProperties.END_LABELS);

    const nodePos = node.getPosition();

    for (const labelCell of endLabelCells.values()) {
      const labelCellRect = labelCell.getCellRectangle();
      labelCellRect.move(nodePos);

      labelCell.applyLabelLayout();
    }

    // Remove label cells
    node.setProperty(InternalProperties.END_LABELS, null);
  }
}
