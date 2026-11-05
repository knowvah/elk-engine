// SPDX-License-Identifier: EPL-2.0
import type { LabelCell } from '../../common/nodespacing/cellsystem/LabelCell.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { EndLabelSorterLabelGroup } from './EndLabelSorterLabelGroup.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * Sorts the end labels of ports, since the order of the labels might be wrong after label placement. Labels are
 * sorted by their edge's source port, target node and (reversed) target port.
 *
 * Mission 7f: the end labels themselves are created by `EndLabelPreprocessor` (mission 7f2), so until then the body
 * does work only on a node that already carries `END_LABELS` (hand-built graphs); the monitor step and the no-label
 * path run on every layout.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/EndLabelSorter.java
 */
export class EndLabelSorter implements ILayoutProcessor<LGraph> {
  /**
   * Compares label groups by source port id, then target node id, then (backwards) target port id.
   *
   * @see EndLabelSorter.java:216
   */
  private static readonly LABEL_GROUP_COMPARATOR = (
    group1: EndLabelSorterLabelGroup,
    group2: EndLabelSorterLabelGroup,
  ): number => {
    // If they are not connected to the same source port, use the difference as a basis for the comparison
    const sourcePortDiff = integerCompare(group1.edge.getSource()!.id, group2.edge.getSource()!.id);
    if (sourcePortDiff !== 0) {
      return sourcePortDiff;
    }

    // They are connected to the same source port. Sort by target node, if that makes a difference.
    const targetNodeDiff = integerCompare(
      group1.edge.getTarget()!.getNode()!.id,
      group2.edge.getTarget()!.getNode()!.id,
    );
    if (targetNodeDiff !== 0) {
      return targetNodeDiff;
    }

    // They are connected to the same source port and to the same target node. Compare target ports, but
    // backwards. Since western ports are ordered from bottom to top, not sorting backwards would yield the
    // opposite of our desires.
    return integerCompare(group2.edge.getTarget()!.id, group1.edge.getTarget()!.id);
  };

  /** @see EndLabelSorter.java:37 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Sort end labels', 1);

    for (const layer of layeredGraph.getLayers()) {
      for (const node of layer.getNodes()) {
        if (node.getType() === NodeType.NORMAL) {
          this.processNode(node);
        }
      }
    }

    monitor.done();
  }

  // ////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Node Processing and Initialization

  /** @see EndLabelSorter.java:50 */
  private processNode(node: LNode): void {
    let initializeMethodCalled = false;

    if (node.hasProperty(InternalProperties.END_LABELS)) {
      const labelCellMap = node.getProperty(InternalProperties.END_LABELS);

      // Iterate over all ports and check for each port if it requires its labels to be sorted
      for (const port of node.getPorts()) {
        if (this.needsSorting(port)) {
          // Check if we need to initialize
          if (!initializeMethodCalled) {
            this.initialize(node.getGraph()!);
            initializeMethodCalled = true;
          }

          this.sort(port, labelCellMap.get(port)!);
        }
      }
    }
  }

  /**
   * A port requires its end labels to be sorted if there are end labels of at least two edges there.
   *
   * @see EndLabelSorter.java:74
   */
  private needsSorting(port: LPort): boolean {
    let edgesWithEndLabels = 0;

    for (const inEdge of port.getIncomingEdges()) {
      const headLabels = inEdge
        .getLabels()
        .some((label) => label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT) === EdgeLabelPlacement.HEAD);
      if (headLabels) {
        edgesWithEndLabels++;
      }
    }

    for (const outEdge of port.getOutgoingEdges()) {
      const tailLabels = outEdge
        .getLabels()
        .some((label) => label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT) === EdgeLabelPlacement.TAIL);
      if (tailLabels) {
        edgesWithEndLabels++;
      }
    }

    return edgesWithEndLabels >= 2;
  }

  /**
   * Called once we find the first instance of labels that have to be sorted. This method initializes everything we
   * need.
   *
   * @see EndLabelSorter.java:100
   */
  private initialize(lGraph: LGraph): void {
    // Give nodes and ports ascending IDs
    let nextElementID = 0;
    for (const layer of lGraph) {
      for (const node of layer) {
        node.id = nextElementID++;

        for (const port of node.getPorts()) {
          port.id = nextElementID++;
        }
      }
    }
  }

  // ////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Sorting

  /**
   * Sorts the labels of the given port which are contained in the given label cell.
   *
   * @see EndLabelSorter.java:122
   */
  private sort(_port: LPort, portLabelCell: LabelCell): void {
    const labelGroups = this.createLabelGroups(portLabelCell);
    labelGroups.sort(EndLabelSorter.LABEL_GROUP_COMPARATOR);

    // Re-add the label cell's labels in the proper order. We directly access the cell's label list here, which
    // won't case the cell to recompute its size
    const portLabelCellLabels = portLabelCell.getLabels();
    portLabelCellLabels.length = 0;
    for (const group of labelGroups) {
      portLabelCellLabels.push(...group.labels);
    }
  }

  /**
   * Creates a list of label groups that group labels from the same edge. `edgeToGroupMap` is lookup-only except for
   * the final `values()` copy, whose insertion order is the AD-10 stand-in for the identity-hashed Java `HashMap`; it
   * can matter only for groups the comparator calls equal (parallel edges). Decision FX2: 7f2 records that scenario.
   *
   * @see EndLabelSorter.java:150
   */
  private createLabelGroups(portLabelCell: LabelCell): EndLabelSorterLabelGroup[] {
    const edgeToGroupMap = new Map<LEdge, EndLabelSorterLabelGroup>();

    // Make sure every label is contained in a label group
    for (const label of portLabelCell.getLabels()) {
      const edge = label.getProperty(InternalProperties.END_LABEL_EDGE);

      // Create a new label group for the edge if we see it for the first time. Note that this works even if the
      // label didn't have an END_LABEL_EDGE property set
      if (!edgeToGroupMap.has(edge)) {
        edgeToGroupMap.set(edge, new EndLabelSorterLabelGroup(edge));
      }

      edgeToGroupMap.get(edge)!.labels.push(label);
    }

    return Array.from(edgeToGroupMap.values());
  }
}
