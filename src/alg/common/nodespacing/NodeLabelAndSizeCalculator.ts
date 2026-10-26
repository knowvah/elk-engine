// SPDX-License-Identifier: EPL-2.0
import { ElkPadding } from '../../../core/math/ElkPadding.js';
import type { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import { ContainerArea } from './cellsystem/ContainerArea.js';
import type { GridContainerCell } from './cellsystem/GridContainerCell.js';
import { CellSystemConfigurator } from './internal/algorithm/CellSystemConfigurator.js';
import { HorizontalPortPlacementSizeCalculator } from './internal/algorithm/HorizontalPortPlacementSizeCalculator.js';
import { InsidePortLabelCellCreator } from './internal/algorithm/InsidePortLabelCellCreator.js';
import { LabelPlacer } from './internal/algorithm/LabelPlacer.js';
import { NodeLabelAndSizeUtilities } from './internal/algorithm/NodeLabelAndSizeUtilities.js';
import { NodeLabelCellCreator } from './internal/algorithm/NodeLabelCellCreator.js';
import { NodeSizeCalculator } from './internal/algorithm/NodeSizeCalculator.js';
import { PortContextCreator } from './internal/algorithm/PortContextCreator.js';
import { PortLabelPlacementCalculator } from './internal/algorithm/PortLabelPlacementCalculator.js';
import { PortPlacementCalculator } from './internal/algorithm/PortPlacementCalculator.js';
import { VerticalPortPlacementSizeCalculator } from './internal/algorithm/VerticalPortPlacementSizeCalculator.js';
import { NodeContext } from './internal/NodeContext.js';

/**
 * Knows how to calculate the size of a node and how to place its ports. Takes all size constraints and options into
 * account.
 *
 * This calculator internally understands the layout of the node as a grid-like system of cells in which different
 * labels and ports are placed. Each cell has a padding and a minimum size, which may or may not be taken into
 * account when calculating the minimum size of the node.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/NodeLabelAndSizeCalculator.java
 */
export class NodeLabelAndSizeCalculator {
  /** No instance required. */
  private constructor() {}

  /**
   * The Java overloads `process(GraphAdapter)` (`:63`) and `process(GraphAdapter, NodeAdapter, boolean, boolean)`
   * (`:86`) differ in arity, so they share one name (translation-rules 6.5).
   *
   * Processes all direct children of the given graph, or the given node, which is assumed to be a child of the
   * given graph. Note that the second form does not check whether or not this is the case. The worst that can
   * happen, however, is that wrong spacing values are applied during processing.
   *
   * @param graph the node's parent graph.
   * @param node the node to process.
   * @param applyStuff `true` if the node should actually be resized and have its ports and labels positioned,
   *                   `false` if we should only return the size that would be applied.
   * @param ignoreInsidePortLabels if `true`, we don't place port labels that should be placed inside. This is
   *                   usually used in conjunction with `applyStuff` by layout algorithms that want to get a lower
   *                   bound on a hierarchical node's size, but that handle inside port labels themselves.
   * @returns the node's size that was or would be applied (second form).
   */
  static process(graph: GraphAdapters.GraphAdapter<unknown>): void;
  static process(
    graph: GraphAdapters.GraphAdapter<unknown> | null,
    node: GraphAdapters.NodeAdapter<unknown>,
    applyStuff: boolean,
    ignoreInsidePortLabels: boolean,
  ): KVector;
  static process(
    graph: GraphAdapters.GraphAdapter<unknown> | null,
    node?: GraphAdapters.NodeAdapter<unknown>,
    applyStuff?: boolean,
    ignoreInsidePortLabels?: boolean,
  ): KVector | undefined {
    if (node === undefined) {
      // Process all of the graph's direct children
      for (const child of graph!.getNodes()) {
        NodeLabelAndSizeCalculator.process(graph, child, true, false);
      }
      return undefined;
    }
    return NodeLabelAndSizeCalculator.processNode(graph, node, applyStuff!, ignoreInsidePortLabels!);
  }

  // The body of Java `process(graph, node, applyStuff, ignoreInsidePortLabels)` (`:86`). Phases 1-4 are
  // `setupCells` and `computeMinimumPortSpace` (function size limit); the phase order is Java's.
  private static processNode(
    graph: GraphAdapters.GraphAdapter<unknown> | null,
    node: GraphAdapters.NodeAdapter<unknown>,
    applyStuff: boolean,
    ignoreInsidePortLabels: boolean,
  ): KVector {
    // Note that, upon Miro's request, each phase of the algorithm was given a code name in the first version of
    // this code. We happily carry on fulfilling this request in this, the second version.

    /* PREPARATORY PREPARATIONS
     *
     * Create the context objects that hold all of the information relevant to our calculations, including pointers
     * to all the components of the cell system. The different method calls will often just update information in
     * the context object (or nested objects) that subsequent method calls will make use of. Creating the port
     * contexts will also create label cells for each port that has labels.
     */
    const nodeContext = new NodeContext(graph as GraphAdapters.GraphAdapter<unknown>, node);
    PortContextCreator.createPortContexts(nodeContext, ignoreInsidePortLabels);

    NodeLabelAndSizeCalculator.setupCells(graph, nodeContext);
    NodeLabelAndSizeCalculator.computeMinimumPortSpace(nodeContext);

    /* PHASE 5: DUCK AND COVER
     *          Set Node Width and Place Horizontal Ports
     *
     * We can now set the node's width and place the ports (and port labels) along the horizontal sides. Since we
     * have no idea how high the node is going to be yet, we place southern ports with the assumption that the
     * node has a height of 0. We will later have to offset those ports by the node's height. Setting the node
     * width has the side effect of computing a horizontal layout for the cell system.
     */
    NodeSizeCalculator.setNodeWidth(nodeContext);

    PortPlacementCalculator.placeHorizontalPorts(nodeContext);
    PortLabelPlacementCalculator.placeHorizontalPortLabels(nodeContext);

    /* PHASE 6: GIGANTIC GOOSE
     *          Set Node Height and Place Vertical Ports
     *
     * We can now calculate the node's height and place the ports (and port labels) along the vertical sides. Also,
     * since we now know the node's height, we can finally correct the southern port positions. Before we can do
     * all that, however, we might need to update the height and padding of the eastern and western inside port
     * label cells to be sure that free ports are positioned properly.
     *
     * Note that if we are to not apply stuff, we're done once we know the node's height. Which is why we stop at
     * that point.
     */
    CellSystemConfigurator.updateVerticalInsidePortLabelCellPadding(nodeContext);
    NodeSizeCalculator.setNodeHeight(nodeContext);

    if (!applyStuff) {
      return nodeContext.nodeSize;
    }

    NodeLabelAndSizeUtilities.offsetSouthernPortsByNodeSize(nodeContext);

    PortPlacementCalculator.placeVerticalPorts(nodeContext);
    PortLabelPlacementCalculator.placeVerticalPortLabels(nodeContext);

    /* PHASE 7: THANKSGIVING
     *          Place Labels and Apply Stuff
     *
     * Since we now have the node's final size, we can now calculate the positions of the containers for outer node
     * labels and place all inner and outer node labels. Also, the port label cells have positions assigned to them
     * and can be told to apply positions to their labels. Finally, we can apply the node's size and all of the
     * port positions we have calculated.
     */
    LabelPlacer.placeLabels(nodeContext);
    NodeLabelAndSizeUtilities.setNodePadding(nodeContext);
    NodeLabelAndSizeUtilities.applyStuff(nodeContext);

    // Return the size
    return nodeContext.nodeSize;
  }

  // Phases 1 and 2 of `process(graph, node, applyStuff, ignoreInsidePortLabels)`, split out to respect the function
  // size limit (Java: one method).
  private static setupCells(graph: GraphAdapters.GraphAdapter<unknown> | null, nodeContext: NodeContext): void {
    /* PHASE 1: WONDEROUS WATERFOWL
     *          Setup All Cells
     *
     * Create all the label cells that will hold node labels, as well as the cell containers that will hold them,
     * for both inside and outside node labels. Also, assign node labels to the relevant label cells. If port
     * labels are to be placed on the inside, setup the inside port label cells with the appropriate paddings, and
     * set the width of the eastern and western ones to the maximum width of the labels they will contain. We can't
     * do that for the northern and southern cells yet because port label placement is more complicated there.
     */
    let horizontalLayoutMode = true;
    // If the graph is null, no layout direction is specified, or the layout direction is set to undefined,
    // use horizontal layout mode (which yields vertically stacked labels).
    if (graph !== null && graph.hasProperty(CoreOptions.DIRECTION)) {
      const layoutDirection = graph.getProperty(CoreOptions.DIRECTION);
      horizontalLayoutMode = layoutDirection === Direction.UNDEFINED || layoutDirection.isHorizontal();
    }
    NodeLabelCellCreator.createNodeLabelCells(nodeContext, false, horizontalLayoutMode);
    InsidePortLabelCellCreator.createInsidePortLabelCells(nodeContext);

    /* PHASE 2: DEFECTIVE DUCK
     *          Setup Client Area Space and Node Cell Padding
     *
     * Apply the minimum client area size to the central grid container cell. Also, reserve space for ports that
     * extend inside the node due to negative port border offsets by setting up appropriate paddings on the main
     * node container cell.
     */
    NodeLabelAndSizeUtilities.setupMinimumClientAreaSize(nodeContext);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(nodeContext);
  }

  // Phases 3 and 4 of the same method, split out likewise.
  private static computeMinimumPortSpace(nodeContext: NodeContext): void {
    /* PHASE 3: SALVAGEABLE SWAN
     *          Minimum Space Required to Place Ports
     *
     * It is now time to find out how large the node needs to be if all ports are to be placed in a way that
     * satisfies all spacing constraints. This may or may not include the labels of ports. We remember these
     * information by setting the minimum width of north / south inside port label cells and the minimum height of
     * east / west inside port label cells. Since the east / west cells are surrounded by the north / south cells,
     * their height may be updated later once we know how high the north / south cells will be.
     */
    HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(nodeContext);
    VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(nodeContext);

    /* PHASE 4: DAMNABLE DUCKLING
     *          Setup Cell System Size Contribution Flags
     *
     * Depending on the size constraints, the different cells may contribute to the height or to the width of the
     * node. In this phase, we setup the size contribution flags according to the size constraints. This lays the
     * groundwork for letting the cell system calculate stuff.
     */
    CellSystemConfigurator.configureCellSystemSizeContributions(nodeContext);
  }

  /**
   * Computes the padding required to place inside non-center node labels. This can be used to reserve space around
   * a hierarchical node while laying out its content. The layout direction is interesting here: usually, one would
   * probably either use the graph's layout direction, or the layout direction used to lay out the node's children.
   * However, the way the node's labels are placed may not have anything to do with either direction.
   *
   * @param graph the node's parent graph which may specify spacings inherited by the node.
   * @param node the node to process.
   * @param layoutDirection the layout direction to assume when computing the paddings.
   * @returns the padding required for inside node labels.
   */
  static computeInsideNodeLabelPadding(
    _graph: GraphAdapters.GraphAdapter<unknown>,
    node: GraphAdapters.NodeAdapter<unknown>,
    layoutDirection: Direction,
  ): ElkPadding {
    // Create a node context and fill it with all the inside node labels
    const nodeContext = new NodeContext(null as unknown as GraphAdapters.GraphAdapter<unknown>, node);
    NodeLabelCellCreator.createNodeLabelCells(nodeContext, true, !layoutDirection.isVertical());

    const labelCellContainer = nodeContext.insideNodeLabelContainer;
    const padding = new ElkPadding();

    NodeLabelAndSizeCalculator.computeTopAndBottomExtents(labelCellContainer, padding);
    NodeLabelAndSizeCalculator.computeLeftAndRightExtents(labelCellContainer, padding);
    NodeLabelAndSizeCalculator.applyInsetsAndGap(labelCellContainer, padding);

    return padding;
  }

  // The "Top" and "Bottom" sections of `computeInsideNodeLabelPadding`, split out to respect the function size limit.
  private static computeTopAndBottomExtents(labelCellContainer: GridContainerCell, padding: ElkPadding): void {
    // Top
    for (const col of ContainerArea.values()) {
      const labelCell = labelCellContainer.getCell(ContainerArea.BEGIN, col);
      if (labelCell !== null) {
        padding.top = Math.max(padding.top, labelCell.getMinimumHeight());
      }
    }

    // Bottom
    for (const col of ContainerArea.values()) {
      const labelCell = labelCellContainer.getCell(ContainerArea.END, col);
      if (labelCell !== null) {
        padding.bottom = Math.max(padding.bottom, labelCell.getMinimumHeight());
      }
    }
  }

  // The "Left" and "Right" sections of `computeInsideNodeLabelPadding`, split out to respect the function size limit.
  private static computeLeftAndRightExtents(labelCellContainer: GridContainerCell, padding: ElkPadding): void {
    // Left
    for (const row of ContainerArea.values()) {
      const labelCell = labelCellContainer.getCell(row, ContainerArea.BEGIN);
      if (labelCell !== null) {
        padding.left = Math.max(padding.left, labelCell.getMinimumWidth());
      }
    }

    // Right
    for (const row of ContainerArea.values()) {
      const labelCell = labelCellContainer.getCell(row, ContainerArea.END);
      if (labelCell !== null) {
        padding.right = Math.max(padding.right, labelCell.getMinimumWidth());
      }
    }
  }

  // The "Apply insets and gap where necessary" section of `computeInsideNodeLabelPadding`, split out likewise.
  private static applyInsetsAndGap(labelCellContainer: GridContainerCell, padding: ElkPadding): void {
    if (padding.top > 0) {
      padding.top += labelCellContainer.getPadding().top;
      padding.top += labelCellContainer.getGap();
    }

    if (padding.bottom > 0) {
      padding.bottom += labelCellContainer.getPadding().bottom;
      padding.bottom += labelCellContainer.getGap();
    }

    if (padding.left > 0) {
      padding.left += labelCellContainer.getPadding().left;
      padding.left += labelCellContainer.getGap();
    }

    if (padding.right > 0) {
      padding.right += labelCellContainer.getPadding().right;
      padding.right += labelCellContainer.getGap();
    }
  }
}
