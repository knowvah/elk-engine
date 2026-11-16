// SPDX-License-Identifier: EPL-2.0
import { NodeMicroLayout } from '../common/NodeMicroLayout.js';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import type { ILayoutProcessor } from '../../core/alg/ILayoutProcessor.js';
import { LayoutProcessorConfiguration } from '../../core/alg/LayoutProcessorConfiguration.js';
import { KVector } from '../../core/math/KVector.js';
import type { ElkPadding } from '../../core/math/ElkPadding.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import { BoxLayoutProvider } from '../../core/util/BoxLayoutProvider.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../core/util/IElkProgressMonitor.js';
import type { EList } from '../../emf/common/util/EList.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { type JavaClassRef, simpleNameOf } from '../../java/lang/JavaClass.js';
import { PROPERTY_RETURN_VALUE, unboxDouble } from '../../java/lang/Unbox.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { InternalProperties } from './options/InternalProperties.js';
import { RectPackingOptions } from './options/RectPackingOptions.js';
import { RectPackingLayoutPhases } from './RectPackingLayoutPhases.js';

/**
 * A layout algorithm that does not take edges into account, but treats all nodes as isolated boxes. This is useful for
 * parts of a diagram that consist of objects without connections, such as parallel regions in Statecharts.
 *
 * Nodes are viewed as rectangles and so `ElkNode`s are referred to as rectangles in the comments.
 *
 * Depending on the settings, checks for a specified special case, calculates a layout with a approximation algorithm or
 * uses that approximation algorithm for the needed area of the rectangles and places the rectangles nicely aligned on
 * the drawing area according to that approximation.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
 */
export class RectPackingLayoutProvider extends AbstractLayoutProvider {
  /** The thing that will assemble the processors that will constitute our algorithm. */
  private readonly algorithmAssembler: AlgorithmAssembler<RectPackingLayoutPhases, ElkNode> = AlgorithmAssembler.create<
    RectPackingLayoutPhases,
    ElkNode
  >(RectPackingLayoutPhases);

