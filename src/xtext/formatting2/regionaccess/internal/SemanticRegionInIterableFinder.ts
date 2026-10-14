// SPDX-License-Identifier: EPL-2.0
import type { ISemanticRegion } from '../ISemanticRegion.js';
import { AbstractSemanticRegionsFinder } from './AbstractSemanticRegionsFinder.js';
import type { SemanticRegionPredicate } from './SemanticRegionPredicates.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/SemanticRegionInIterableFinder.java */
export class SemanticRegionInIterableFinder extends AbstractSemanticRegionsFinder {
  private readonly regions: Iterable<ISemanticRegion>;

  constructor(regions: Iterable<ISemanticRegion>) {
    super();
    this.regions = regions;
  }

  protected findAll(predicate: SemanticRegionPredicate): ISemanticRegion[] {
    const result: ISemanticRegion[] = [];
    for (const region of this.regions) {
      if (predicate(region)) result.push(region);
    }
    return result;
  }

  protected findFirst(predicate: SemanticRegionPredicate): ISemanticRegion | null {
    for (const region of this.regions) {
      if (predicate(region)) return region;
    }
    return null;
  }
}
