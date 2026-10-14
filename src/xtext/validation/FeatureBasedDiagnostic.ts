// SPDX-License-Identifier: EPL-2.0
import { AbstractValidationDiagnostic } from './AbstractValidationDiagnostic.js';
import type { CheckType } from './CheckType.js';
import type { EStructuralFeature } from './EStructuralFeature.js';
import type { IssueDetails, IssueTarget } from './ValidationMessageAcceptor.js';

/**
 * A validation diagnostic located at a feature of its source object, optionally at one index of a
 * multi-valued feature. Java rejects a feature the source's class does not declare
 * (`IllegalArgumentException`); the port has no metamodel (D3) to check that against, and
 * `toString` is not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/FeatureBasedDiagnostic.java
 */
export class FeatureBasedDiagnostic extends AbstractValidationDiagnostic {
  readonly #feature: EStructuralFeature | null;
  readonly #index: number;

  constructor(
    severity: number,
    message: string,
    target: IssueTarget,
    checkType: CheckType | null,
    details: IssueDetails,
  ) {
    super(severity, message, target.object, checkType, details);
    this.#feature = target.feature;
    this.#index = target.index;
  }

  /** `[source]`, then `feature` and `index` when there is a feature, then the issue data array. */
  getData(): readonly unknown[] {
    const result: unknown[] = [this.getSourceEObject()];
    if (this.#feature !== null) {
      result.push(this.#feature, this.#index);
    }
    result.push(this.getIssueData());
    return result;
  }

  getFeature(): EStructuralFeature | null {
    return this.#feature;
  }

  getIndex(): number {
    return this.#index;
  }
}
