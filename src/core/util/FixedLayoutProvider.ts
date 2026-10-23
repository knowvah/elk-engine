// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkLabel } from '../../graph/ElkLabel.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphFactory } from '../../graph/ElkGraphFactory.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { KVectorChain } from '../math/KVectorChain.js';
import { KVector } from '../math/KVector.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { EdgeRouting } from '../options/EdgeRouting.js';
import { FixedLayouterOptions } from '../options/FixedLayouterOptions.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { ElkUtil } from './ElkUtil.js';
import type { IElkProgressMonitor } from './IElkProgressMonitor.js';

/** The maximal coordinates found so far (Java's locals `maxx`/`maxy`, shared by the helpers of `layout`). */
interface Extent {
  maxx: number;
  maxy: number;
}

/**
 * A layout provider that sets fixed positions for all elements. These positions are taken from the
 * {@link CoreOptions.POSITION} and {@link CoreOptions.BEND_POINTS} options. Elements that have no position option
 * attached just stay where they are. This is useful for at least two things:
 * - Fix the layout of a part of the diagram so it won't be affected by automatic layout.
 * - Apply a layout imported from somewhere else, e.g. the original layout that was manually created in another
 *   modeling tool.
 *
 * MIGRATE The fixed layout provider does not support hyperedges yet.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/FixedLayoutProvider.java
 */
export class FixedLayoutProvider extends AbstractLayoutProvider {
  layout(layoutNode: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Fixed Layout', 1);

    const edgeRouting = layoutNode.getProperty(CoreOptions.EDGE_ROUTING);

    const extent: Extent = { maxx: 0, maxy: 0 };

    for (const node of layoutNode.getChildren()) {
      this.layoutNodeAndLabels(node, extent);
      this.layoutPorts(node, extent);
      this.layoutEdges(layoutNode, node, edgeRouting, extent);
    }

    // if orthogonal routing is selected, determine the junction points
    if (edgeRouting === EdgeRouting.ORTHOGONAL) {
      for (const node of layoutNode.getChildren()) {
        for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
          this.generateJunctionPoints(edge);
        }
      }
    }

    // set size of the parent node unless its size should be fixed as well
    if (!layoutNode.getProperty(FixedLayouterOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      const padding = layoutNode.getProperty(FixedLayouterOptions.PADDING);
      const newWidth = extent.maxx + padding.getLeft() + padding.getRight();
      const newHeight = extent.maxy + padding.getTop() + padding.getBottom();
      ElkUtil.resizeNode(layoutNode, newWidth, newHeight, true, true);
    }
    progressMonitor.done();
  }

  /** The node's fixed position and size (or as it is), then its labels: the first sections of Java's loop body. */
  private layoutNodeAndLabels(node: ElkNode, extent: Extent): void {
    // set the fixed position of the node, or leave it as it is
    const pos: KVector | null = node.getProperty(FixedLayouterOptions.POSITION);
    if (pos !== null) {
      node.setLocation(pos.x, pos.y);

      // set the fixed size of the node
      if (node.getProperty(FixedLayouterOptions.NODE_SIZE_CONSTRAINTS).contains(SizeConstraint.MINIMUM_SIZE)) {
        const minSize = node.getProperty(FixedLayouterOptions.NODE_SIZE_MINIMUM);
        if (minSize.x > 0 && minSize.y > 0) {
          ElkUtil.resizeNode(node, minSize.x, minSize.y, true, true);
        }
      }
    }
    extent.maxx = Math.max(extent.maxx, node.getX() + node.getWidth());
    extent.maxy = Math.max(extent.maxy, node.getY() + node.getHeight());

    // set the fixed position of the node labels, or leave them as they are
    for (const label of node.getLabels()) {
      this.fixLabelPosition(label);
      extent.maxx = Math.max(extent.maxx, node.getX() + label.getX() + label.getWidth());
      extent.maxy = Math.max(extent.maxy, node.getY() + label.getY() + label.getHeight());
    }
  }

  /** Sets the label's fixed position, or leaves it as it is (the repeated `getProperty(POSITION)` block of Java). */
  private fixLabelPosition(label: ElkLabel): void {
    const pos: KVector | null = label.getProperty(FixedLayouterOptions.POSITION);
    if (pos !== null) {
      label.setLocation(pos.x, pos.y);
    }
  }

