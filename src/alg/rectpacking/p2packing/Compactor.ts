// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { LayoutProcessorConfiguration } from '../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ElkGraphFactory } from '../../../graph/ElkGraphFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../../java/lang/Unbox.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { RectPackingOptions } from '../options/RectPackingOptions.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import type { DrawingData } from '../util/DrawingData.js';
import { RowFillingAndCompaction } from './RowFillingAndCompaction.js';

/** Java auto-unboxing of a `Double` property that may be unset (`NullPointerException` is a `TypeError`, D10). */
const unboxProperty = (value: number | null | undefined): number =>
  unboxDouble(value, PROPERTY_RETURN_VALUE('ElkNode'));

/**
 * Places and compact the given rectangles by forming rows of stacks of blocks of subrows to maintain a common reading
 * direction inside a target width.
 *
 * Precondition: TARGET_WIDTH is set. Postcondition: all child nodes have coordinates such that the next node is either in
 * the same subrows/row, a new subrows/row, or in a new stack in the same row; DRAWING_WIDTH, DRAWING_HEIGHT, ROWS and
 * ADDITIONAL_HEIGHT are set.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java
 */
export class Compactor implements ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Compaction', 1);
    const rectangles = graph.getChildren();
    const aspectRatio = graph.getProperty(RectPackingOptions.ASPECT_RATIO);
    const nodeNodeSpacing = graph.getProperty(RectPackingOptions.SPACING_NODE_NODE);
    const padding = graph.getProperty(RectPackingOptions.PADDING);

    let secondIt = new RowFillingAndCompaction(aspectRatio, nodeNodeSpacing);
    const drawing = secondIt.start(rectangles, progressMonitor, graph, padding);
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(graph, 'Compacted');
    }
    // elkjs-exclude-end
    // Begin possible iterations to improve rectpacking by setting a new target width and repeating the compaction.
    this.copyRowWidthChangeValues(graph, secondIt);

    // Begin more compaction iterations if more than one iteration is specified.
    let iterations = graph.getProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS);
    while (iterations > 1) {
      // Create a shallow clone based on properties and sizes of children (not grandchildren).
      const clone = this.clone(graph);
      const oldSM = drawing.getScaleMeasure();
      // Calculate new target width and configure clone.
      this.configureSecondIteration(graph, clone, drawing);
      // Run additional compaction step.
      secondIt = new RowFillingAndCompaction(aspectRatio, nodeNodeSpacing);
      const newDrawing = secondIt.start(rectangles, progressMonitor, clone, padding);

      this.logClone(progressMonitor, clone, iterations);
      // Compare scale measure and choose the best packing.
      const newSM = newDrawing.getScaleMeasure();

      // Java: `newSM >= oldSM && newSM == (double) newSM`; the second operand is false only for NaN.
      if (newSM >= oldSM && !Number.isNaN(newSM)) {
        // If the new packing is better apply packing to original graph.
        this.applyPacking(graph, clone, secondIt, drawing, newDrawing);
      }
      iterations--;
    }

    graph.setProperty(InternalProperties.DRAWING_HEIGHT, drawing.getDrawingHeight());
    graph.setProperty(InternalProperties.DRAWING_WIDTH, drawing.getDrawingWidth());
    progressMonitor.done();
  }

  /** The `Layouted clone` log of the iteration loop (Compactor.java:79-83). */
  private logClone(progressMonitor: IElkProgressMonitor, clone: ElkNode, iterations: number): void {
    // elkjs-exclude-start
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(clone, `Layouted clone ${String(iterations)}`);
    }
    // elkjs-exclude-end
  }

  /** The body of the "new packing is better" `if` of `process` (Compactor.java:88-95). */
  private applyPacking(
    graph: ElkNode,
    clone: ElkNode,
    secondIt: RowFillingAndCompaction,
    drawing: DrawingData,
    newDrawing: DrawingData,
  ): void {
    for (let i = 0; i < clone.getChildren().size(); i++) {
      this.copyPosition(clone.getChildren().get(i), graph.getChildren().get(i));
    }
    this.copyRowWidthChangeValues(graph, secondIt);
    drawing.setDrawingWidth(newDrawing.getDrawingWidth());
    drawing.setDrawingHeight(newDrawing.getDrawingHeight());
  }

  /**
   * Copies the row width increase and decrease to the graph.
   *
   * @param graph The graph
   * @param compaction Compaction data
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java
   */
  private copyRowWidthChangeValues(graph: ElkNode, compaction: RowFillingAndCompaction): void {
    graph.setProperty(InternalProperties.MIN_ROW_INCREASE, compaction.potentialRowWidthIncreaseMin);
    graph.setProperty(InternalProperties.MAX_ROW_INCREASE, compaction.potentialRowWidthIncreaseMax);
    graph.setProperty(InternalProperties.MIN_ROW_DECREASE, compaction.potentialRowWidthDecreaseMin);
    graph.setProperty(InternalProperties.MAX_ROW_DECREASE, compaction.potentialRowWidthDecreaseMax);
  }

  /** @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java */
  getLayoutProcessorConfiguration(
    graph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> | null {
    void graph;
    return null;
  }

  /**
   * Set new target width on clone.
   *
   * @param layoutGraph The original graph.
   * @param clone The clone to configure.
   * @param drawing The initial drawing.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java
   */
  private configureSecondIteration(layoutGraph: ElkNode, clone: ElkNode, drawing: DrawingData): void {
    const padding = layoutGraph.getProperty(RectPackingOptions.PADDING);
    const aspectRatio = layoutGraph.getProperty(RectPackingOptions.ASPECT_RATIO);
    // Try to layout again if the aspect ratio seems to be bad
    if (
      layoutGraph.getChildren().size() > 1 &&
      layoutGraph.getProperty(InternalProperties.MIN_ROW_INCREASE) !== Number.POSITIVE_INFINITY &&
      (drawing.getDrawingWidth() + padding.getHorizontal()) / (drawing.getDrawingHeight() + padding.getVertical()) <
        aspectRatio
    ) {
      // The drawing is too high, this means the approximated target width is too low
      // The new target width will be set to the next higher value that would change something.
      clone.setProperty(
        InternalProperties.TARGET_WIDTH,
        unboxProperty(layoutGraph.getProperty(InternalProperties.TARGET_WIDTH)) +
          layoutGraph.getProperty(InternalProperties.MIN_ROW_INCREASE),
      );
    } else if (
      layoutGraph.getChildren().size() > 1 &&
      layoutGraph.getProperty(InternalProperties.MIN_ROW_DECREASE) !== Number.POSITIVE_INFINITY &&
      (drawing.getDrawingWidth() + padding.getHorizontal()) / (drawing.getDrawingHeight() + padding.getVertical()) >
        aspectRatio
    ) {
      // The drawing is too high, this means the approximated target width is too high.
      // The new target width will be set to the next smaller value that would change something.
      clone.setProperty(
        InternalProperties.TARGET_WIDTH,
        Math.max(
          unboxProperty(layoutGraph.getProperty(InternalProperties.MIN_WIDTH)),
          unboxProperty(clone.getProperty(InternalProperties.TARGET_WIDTH)) -
            layoutGraph.getProperty(InternalProperties.MIN_ROW_DECREASE),
        ),
      );
    }
  }

  /**
   * Clones a node including all properties and its children with their properties.
   *
   * @param node The node to clone
   * @return The clones node
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java
   */
  private clone(node: ElkNode): ElkNode {
    const clone = ElkGraphFactory.eINSTANCE.createElkNode();
    clone.copyProperties(node);
    for (const child of node.getChildren()) {
      const newChild = ElkGraphFactory.eINSTANCE.createElkNode();
      newChild.setParent(clone);
      newChild.setDimensions(child.getWidth(), child.getHeight());
      newChild.setIdentifier(child.getIdentifier());
      newChild.setLocation(child.getX(), child.getY());
      clone.getChildren().add(newChild);
      newChild.copyProperties(child);
    }
    return clone;
  }

  /**
   * Copy the position of dimension of a node to the other and does the same for its children.
   *
   * @param node The node to copy from.
   * @param other The node to copy to.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p2packing/Compactor.java
   */
  private copyPosition(node: ElkNode, other: ElkNode): void {
    other.setDimensions(node.getWidth(), node.getHeight());
    other.setLocation(node.getX(), node.getY());
    for (let i = 0; i < node.getChildren().size(); i++) {
      this.copyPosition(node.getChildren().get(i), other.getChildren().get(i));
    }
  }
}
