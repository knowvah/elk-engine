// SPDX-License-Identifier: EPL-2.0
import { CGroup } from './CGroup.js';
import type { CGraph } from './CGraph.js';
import type { CNode } from './CNode.js';

/**
 * Builder class for {@link CGroup}s. Java's public nested class `CGroup.CGroupBuilder`, split into
 * its own file (M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/CGroup.java
 */
export class CGroupBuilder {
  /** The group currently being constructed. */
  private readonly group: CGroup;

  /** Private in Java; use {@link CGroup.of}. */
  constructor() {
    this.group = new CGroup();
  }

  /**
   * Adds the passed nodes to this group.
   *
   * @param nodes the nodes
   * @returns this builder.
   */
  nodes(...nodes: CNode[]): CGroupBuilder {
    for (const n of nodes) {
      this.group.addCNode(n);
    }
    return this;
  }

  /**
   * Sets the reference node of this group.
   *
   * @param referenceNode the reference node
   * @returns this builder.
   */
  reference(referenceNode: CNode): CGroupBuilder {
    this.group.reference = referenceNode;
    return this;
  }

  /**
   * Sets the passed node as 'master'.
   *
   * @param master the master node
   * @returns this builder.
   */
  master(master: CNode): CGroupBuilder {
    this.group.master = master;
    return this;
  }

  /**
   * Finally creates this group. That is, the node is added to the passed {@link CGraph}.
   *
   * @param graph the {@link CGraph} this node belongs to.
   * @returns the created {@link CGroup}.
   */
  create(graph: CGraph): CGroup {
    graph.cGroups.push(this.group);
    return this.group;
  }
}
