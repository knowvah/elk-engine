// SPDX-License-Identifier: EPL-2.0
import { LabelCell } from '../../common/nodespacing/cellsystem/LabelCell.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphAdapters } from '../graph/LGraphAdapters.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { placeNodeEndLabels } from './EndLabelPreprocessorPlacement.js';

/** Special value to indicate that there are no edges incident to a port. @see EndLabelPreprocessor.java:157 */
const NO_INCIDENT_EDGE_THICKNESS = -1;

/**
 * Puts all end labels into label cells stored for each node using the `InternalProperties.END_LABELS` property. The
 * label cells are properly positioned relative to their node's top left corner, and thus will need post-processing
 * once node coordinates are known. Also updates node margins to include end labels.
 *
 * Precondition: a layered graph; labels are marked with a placement side; node sizes and port positions are fixed; port
 * lists are sorted according to `PortListSorter.PortComparator`. Postcondition: each node with end labels has its
 * `END_LABELS` property set accordingly; label cells are large enough to hold their labels and are positioned
 * correctly relative to their node; node margins include space required to place edge end labels. Slot: before phase
 * 4; same-slot dependencies: `LabelAndNodeSizeProcessor`, `InnermostNodeMarginCalculator`, `LabelSideSelector`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/EndLabelPreprocessor.java
 */
export class EndLabelPreprocessor implements ILayoutProcessor<LGraph> {
  /** @see EndLabelPreprocessor.java:76 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('End label pre-processing', 1);

    const edgeLabelSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_LABEL);
    const labelLabelSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_LABEL_LABEL);
    const verticalLayout = layeredGraph.getProperty(LayeredOptions.DIRECTION).isVertical();

    // We iterate over each node and place the end labels of its incident edges
    for (const layer of layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        this.processNode(node, edgeLabelSpacing, labelLabelSpacing, verticalLayout);
      }
    }

    monitor.done();
  }

  /** @see EndLabelPreprocessor.java:91 */
  private processNode(node: LNode, edgeLabelSpacing: number, labelLabelSpacing: number, verticalLayout: boolean): void {
    // Iterate over all ports and collect their labels in label cells
    const portCount = node.getPorts().length;
    const portLabelCells: (LabelCell | null)[] = new Array<LabelCell | null>(portCount).fill(null);

    for (let portIndex = 0; portIndex < portCount; portIndex++) {
      const port = node.getPorts()[portIndex]!;
      port.id = portIndex;

      portLabelCells[portIndex] = this.createConfiguredLabelCell(
        EndLabelPreprocessor.gatherLabels(port),
        labelLabelSpacing,
        verticalLayout,
      );
    }

    // Actually go off and place them labels!
    placeNodeEndLabels(node, portLabelCells, labelLabelSpacing, edgeLabelSpacing, verticalLayout);

    // Turn the array into a map and save that in the node
    // AD-10: the Java `HashMap<LPort, LabelCell>` (EndLabelPreprocessor.java:110) is an insertion-ordered Map (G4)
    const portToLabelCellMap = new Map<LPort, LabelCell>();
    for (let index = 0; index < portLabelCells.length; index++) {
      const cell = portLabelCells[index]!;
      if (cell !== null) {
        portToLabelCellMap.set(node.getPorts()[index]!, cell);
      }
    }

    if (portToLabelCellMap.size > 0) {
      node.setProperty(InternalProperties.END_LABELS, portToLabelCellMap);

      // Update the node's margins
      this.updateNodeMargins(node, portLabelCells);
    }
  }

  /**
   * Creates label cell for the given port with the given labels, if any. If there are no labels, this method returns
   * `null`. The label cell will still have to have its alignment set up, but its size is already set to the size
   * required to place its labels.
   *
   * @see EndLabelPreprocessor.java:130
   */
  private createConfiguredLabelCell(
    labels: LLabel[] | null,
    labelLabelSpacing: number,
    verticalLayout: boolean,
  ): LabelCell | null {
    if (labels === null || labels.length === 0) {
      return null;
    }

    // Create the new label cell and setup its alignments depending on the port's side
    const labelCell = new LabelCell(labelLabelSpacing, !verticalLayout);

    for (const label of labels) {
      labelCell.addLabel(LGraphAdapters.adapt(label));
    }

    // Setup the label cell's size
    const labelCellRect = labelCell.getCellRectangle();
    labelCellRect.height = labelCell.getMinimumHeight();
    labelCellRect.width = labelCell.getMinimumWidth();

    return labelCell;
  }

  // ////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Label Gathering

