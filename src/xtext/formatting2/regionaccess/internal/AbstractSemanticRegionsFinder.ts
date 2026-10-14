// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { FeatureRef } from '../FeatureRef.js';
import type { ISemanticRegion } from '../ISemanticRegion.js';
import type { ISemanticRegionsFinder } from '../ISemanticRegionsFinder.js';
import { SemanticRegionPredicates, type SemanticRegionPredicate } from './SemanticRegionPredicates.js';

function setOf(values: readonly string[]): ReadonlySet<string> {
  return new Set(values);
}

/**
 * Shared finder logic over `findFirst`/`findAll`. Not ported: `keywordPairs`, `ruleCallTo(s)`,
 * `assertNoEObjectRule(Call)` and `collectMatchableElements` (they inspect the grammar model; with opaque
 * ids a token matches an Assignment when it carries its id, which is what collecting the Assignment's
 * terminals computes), `GrammarElementPredicate.toString` titles.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/AbstractSemanticRegionsFinder.java
 */
export abstract class AbstractSemanticRegionsFinder implements ISemanticRegionsFinder {
  protected assertNoContainment(feature: FeatureRef): void {
    if (feature.isContainment) {
      throw new IllegalStateException('Only EAttributes and CrossReferences allowed.');
    }
  }

  protected abstract findAll(predicate: SemanticRegionPredicate): ISemanticRegion[];

  protected abstract findFirst(predicate: SemanticRegionPredicate): ISemanticRegion | null;

  assignment(assignment: string): ISemanticRegion | null {
    return this.findFirst(SemanticRegionPredicates.assignments(setOf([assignment])));
  }

  assignments(...assignments: string[]): ISemanticRegion[] {
    return this.findAll(SemanticRegionPredicates.assignments(setOf(assignments)));
  }

  crossRef(crossReference: string): ISemanticRegion | null {
    return this.findFirst(SemanticRegionPredicates.crossRefs(setOf([crossReference])));
  }

  crossRefs(...crossReferences: string[]): ISemanticRegion[] {
    return this.findAll(SemanticRegionPredicates.crossRefs(setOf(crossReferences)));
  }

  element(element: string): ISemanticRegion | null {
    return this.findFirst(SemanticRegionPredicates.grammarElements(setOf([element])));
  }

  elements(...elements: string[]): ISemanticRegion[] {
    return this.findAll(SemanticRegionPredicates.grammarElements(setOf(elements)));
  }

  feature(feature: FeatureRef): ISemanticRegion | null {
    this.assertNoContainment(feature);
    return this.findFirst(SemanticRegionPredicates.feature(feature));
  }

  features(...features: FeatureRef[]): ISemanticRegion[] {
    const predicates = features.map((feature) => {
      this.assertNoContainment(feature);
      return SemanticRegionPredicates.feature(feature);
    });
    return this.findAll((input) => predicates.some((predicate) => predicate(input)));
  }

  keywordElement(keyword: string): ISemanticRegion | null {
    return this.findFirst(SemanticRegionPredicates.grammarElements(setOf([keyword])));
  }

  keywordElements(...keywords: string[]): ISemanticRegion[] {
    return this.findAll(SemanticRegionPredicates.grammarElements(setOf(keywords)));
  }

  keyword(keyword: string): ISemanticRegion | null {
    return this.findFirst(SemanticRegionPredicates.keywords(setOf([keyword])));
  }

  keywords(...keywords: string[]): ISemanticRegion[] {
    return this.findAll(SemanticRegionPredicates.keywords(setOf(keywords)));
  }

  ruleCall(ruleCall: string): ISemanticRegion | null {
    return this.findFirst(SemanticRegionPredicates.grammarElements(setOf([ruleCall])));
  }

  ruleCalls(...ruleCalls: string[]): ISemanticRegion[] {
    return this.findAll(SemanticRegionPredicates.grammarElements(setOf(ruleCalls)));
  }
}
