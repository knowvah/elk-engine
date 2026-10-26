// SPDX-License-Identifier: EPL-2.0
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { CGroup } from './CGroup.js';
import type { CGraph } from './CGraph.js';
import { CNode } from './CNode.js';

/**
 * Builder class for {@link CNode}s. Java's public nested class `CNode.CNodeBuilder`, split into
 * its own file (M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/CNode.java
 */
export class CNodeBuilder {
  /** The node currently being constructed. */
  private readonly node: CNode;
  /** A node into which's {@link CGroup} this node should be placed upon creation. */
  private groupParent: CNode | null = null;

  /** Private in Java; use {@link CNode.of}. */
  constructor() {
    this.node = new CNode();
  }

  /**
   * Sets the id field.
   *
   * @param id a non-negative integer.
   * @returns this builder.
   */
  id(id: number): CNodeBuilder {
    this.node.id = id;
    return this;
  }

  /**
   * Sets the origin field.
   *
   * @param origin any object.
   * @returns this builder.
   */
  origin(origin: unknown): CNodeBuilder {
    this.node.origin = origin;
    return this;
  }

  /**
   * Sets the type field.
   *
   * @param type any string, has no semantic meaning, can be used for debugging.
   * @returns this builder.
   */
  type(type: string): CNodeBuilder {
    this.node.type = type;
    return this;
  }

  /**
   * Sets the hitbox.
   *
   * @param hitbox a rectangle defining the occupied space of this node.
   * @returns this builder.
   */
  hitbox(hitbox: ElkRectangle): CNodeBuilder {
    this.node.hitbox = hitbox;
    return this;
  }

  /**
   * Allows the customization of the {@link CNode}'s `toString` method.
   *
   * @param delegate the delegate
   * @returns this builder.
   */
  toStringDelegate(delegate: (node: CNode) => string): CNodeBuilder {
    this.node.toStringDelegate = delegate;
    return this;
  }

  /**
   * Add this node to `parent`'s {@link CGroup}.
   *
   * @param parent the node which should be the parent. May be `null`, in which case no grouping is applied.
   * @returns this builder.
   */
  groupWith(parent: CNode | null): CNodeBuilder {
    this.groupParent = parent;
    return this;
  }

  /**
   * Finally creates this node. That is, the node is added to the passed {@link CGraph}.
   *
   * @param graph the {@link CGraph} this node belongs to.
   * @returns the created {@link CNode}.
   */
  create(graph: CGraph): CNode {
    graph.cNodes.push(this.node);
    if (this.groupParent !== null) {
      if (this.groupParent.cGroup === null) {
        CGroup.of().nodes(this.groupParent, this.node).create(graph);
      } else {
        this.groupParent.cGroup.addCNode(this.node);
      }
    }
    return this.node;
  }
}
