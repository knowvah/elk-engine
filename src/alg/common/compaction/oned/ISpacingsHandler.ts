// SPDX-License-Identifier: EPL-2.0
import type { CNode } from './CNode.js';

/**
 * An implementation of this class is able to report both the vertical and the horizontal spacing
 * between any pair of {@link CNode}s. Different implementations of {@link CNode}s may have
 * different special requirements. In such a case a special spacings handler should be implemented.
 * For a default implementation, use the {@link DEFAULT_SPACING_HANDLER}.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/ISpacingsHandler.java
 */
export interface ISpacingsHandler {
  /**
   * @param cNode1 the first involved node.
   * @param cNode2 the second involved node.
   * @returns the horizontal spacing that should be preserve between the two passed nodes.
   */
  getHorizontalSpacing(cNode1: CNode, cNode2: CNode): number;

  /**
   * @param cNode1 the first involved node.
   * @param cNode2 the second involved node.
   * @returns the vertical spacing that should be preserved between the two passed nodes.
   */
  getVerticalSpacing(cNode1: CNode, cNode2: CNode): number;
}

/**
 * A default implementation, returning **no** spacing in either direction (Java constant
 * `ISpacingsHandler.DEFAULT_SPACING_HANDLER`; a TypeScript interface cannot hold a value).
 */
export const DEFAULT_SPACING_HANDLER: ISpacingsHandler = {
  getHorizontalSpacing(_cNode1: CNode, _cNode2: CNode): number {
    return 0;
  },
  getVerticalSpacing(_cNode1: CNode, _cNode2: CNode): number {
    return 0;
  },
};
