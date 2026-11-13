// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { DrawingUtil } from '../util/DrawingUtil.js';

/**
 * Strategy that just does nothing with the input and just calculates the drawing size based on the coordinates of the
 * children. Whitespace elimination cannot be done with this packing strategy since it might not succeed.
 *
 * Precondition: TARGET_WIDTH is set; child nodes already have sensible coordinates. Postcondition: DRAWING_WIDTH,
 * DRAWING_HEIGHT and ADDITIONAL_HEIGHT are set.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/NoPlacement.java
 */
export class NoPlacement implements ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/NoPlacement.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('No Compaction', 1);
    const padding = graph.getProperty(RectPackingOptions.PADDING);
    const rectangles = graph.getChildren();

    const size = DrawingUtil.calculateDimensionsOfRectangles(rectangles);
    const width = Math.max(
      size.x,
      unboxDouble(graph.getProperty(InternalProperties.MIN_WIDTH), PROPERTY_RETURN_VALUE('ElkNode')) -
        padding.getHorizontal(),
    );
    const height = Math.max(
      size.y,
      unboxDouble(graph.getProperty(InternalProperties.MIN_HEIGHT), PROPERTY_RETURN_VALUE('ElkNode')) -
        padding.getVertical(),
    );
    const additionalHeight = height - size.y;
    graph.setProperty(InternalProperties.ADDITIONAL_HEIGHT, additionalHeight);
    graph.setProperty(InternalProperties.DRAWING_WIDTH, width);
    graph.setProperty(InternalProperties.DRAWING_HEIGHT, height + additionalHeight);
    progressMonitor.done();
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/NoPlacement.java */
  getLayoutProcessorConfiguration(
    graph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> | null {
    void graph;
    return null;
  }
}
