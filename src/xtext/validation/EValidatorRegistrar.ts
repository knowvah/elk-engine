// SPDX-License-Identifier: EPL-2.0
import { CompositeEValidator } from './CompositeEValidator.js';
import type { EValidator } from './emf/EValidator.js';

/**
 * Registers a language validator for the one package it validates, reduced from the registry-wide
 * `EValidator.Registry`. A package without a validator of its own is served by EMF's plain
 * `EObjectValidator` (the registry default), so the first registration wraps that default into a
 * fresh composite: `[default EObjectValidator, plain EObjectValidator, language validator]`. The
 * plain one differs in class from the composite's default one, so both stay, and EMF's
 * `EObjectValidator` constraints run twice for each object (the recorded JVM output holds every
 * `org.eclipse.emf.ecore.14` issue twice). A package the registry holds no validator for (`null`) gets a fresh
 * composite with only its own defaults (`.elkj`: each constraint once).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/EValidatorRegistrar.java
 */
export class EValidatorRegistrar {
  #validator: EValidator | null;
  readonly #newComposite: () => CompositeEValidator;

  /**
   * @param registryDefault what the registry returns for the package before any registration (EMF's
   *   `EObjectValidator`, or `null` when none is registered)
   * @param newComposite the composite provider (Guice `compositeProvider`)
   */
  constructor(registryDefault: EValidator | null, newComposite: () => CompositeEValidator) {
    this.#validator = registryDefault;
    this.#newComposite = newComposite;
  }

  /**
   * @param registerMe the validator to add
   * @returns the composite now registered for the package
   */
  register(registerMe: EValidator): CompositeEValidator {
    let composite: CompositeEValidator;
    if (this.#validator === null) {
      composite = this.#newComposite();
    } else if (this.#validator instanceof CompositeEValidator) {
      composite = this.#validator;
    } else {
      composite = this.#newComposite();
      composite.addValidator(this.#validator);
    }
    composite.addValidator(registerMe);
    this.#validator = composite;
    return composite;
  }
}
