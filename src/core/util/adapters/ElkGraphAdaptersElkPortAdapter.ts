// SPDX-License-Identifier: EPL-2.0
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { CoreOptions } from '../../options/CoreOptions.js';
import type { PortSide } from '../../options/PortSide.js';
import { AbstractElkGraphElementAdapter } from './ElkGraphAdaptersAbstractElkGraphElementAdapter.js';
import { ElkEdgeAdapter } from './ElkGraphAdaptersElkEdgeAdapter.js';
import { ElkLabelAdapter } from './ElkGraphAdaptersElkLabelAdapter.js';
import type { GraphAdapters } from './GraphAdapters.js';

/**
 * Adapter for `ElkPort`s. Java: private nested class (the constructor is public here only so that sibling files
 * can create instances; the class is not exported from the facade).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class ElkPortAdapter
  extends AbstractElkGraphElementAdapter<ElkPort>
  implements GraphAdapters.PortAdapter<ElkPort>
{
  /** Cached list of label adapters. */
  private labelAdapters: GraphAdapters.LabelAdapter<unknown>[] | null = null;
  /** Cached list of edge adapters for incoming edges. */
  private incomingEdgeAdapters: GraphAdapters.EdgeAdapter<unknown>[] | null = null;
  /** Cached list of edge adapters for outgoing edges. */
  private outgoingEdgeAdapters: GraphAdapters.EdgeAdapter<unknown>[] | null = null;

  /**
   * Creates a new adapter for the given port.
   *
   * @param port the port to adapt.
   */
  constructor(port: ElkPort) {
    super(port);
  }

  getSide(): PortSide {
    return this.element.getProperty(CoreOptions.PORT_SIDE);
  }

  getLabels(): GraphAdapters.LabelAdapter<unknown>[] {
    if (this.labelAdapters === null) {
      this.labelAdapters = [];
      for (const l of this.element.getLabels()) {
        this.labelAdapters.push(new ElkLabelAdapter(l));
      }
    }
    return this.labelAdapters;
  }

  getIncomingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    if (this.incomingEdgeAdapters === null) {
      this.incomingEdgeAdapters = [];
      for (const e of this.element.getIncomingEdges()) {
        this.incomingEdgeAdapters.push(new ElkEdgeAdapter(e));
      }
    }
    return this.incomingEdgeAdapters;
  }

  getOutgoingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    if (this.outgoingEdgeAdapters === null) {
      this.outgoingEdgeAdapters = [];
      for (const e of this.element.getOutgoingEdges()) {
        this.outgoingEdgeAdapters.push(new ElkEdgeAdapter(e));
      }
    }
    return this.outgoingEdgeAdapters;
  }

  hasCompoundConnections(): boolean {
    const node = this.element.getParent() as ElkNode;

    for (const edge of this.element.getOutgoingEdges()) {
      if (ElkPortAdapter.hasCompoundTarget(edge, node)) {
        return true;
      }
    }

    for (const edge of this.element.getIncomingEdges()) {
      for (const source of edge.getSources()) {
        if (ElkGraphUtil.isDescendant(ElkGraphUtil.connectableShapeToNode(source) as ElkNode, node)) {
          return true;
        }
      }
    }

    return false;
  }

  /** The body of the Java outgoing-edge loop in `hasCompoundConnections`. */
  private static hasCompoundTarget(edge: ElkEdge, node: ElkNode): boolean {
    for (const target of edge.getTargets()) {
      if (ElkGraphUtil.isDescendant(ElkGraphUtil.connectableShapeToNode(target) as ElkNode, node)) {
        return true;
      } else if (
        ElkGraphUtil.connectableShapeToNode(target) === node &&
        edge.getProperty(CoreOptions.INSIDE_SELF_LOOPS_YO)
      ) {
        // Inside self loops are treated as compound connections, too
        return true;
      }
    }
    return false;
  }
}
