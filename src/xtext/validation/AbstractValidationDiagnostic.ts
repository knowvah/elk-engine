// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { CheckType } from './CheckType.js';
import type { Diagnostic } from './emf/Diagnostic.js';
import type { IssueDetails } from './ValidationMessageAcceptor.js';

/**
 * Base of the diagnostics the declarative validator creates: the severity, message and source
 * object plus Xtext's string issue code, issue data and check type (Java's `issueCode` and `issueData`
 * parameters travel as one `IssueDetails`). `toString` and
 * `severityToStr` (debug output through `EmfFormatter`) are not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/AbstractValidationDiagnostic.java
 */
export abstract class AbstractValidationDiagnostic implements Diagnostic {
  readonly #message: string;
  readonly #source: EObject | null;
  readonly #severity: number;
  readonly #checkType: CheckType | null;
  readonly #issueCode: string | null;
  readonly #issueData: readonly string[];

  /**
   * @throws TypeError if `issueData` contains `null` (Java: `NullPointerException`, D10)
   */
  protected constructor(
    severity: number,
    message: string,
    source: EObject | null,
    checkType: CheckType | null,
    details: IssueDetails,
  ) {
    const { code: issueCode, issueData } = details;
    if (issueData.some((datum) => (datum as string | null) === null)) {
      throw new TypeError('issueData may not contain null');
    }
    this.#source = source;
    this.#severity = severity;
    this.#message = message;
    this.#issueCode = issueCode;
    this.#checkType = checkType;
    this.#issueData = issueData;
  }

  getChildren(): readonly Diagnostic[] {
    return [];
  }

  /** EMF works well with 0; the string code is {@link getIssueCode}. */
  getCode(): number {
    return 0;
  }

  getSource(): string {
    return this.#source === null ? '' : String(this.#source);
  }

  getSourceEObject(): EObject | null {
    return this.#source;
  }

  getMessage(): string {
    return this.#message;
  }

  getSeverity(): number {
    return this.#severity;
  }

  getIssueCode(): string | null {
    return this.#issueCode;
  }

  getIssueData(): readonly string[] {
    return this.#issueData;
  }

  getCheckType(): CheckType | null {
    return this.#checkType;
  }

  abstract getData(): readonly unknown[];
}
