// SPDX-License-Identifier: EPL-2.0
import type { FeatureRef } from './FeatureRef.js';
import type { ISemanticRegion } from './ISemanticRegion.js';

/**
 * Finds one semantic region. The Java overloads `keyword(Keyword)` / `keyword(String)` are
 * `keywordElement(id)` (match the grammar element id) / `keyword(text)` (match the keyword value).
 * `ruleCallTo(AbstractRule)` is not ported (no rule model).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ISemanticRegionFinder.java
 */
export interface ISemanticRegionFinder {
  assignment(assignment: string): ISemanticRegion | null;
  crossRef(crossReference: string): ISemanticRegion | null;
  element(element: string): ISemanticRegion | null;
  feature(feature: FeatureRef): ISemanticRegion | null;
  keywordElement(keyword: string): ISemanticRegion | null;
  keyword(keyword: string): ISemanticRegion | null;
  ruleCall(ruleCall: string): ISemanticRegion | null;
}
