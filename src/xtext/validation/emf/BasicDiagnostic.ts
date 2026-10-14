// SPDX-License-Identifier: EPL-2.0
import type { Diagnostic } from './Diagnostic.js';
import type { DiagnosticChain } from './DiagnosticChain.js';

/**
 * A diagnostic that is also a chain: added children raise its severity to the highest child
 * severity. Java's three constructors collapse into one (the severity-less ones pass `OK`).
 *
 * @see org.eclipse.emf.common/src/org/eclipse/emf/common/util/BasicDiagnostic.java
 */
export class BasicDiagnostic implements Diagnostic, DiagnosticChain {
  #severity: number;
  readonly #source: string;
  readonly #code: number;
  readonly #message: string;
  readonly #data: readonly unknown[];
  readonly #children: Diagnostic[] = [];

  constructor(severity: number, source: string, code: number, message: string, data: readonly unknown[] = []) {
    this.#severity = severity;
    this.#source = source;
    this.#code = code;
    this.#message = message;
    this.#data = [...data];
  }

  getSeverity(): number {
    return this.#severity;
  }

  getMessage(): string {
    return this.#message;
  }

  getSource(): string {
    return this.#source;
  }

  getCode(): number {
    return this.#code;
  }

  getData(): readonly unknown[] {
    return this.#data;
  }

  getChildren(): readonly Diagnostic[] {
    return this.#children;
  }

  add(diagnostic: Diagnostic): void {
    this.#children.push(diagnostic);
    const childSeverity = diagnostic.getSeverity();
    if (childSeverity > this.#severity) {
      this.#severity = childSeverity;
    }
  }
}
