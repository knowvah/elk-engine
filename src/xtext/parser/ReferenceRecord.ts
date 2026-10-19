// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';

/**
 * One cross-reference occurrence of the Phase 5 contract.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface ReferenceRecord {
  readonly owner: EObject;
  readonly feature: string;
  readonly index: number;
  readonly ruleName: string;
  readonly text: string;
  readonly line: number;
}
