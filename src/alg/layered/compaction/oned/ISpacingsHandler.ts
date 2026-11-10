// SPDX-License-Identifier: EPL-2.0
import type { CNode } from './CNode.js';

/**
 * An implementation of this class is able to report both the vertical and the horizontal spacing
 * between any pair of {@link CNode}s. Different implementations of {@link CNode}s may have
 * different special requirements. In such a case a special spacings handler should be implemented.
 * For a default implementation, use the {@link DEFAULT_SPACING_HANDLER}.
 *
 * @typeParam T the node type
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/ISpacingsHandler.java
 */
export interface ISpacingsHandler<T extends CNode = CNode> {
  /**
   * @param cNode1 the first involved node.
   * @param cNode2 the second involved node.
   * @returns the horizontal spacing that should be preserve between the two passed nodes.
   */
  getHorizontalSpacing(cNode1: T, cNode2: T): number;

  /**
   * @param cNode1 the first involved node.
   * @param cNode2 the second involved node.
   * @returns the vertical spacing that should be preserved between the two passed nodes.
   */
  getVerticalSpacing(cNode1: T, cNode2: T): number;
}

/**
 * A default implementation, returning for either spacing the maximum of the two desired
 * spacings (Java constant `ISpacingsHandler.DEFAULT_SPACING_HANDLER`; a TypeScript interface cannot
 * hold a value).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/ISpacingsHandler.java
 */
export const DEFAULT_SPACING_HANDLER: ISpacingsHandler<CNode> = {
  getHorizontalSpacing(cNode1: CNode, cNode2: CNode): number {
    return Math.max(cNode1.getHorizontalSpacing(), cNode2.getHorizontalSpacing());
  },

  getVerticalSpacing(cNode1: CNode, cNode2: CNode): number {
    return Math.max(cNode1.getVerticalSpacing(), cNode2.getVerticalSpacing());
  },
};
