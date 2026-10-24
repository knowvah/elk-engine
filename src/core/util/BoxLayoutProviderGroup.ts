// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import { KVector } from '../math/KVector.js';
import { ElkUtil } from './ElkUtil.js';

/**
 * Internal representation of a group. A group either wraps a single node, or holds a collection of groups.
 * In essence it delegates position/dimension changes to the inner-most groups (wrapping nodes).
 *
 * Java's private nested class `BoxLayoutProvider.Group`, split into its own file (M15); module-internal.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/BoxLayoutProvider.java
 */
export class Group {
  /** The node represented by this group, may be `null`. */
  node: ElkNode | null = null;
  /** The set of groups wrapped in this group, may only be used if `node` is `null`. */
  groups: Group[] | null = null;
  /** If this group represents other groups, `size` represents the bounding rectangle. */
  size: KVector | null = null;

  /** Stores the bottom-most nodes of this group, used if `CoreOptions.EXPAND_NODES` is active. */
  bottom: Group[] | null = null;
  /** Stores the right-most nodes of this group, used if `CoreOptions.EXPAND_NODES` is active. */
  right: Group[] | null = null;

  /** Java constructors `Group(ElkNode)` and `Group(Iterable<Group>)`, told apart by the argument's runtime type. */
  constructor(nodeOrGroups: ElkNode | Iterable<Group>) {
    if (isElkNode(nodeOrGroups)) {
      this.node = nodeOrGroups;
      nodeOrGroups.setLocation(0, 0);
    } else {
      this.groups = [...nodeOrGroups];
      this.bottom = [];
      this.right = [];
      this.size = new KVector();
    }
  }

  area(): number {
    return this.getWidth() * this.getHeight();
  }

  getWidth(): number {
    if (this.node !== null) {
      return this.node.getWidth();
    }
    return (this.size as KVector).x;
  }

  getHeight(): number {
    if (this.node !== null) {
      return this.node.getHeight();
    }
    return (this.size as KVector).y;
  }

  /**
   * Sets (increases) the width of this group. For node-wrapping groups this directly alters the
   * node's with. For groups of groups this only makes sense in conjunction with
   * `CoreOptions.EXPAND_NODES`, effectively increasing all inner-most nodes (by recursion) of the
   * `right` collection as to fit their parent group's width.
   */
  setWidth(w: number): void {
    // assert w > getWidth(); (Java assertions are disabled by default, JLS 14.10)
    if (this.node !== null) {
      this.node.setWidth(w);
    } else {
      // increase width of the rightmost nodes
      const delta = w - this.getWidth();
      for (const g of this.right as Group[]) {
        g.setWidth(g.getWidth() + delta);
      }
    }
  }

  /** Sets (increases) the height of this group. See {@link Group.setWidth} for further details. */
  setHeight(h: number): void {
    // assert h > getHeight(); (Java assertions are disabled by default, JLS 14.10)
    if (this.node !== null) {
      this.node.setHeight(h);
    } else {
      // increase bottom most groups
      const delta = h - this.getHeight();
      for (const g of this.bottom as Group[]) {
        g.setHeight(g.getHeight() + delta);
      }
    }
  }

  /**
   * For groups wrapping nodes, the passed `x` and `y` are added to the node's
   * location. For group-wrapping groups, the method is called recursively.
   *
   * As opposed to {@link Group.translateInnerNodes} this method alters the position of a wrapped
   * node's location.
   */
  translate(x: number, y: number): void {
    if (this.node !== null) {
      this.node.setX(this.node.getX() + x);
      this.node.setY(this.node.getY() + y);
    } else {
      for (const g of this.groups as Group[]) {
        g.translate(x, y);
      }
    }
  }

  /**
   * Translates the nested nodes of wrapped hierarchical nodes.
   *
   * As opposed to {@link Group.translate} this method translates the nested nodes of a hierarchical
   * node. See also `ElkUtil.translate(ElkNode, double, double)`.
   */
  translateInnerNodes(x: number, y: number): void {
    if (this.node !== null) {
      ElkUtil.translate(this.node, x, y);
    } else {
      for (const g of this.groups as Group[]) {
        g.translateInnerNodes(x, y);
      }
    }
  }

  toString(): string {
    if (this.node !== null) {
      return this.node.toString();
    } else {
      return `[${(this.groups as Group[]).map((g) => g.toString()).join(', ')}]`;
    }
  }
}