  /**
   * Calculating and applying layout to the model.
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Rectangle Packing', 1);

    const padding = layoutGraph.getProperty(RectPackingOptions.PADDING);
    const fixedGraphSize = layoutGraph.getProperty(RectPackingOptions.NODE_SIZE_FIXED_GRAPH_SIZE);
    const nodeNodeSpacing = layoutGraph.getProperty(RectPackingOptions.SPACING_NODE_NODE);
    const tryBox = layoutGraph.getProperty(RectPackingOptions.TRYBOX);
    const rectangles = layoutGraph.getChildren();

    // if requested, compute nodes's dimensions, place node labels, ports, port labels, etc.
    if (!layoutGraph.getProperty(RectPackingOptions.OMIT_NODE_MICRO_LAYOUT)) {
      NodeMicroLayout.forGraph(layoutGraph).execute();
    }

    // Check whether regions are stackable and do box layout instead.
    if (!RectPackingLayoutProvider.isStackable(tryBox, rectangles, nodeNodeSpacing)) {
      RectPackingLayoutProvider.boxLayout(layoutGraph, rectangles);
      progressMonitor.done();
      return;
    }

    if (!this.invokeProcessors(layoutGraph, progressMonitor)) {
      return;
    }

    this.finish(layoutGraph, padding, fixedGraphSize);

    // Do micro layout again since the whitspace elimination and other things might have changed node sizes.
    if (!layoutGraph.getProperty(RectPackingOptions.OMIT_NODE_MICRO_LAYOUT)) {
      NodeMicroLayout.forGraph(layoutGraph).execute();
    }
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(layoutGraph, 'Output');
    }
    progressMonitor.done();
  }

  /**
   * The box layout fallback of `layout` (Java keeps it inline, `:94-103`).
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private static boxLayout(layoutGraph: ElkNode, rectangles: EList<ElkNode>): void {
    // Set priority to invoke box layout.
    let priority = rectangles.size();
    for (const elkNode of rectangles) {
      elkNode.setProperty(CoreOptions.PRIORITY, priority);
      priority--;
    }
    new BoxLayoutProvider().layout(layoutGraph, new BasicProgressMonitor());
  }

  /**
   * Assembles the algorithm and invokes each layout processor (Java keeps it inline, `:105-132`).
   *
   * @returns `false` when the monitor was canceled before a processor (the Java returns from `layout` there, `:112-113`)
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private invokeProcessors(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): boolean {
    const algorithm = this.assembleAlgorithm(layoutGraph);
    // float monitorProgress = 1.0f / algorithm.size();
    const monitorProgress = Math.fround(1.0 / algorithm.length);

    // Invoke each layout processor
    let slotIndex = 0;
    for (const processor of algorithm) {
      if (progressMonitor.isCanceled()) {
        return false;
      }

      // Output debug graph
      if (progressMonitor.isLoggingEnabled()) {
        progressMonitor.logGraph(
          layoutGraph,
          `${String(slotIndex)}-Before ${simpleNameOf(processor.constructor as JavaClassRef)}`,
        );
      }

      processor.process(layoutGraph, progressMonitor.subTask(monitorProgress)!);
      slotIndex++;
    }

    // Graph debug output
    if (progressMonitor.isLoggingEnabled()) {
      progressMonitor.logGraph(layoutGraph, `${String(slotIndex)}-Finished`);
    }
    return true;
  }

  /**
   * The stackable check of `layout`: whether the regions are stackable, so that no box layout is done instead. Java
   * keeps it inline (`:60-85`).
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private static isStackable(tryBox: boolean, rectangles: EList<ElkNode>, nodeNodeSpacing: number): boolean {
    let stackable = false;
    if (tryBox && rectangles.size() >= 3) {
      let region1: ElkNode;
      let region2 = rectangles.get(0);
      let region3 = rectangles.get(1);
      let counter = 0;
      while (counter + 2 < rectangles.size()) {
        region1 = region2;
        region2 = region3;
        region3 = rectangles.get(counter + 2);
        if (
          region1.getHeight() >= region2.getHeight() + region3.getHeight() + nodeNodeSpacing ||
          region3.getHeight() >= region1.getHeight() + region2.getHeight() + nodeNodeSpacing
        ) {
          stackable = true;
          break;
        } else {
          counter++;
        }
      }
    } else {
      stackable = true;
    }
    return stackable;
  }

  /**
   * Content alignment, final touch and graph resize of `layout` (Java keeps them inline, `:121-148`).
   *
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private finish(layoutGraph: ElkNode, padding: ElkPadding, fixedGraphSize: boolean): void {
    const rectangles = layoutGraph.getChildren();
    const source = PROPERTY_RETURN_VALUE('ElkNode');

    // Content alignment
    let realWidth = 0;
    let realHeight = 0;
    for (const rect of rectangles) {
      realWidth = Math.max(realWidth, rect.getX() + rect.getWidth());
      realHeight = Math.max(realHeight, rect.getY() + rect.getHeight());
    }

    ElkUtil.translate(
      layoutGraph,
      new KVector(
        unboxDouble(layoutGraph.getProperty(InternalProperties.DRAWING_WIDTH), source),
        unboxDouble(layoutGraph.getProperty(InternalProperties.DRAWING_HEIGHT), source),
      ),
      new KVector(realWidth, realHeight),
    );

    // Final touch.
    RectPackingLayoutProvider.applyPadding(rectangles, padding);

    if (!fixedGraphSize) {
      ElkUtil.resizeNode(
        layoutGraph,
        unboxDouble(layoutGraph.getProperty(InternalProperties.DRAWING_WIDTH), source) + padding.getHorizontal(),
        unboxDouble(layoutGraph.getProperty(InternalProperties.DRAWING_HEIGHT), source) + padding.getVertical(),
        false,
        true,
      );
    }
  }

  /**
   * Shifts all rectangles to the right and bottom according to the specified padding.
   *
   * @param rectangles list of rectangles that have been placed.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private static applyPadding(rectangles: EList<ElkNode>, padding: ElkPadding): void {
    for (const rect of rectangles) {
      rect.setLocation(rect.getX() + padding.getLeft(), rect.getY() + padding.getTop());
    }
  }

  /**
   * Configure the layout provider by assembling different layout processors.
   *
   * @param layoutGraph The graph which shall be layouted.
   * @return The list of assembled layout processors.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private assembleAlgorithm(layoutGraph: ElkNode): ILayoutProcessor<ElkNode>[] {
    this.algorithmAssembler.reset();
    this.algorithmAssembler.setPhase(
      RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION,
      layoutGraph.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY),
    );
    this.algorithmAssembler.setPhase(
      RectPackingLayoutPhases.P2_PACKING,
      layoutGraph.getProperty(RectPackingOptions.PACKING_STRATEGY),
    );
    this.algorithmAssembler.setPhase(
      RectPackingLayoutPhases.P3_WHITESPACE_ELIMINATION,
      layoutGraph.getProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY),
    );

    this.algorithmAssembler.addProcessorConfiguration(
      RectPackingLayoutProvider.getPhaseIndependentLayoutProcessorConfiguration(layoutGraph),
    );
    return this.algorithmAssembler.build(layoutGraph);
  }

  /**
   * Returns an intermediate processing configuration with processors not tied to specific phases.
   *
   * @param layoutGraph the graph to be processed. The configuration may vary depending on certain properties of the
   *     graph.
   * @return intermediate processing configuration.
   * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutProvider.java
   */
  private static getPhaseIndependentLayoutProcessorConfiguration(
    layoutGraph: ElkNode,
  ): LayoutProcessorConfiguration<RectPackingLayoutPhases, ElkNode> {
    // Basic configuration
    const configuration = LayoutProcessorConfiguration.create<RectPackingLayoutPhases, ElkNode>();

    configuration.addBefore(
      RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION,
      IntermediateProcessorStrategy.MIN_SIZE_PRE_PROCESSOR,
    );

    configuration.addBefore(RectPackingLayoutPhases.P2_PACKING, IntermediateProcessorStrategy.MIN_SIZE_POST_PROCESSOR);

    if (layoutGraph.getProperty(RectPackingOptions.ORDER_BY_SIZE)) {
      configuration.addBefore(
        RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION,
        IntermediateProcessorStrategy.NODE_SIZE_REORDERER,
      );
    }

    if (layoutGraph.getProperty(RectPackingOptions.INTERACTIVE)) {
      configuration.addBefore(
        RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION,
        IntermediateProcessorStrategy.INTERACTIVE_NODE_REORDERER,
      );
    }

    return configuration;
  }
}
