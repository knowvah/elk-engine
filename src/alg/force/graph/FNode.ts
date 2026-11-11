// SPDX-License-Identifier: EPL-2.0
import { FParticle } from './FParticle.js';

/**
 * A node in the force graph.
 *
 * @author owo
 * @author msp
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/graph/FNode.java
 */
export class FNode extends FParticle {
  /** the identifier number. */
  id: number = 0;
  /** the node label. */
  private readonly label: string | null;
  /** The parent node. */
  private readonly parent: FNode | null;
  /** List of child nodes. */
  private children: FNode[] | null = null;

  /**
   * Covers the three Java constructors: `FNode()`, `FNode(String label)` and `FNode(String label, FNode theParent)`.
   *
   * @param label the label text
   * @param theParent the parent node
   */
  constructor(label: string | null = null, theParent: FNode | null = null) {
    super();
    this.label = label;
    this.parent = theParent;
  }

  override toString(): string {
    if (this.label === null || this.label.length === 0) {
      return `n_${String(this.id)}`;
    } else {
      return `n_${this.label}`;
    }
  }

  /**
   * Returns whether this node is a compound node.
   *
   * @return true if compound
   */
  isCompound(): boolean {
    return this.children !== null && this.children.length > 0;
  }

  /**
   * Returns the label text of this node.
   *
   * @return the label
   */
  getLabel(): string | null {
    return this.label;
  }

  /**
   * Returns the parent node.
   *
   * @return the parent
   */
  getParent(): FNode | null {
    return this.parent;
  }

  /**
   * Returns the list of children, creating it if necessary.
   *
   * @return the children
   */
  getChildren(): FNode[] {
    if (this.children === null) {
      this.children = [];
    }
    return this.children;
  }

  /**
   * Returns the depth of this node in the compound hierarchy.
   *
   * @return the depth
   */
  getDepth(): number {
    let depth = 0;
    let node = this.parent;
    while (node !== null) {
      node = node.getParent();
      depth++;
    }
    return depth;
  }
}
