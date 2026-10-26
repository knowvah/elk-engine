// SPDX-License-Identifier: EPL-2.0
import * as Lists from '../../guava/Lists.js';

/**
 * A tree of T.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/Tree.java
 */
export class Tree<T> {
  /** The contained node. */
  readonly node: T;
  /** The subtrees. */
  children: Tree<T>[];

  /**
   * Constructor.
   *
   * @param n the contained node
   */
  constructor(n: T) {
    this.node = n;
    this.children = Lists.newArrayList<Tree<T>>();
  }
}
