// SPDX-License-Identifier: EPL-2.0
import type { Diagnostic } from './Diagnostic.js';
import type { Severity } from './Severity.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/IDiagnosticConsumer.java
 */
export interface IDiagnosticConsumer {
  /** @param severity neither `null` nor `Severity.INFO` */
  consume(diagnostic: Diagnostic, severity: Severity): void;

  /** @param severity neither `null` nor `Severity.INFO` */
  hasConsumedDiagnostics(severity: Severity): boolean;
}
