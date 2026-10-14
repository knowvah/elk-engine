// SPDX-License-Identifier: EPL-2.0
import type { FeatureRef } from '../FeatureRef.js';
import type { ISemanticRegion } from '../ISemanticRegion.js';

/** Java `Predicate<ISemanticRegion>`; `null` input yields `false` like the Java `apply`. */
export type SemanticRegionPredicate = (input: ISemanticRegion | null) => boolean;

/**
 * Predicates of `AbstractSemanticRegionsFinder` (inner classes in Java). The grammar-model tests become tests
 * of the opaque ids carried by the token: `element instanceof Keyword` is `getKind() === 'keyword'`, and
 * `containingAssignment(element)` is `getAssignment()`. `RulePredicate`/`RulesPredicate` (`ruleCallTo`) are not
 * ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/AbstractSemanticRegionsFinder.java
 */
export class SemanticRegionPredicates {
  /** `FeaturePredicate`: the assignment's feature has the name and the semantic element is of the class. */
  static feature(feature: FeatureRef): SemanticRegionPredicate {
    return (input) => {
      if (input === null) return false;
      const name = input.getFeatureName();
      if (name === null || feature.name !== name) return false;
      return feature.isInstance(input.getSemanticElement());
    };
  }

  /** `GrammarElementPredicate` / `GrammarElementsPredicate`. */
  static grammarElements(grammarElements: ReadonlySet<string>): SemanticRegionPredicate {
    return (input) => input !== null && grammarElements.has(input.getGrammarElement());
  }

  /** The predicate of `createPredicate(Assignment...)`: the terminals of an assignment are the tokens assigned to it. */
  static assignments(assignments: ReadonlySet<string>): SemanticRegionPredicate {
    return (input) => {
      if (input === null) return false;
      const assignment = input.getAssignment();
      return assignment !== null && assignments.has(assignment);
    };
  }

  /** `KeywordPredicate` / `KeywordsPredicate`. */
  static keywords(keywords: ReadonlySet<string>): SemanticRegionPredicate {
    return (input) => input !== null && input.getKind() === 'keyword' && keywords.has(input.getText());
  }

  /** The predicate of `createPredicate(CrossReference...)`: tokens of the cross reference. */
  static crossRefs(crossReferences: ReadonlySet<string>): SemanticRegionPredicate {
    return (input) =>
      input !== null && input.getKind() === 'crossref' && crossReferences.has(input.getGrammarElement());
  }
}
