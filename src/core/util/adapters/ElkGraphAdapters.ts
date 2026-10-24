// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import type { ElkPort } from '../../../graph/ElkPort.js';
import { ElkGraphAdapter } from './ElkGraphAdaptersElkGraphAdapter.js';
import { ElkNodeAdapter } from './ElkGraphAdaptersElkNodeAdapter.js';
import { ElkPortAdapter } from './ElkGraphAdaptersElkPortAdapter.js';
import { PortComparator } from './ElkGraphAdaptersPortComparator.js';

export { ElkGraphAdapter } from './ElkGraphAdaptersElkGraphAdapter.js';
export { ElkNodeAdapter } from './ElkGraphAdaptersElkNodeAdapter.js';
export { ElkPortAdapter } from './ElkGraphAdaptersElkPortAdapter.js';
export { PortComparator } from './ElkGraphAdaptersPortComparator.js';

/**
 * Contains implementations of the `GraphAdapters` interfaces for the ElkGraph. To obtain an adapter for a full
 * ElkGraph, simply call {@link ElkGraphAdapters.adapt}. To obtain an adapter only for a single node, call
 * {@link ElkGraphAdapters.adaptSingleNode}.
 *
 * The nested Java classes live in prefixed files (`ElkGraphAdapters*.ts`); the private ones (`ElkLabelAdapter`,
 * `ElkEdgeAdapter`, `AbstractElkGraphElementAdapter`) are not re-exported here.
 *
 * @author uru
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class ElkGraphAdapters {
  /**
   * The default comparator for ports. Ports are sorted by side (north, east, south, west) in clockwise order,
   * beginning at the top left corner.
   */
  static readonly DEFAULT_PORTLIST_SORTER: PortComparator = new PortComparator();

  private constructor() {}

  /**
   * Creates the necessary adapters for the ElkGraph rooted at the given node.
   *
   * @param graph the graph that should be wrapped in an adapter
   * @returns an {@link ElkGraphAdapter} for the passed graph.
   */
  static adapt(graph: ElkNode): ElkGraphAdapter {
    return new ElkGraphAdapter(graph);
  }

  /**
   * Creates a single node adapter for the given node.
   *
   * @param node the node that should be wrapped in an adapter
   * @returns an {@link ElkNodeAdapter} for the passed node.
   */
  static adaptSingleNode(node: ElkNode): ElkNodeAdapter {
    const parent = node.getParent();
    return new ElkNodeAdapter(parent === null ? null : ElkGraphAdapters.adapt(parent), node);
  }

  /**
   * Creates a single port adapter for the given port.
   *
   * @param port the port that should be wrapped in an adapter
   * @returns an {@link ElkPortAdapter} for the passed port.
   */
  static adaptSinglePort(port: ElkPort): ElkPortAdapter {
    return new ElkPortAdapter(port);
  }
}
