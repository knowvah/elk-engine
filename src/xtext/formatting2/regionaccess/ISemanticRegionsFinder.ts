// SPDX-License-Identifier: EPL-2.0
import type { FeatureRef } from './FeatureRef.js';
import type { ISemanticRegion } from './ISemanticRegion.js';
import type { ISemanticRegionFinder } from './ISemanticRegionFinder.js';

/**
 * Finds all matching semantic regions. Java `keywords(Keyword...)` / `keywords(String...)` are
 * `keywordElements(...ids)` / `keywords(...texts)`. `keywordPairs` and `ruleCallsTo` are not ported
 * (`ElkGraphFormatter` does not reach them).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ISemanticRegionsFinder.java
 */
export interface ISemanticRegionsFinder extends ISemanticRegionFinder {
  assignments(...assignments: string[]): ISemanticRegion[];
  crossRefs(...crossReferences: string[]): ISemanticRegion[];
  elements(...elements: string[]): ISemanticRegion[];
  features(...features: FeatureRef[]): ISemanticRegion[];
  keywordElements(...keywords: string[]): ISemanticRegion[];
  keywords(...keywords: string[]): ISemanticRegion[];
  ruleCalls(...ruleCalls: string[]): ISemanticRegion[];
}
