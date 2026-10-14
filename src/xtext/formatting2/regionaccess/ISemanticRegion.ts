// SPDX-License-Identifier: EPL-2.0
import type { IAstRegion } from './IAstRegion.js';
import type { IEObjectRegion } from './IEObjectRegion.js';
import type { SemanticKind } from './FormattingToken.js';

/**
 * A token region. The three port-local accessors (`getKind`, `getAssignment`, `getFeatureName`) replace the
 * grammar-model queries of the Java predicates (`element instanceof Keyword`, `containingAssignment`).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/ISemanticRegion.java
 */
export interface ISemanticRegion extends IAstRegion {
  getEObjectRegion(): IEObjectRegion;
  getKind(): SemanticKind;
  getAssignment(): string | null;
  getFeatureName(): string | null;
}

/** Java `instanceof ISemanticRegion`. */
export function isSemanticRegion(value: unknown): value is ISemanticRegion {
  return typeof value === 'object' && value !== null && 'getEObjectRegion' in value;
}
