// SPDX-License-Identifier: EPL-2.0
import type { ISemanticRegion } from '../ISemanticRegion.js';

/**
 * The semantic regions from `first` to `last` (inclusive) in document order. As in Java, a `last` that is not
 * reachable from `first` ends the iteration only at the end of the document.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/SemanticRegionIterable.java
 */
export class SemanticRegionIterable implements Iterable<ISemanticRegion> {
  private readonly first: ISemanticRegion | null;
  private readonly last: ISemanticRegion | null;

  constructor(first: ISemanticRegion | null, last: ISemanticRegion | null) {
    this.first = first;
    this.last = last;
  }

  *[Symbol.iterator](): Iterator<ISemanticRegion> {
    let next = this.first;
    while (next !== null) {
      const result: ISemanticRegion = next;
      next = next.getNextSemanticRegion();
      if (result === this.last) next = null;
      yield result;
    }
  }
}
