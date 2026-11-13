// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { KVector } from '../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { BlockStack } from '../util/BlockStack.js';
import { DrawingUtil } from '../util/DrawingUtil.js';
import type { RectRow } from '../util/RectRow.js';
import { InitialPlacement } from './InitialPlacement.js';

/** Java auto-unboxing of a `Double` property that may be unset (`NullPointerException` is a `TypeError`, D10). */
const unboxProperty = (value: number | null | undefined): number =>
  unboxDouble(value, PROPERTY_RETURN_VALUE('ElkNode'));

/**
 * Places the given rectangles next to each other to form rows.
 *
 * Precondition: TARGET_WIDTH is set. Postcondition: all child nodes have coordinates such that the next node is either
 * right of the current one or in a new row; DRAWING_WIDTH, DRAWING_HEIGHT, ROWS and ADDITIONAL_HEIGHT are set.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/SimplePlacement.java
 */
export class SimplePlacement implements ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/SimplePlacement.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('No Compaction', 1);
    const targetWidth = unboxProperty(graph.getProperty(InternalProperties.TARGET_WIDTH));
    const nodeNodeSpacing = graph.getProperty(RectPackingOptions.SPACING_NODE_NODE);
    const padding = graph.getProperty(RectPackingOptions.PADDING);
    // Reset coordinates potentially set by width approximation.
    DrawingUtil.resetCoordinates(graph.getChildren());

    // Initial placement for rectangles in blocks in each row.
    // `InitialPlacement.place` returns its list on every path, so the `rows == null` arm below is dead (U).
    const rows: RectRow[] | null = InitialPlacement.place(graph.getChildren(), targetWidth, nodeNodeSpacing);
    let size: KVector;
    const rectangles = graph.getChildren();
    if (rows === null) {
      size = DrawingUtil.calculateDimensionsOfRectangles(rectangles);
    } else {
      SimplePlacement.putBlocksInOwnStacks(graph, rows);
      size = DrawingUtil.calculateDimensions(rows, nodeNodeSpacing);
    }
    const width = Math.max(
      size.x,
      unboxProperty(graph.getProperty(InternalProperties.MIN_WIDTH)) - padding.getHorizontal(),
    );
    const height = Math.max(
      size.y,
      unboxProperty(graph.getProperty(InternalProperties.MIN_HEIGHT)) - padding.getVertical(),
    );
    const additionalHeight = height - size.y;
    graph.setProperty(InternalProperties.ADDITIONAL_HEIGHT, additionalHeight);
    graph.setProperty(InternalProperties.DRAWING_WIDTH, width);
    graph.setProperty(InternalProperties.DRAWING_HEIGHT, height + additionalHeight);
    graph.setProperty(InternalProperties.ROWS, rows as RectRow[]);
    progressMonitor.done();
  }

  /** "Put every block in its own block stack." (SimplePlacement.java:63-71). */
  private static putBlocksInOwnStacks(graph: ElkNode, rows: RectRow[]): void {
    for (const row of rows) {
      for (const block of row.getChildren()) {
        const stack = new BlockStack(
          block.getX(),
          block.getY(),
          graph.getProperty(RectPackingOptions.SPACING_NODE_NODE),
        );
        stack.addBlock(block);
        row.getStacks().push(stack);
      }
    }
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/SimplePlacement.java */
  getLayoutProcessorConfiguration(
    graph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> | null {
    void graph;
    return null;
  }
}
