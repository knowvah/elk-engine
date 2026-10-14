// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';

/**
 * Stands for the `EStructuralFeature` argument of `regionFor.feature(...)`: the TypeScript `EObject` has no
 * metamodel, so the caller supplies the feature name, the `EClass.isInstance` test of the feature's
 * containing class, and whether the feature is a containment reference.
 */
export interface FeatureRef {
  readonly name: string;
  readonly isContainment: boolean;
  /** `feature.getEContainingClass().isInstance(semanticElement)`. */
  isInstance(semanticElement: EObject): boolean;
}
