// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IEObjectRegion } from './IEObjectRegion.js';
import type { ISequentialRegion } from './ISequentialRegion.js';

/**
 * A region of an object or of a token. Grammar elements are opaque string ids (G1: no grammar model).
 * `getContainingFeature` and `getIndexInContainingFeature` are not ported (they need the Ecore metamodel,
 * which the TypeScript `EObject` lacks).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/IAstRegion.java
 */
export interface IAstRegion extends ISequentialRegion {
  getGrammarElement(): string;
  getSemanticElement(): EObject;
  getContainingRegion(): IEObjectRegion | null;
}
