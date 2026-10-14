// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';

/**
 * The type of the terminal element a token was emitted for: a keyword (`grammarElement` is the Keyword id,
 * the token text is its value), a rule call to a terminal/datatype/enum rule (`'assignment'`, the name is
 * the T12 -> T19 contract: it is the kind of every value token, assigned or not), or a cross reference
 * (`grammarElement` is the CrossReference id).
 */
export type SemanticKind = 'keyword' | 'assignment' | 'crossref';

/**
 * One token of the writer's output, as emitted by the grammar-specific sequencer (T19) into the
 * {@link TextRegionAccessBuilder}. Ids are opaque strings; the grammar-access constants of the formatter
 * (T21) are the same strings.
 */
export interface FormattingToken {
  readonly kind: SemanticKind;
  /** Id of the terminal element (keyword, rule call, cross reference). */
  readonly grammarElement: string;
  /** Id of the enclosing Assignment, `null` for unassigned keywords. */
  readonly assignment: string | null;
  /** Exact token text; empty text is ignored (`TextRegionAccessBuildingSequencer.appendSemantic` 124-126). */
  readonly text: string;
  /** Semantic object whose region the token belongs to. */
  readonly owner: EObject;
  /**
   * Optional port-local addition: name of the feature of the enclosing Assignment (the
   * `Assignment.getFeature()` that `GrammarUtil.containingAssignment` yields), needed only by
   * `regionFor.feature(...)`. Omitted or `null` when unknown/unassigned.
   */
  readonly feature?: string | null;
}
