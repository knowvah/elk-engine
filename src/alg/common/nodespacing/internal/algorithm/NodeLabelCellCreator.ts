// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { GraphAdapters } from '../../../../../core/util/adapters/GraphAdapters.js';
import { GridContainerCell } from '../../cellsystem/GridContainerCell.js';
import { LabelCell } from '../../cellsystem/LabelCell.js';
import { ContainerArea } from '../../cellsystem/ContainerArea.js';
import { StripContainerCell } from '../../cellsystem/StripContainerCell.js';
import { StripContainerCellStrip } from '../../cellsystem/StripContainerCellStrip.js';
import type { NodeContext } from '../NodeContext.js';
import { NodeLabelLocation } from '../NodeLabelLocation.js';

const { HORIZONTAL, VERTICAL } = StripContainerCellStrip;

/**
 * Knows how to take all of a node's labels and create the appropriate grid cells.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/NodeLabelCellCreator.java
 */
export class NodeLabelCellCreator {
  /**
   * No instances required.
   */
  private constructor() {}

  /**
   * Iterates over all of the node's labels and creates all required cell containers and label cells.
   *
   * @param nodeContext the node context to work with.
   * @param onlyInside `true` if only inside node labels should be assigned to their respective label cells. Used for
   *            computing the space required for inside node label cells, but nothing else.
   * @param horizontalLayoutMode Whether we operate in horizontal or vertical layout mode.
   * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/NodeLabelCellCreator.java
   */
  static createNodeLabelCells(nodeContext: NodeContext, onlyInside: boolean, horizontalLayoutMode: boolean): void {
    // Make sure all the relevant containers exist
    NodeLabelCellCreator.createNodeLabelCellContainers(nodeContext, onlyInside);

    // Handle each of the node's labels
    for (const label of nodeContext.node.getLabels()) {
      NodeLabelCellCreator.handleNodeLabel(nodeContext, label, onlyInside, horizontalLayoutMode);
    }
  }

