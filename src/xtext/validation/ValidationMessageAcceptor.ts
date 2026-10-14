// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { EStructuralFeature } from './EStructuralFeature.js';

/** Marks an issue that does not point at one value of a multi-valued feature. */
export const INSIGNIFICANT_INDEX = -1;

/**
 * Where a message points: Java passes `object`, `feature` and `index` as three parameters; the port
 * groups them (the complexity limit allows five parameters).
 */
export interface IssueTarget {
  readonly object: EObject | null;
  readonly feature: EStructuralFeature | null;
  readonly index: number;
}

/** The Xtext-specific payload of a message: Java's `code` and varargs `issueData`. */
export interface IssueDetails {
  readonly code: string | null;
  readonly issueData: readonly string[];
}

/**
 * Receives validation messages. The offset/length variants (`RangeBasedDiagnostic`) are not reached
 * by the ELK validator and are not ported. Java's `(message, object, feature, index, code, issueData)`
 * is `(message, target, details)` here.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/ValidationMessageAcceptor.java
 */
export interface ValidationMessageAcceptor {
  acceptError(message: string, target: IssueTarget, details: IssueDetails): void;
  acceptWarning(message: string, target: IssueTarget, details: IssueDetails): void;
  acceptInfo(message: string, target: IssueTarget, details: IssueDetails): void;
}
