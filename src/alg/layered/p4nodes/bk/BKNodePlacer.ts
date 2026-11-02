// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../../core/alg/ILayoutPhase.js';
import { LayoutProcessorConfiguration } from '../../../../core/alg/LayoutProcessorConfiguration.js';
import type { IElkProgressMonitor } from '../../../../core/util/IElkProgressMonitor.js';
import * as DoubleToString from '../../../../java/lang/DoubleToString.js';
import * as Lists from '../../../../guava/Lists.js';
import { LayeredPhases } from '../../LayeredPhases.js';
import type { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { IntermediateProcessorStrategy } from '../../intermediate/IntermediateProcessorStrategy.js';
import { FixedAlignment } from '../../options/FixedAlignment.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { BKAligner } from './BKAligner.js';
import { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';
import { BKCompactor } from './BKCompactor.js';
import { createBalancedLayout } from './BKNodePlacerBalancing.js';
import { collectionToString, mapToString } from './BKNodePlacerDebug.js';
import { markConflicts } from './BKNodePlacerConflicts.js';
import { checkOrderConstraint } from './BKNodePlacerFeasibility.js';
import type { ICompactor } from './ICompactor.js';
import { NeighborhoodInformation } from './NeighborhoodInformation.js';

/**
 * This algorithm is an implementation for solving the node placement problem which is posed in phase 4 of the ELK
 * Layered algorithm. Inspired by:
 *
 * - Ulrik Brandes and Boris Koepf, Fast and simple horizontal coordinate assignment. In _Proceedings of the 9th
 *   International Symposium on Graph Drawing (GD'01)_, LNCS vol. 2265, pp. 33-36, Springer, 2002.
 *
 * The original algorithm was extended to be able to cope with ports, node sizes, and node margins, and was made more
 * stable in general. The algorithm is structured in five steps, which include two new steps which were not included in
 * the original algorithm by Brandes and Koepf. The middle three steps are executed four times, traversing the graph in
 * all combinations of TOP or BOTTOM and LEFT or RIGHT.
 *
 * In ELK Layered we have the general idea of layouting from left to right and transforming in the desired direction
 * later. We decided to translate the terminology of the original algorithm which thinks of a layout from top to
 * bottom. When placing coordinates, we have to differ from the original algorithm, since node placement in ELK Layered
 * has to assign y-coordinates and not x-coordinates.
 *
 * The algorithm: (1) mark type 1 conflicts (`markConflicts`); then, for each of UP/DOWN x LEFT/RIGHT, (2) group nodes
 * into blocks (`BKAligner.verticalAlignment`), (3) shift nodes inside the blocks (`BKAligner.insideBlockShift`) and
 * (4) assign y-coordinates (`BKCompactor.horizontalCompaction`); (5) choose the smallest feasible layout, or the
 * median of all four when a balanced layout is wanted. A layout that has overlaps or violates the layer order is
 * discarded.
 *
 * - Preconditions: The graph has a proper layering with optimized nodes ordering; ports are properly arranged
 * - Postconditions: Each node is assigned a vertical coordinate such that no two nodes overlap; the size of each layer
 *   is set according to the area occupied by its nodes; the height of the graph is set to the maximal layer height
 *
 * Sections (P1): conflict detection (`BKNodePlacer.java:268-380`) is `BKNodePlacerConflicts`, layout balancing
 * (`:382-460`) `BKNodePlacerBalancing`, `checkOrderConstraint` `BKNodePlacerFeasibility`, and the `toString`s of the
 * debug output `BKNodePlacerDebug`. They take the placer's fields as parameters. `process` is split into
 * `createLayouts`, `chooseLayout` and `applyPositions` (complexity limits); the Java statement order is kept.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKNodePlacer.java
 */
export class BKNodePlacer implements ILayoutPhase<LayeredPhases, LGraph> {
  static #HIERARCHY_PROCESSING_ADDITIONS: LayoutProcessorConfiguration<LayeredPhases, LGraph> | undefined;

  /**
   * Additional processor dependencies for graphs with hierarchical ports. Built on first use, as Java builds the
   * static field at class initialisation: a module-level read of `IntermediateProcessorStrategy` would run before that
   * enum finishes evaluating (mission 7b decision E1, mission 7d N4).
   *
   * @see BKNodePlacer.java:123
   */
  private static get HIERARCHY_PROCESSING_ADDITIONS(): LayoutProcessorConfiguration<LayeredPhases, LGraph> {
    return (BKNodePlacer.#HIERARCHY_PROCESSING_ADDITIONS ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR));
  }

  getLayoutProcessorConfiguration(graph: LGraph): LayoutProcessorConfiguration<LayeredPhases, LGraph> | null {
    if (graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      return BKNodePlacer.HIERARCHY_PROCESSING_ADDITIONS;
    } else {
      return null;
    }
  }

  private lGraph!: LGraph;
  /** List of edges involved in type 1 conflicts (see above); membership only (N7). */
  private readonly markedEdges: Set<LEdge> = new Set<LEdge>();
  /** Precalculated information on nodes' neighborhoods etc. */
  private ni!: NeighborhoodInformation;

  /** Whether to produce a balanced layout or not. */
  private produceBalancedLayout = false;

  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Brandes & Koepf node placement', 1);

    this.lGraph = layeredGraph;

    // Precalculate some information that we require during the
    // following processes.
    this.ni = NeighborhoodInformation.buildFor(layeredGraph);

    // a balanced layout is desired if
    //  a) no specific alignment is set and straight edges are not desired
    //  b) a balanced alignment is enforced
    const align = layeredGraph.getProperty(LayeredOptions.NODE_PLACEMENT_BK_FIXED_ALIGNMENT);
    const favorStraightEdges = layeredGraph.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES);
    this.produceBalancedLayout =
      (align === FixedAlignment.NONE && !favorStraightEdges) || align === FixedAlignment.BALANCED;

    // Phase which marks type 1 conflicts, no difference between the directions so only
    // one run is required.
    markConflicts(layeredGraph, this.ni, this.markedEdges);

    // Initialize four layouts which result from the two possible directions respectively.
    const layouts = this.createLayouts(layeredGraph);

    this.alignLayouts(layeredGraph, layouts);

    const compacter: ICompactor = new BKCompactor(layeredGraph, this.ni);
    for (const bal of layouts) {
      // This phase determines the y coordinates of the blocks and thus the vertical coordinates
      // of all nodes.
      compacter.horizontalCompaction(bal);
    }

    // Debug output
    if (monitor.isLoggingEnabled()) {
      for (const bal of layouts) {
        monitor.log(`${bal.toString()} size is ${DoubleToString.toString(bal.layoutSize())}`);
      }
    }

    const chosenLayout = this.chooseLayout(layeredGraph, layouts, monitor);

    // Apply calculated positions to nodes.
    this.applyPositions(layeredGraph, chosenLayout);

    this.logResult(chosenLayout, monitor);

    // cleanup
    for (const bal of layouts) {
      bal.cleanup();
    }
    this.ni.cleanup();
    this.markedEdges.clear();

    monitor.done();
  }

  /** The first loop over the layouts of `process` (`BKNodePlacer.java:204`), split off for the complexity limits. */
  private alignLayouts(layeredGraph: LGraph, layouts: BKAlignedLayout[]): void {
    const aligner = new BKAligner(layeredGraph, this.ni);
    for (const bal of layouts) {
      // Phase which determines the nodes' memberships in blocks. This happens in four different
      // ways, either from processing the nodes from the first layer to the last or vice versa.
      aligner.verticalAlignment(bal, this.markedEdges);

      // Additional phase which is not included in the original Brandes-Koepf Algorithm.
      // It makes sure that the connected ports within a block are aligned to avoid unnecessary
      // bend points. Also, the required size of each block is determined.
      aligner.insideBlockShift(bal);
    }
  }

  /** The debug output after the positions are applied (`BKNodePlacer.java:277-281`; N8), split off likewise. */
  private logResult(chosenLayout: BKAlignedLayout, monitor: IElkProgressMonitor): void {
    // Debug output
    if (monitor.isLoggingEnabled()) {
      monitor.log(`Chosen node placement: ${chosenLayout.toString()}`);
      monitor.log(`Blocks: ${mapToString(BKNodePlacer.getBlocks(chosenLayout))}`);
      monitor.log(`Classes: ${mapToString(BKNodePlacer.getClasses(chosenLayout, monitor))}`);
      monitor.log(`Marked edges: ${collectionToString(this.markedEdges)}`);
    }
  }

  /**
   * The `switch` of `process` (`BKNodePlacer.java:177`): the layouts to compute, in the order they are processed. The
   * Java locals `rightdown`, `rightup`, `leftdown` and `leftup` only serve to fill the list.
   */
  private createLayouts(layeredGraph: LGraph): BKAlignedLayout[] {
    const layouts: BKAlignedLayout[] = Lists.newArrayListWithCapacity(4);
    const nodeCount = this.ni.nodeCount;
    switch (layeredGraph.getProperty(LayeredOptions.NODE_PLACEMENT_BK_FIXED_ALIGNMENT)) {
      case FixedAlignment.LEFTDOWN:
        layouts.push(new BKAlignedLayout(layeredGraph, nodeCount, VDirection.DOWN, HDirection.LEFT));
        break;
      case FixedAlignment.LEFTUP:
        layouts.push(new BKAlignedLayout(layeredGraph, nodeCount, VDirection.UP, HDirection.LEFT));
        break;
      case FixedAlignment.RIGHTDOWN:
        layouts.push(new BKAlignedLayout(layeredGraph, nodeCount, VDirection.DOWN, HDirection.RIGHT));
        break;
      case FixedAlignment.RIGHTUP:
        layouts.push(new BKAlignedLayout(layeredGraph, nodeCount, VDirection.UP, HDirection.RIGHT));
        break;
      default: {
        const leftdown = new BKAlignedLayout(layeredGraph, nodeCount, VDirection.DOWN, HDirection.LEFT);
        const leftup = new BKAlignedLayout(layeredGraph, nodeCount, VDirection.UP, HDirection.LEFT);
        const rightdown = new BKAlignedLayout(layeredGraph, nodeCount, VDirection.DOWN, HDirection.RIGHT);
        const rightup = new BKAlignedLayout(layeredGraph, nodeCount, VDirection.UP, HDirection.RIGHT);
        layouts.push(rightdown);
        layouts.push(rightup);
        layouts.push(leftdown);
        layouts.push(leftup);
      }
    }
    return layouts;
  }

  /**
   * Choose a layout from the four calculated layouts (`BKNodePlacer.java:236`). Layouts that contain errors are
   * skipped. The layout with the smallest size is selected. If more than one smallest layout exists, the first one of
   * the competing layouts is selected.
   */
  private chooseLayout(
    layeredGraph: LGraph,
    layouts: BKAlignedLayout[],
    monitor: IElkProgressMonitor,
  ): BKAlignedLayout {
    let chosenLayout: BKAlignedLayout | null = null;

    // If layout options chose to use the balanced layout, it is calculated and added here.
    // If it is broken for any reason, one of the four other layouts is selected by the
    // given criteria.
    if (this.produceBalancedLayout) {
      const balanced = createBalancedLayout(this.lGraph, layouts, this.ni.nodeCount);
      if (checkOrderConstraint(layeredGraph, balanced, monitor)) {
        chosenLayout = balanced;
      }
    }

    // Either if no balanced layout is requested, or, if the balanced layout
    // violates order constraints, pick the one with the smallest height
    if (chosenLayout === null) {
      for (const bal of layouts) {
        if (checkOrderConstraint(layeredGraph, bal, monitor)) {
          if (chosenLayout === null || chosenLayout.layoutSize() > bal.layoutSize()) {
            chosenLayout = bal;
          }
        }
      }
    }

    // If no layout is correct (which should never happen but is not strictly impossible),
    // the RIGHTDOWN layout is chosen by default.
    if (chosenLayout === null) {
      chosenLayout = layouts[0]!; // there has to be at least one layout in the list
    }
    return chosenLayout;
  }

  /** The loop that applies the chosen layout (`BKNodePlacer.java:270`). */
  private applyPositions(layeredGraph: LGraph, chosenLayout: BKAlignedLayout): void {
    for (const layer of layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        node.getPosition().y = chosenLayout.y[node.id]! + chosenLayout.innerShift[node.id]!;
      }
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////
  // Utility Methods

  /**
   * Find an edge between two given nodes.
   *
   * @param source The source node of the edge
   * @param target The target node of the edge
   * @return The edge between source and target, or null if there is none
   * @see BKNodePlacer.java:501
   */
  static getEdge(source: LNode, target: LNode): LEdge | null {
    for (const edge of source.getConnectedEdges()) {
      if (edge.getTarget()!.getNode() === target || edge.getSource()!.getNode() === target) {
        return edge;
      }
    }

    return null;
  }

  /**
   * Finds all blocks of a given layout. The result is a `LinkedHashMap` in Java, a `Map` here (insertion order); a
   * balanced layout has no roots, so its only key is `null`.
   *
   * @param bal The layout of which the blocks shall be found
   * @return The blocks of the given layout
   * @see BKNodePlacer.java:517
   */
  static getBlocks(bal: BKAlignedLayout): Map<LNode | null, LNode[]> {
    const blocks = new Map<LNode | null, LNode[]>();

    for (const layer of bal.layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        const root = bal.root[node.id] ?? null;
        let blockContents = blocks.get(root);

        if (blockContents === undefined) {
          blockContents = Lists.newArrayList<LNode>();
          blocks.set(root, blockContents);
        }

        blockContents.push(node);
      }
    }

    return blocks;
  }

  /**
   * Finds all classes of a given layout. Only used for debug output.
   *
   * @param bal The layout whose classes to find
   * @param monitor progress monitor for debug output
   * @return The classes of the given layout
   * @see BKNodePlacer.java:544
   */
  static getClasses(bal: BKAlignedLayout, monitor: IElkProgressMonitor): Map<LNode | null, LNode[]> {
    const classes = new Map<LNode | null, LNode[]>();

    // We need to enumerate all block roots
    const roots = new Set<LNode | null>(bal.root);
    for (const root of roots) {
      if (root === null) {
        monitor.log('There are no classes in a balanced layout.');
        break;
      }
      const sink = bal.sink[root.id]!;
      let classContents = classes.get(sink);

      if (classContents === undefined) {
        classContents = Lists.newArrayList<LNode>();
        classes.set(sink, classContents);
      }

      classContents.push(root);
    }

    return classes;
  }
}
