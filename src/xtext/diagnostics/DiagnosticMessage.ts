// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { Severity } from './Severity.js';

const INFO_NOT_SUPPORTED = 'Severity INFO is not supported for diagnostic messages.';

/**
 * A message with a severity and an optional issue code and data, from which a producer creates the
 * diagnostic. Java's trailing `String... issueData` is an array parameter here.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/DiagnosticMessage.java
 */
export class DiagnosticMessage {
  readonly #message: string | null;
  readonly #severity: Severity;
  readonly #issueCode: string | null;
  readonly #issueData: readonly string[];

  constructor(message: string | null, severity: Severity, issueCode: string | null, issueData: readonly string[] = []) {
    if (severity === Severity.INFO) {
      throw new IllegalArgumentException(INFO_NOT_SUPPORTED);
    }
    this.#message = message;
    this.#severity = severity;
    this.#issueCode = issueCode;
    this.#issueData = issueData;
  }

  getIssueCode(): string | null {
    return this.#issueCode;
  }

  getIssueData(): readonly string[] {
    return this.#issueData;
  }

  getMessage(): string | null {
    return this.#message;
  }

  getSeverity(): Severity {
    return this.#severity;
  }
}
