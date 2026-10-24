// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { IDataProvider } from './IDataProvider.js';

/**
 * Implementation of {@link IDataProvider} for ELK graphs. Comments are nodes that have the
 * {@link CoreOptions.COMMENT_BOX} property set. Possible attachment targets are the siblings of a comment node.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/ElkGraphDataProvider.java
 */
export class ElkGraphDataProvider extends IDataProvider<ElkNode, ElkNode> {
  private readonly graph: ElkNode;

  /**
   * Creates a new instance that provides data from the given graph.
   *
   * @param graph - non-null graph to provide data for.
   * @throws TypeError if `graph` is null (Java: `Objects.requireNonNull` NPE).
   */
  constructor(graph: ElkNode | null) {
    super();
    if (graph === null || graph === undefined) {
      throw new TypeError('Comment attachment must be run on a graph.');
    }
    this.graph = graph;
  }

  override provideComments(): ElkNode[] {
    // Simply return all nodes marked as comments
    return [...this.graph.getChildren()].filter((node) => node.getProperty(CoreOptions.COMMENT_BOX));
  }

  override provideTargets(): ElkNode[] {
    // Return all non-comment nodes
    return [...this.graph.getChildren()].filter((node) => !node.getProperty(CoreOptions.COMMENT_BOX));
  }

  override provideSubHierarchies(): IDataProvider<ElkNode, ElkNode>[] {
    return [...this.graph.getChildren()]
      .filter((node) => !node.getChildren().isEmpty())
      .map((node) => new ElkGraphDataProvider(node));
  }

  /** Attaches a comment to an attachment target by inserting an edge that connects the two. */
  override attach(comment: ElkNode, target: ElkNode): void {
    ElkGraphUtil.createSimpleEdge(comment, target);
  }
}
