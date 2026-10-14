// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { BasicDiagnostic } from './emf/BasicDiagnostic.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import type { DiagnosticChain } from './emf/DiagnosticChain.js';
import type { EValidator, ValidationContext } from './emf/EValidator.js';
import { EObjectValidator, type MapEntryFeatureProvider } from './EObjectValidator.js';

/** The message of the diagnostic that replaces a delegate that threw. */
const EXECUTION_ERROR_MESSAGE = 'Error executing EValidator';

/** Receives what Java logs through Log4j (`logger.error`). */
export type ErrorLog = (message: string, error: unknown) => void;

/**
 * Java's anonymous `EObjectValidator` of `initDefaults`, which switches off `validate_EveryProxyResolves`
 * and `validate_NoCircularContainment`. Neither is ported (they cannot fire, see `EObjectValidator`), so
 * it behaves like its base; it stays a class of its own because the composite's equality support
 * compares delegate classes, and a plain `EObjectValidator` registered next to it is a second delegate.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/CompositeEValidator.java
 */
export class DefaultEObjectValidator extends EObjectValidator {}

/**
 * Runs its delegates in order for each object. A delegate that throws does not abort the run: the
 * failure becomes an `Error executing EValidator` error diagnostic and the next delegate runs.
 * Delegates are unique by class (`EValidatorEqualitySupport`; the language-name comparison of
 * `AbstractInjectableValidator` is moot with a single language). Not ported: the data-type and
 * plain-`EObject` `validate` overloads, `clone`/`getCopyAndClearContents`, cancellation.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/CompositeEValidator.java
 */
export class CompositeEValidator implements EValidator {
  readonly #mapEntryFeatures: MapEntryFeatureProvider;
  readonly #logError: ErrorLog;
  #contents: EValidator[] | null = null;

  /**
   * @param mapEntryFeatures the map features for the default `EObjectValidator`
   * @param logError receives each delegate failure (Java: `logger.error`)
   */
  constructor(mapEntryFeatures: MapEntryFeatureProvider, logError: ErrorLog) {
    this.#mapEntryFeatures = mapEntryFeatures;
    this.#logError = logError;
  }

  /** The delegates; the first access installs the defaults (`initDefaults`). */
  getContents(): readonly EValidator[] {
    return this.#ensureContents();
  }

  /**
   * Adds a delegate unless one of the same class is present; a composite adds its delegates.
   *
   * @param validator the validator to add
   */
  addValidator(validator: EValidator): void {
    if (this === (validator as EValidator)) {
      return;
    }
    if (validator instanceof CompositeEValidator) {
      for (const delegate of validator.getContents()) {
        this.addValidator(delegate);
      }
      return;
    }
    const contents = this.#ensureContents();
    if (!contents.some((existing) => existing.constructor === validator.constructor)) {
      contents.push(validator);
    }
  }

  validate(eClass: EClass, eObject: EObject, diagnostics: DiagnosticChain, context: ValidationContext): boolean {
    let result = true;
    for (const delegate of this.#ensureContents()) {
      try {
        const valid = delegate.validate(eClass, eObject, diagnostics, context);
        result = result && valid;
      } catch (e) {
        this.#logError(EXECUTION_ERROR_MESSAGE, e);
        diagnostics.add(this.#createExceptionDiagnostic(eClass, e));
      }
    }
    return result;
  }

  /** The source is `eClass.toString()` in Java (class name and identity hash); the class name stands in. */
  #createExceptionDiagnostic(eClass: EClass, error: unknown): BasicDiagnostic {
    return new BasicDiagnostic(DiagnosticSeverity.ERROR, eClass.getName(), 0, EXECUTION_ERROR_MESSAGE, [error]);
  }

  #ensureContents(): EValidator[] {
    if (this.#contents === null) {
      this.#contents = [];
      this.addValidator(new DefaultEObjectValidator(this.#mapEntryFeatures));
    }
    return this.#contents;
  }
}
