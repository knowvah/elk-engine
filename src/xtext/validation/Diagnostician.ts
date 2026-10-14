// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import { BasicDiagnostic } from './emf/BasicDiagnostic.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import type { DiagnosticChain } from './emf/DiagnosticChain.js';
import { DIAGNOSTIC_SOURCE } from './EObjectValidator.js';
import type { EValidator, ValidationContext } from './emf/EValidator.js';

/**
 * EMF's `Diagnostician` as Xtext's `CancelableDiagnostician` uses it. That subclass does not
 * override `doValidateContents`, so EMF validates in its non-recursive mode: it walks the object and
 * all its contents depth-first in pre-order (`eContents()` order) and validates each object once with
 * the validator registered for the package, here given directly. Cancellation (the subclass's only
 * addition) is dropped. Not ported: the recursive mode and `doValidateContents`, `handleThrowable`
 * (the composite validator catches every failure of its delegates, so nothing reaches it),
 * `ROOT_OBJECT` pruning (only the disabled circular-containment check sets it), data-type validation
 * and the label providers.
 *
 * @see org.eclipse.emf.ecore/src/org/eclipse/emf/ecore/util/Diagnostician.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/CancelableDiagnostician.java
 */
export class Diagnostician {
  readonly #validator: EValidator;

  /** @param validator the validator registered for the package of the validated objects */
  constructor(validator: EValidator) {
    this.#validator = validator;
  }

  /**
   * @param eObject the root of the objects to validate
   * @param contextEntries entries for the validation context (`CheckMode.KEY`)
   * @returns a root diagnostic whose children are the reported diagnostics
   */
  validate(eObject: EObject, contextEntries: ReadonlyMap<unknown, unknown>): BasicDiagnostic {
    const diagnostics = new BasicDiagnostic(
      DiagnosticSeverity.OK,
      DIAGNOSTIC_SOURCE,
      0,
      `Diagnosis of ${eObject.eClass().getName()}`,
      [eObject],
    );
    const context: ValidationContext = new Map(contextEntries);
    this.validateTree(eObject, diagnostics, context);
    return diagnostics;
  }

  protected validateTree(eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean {
    let result = this.#validator.validate(eObject.eClass(), eObject, diagnostics, context);
    for (const child of eObject.eAllContents()) {
      const valid = this.#validator.validate(child.eClass(), child, diagnostics, context);
      result = result && valid;
    }
    return result;
  }
}