  /**
   * Handles the given node label by adding it to the corresponding node label cell. If such a cell doesn't exist
   * yet, it is created and added to the correct container cell.
   */
  private static handleNodeLabel(
    nodeContext: NodeContext,
    label: GraphAdapters.LabelAdapter<unknown>,
    onlyInside: boolean,
    horizontalLayoutMode: boolean,
  ): void {
    // Find the effective label location
    const labelPlacement = label.hasProperty(CoreOptions.NODE_LABELS_PLACEMENT)
      ? label.getProperty(CoreOptions.NODE_LABELS_PLACEMENT)
      : nodeContext.nodeLabelPlacement;
    const labelLocation = NodeLabelLocation.fromNodeLabelPlacement(labelPlacement);

    // If the label has its location fixed, we will ignore it
    if (labelLocation === NodeLabelLocation.UNDEFINED) {
      return;
    }

    // If the label's location is on the node's outside but we only want inside node labels, we will ignore it
    if (onlyInside && !labelLocation.isInsideLocation()) {
      return;
    }

    NodeLabelCellCreator.retrieveNodeLabelCell(nodeContext, labelLocation, horizontalLayoutMode).addLabel(label);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Cell Creation and Retrieval

  /**
   * Creates all node label containers.
   */
  private static createNodeLabelCellContainers(nodeContext: NodeContext, onlyInside: boolean): void {
    const symmetry = !nodeContext.sizeOptions.contains(SizeOptions.ASYMMETRICAL);
    const tabularNodeLabels = nodeContext.sizeOptions.contains(SizeOptions.FORCE_TABULAR_NODE_LABELS);

    // Inside container
    nodeContext.insideNodeLabelContainer = new GridContainerCell(
      tabularNodeLabels,
      symmetry,
      nodeContext.labelCellSpacing,
    );

    // The Java type allows a null padding here; the TS `NodeContext` types it as non-null (its spacing reader
    // casts), so this stays a guard on the Java branch.
    if (nodeContext.nodeLabelsPadding !== null) {
      nodeContext.insideNodeLabelContainer.getPadding().copy(nodeContext.nodeLabelsPadding);
    }
    nodeContext.nodeContainerMiddleRow.setCell(ContainerArea.CENTER, nodeContext.insideNodeLabelContainer);

    // Outside containers, if requested
    if (!onlyInside) {
      NodeLabelCellCreator.createOutsideNodeLabelCellContainers(nodeContext, symmetry);
    }
  }

  /**
   * The `!onlyInside` branch of `createNodeLabelCellContainers`, split out to respect the function size limit.
   */
  private static createOutsideNodeLabelCellContainers(nodeContext: NodeContext, symmetry: boolean): void {
    const gap = nodeContext.labelCellSpacing;

    const northContainer = new StripContainerCell(HORIZONTAL, symmetry, gap);
    northContainer.getPadding().bottom = nodeContext.nodeLabelSpacing;
    nodeContext.outsideNodeLabelContainers.put(PortSide.NORTH, northContainer);

    const southContainer = new StripContainerCell(HORIZONTAL, symmetry, gap);
    southContainer.getPadding().top = nodeContext.nodeLabelSpacing;
    nodeContext.outsideNodeLabelContainers.put(PortSide.SOUTH, southContainer);

    const westContainer = new StripContainerCell(VERTICAL, symmetry, gap);
    westContainer.getPadding().right = nodeContext.nodeLabelSpacing;
    nodeContext.outsideNodeLabelContainers.put(PortSide.WEST, westContainer);

    const eastContainer = new StripContainerCell(VERTICAL, symmetry, gap);
    eastContainer.getPadding().left = nodeContext.nodeLabelSpacing;
    nodeContext.outsideNodeLabelContainers.put(PortSide.EAST, eastContainer);
  }

  /**
   * Retrieves the node label cell for the given location. If it doesn't exist yet, it is created.
   */
  private static retrieveNodeLabelCell(
    nodeContext: NodeContext,
    nodeLabelLocation: NodeLabelLocation,
    horizontalLayoutMode: boolean,
  ): LabelCell {
    let nodeLabelCell = nodeContext.nodeLabelCells.get(nodeLabelLocation);

    if (nodeLabelCell === undefined) {
      // The node label cell doesn't exist yet, so create one and add it to the relevant container
      nodeLabelCell = new LabelCell(nodeContext.labelLabelSpacing, nodeLabelLocation, horizontalLayoutMode);
      nodeContext.nodeLabelCells.put(nodeLabelLocation, nodeLabelCell);

      NodeLabelCellCreator.addNodeLabelCellToContainer(nodeContext, nodeLabelLocation, nodeLabelCell);
    }

    return nodeLabelCell;
  }

  /**
   * The "find the correct container and add the cell to it" part of `retrieveNodeLabelCell`, split out to respect
   * the function size limit.
   */
  private static addNodeLabelCellToContainer(
    nodeContext: NodeContext,
    nodeLabelLocation: NodeLabelLocation,
    nodeLabelCell: LabelCell,
  ): void {
    // Find the correct container and add the cell to it
    if (nodeLabelLocation.isInsideLocation()) {
      nodeContext.insideNodeLabelContainer.setCell(
        nodeLabelLocation.getContainerRow()!,
        nodeLabelLocation.getContainerColumn()!,
        nodeLabelCell,
      );
    } else {
      const outsideSide = nodeLabelLocation.getOutsideSide();
      const containerCell = nodeContext.outsideNodeLabelContainers.get(outsideSide)!;

      switch (outsideSide) {
        case PortSide.NORTH:
        case PortSide.SOUTH:
          nodeLabelCell.setContributesToMinimumHeight(true);
          containerCell.setCell(nodeLabelLocation.getContainerColumn()!, nodeLabelCell);
          break;

        case PortSide.WEST:
        case PortSide.EAST:
          nodeLabelCell.setContributesToMinimumWidth(true);
          containerCell.setCell(nodeLabelLocation.getContainerRow()!, nodeLabelCell);
          break;
      }
    }
  }
}
