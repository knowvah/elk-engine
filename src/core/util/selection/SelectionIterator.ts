// SPDX-License-Identifier: EPL-2.0
import { AbstractTreeIterator } from '../../../emf/common/util/AbstractTreeIterator.js';
import type { ElkEdge } from '../../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../../graph/ElkGraphElement.js';
import type { ElkPort } from '../../../graph/ElkPort.js';

/**
 * A tree iterator over the elements reachable from an edge through ports. The Java imports
 * `ElkUtil` but never uses it, so the import is not ported.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/selection/SelectionIterator.java
 */
export abstract class SelectionIterator extends AbstractTreeIterator<ElkGraphElement> {
  /** The already visited ports; used to break infinite loops. */
  protected visited: Set<ElkPort> | null = null;

  /** The iterator does not include the starting object. */
  constructor(edge: ElkEdge) {
    super(edge, false);
  }

  /** Attaches a set of visited ports, which can be shared across multiple iterators. */
  attachVisitedSet(visitedSet: Set<ElkPort>): void {
    this.visited = visitedSet;
  }
}