  /**
   * Returns a list that contains all end labels to be placed at the given port. If there are no such labels, the list
   * will be empty. If there are not even any edges connected to the port, the return value will be `null`.
   *
   * This method also takes care of north / south ports whose original edges have been rerouted to a north / south
   * port dummy. The maximum thickness of any edge connected to the port is saved as `MAX_EDGE_THICKNESS` if it has
   * labels. This method is also used by `LabelSideSelector` (Java package-private static).
   *
   * @see EndLabelPreprocessor.java:169
   */
  static gatherLabels(port: LPort): LLabel[] | null {
    const labels: LLabel[] = [];

    // Gather labels of the port itself
    let maxEdgeThickness = EndLabelPreprocessor.gatherPortLabels(port, labels);

    // If it has a dummy associated with it, we need to go through the dummy's ports and process those that were
    // created for the current port (see the NorthSouthPortPreprocessor)
    const dummyNode = port.getProperty(InternalProperties.PORT_DUMMY);
    if (dummyNode !== null && dummyNode !== undefined) {
      for (const dummyPort of dummyNode.getPorts()) {
        if (dummyPort.getProperty(InternalProperties.ORIGIN) === port) {
          maxEdgeThickness = Math.max(maxEdgeThickness, EndLabelPreprocessor.gatherPortLabels(dummyPort, labels));
        }
      }
    }

    // Only save the maximum edge thickness if we'll be interested in it later
    if (labels.length > 0) {
      port.setProperty(InternalProperties.MAX_EDGE_THICKNESS, maxEdgeThickness);
    }

    return maxEdgeThickness !== NO_INCIDENT_EDGE_THICKNESS ? labels : null;
  }

  /**
   * Puts all relevant end labels of edges connected to the given port into the given list. Returns the maximum edge
   * thickness of any incident edge or `NO_INCIDENT_EDGE_THICKNESS` if there is no incident edge. (Java overload
   * `gatherLabels(LPort, List)`, private.)
   *
   * @see EndLabelPreprocessor.java:200
   */
  private static gatherPortLabels(port: LPort, targetList: LLabel[]): number {
    let maxEdgeThickness = -1;

    const labels: LLabel[] = [];

    for (const incidentEdge of port.getConnectedEdges()) {
      maxEdgeThickness = Math.max(maxEdgeThickness, incidentEdge.getProperty(LayeredOptions.EDGE_THICKNESS));

      // An outgoing edge: all tail labels belong to this port; an incoming edge: all head labels belong to it
      const placement = incidentEdge.getSource() === port ? EdgeLabelPlacement.TAIL : EdgeLabelPlacement.HEAD;
      EndLabelPreprocessor.collectLabels(incidentEdge, placement, labels);

      // Remember the edge each label came from
      for (const label of labels) {
        if (!label.hasProperty(InternalProperties.END_LABEL_EDGE)) {
          label.setProperty(InternalProperties.END_LABEL_EDGE, incidentEdge);
        }
      }

      targetList.push(...labels);
      labels.length = 0;
    }

    return maxEdgeThickness;
  }

  /** The two stream filters of Java `gatherLabels(LPort, List)` (`:210`, `:216`), one per branch. */
  private static collectLabels(edge: LEdge, placement: EdgeLabelPlacement, labels: LLabel[]): void {
    for (const label of edge.getLabels()) {
      if (label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT) === placement) {
        labels.push(label);
      }
    }
  }

  // ////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Node Margins

  /**
   * Updates the node's margins to account for its end labels.
   *
   * @see EndLabelPreprocessor.java:420
   */
  private updateNodeMargins(node: LNode, labelCells: readonly (LabelCell | null)[]): void {
    const nodeMargin = node.getMargin();
    const nodeSize = node.getSize();

    // Calculate the rectangle that describes the node's current margin
    const nodeMarginRectangle = new ElkRectangle(
      -nodeMargin.left,
      -nodeMargin.top,
      nodeMargin.left + nodeSize.x + nodeMargin.right,
      nodeMargin.top + nodeSize.y + nodeMargin.bottom,
    );

    // Union the rectangle with each rectangle that describes a label cell
    for (const labelCell of labelCells) {
      if (labelCell !== null) {
        nodeMarginRectangle.union(labelCell.getCellRectangle());
      }
    }

    // Reapply the new rectangle to the margin
    nodeMargin.left = -nodeMarginRectangle.x;
    nodeMargin.top = -nodeMarginRectangle.y;
    nodeMargin.right = nodeMarginRectangle.width - nodeMargin.left - nodeSize.x;
    nodeMargin.bottom = nodeMarginRectangle.height - nodeMargin.top - nodeSize.y;
  }
}
