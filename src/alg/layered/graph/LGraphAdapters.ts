// SPDX-License-Identifier: EPL-2.0
import { LGraphAdapter } from './LGraphAdaptersLGraphAdapter.js';
import { LLabelAdapter } from './LGraphAdaptersLLabelAdapter.js';
import { LNodeAdapter } from './LGraphAdaptersLNodeAdapter.js';
import { DEFAULT_PORTLIST_SORTER, PortComparator } from './LGraphAdaptersPortComparator.js';
import { LGraph } from './LGraph.js';
import { LLabel } from './LLabel.js';
import type { LNode } from './LNode.js';

export { LEdgeAdapter } from './LGraphAdaptersLEdgeAdapter.js';
export { LGraphAdapter } from './LGraphAdaptersLGraphAdapter.js';
export { LLabelAdapter } from './LGraphAdaptersLLabelAdapter.js';
export { LNodeAdapter } from './LGraphAdaptersLNodeAdapter.js';
export { LPortAdapter } from './LGraphAdaptersLPortAdapter.js';
export { PortComparator } from './LGraphAdaptersPortComparator.js';

/**
 * Provides implementations of the `GraphAdapters` interfaces for the LGraph. The adapted graph can then be fed to
 * ELK's node size calculation code, for example. To obtain an adapter for an {@link LGraph}, simply call
 * {@link LGraphAdapters.adapt}.
 *
 * The nested Java classes live in prefixed files (`LGraphAdapters*.ts`); the private `AbstractLShapeAdapter` is not
 * re-exported here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class LGraphAdapters {
  /**
   * A comparer for ports. Ports are sorted by side (north, east, south, west) in clockwise order, beginning at the
   * top left corner.
   */
  static readonly DEFAULT_PORTLIST_SORTER: PortComparator = DEFAULT_PORTLIST_SORTER;

  private constructor() {}

  /**
   * Java overloads `adapt(LGraph)`, `adapt(LGraph, boolean)`, `adapt(LGraph, boolean, boolean, Predicate)`,
   * `adapt(LNode, boolean)` and `adapt(LLabel)`; one implementation dispatching on the first argument
   * (translation-rules §6.5).
   *
   * Adapts the given graph, node or label. For graphs and nodes, `transparentNorthSouthEdges` makes edges connected
   * to north/south port dummies appear to be directly connected to their original north/south ports; for graphs,
   * `transparentCommentNodes` includes attached comment nodes temporarily removed from the graph and `nodeFilter`
   * returns `true` for a node that should be visible in the adapted graph.
   */
  static adapt(graph: LGraph, transparentNorthSouthEdges?: boolean): LGraphAdapter;
  static adapt(
    graph: LGraph,
    transparentNorthSouthEdges: boolean,
    transparentCommentNodes: boolean,
    nodeFilter: (node: LNode) => boolean,
  ): LGraphAdapter;
  static adapt(node: LNode, transparentNorthSouthEdges: boolean): LNodeAdapter;
  static adapt(label: LLabel): LLabelAdapter;
  static adapt(
    element: LGraph | LNode | LLabel,
    transparentNorthSouthEdges = false,
    transparentCommentNodes = false,
    nodeFilter: (node: LNode) => boolean = () => true,
  ): LGraphAdapter | LNodeAdapter | LLabelAdapter {
    if (element instanceof LGraph) {
      return new LGraphAdapter(element, transparentNorthSouthEdges, transparentCommentNodes, nodeFilter);
    } else if (element instanceof LLabel) {
      return new LLabelAdapter(element);
    } else {
      return new LNodeAdapter(null, element, transparentNorthSouthEdges);
    }
  }
}
