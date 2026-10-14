// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { EStructuralFeature } from './EStructuralFeature.js';

/** Where an object sits in its container: the containing feature and the index within it. */
export interface ContainmentSlot {
  readonly feature: EStructuralFeature;
  /** Position in a multi-valued feature, `INSIGNIFICANT_INDEX` (-1) for a single-valued one. */
  readonly index: number;
}

/**
 * The node-model lookups the diagnostic converter needs (the parser task implements it over its
 * `positions`). Lines are 1-based start lines of the node's text region, i.e. the line of its first
 * non-hidden character.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/DiagnosticConverterImpl.java
 */
export interface IssueLocator {
  /** `NodeModelUtils.getNode(obj)` start line; `null` when the object has no node. */
  objectStartLine(obj: EObject): number | null;
  /** `NodeModelUtils.findNodesForFeature(obj, feature)` start lines, in source order. */
  featureStartLines(obj: EObject, featureName: string): readonly number[];
  /**
   * `obj.eContainingFeature()` and, for a multi-valued feature, `indexOf(obj)` in the container's
   * list. Called only for an object with a container.
   */
  containingSlot(obj: EObject): ContainmentSlot;
}
