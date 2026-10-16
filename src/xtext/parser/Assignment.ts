// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';

/**
 * Where a converted value goes: the owner, the assigned feature, the converter rule.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface Assignment {
  readonly owner: EObject;
  readonly feature: string;
  readonly rule: string;
  /** The feature has a primitive type (`double`): a `null` conversion result is an error. */
  readonly primitive?: boolean;
}
