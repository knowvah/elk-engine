// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { ILabelManager } from '../../../core/labels/ILabelManager.js';
import { LabelManagementOptions } from '../../../core/labels/LabelManagementOptions.js';
import { KVector } from '../../../core/math/KVector.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Invokes a potentially registered label manager on labels. This processor has two modes of operation. The first mode
 * seeks out node labels, port labels, and edge labels. This mode is used for the first label management run before
 * computing node sizes. The second mode manages center edge labels, which requires node sizes to be fixed.
 *
 * Precondition: the graph is layered; label dummy nodes are placed in their final layers. Postcondition: possible
 * label text modifications to end labels, port labels, and node labels. Slots: before phase 4. Same-slot dependencies
 * for mode 1: none; for mode 2: `LabelDummySwitcher`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelManagementProcessor.java
 */
export class LabelManagementProcessor implements ILayoutProcessor<LGraph> {
  /** Minimum width for shortened port labels. */
  private static readonly MIN_WIDTH_PORT_LABELS = 20;
  /** Minimum width for shortened node labels. */
  private static readonly MIN_WIDTH_NODE_LABELS = 40;
  /** Minimum width for shortened edge labels. */
  static readonly MIN_WIDTH_EDGE_LABELS = 60;

  /** Whether we should only manage edge center labels. */
  readonly #centerLabels: boolean;

  /**
   * Creates a new instance.
   *
   * @param centerLabels `true` if the new instance should operate only on edge center labels, `false` if it should
   *   operate on everything except edge center labels.
   * @see LabelManagementProcessor.java:73
   */
  constructor(centerLabels: boolean) {
    this.#centerLabels = centerLabels;
  }

  /** @see LabelManagementProcessor.java:78 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Label management', 1);

    // If there is no label manager configured for this graph, this processor should not be part of the algorithm.
    // However, better be sure.
    const labelManager: ILabelManager | null = layeredGraph.getProperty(LabelManagementOptions.LABEL_MANAGER);
    if (labelManager !== null) {
      const edgeLabelSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_LABEL);
      const labelLabelSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_LABEL_LABEL);

      if (this.#centerLabels) {
        this.manageCenterLabels(layeredGraph, labelManager, edgeLabelSpacing, labelLabelSpacing);
      } else {
        this.manageNonCenterLabels(layeredGraph, labelManager, labelLabelSpacing);
      }
    }

    monitor.done();
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Everything Except Center Edge Labels

  /**
   * Calls label management on all labels that are not edge center labels.
   *
   * @see LabelManagementProcessor.java:105
   */
  private manageNonCenterLabels(lGraph: LGraph, labelManager: ILabelManager, labelLabelSpacing: number): void {
    const verticalLayout = lGraph.getProperty(LayeredOptions.DIRECTION).isVertical();

    // Iterate over the layers
    for (const layer of lGraph) {
      // Apply label management to node and port labels
      for (const node of layer) {
        if (node.getType() === NodeType.NORMAL) {
          this.manageNodePortAndCommentLabels(node, labelManager, labelLabelSpacing, verticalLayout);
        }

        // Edges can have edge head and tail labels that need to be managed as well (note that at this
        // point, only head and tail labels remain). Upstream's comment reads "edge Unand tail labels" (a typo).
        for (const edge of node.getOutgoingEdges()) {
          LabelManagementProcessor.doManageLabels(
            labelManager,
            edge.getLabels(),
            LabelManagementProcessor.MIN_WIDTH_EDGE_LABELS,
            0,
            verticalLayout,
          );
        }
      }
    }
  }

  /**
   * The `NORMAL` node block of `manageNonCenterLabels` (`:123-147`): node labels, port labels and attached comments;
   * split off to keep the function within the complexity limits.
   *
   * @see LabelManagementProcessor.java:123
   */
  private manageNodePortAndCommentLabels(
    node: LNode,
    labelManager: ILabelManager,
    labelLabelSpacing: number,
    verticalLayout: boolean,
  ): void {
    // Handle node labels
    LabelManagementProcessor.doManageLabels(
      labelManager,
      node.getLabels(),
      LabelManagementProcessor.MIN_WIDTH_NODE_LABELS,
      labelLabelSpacing,
      verticalLayout,
    );

    // Handle ports
    for (const port of node.getPorts()) {
      LabelManagementProcessor.doManageLabels(
        labelManager,
        port.getLabels(),
        LabelManagementProcessor.MIN_WIDTH_PORT_LABELS,
        labelLabelSpacing,
        verticalLayout,
      );
    }

    this.manageAttachedComments(node, labelManager, verticalLayout);
  }

  /**
   * The "attached comments" part of the `NORMAL` node block (`:136-146`), split off like
   * `manageNodePortAndCommentLabels`.
   *
   * @see LabelManagementProcessor.java:136
   */
  private manageAttachedComments(node: LNode, labelManager: ILabelManager, verticalLayout: boolean): void {
    // Handle attached comments
    if (node.hasProperty(InternalProperties.TOP_COMMENTS)) {
      this.doManageAttachedCommentLabels(
        labelManager,
        node.getProperty(InternalProperties.TOP_COMMENTS),
        LabelManagementProcessor.MIN_WIDTH_NODE_LABELS,
        verticalLayout,
      );
    }

    if (node.hasProperty(InternalProperties.BOTTOM_COMMENTS)) {
      this.doManageAttachedCommentLabels(
        labelManager,
        node.getProperty(InternalProperties.BOTTOM_COMMENTS),
        LabelManagementProcessor.MIN_WIDTH_NODE_LABELS,
        verticalLayout,
      );
    }
  }

