// SPDX-License-Identifier: EPL-2.0
import type { FeatureRef } from '../FeatureRef.js';
import type { ISemanticRegion } from '../ISemanticRegion.js';
import type { ISemanticRegionsFinder } from '../ISemanticRegionsFinder.js';

/** The finder that finds nothing (Java enum singleton `INSTANCE`). */
class SemanticRegionNullFinderImpl implements ISemanticRegionsFinder {
  assignment(_assignment: string): ISemanticRegion | null {
    return null;
  }
  assignments(..._assignments: string[]): ISemanticRegion[] {
    return [];
  }
  crossRef(_crossReference: string): ISemanticRegion | null {
    return null;
  }
  crossRefs(..._crossReferences: string[]): ISemanticRegion[] {
    return [];
  }
  element(_element: string): ISemanticRegion | null {
    return null;
  }
  elements(..._elements: string[]): ISemanticRegion[] {
    return [];
  }
  feature(_feature: FeatureRef): ISemanticRegion | null {
    return null;
  }
  features(..._features: FeatureRef[]): ISemanticRegion[] {
    return [];
  }
  keywordElement(_keyword: string): ISemanticRegion | null {
    return null;
  }
  keywordElements(..._keywords: string[]): ISemanticRegion[] {
    return [];
  }
  keyword(_keyword: string): ISemanticRegion | null {
    return null;
  }
  keywords(..._keywords: string[]): ISemanticRegion[] {
    return [];
  }
  ruleCall(_ruleCall: string): ISemanticRegion | null {
    return null;
  }
  ruleCalls(..._ruleCalls: string[]): ISemanticRegion[] {
    return [];
  }
}

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/SemanticRegionNullFinder.java */
export const SemanticRegionNullFinder: { readonly INSTANCE: ISemanticRegionsFinder } = {
  INSTANCE: new SemanticRegionNullFinderImpl(),
};
