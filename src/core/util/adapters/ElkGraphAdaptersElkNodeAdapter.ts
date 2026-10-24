// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ECollections } from '../../../emf/common/util/ECollections.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { CoreOptions } from '../../options/CoreOptions.js';
import { AbstractElkGraphElementAdapter } from './ElkGraphAdaptersAbstractElkGraphElementAdapter.js';
import { ElkEdgeAdapter } from './ElkGraphAdaptersElkEdgeAdapter.js';
import type { ElkGraphAdapter } from './ElkGraphAdaptersElkGraphAdapter.js';
import { ElkLabelAdapter } from './ElkGraphAdaptersElkLabelAdapter.js';
import { ElkPortAdapter } from './ElkGraphAdaptersElkPortAdapter.js';
import { ElkGraphAdapters } from './ElkGraphAdapters.js';
import type { GraphAdapters } from './GraphAdapters.js';

/**
 * Adapter for `ElkNode`s.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class ElkNodeAdapter
  extends AbstractElkGraphElementAdapter<ElkNode>
  implements GraphAdapters.NodeAdapter<ElkNode>
{
  /** The graph adapter that created this node adapter. */
  private parentGraphAdapter: ElkGraphAdapter | null = null;
  /** Cached list of label adapters. */
  private labelAdapters: GraphAdapters.LabelAdapter<unknown>[] | null = null;
  /** Cached list of port adapters. */
  private portAdapters: GraphAdapters.PortAdapter<unknown>[] | null = null;
  /** Cached list of edge adapters for incoming edges. */
  private incomingEdgeAdapters: GraphAdapters.EdgeAdapter<unknown>[] | null = null;
  /** Cached list of edge adapters for outgoing edges. */
  private outgoingEdgeAdapters: GraphAdapters.EdgeAdapter<unknown>[] | null = null;

  /**
   * Creates a new adapter for the given node (Java: private; public here for sibling files).
   *
   * @param parent the graph adapter that created this thing.
   * @param node the node to adapt.
   */
  constructor(parent: ElkGraphAdapter | null, node: ElkNode) {
    super(node);
    this.parentGraphAdapter = parent;
  }

  getGraph(): GraphAdapters.GraphAdapter<unknown> | null {
    return this.parentGraphAdapter;
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

  getPorts(): GraphAdapters.PortAdapter<unknown>[] {
    if (this.portAdapters === null) {
      this.portAdapters = [];
      for (const p of this.element.getPorts()) {
        this.portAdapters.push(new ElkPortAdapter(p));
      }
    }
    return this.portAdapters;
  }

  getIncomingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    if (this.incomingEdgeAdapters === null) {
      this.incomingEdgeAdapters = [];
      for (const e of ElkGraphUtil.allIncomingEdges(this.element)) {
        this.incomingEdgeAdapters.push(new ElkEdgeAdapter(e));
      }
    }
    return this.incomingEdgeAdapters;
  }

  getOutgoingEdges(): Iterable<GraphAdapters.EdgeAdapter<unknown>> {
    if (this.outgoingEdgeAdapters === null) {
      this.outgoingEdgeAdapters = [];
      for (const e of ElkGraphUtil.allOutgoingEdges(this.element)) {
        this.outgoingEdgeAdapters.push(new ElkEdgeAdapter(e));
      }
    }
    return this.outgoingEdgeAdapters;
  }

  /** Covers the Java overloads `sortPortList()` (default sorter) and `sortPortList(Comparator<?>)`. */
  sortPortList(comparator?: (a: never, b: never) => number): void {
    const effective =
      comparator ?? ((a: ElkPort, b: ElkPort): number => ElkGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(a, b));
    // Iterate through the nodes of all layers
    if (this.element.getProperty(CoreOptions.PORT_CONSTRAINTS).isOrderFixed()) {
      ECollections.sort(this.element.getPorts(), effective as (a: ElkPort, b: ElkPort) => number);
    }
  }

  isCompoundNode(): boolean {
    return !this.element.getChildren().isEmpty() || this.element.getProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE);
  }
}
