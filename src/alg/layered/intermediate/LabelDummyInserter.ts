// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { KVector } from '../../../core/math/KVector.js';
import type { Direction } from '../../../core/options/Direction.js';
import { EdgeLabelPlacement } from '../../../core/options/EdgeLabelPlacement.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LLabel } from '../graph/LLabel.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LongEdgeSplitter } from './LongEdgeSplitter.js';

/**
 * Predicate that checks for center labels.
 *
 * @see LabelDummyInserter.java:58
 */
const CENTER_LABEL = (label: LLabel): boolean =>
  label.getProperty(LayeredOptions.EDGE_LABELS_PLACEMENT) === EdgeLabelPlacement.CENTER;

/** The graph properties `process` reads once (Java keeps them in locals of `process`). */
interface LabelDummySpacings {
  readonly edgeLabelSpacing: number;
  readonly labelLabelSpacing: number;
  readonly layoutDirection: Direction;
}

/**
 * Processor that inserts dummy nodes into edges that have center labels to reserve space for them. At most one dummy
 * node is created for each edge.
 *
 * Precondition: an unlayered acyclic graph. Postcondition: dummy nodes are inserted that represent center labels;
 * center labels are removed from their respective edges and attached to the dummy nodes. Slot: before phase 2.
 * Same-slot dependencies: none.
 *
 * The per-edge body of `process` is `insertLabelDummy` (split out for the complexity limits).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummyInserter.java
 */
export class LabelDummyInserter implements ILayoutProcessor<LGraph> {
  /** @see LabelDummyInserter.java:65 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Label dummy insertions', 1);

    // We cannot add the nodes to the graph while we're iterating over it, so remember the dummy nodes we create
    const newDummyNodes: LNode[] = [];

    const spacings: LabelDummySpacings = {
      edgeLabelSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_LABEL),
      labelLabelSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_LABEL_LABEL),
      layoutDirection: layeredGraph.getProperty(LayeredOptions.DIRECTION),
    };

    for (const node of layeredGraph.getLayerlessNodes()) {
      for (const edge of node.getOutgoingEdges()) {
        if (this.edgeNeedsToBeProcessed(edge)) {
          newDummyNodes.push(this.insertLabelDummy(layeredGraph, edge, spacings));
        }
      }
    }

    // Add created dummies to graph
    layeredGraph.getLayerlessNodes().push(...newDummyNodes);

    monitor.done();
  }

  /**
   * The body of the edge loop of `process`: creates the dummy for the edge, sizes it and moves the center labels over.
   *
   * @see LabelDummyInserter.java:76-125
   */
  private insertLabelDummy(layeredGraph: LGraph, edge: LEdge, spacings: LabelDummySpacings): LNode {
    const { edgeLabelSpacing, labelLabelSpacing, layoutDirection } = spacings;
    const thickness = this.retrieveThickness(edge);

    // Create dummy node and remember represented labels (to be filled below)
    const representedLabels: LLabel[] = [];
    const dummyNode = this.createLabelDummy(layeredGraph, edge, thickness, representedLabels);

    // Determine the size of the dummy node and move labels over to it
    const dummySize = dummyNode.getSize();
    this.moveCenterLabels(edge, dummySize, representedLabels, spacings);

    // The dummy node now contains a superfluous label-label spacing and does not include the
    // edge-label spacing yet
    if (layoutDirection.isVertical()) {
      dummySize.x -= labelLabelSpacing;
      dummySize.y += edgeLabelSpacing + thickness;
    } else {
      dummySize.y += edgeLabelSpacing - labelLabelSpacing + thickness;
    }

    return dummyNode;
  }

  /**
   * The label loop of `process`: every center label grows the dummy and moves to `representedLabels`.
   *
   * @see LabelDummyInserter.java:88-110
   */
  private moveCenterLabels(
    edge: LEdge,
    dummySize: KVector,
    representedLabels: LLabel[],
    spacings: LabelDummySpacings,
  ): void {
    const iterator = new ArrayListIterator<LLabel>(edge.getLabels());
    while (iterator.hasNext()) {
      const label = iterator.next();

      // CENTER_LABEL is the same comparison as the Java's inline test (`:94`)
      if (CENTER_LABEL(label)) {
        // The way we stack labels depends on the layout direction
        if (spacings.layoutDirection.isVertical()) {
          dummySize.x += label.getSize().x + spacings.labelLabelSpacing;
          dummySize.y = Math.max(dummySize.y, label.getSize().y);
        } else {
          dummySize.x = Math.max(dummySize.x, label.getSize().x);
          dummySize.y += label.getSize().y + spacings.labelLabelSpacing;
        }

        // Move the label over to the dummy node's REPRESENTED_LABELS property
        representedLabels.push(label);
        iterator.remove();
      }
    }
  }

  /**
   * Checks whether the given edge needs to be processed. That's the case if the edge is not a self-loop and if it has
   * center edge labels in the first place.
   *
   * @see LabelDummyInserter.java:130
   */
  private edgeNeedsToBeProcessed(edge: LEdge): boolean {
    return edge.getSource()!.getNode() !== edge.getTarget()!.getNode() && edge.getLabels().some(CENTER_LABEL);
  }

  /**
   * Retrieves the given edge's thickness. If this is a negative value, zero is returned and set on the edge.
   *
   * @see LabelDummyInserter.java:138
   */
  private retrieveThickness(edge: LEdge): number {
    let thickness = edge.getProperty(LayeredOptions.EDGE_THICKNESS);
    if (thickness < 0) {
      thickness = 0;
      edge.setProperty(LayeredOptions.EDGE_THICKNESS, thickness);
    }

    return thickness;
  }

  /**
   * Creates a label dummy for the given edge.
   *
   * @param layeredGraph graph the dummy will later be placed in.
   * @param edge the edge the label dummy is created for.
   * @param thickness the edge's thickness.
   * @param representedLabels currently empty list of labels represented by the new label dummy. This is set on the dummy
   *   as a property and will later be filled with the represented labels by the calling method.
   * @see LabelDummyInserter.java:162
   */
  private createLabelDummy(layeredGraph: LGraph, edge: LEdge, thickness: number, representedLabels: LLabel[]): LNode {
    const dummyNode = new LNode(layeredGraph);
    dummyNode.setType(NodeType.LABEL);

    dummyNode.setProperty(InternalProperties.ORIGIN, edge);
    dummyNode.setProperty(InternalProperties.REPRESENTED_LABELS, representedLabels);
    dummyNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    dummyNode.setProperty(InternalProperties.LONG_EDGE_SOURCE, edge.getSource());
    dummyNode.setProperty(InternalProperties.LONG_EDGE_TARGET, edge.getTarget());

    // Actually split the edge
    LongEdgeSplitter.splitEdge(edge, dummyNode);

    // Place ports at the edge's center
    const portPos = Math.floor(thickness / 2);
    for (const dummyPort of dummyNode.getPorts()) {
      dummyPort.getPosition().y = portPos;
    }

    return dummyNode;
  }
}
