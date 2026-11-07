// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import type { Direction } from '../../../core/options/Direction.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LongEdgeJoiner } from './LongEdgeJoiner.js';
import { placeLabelsForHorizontalLayout, placeLabelsForVerticalLayout } from './LabelDummyRemoverPlacement.js';

/** The graph properties `process` reads once (Java keeps them in locals of `process`). */
interface RemovalSettings {
  readonly edgeLabelSpacing: number;
  readonly labelLabelSpacing: number;
  readonly layoutDirection: Direction;
}

/**
 * Processor that removes the inserted center label dummies and places the labels on their position.
 *
 * Precondition: a layered graph; nodes are placed; edges are routed; center labels are represented by and attached to
 * center label dummy nodes. Postcondition: labels are placed; there are no dummy nodes of type `LABEL`; center labels
 * are attached to their original edges again. Slot: after phase 5. Same-slot dependencies:
 * `HierarchicalPortOrthogonalEdgeRouter`.
 *
 * The two placement helpers live in `LabelDummyRemoverPlacement.ts` and the per-dummy body of `process` is
 * `placeLabelsOf` (split out for the complexity limits).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummyRemover.java
 * @see LabelDummyInserter
 */
export class LabelDummyRemover implements ILayoutProcessor<LGraph> {
  /** @see LabelDummyRemover.java:63 */
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Label dummy removal', 1);

    const settings: RemovalSettings = {
      edgeLabelSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_LABEL),
      labelLabelSpacing: layeredGraph.getProperty(LayeredOptions.SPACING_LABEL_LABEL),
      layoutDirection: layeredGraph.getProperty(LayeredOptions.DIRECTION),
    };

    for (const layer of layeredGraph.getLayers()) {
      // An iterator is necessary for traversing nodes, since dummy nodes might be removed
      const nodeIterator = new ArrayListIterator<LNode>(layer.getNodes());

      while (nodeIterator.hasNext()) {
        const node = nodeIterator.next();

        if (node.getType() === NodeType.LABEL) {
          // First, place labels on position of dummy node
          const originEdge = node.getProperty(InternalProperties.ORIGIN) as LEdge;
          this.placeLabelsOf(node, originEdge, settings);

          // Add represented labels back to the original edge
          originEdge.getLabels().push(...node.getProperty(InternalProperties.REPRESENTED_LABELS));

          // Whether we need to add unnecessary bend points around the label dummy depends on the edge
          // router. For orthogonal edge routing, they are not necessary. For splines, they may even be
          // harmful. For polylines, they are necessary to keep the routes edges take close to their labels
          LongEdgeJoiner.joinAt(node, layeredGraph.getProperty(LayeredOptions.EDGE_ROUTING) === EdgeRouting.POLYLINE);

          // Remove the node
          nodeIterator.remove();
        }
      }
    }

    monitor.done();
  }

  /**
   * Places the labels a dummy represents on the dummy's position.
   *
   * @see LabelDummyRemover.java:72-111
   */
  private placeLabelsOf(node: LNode, originEdge: LEdge, settings: RemovalSettings): void {
    const { edgeLabelSpacing, labelLabelSpacing, layoutDirection } = settings;
    // `EDGE_THICKNESS` has the non-null default 1, so Java's `.doubleValue()` cannot unbox null
    const thickness = originEdge.getProperty(LayeredOptions.EDGE_THICKNESS);
    const labelsBelowEdge = node.getProperty(InternalProperties.LABEL_SIDE) === LabelSide.BELOW;

    const currLabelPos = new KVector(node.getPosition());

    // If the labels are to be placed below their edge, we need to move the first label's
    // position down a bit to respect the label spacing
    if (labelsBelowEdge) {
      currLabelPos.y += thickness + edgeLabelSpacing;
    }

    // Calculate the space available for the placement of labels
    const labelSpace = new KVector(
      node.getSize().x,
      node.getSize().y + (node.isInlineEdgeLabel() ? 0 : -thickness - edgeLabelSpacing),
    );

    // Place labels
    const representedLabels = node.getProperty(InternalProperties.REPRESENTED_LABELS);

    if (layoutDirection.isVertical()) {
      placeLabelsForVerticalLayout(representedLabels, currLabelPos, labelLabelSpacing, labelSpace, {
        leftAligned: labelsBelowEdge,
        layoutDirection,
      });
    } else {
      placeLabelsForHorizontalLayout(representedLabels, currLabelPos, labelLabelSpacing, labelSpace);
    }
  }
}