  /**
   * Manages labels of comments attached to a node and thus currently not part of the graph structure.
   *
   * @see LabelManagementProcessor.java:150
   */
  private doManageAttachedCommentLabels(
    labelManager: ILabelManager,
    commentNodes: readonly LNode[],
    minWidthNodeLabels: number,
    verticalLayout: boolean,
  ): void {
    for (const commentNode of commentNodes) {
      // We only do stuff if the node actually does have labels
      if (commentNode.getLabels().length === 0) {
        continue;
      }

      LabelManagementProcessor.doManageLabels(
        labelManager,
        commentNode.getLabels(),
        minWidthNodeLabels,
        0,
        verticalLayout,
      );
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Center Edge Labels

  /**
   * Calls label management on all edge center labels.
   *
   * @see LabelManagementProcessor.java:170
   */
  private manageCenterLabels(
    lGraph: LGraph,
    labelManager: ILabelManager,
    edgeLabelSpacing: number,
    labelLabelSpacing: number,
  ): void {
    const verticalLayout = lGraph.getProperty(LayeredOptions.DIRECTION).isVertical();

    // Iterate over the layers and find label dummy nodes
    for (const layer of lGraph) {
      // The maximum width is used as the target width for center edge labels
      const maxWidth = Math.max(
        LabelManagementProcessor.MIN_WIDTH_EDGE_LABELS,
        LGraphUtil.findMaxNonDummyNodeWidth(layer, false),
      );

      for (const node of layer) {
        if (node.getType() === NodeType.LABEL) {
          const edge: LEdge = node.getConnectedEdges()[Symbol.iterator]().next().value as LEdge;
          const edgeThickness = edge.getProperty(LayeredOptions.EDGE_THICKNESS);

          // The list of labels should never be empty (otherwise the label dummy wouldn't have been created
          // in the first place)
          const labels = node.getProperty(InternalProperties.REPRESENTED_LABELS);
          const spaceRequiredForLabels = LabelManagementProcessor.doManageLabels(
            labelManager,
            labels,
            maxWidth,
            labelLabelSpacing,
            verticalLayout,
          );

          // Apply the space required for labels to the dummy node (we don't bother with the ports here since
          // they will be meddled with later by the LabelSideSelector anyway)
          node.getSize().x = spaceRequiredForLabels.x;
          node.getSize().y = spaceRequiredForLabels.y + edgeThickness + edgeLabelSpacing;
        }
      }
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Actual Label Management

  /**
   * Manage all the labels according to the labelManager and change the labels size.
   *
   * @param labelManager the label manager used to manage labels.
   * @param labels the labels to be passed to the label manager.
   * @param targetWidth the target width.
   * @param labelLabelSpacing spacing between two adjacent labels
   * @param verticalLayout `true` if the graph is laid out downwards or upwards. In these cases, the new label
   *   dimensions returned by the label manager need to be turned 90 degrees.
   * @returns size required to place the labels. Does not include the edge-label space yet.
   * @see LabelManagementProcessor.java:219
   */
  static doManageLabels(
    labelManager: ILabelManager,
    labels: Iterable<LLabel>,
    targetWidth: number,
    labelLabelSpacing: number,
    verticalLayout: boolean,
  ): KVector {
    const requiredLabelSpace = new KVector();

    // Manage all of them labels, if there are any
    const labelList = Array.from(labels);
    if (labelList.length > 0) {
      for (const label of labelList) {
        const labelSize = LabelManagementProcessor.manageLabel(labelManager, label, targetWidth, verticalLayout);

        // Update required label space
        if (verticalLayout) {
          requiredLabelSpace.x += labelLabelSpacing + label.getSize().x;
          requiredLabelSpace.y = Math.max(requiredLabelSpace.y, labelSize.y);
        } else {
          requiredLabelSpace.x = Math.max(requiredLabelSpace.x, labelSize.x);
          requiredLabelSpace.y += labelLabelSpacing + label.getSize().y;
        }
      }

      // There is one label-label spacing too much
      if (verticalLayout) {
        requiredLabelSpace.x -= labelLabelSpacing;
      } else {
        requiredLabelSpace.y -= labelLabelSpacing;
      }
    }

    return requiredLabelSpace;
  }

  /**
   * The first half of the loop body of `doManageLabels` (`:230-244`): calls the label size modifier on a label that
   * has an origin and applies the new size. Split off to keep `doManageLabels` within the complexity limits.
   *
   * @returns the label's size vector (the same object the Java loop keeps in `labelSize`)
   * @see LabelManagementProcessor.java:230
   */
  private static manageLabel(
    labelManager: ILabelManager,
    label: LLabel,
    targetWidth: number,
    verticalLayout: boolean,
  ): KVector {
    const labelSize = label.getSize();

    // If the label has an origin, call the label size modifier
    const origin = label.getProperty(InternalProperties.ORIGIN);
    if (origin !== null) {
      const newSize = labelManager.manageLabelSize(origin, targetWidth);

      if (newSize !== null) {
        if (verticalLayout) {
          // Our labels are turned 90 degrees
          labelSize.x = newSize.y;
          labelSize.y = newSize.x;
        } else {
          labelSize.x = newSize.x;
          labelSize.y = newSize.y;
        }
      }
    }

    return labelSize;
  }
}