  /** The node's ports and their labels (fixed positions, or as they are). */
  private layoutPorts(node: ElkNode, extent: Extent): void {
    for (const port of node.getPorts()) {
      const pos: KVector | null = port.getProperty(FixedLayouterOptions.POSITION);
      if (pos !== null) {
        port.setLocation(pos.x, pos.y);
      }

      const portx = node.getX() + port.getX();
      const porty = node.getY() + port.getY();
      extent.maxx = Math.max(extent.maxx, portx + port.getWidth());
      extent.maxy = Math.max(extent.maxy, porty + port.getHeight());

      // set the fixed position of the port labels, or leave them as they are
      for (const label of port.getLabels()) {
        this.fixLabelPosition(label);
        extent.maxx = Math.max(extent.maxx, portx + label.getX() + label.getWidth());
        extent.maxy = Math.max(extent.maxy, porty + label.getY() + label.getHeight());
      }
    }
  }

  /** The node's outgoing edges, then its incoming hierarchical edges. */
  private layoutEdges(layoutNode: ElkNode, node: ElkNode, edgeRouting: EdgeRouting, extent: Extent): void {
    // set fixed routing for the node's outgoing edges (both simple and hierarchical), or leave them as they are
    for (const edge of ElkGraphUtil.allOutgoingEdges(node)) {
      const maxv = this.processEdge(edge, edgeRouting);
      extent.maxx = Math.max(extent.maxx, maxv.x);
      extent.maxy = Math.max(extent.maxy, maxv.y);
    }

    // additionally handle incoming hierarchical edges (both short and long)
    //  note that this potentially results in hierarchical edges being handled twice
    for (const edge of ElkGraphUtil.allIncomingEdges(node)) {
      if ((ElkGraphUtil.getSourceNode(edge) as ElkNode).getParent() !== layoutNode) {
        const maxv = this.processEdge(edge, edgeRouting);
        extent.maxx = Math.max(extent.maxx, maxv.x);
        extent.maxy = Math.max(extent.maxy, maxv.y);
      }
    }
  }

  /**
   * Process an edge and its labels.
   *
   * @param edge an edge
   * @param edgeRouting the global edge routing setting
   */
  private processEdge(edge: ElkEdge, _edgeRouting: EdgeRouting): KVector {
    // MIGRATE Does this properly support hyperedges?
    const sourceParent = (ElkGraphUtil.connectableShapeToNode(edge.getSources().get(0)) as ElkNode).getParent();
    const targetParent = (ElkGraphUtil.connectableShapeToNode(edge.getTargets().get(0)) as ElkNode).getParent();
    const sameHierarchy = sourceParent === targetParent;

    const maxv = new KVector();
    const bendPoints: KVectorChain | null = edge.getProperty(FixedLayouterOptions.BEND_POINTS);

    // we need at least two bend points, since the source point and target point must be included
    if (bendPoints !== null && bendPoints.size() >= 2) {
      this.applyBendPoints(edge, bendPoints);
    }

    // determine maximal coordinates
    if (sameHierarchy) {
      for (const edgeSection of edge.getSections()) {
        for (const point of edgeSection.getBendPoints()) {
          maxv.x = Math.max(maxv.x, point.getX());
          maxv.y = Math.max(maxv.y, point.getY());
        }
      }
    }

    // set the fixed position of the edge labels, or leave them as they are
    for (const label of edge.getLabels()) {
      this.fixLabelPosition(label);

      if (sameHierarchy) {
        maxv.x = Math.max(maxv.x, label.getX() + label.getWidth());
        maxv.y = Math.max(maxv.y, label.getY() + label.getHeight());
      }
    }

    return maxv;
  }

  /** Applies the bend points to the edge's single section (the bend point block of Java's `processEdge`). */
  private applyBendPoints(edge: ElkEdge, bendPoints: KVectorChain): void {
    if (edge.getSections().isEmpty()) {
      // We need an edge section to apply the bend points to
      const edgeSection = ElkGraphFactory.eINSTANCE.createElkEdgeSection();
      edge.getSections().add(edgeSection);
    } else if (edge.getSections().size() > 1) {
      // We can only apply bend points to a single edge section, so throw away all except for the last one
      const sections = edge.getSections().listIterator();
      while (sections.hasNext()) {
        sections.remove();
      }
    }

    ElkUtil.applyVectorChain(bendPoints, edge.getSections().get(0));
  }

  /**
   * Determine if given edge has junction points and add appropriate layout option if necessary.
   *
   * @param edge the edge to determine junction points of
   */
  private generateJunctionPoints(edge: ElkEdge): void {
    // Note: if the edge coordinates are not modified, the junction points are also ignored
    const junctionPoints = ElkUtil.determineJunctionPoints(edge);
    if (junctionPoints.isEmpty()) {
      edge.setProperty(CoreOptions.JUNCTION_POINTS, null);
    } else {
      edge.setProperty(CoreOptions.JUNCTION_POINTS, junctionPoints);
    }
  }
}
