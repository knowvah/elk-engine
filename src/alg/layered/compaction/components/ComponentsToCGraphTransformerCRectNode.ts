// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { CNode } from '../oned/CNode.js';

/**
 * {@link CNode} implementation for {@link ElkRectangle}s representing parts of the rectangular
 * convex hull of a connected IComponent. Java's private inner class
 * `ComponentsToCGraphTransformer.CRectNode`, split into its own file. The inner class reads the
 * outer instance's `spacing`; here the outer instance passes a reader of that field.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/components/ComponentsToCGraphTransformer.java
 */
export class CRectNode extends CNode {
  /** Package-visible to the outer class in Java (a private member of a nested class). */
  readonly rect: ElkRectangle;
  private readonly individualSpacing: number | null;
  private readonly outerSpacing: () => number;

  /**
   * @param outerSpacing reads the enclosing transformer's `spacing`
   * @param rect the rectangle this node represents
   * @param spacing the individual spacing, or null to use the transformer's
   */
  constructor(outerSpacing: () => number, rect: ElkRectangle, spacing: number | null = null) {
    super();
    this.outerSpacing = outerSpacing;
    this.rect = rect;
    this.hitbox = new ElkRectangle(rect.x, rect.y, rect.width, rect.height);
    this.individualSpacing = spacing;
  }

  getHorizontalSpacing(): number {
    return this.individualSpacing !== null ? this.individualSpacing : this.outerSpacing();
  }

  getVerticalSpacing(): number {
    return this.individualSpacing !== null ? this.individualSpacing : this.outerSpacing();
  }

  applyElementPosition(): void {
    this.rect.x = this.hitbox.x;
    this.rect.y = this.hitbox.y;
  }

  getElementPosition(): number {
    return this.rect.x;
  }

  override toString(): string {
    // for debug output be quiet! :)
    return '';
  }
}
