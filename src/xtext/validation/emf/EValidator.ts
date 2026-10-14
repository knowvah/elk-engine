// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { DiagnosticChain } from './DiagnosticChain.js';

/** The validation context map: option keys (`CheckMode.KEY`, ...) to values. */
export type ValidationContext = Map<unknown, unknown>;

/**
 * A validator for one object. The `EDataType` and plain-`EObject` overloads are not reached (the
 * Diagnostician always passes the class) and are not ported.
 *
 * @see org.eclipse.emf.ecore/src/org/eclipse/emf/ecore/EValidator.java
 */
export interface EValidator {
  validate(eClass: EClass, eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean;
}
