// SPDX-License-Identifier: EPL-2.0
import type { ISemanticRegion } from '../ISemanticRegion.js';
import { AbstractSemanticRegionsFinder } from './AbstractSemanticRegionsFinder.js';
import type { SemanticRegionPredicate } from './SemanticRegionPredicates.js';

/** Matches one given region (or none) against the finder predicates: `immediatelyFollowing()`/`Preceding()`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/SemanticRegionMatcher.java
 */
export class SemanticRegionMatcher extends AbstractSemanticRegionsFinder {
  private readonly region: ISemanticRegion | null;

  constructor(region: ISemanticRegion | null) {
    super();
    this.region = region;
  }

  protected findAll(predicate: SemanticRegionPredicate): ISemanticRegion[] {
    const element = this.findFirst(predicate);
    return element === null ? [] : [element];
  }

  protected findFirst(predicate: SemanticRegionPredicate): ISemanticRegion | null {
    return predicate(this.region) ? this.region : null;
  }
}
