// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { DrawingUtil } from '../util/DrawingUtil.js';
import { AreaApproximation } from './AreaApproximation.js';

/**
 * Approximates the target width based on a greedy placement strategy, which can be configured to use the scale measure,
 * area, or aspect ratio as its {@link OptimizationGoal}, to transform the rectangle packing problem into a strip
 * packing problem.
 *
 * <dl>
 *   <dt>Precondition:</dt>
 *   <dt>Postcondition:</dt>
 *     <dd>{@link InternalProperties#TARGET_WIDTH} is set on the graph.</dd>
 * </dl>
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/GreedyWidthApproximator.java
 */
export class GreedyWidthApproximator implements ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/GreedyWidthApproximator.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Greedy Width Approximator', 1);

    // The desired aspect ratio.
    const aspectRatio = graph.getProperty(RectPackingOptions.ASPECT_RATIO);
    // The padding surrounding the drawing.
    const padding = graph.getProperty(RectPackingOptions.PADDING);
    // The strategy for the initial width approximation.
    const goal = graph.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL);
    // Option for better width approximation.
    const lastPlaceShift = graph.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT);
    //  The spacing between two nodes.
    const nodeNodeSpacing = graph.getProperty(RectPackingOptions.SPACING_NODE_NODE);

    const rectangles = graph.getChildren();
    DrawingUtil.resetCoordinates(rectangles);

    // Initial width approximation.
    const firstIt = new AreaApproximation(aspectRatio, goal, lastPlaceShift);
    const drawing = firstIt.approxBoundingBox(rectangles, nodeNodeSpacing, padding);

    graph.setProperty(InternalProperties.TARGET_WIDTH, drawing.getDrawingWidth());

    progressMonitor.done();
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/GreedyWidthApproximator.java */
  getLayoutProcessorConfiguration(
    _graph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> | null {
    return null;
  }
}
