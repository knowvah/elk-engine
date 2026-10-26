// SPDX-License-Identifier: EPL-2.0
import { ElkGraphAdapters } from '../../core/util/adapters/ElkGraphAdapters.js';
import type { GraphAdapters } from '../../core/util/adapters/GraphAdapters.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { NodeDimensionCalculation } from './nodespacing/NodeDimensionCalculation.js';

/**
 * Utility class to execute what can be considered as "node micro layout". That is, automatically computing node
 * dimensions if requested by the user, positioning ports, positioning node and port labels, etc.
 *
 * Currently, simply all possible micro layouts are executed. It may make sense to perform only a subset, e.g. only
 * place node labels. This may be implemented in the future.
 *
 * Furthermore, all of {@link NodeDimensionCalculation}'s methods should be moved to this utility class at some point as
 * this class's naming makes it a bit clearer what actually happens.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/NodeMicroLayout.java
 */
export class NodeMicroLayout {
  private readonly adapter: GraphAdapters.GraphAdapter<unknown>;

  private constructor(adapter: GraphAdapters.GraphAdapter<unknown>) {
    this.adapter = adapter;
  }

  /**
   * The two Java overloads `forGraph(ElkNode)` and `forGraph(GraphAdapter<?>)` dispatch on the run-time type
   * (translation-rules 6.5); the `ElkNode` one adapts via {@link ElkGraphAdapters.adapt}.
   *
   * @returns a new micro layout instance for the passed graph. Use {@link NodeMicroLayout.execute} to finally
   *          perform the layout process.
   */
  static forGraph(elkGraph: ElkNode): NodeMicroLayout;
  static forGraph(adapter: GraphAdapters.GraphAdapter<unknown>): NodeMicroLayout;
  static forGraph(graph: ElkNode | GraphAdapters.GraphAdapter<unknown>): NodeMicroLayout {
    if (isElkNode(graph)) {
      return NodeMicroLayout.forGraph(ElkGraphAdapters.adapt(graph));
    }
    const builder = new NodeMicroLayout(graph);
    return builder;
  }

  /** Perform the actual layout. */
  execute(): void {
    NodeDimensionCalculation.sortPortLists(this.adapter);
    NodeDimensionCalculation.calculateLabelAndNodeSizes(this.adapter);
    NodeDimensionCalculation.calculateNodeMargins(this.adapter);
  }
}
