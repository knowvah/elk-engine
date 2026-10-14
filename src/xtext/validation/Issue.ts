// SPDX-License-Identifier: EPL-2.0
import type { Severity } from '../diagnostics/Severity.js';

/**
 * One reported problem, reduced to what the ELK text entry points expose (G4/G5): severity, message,
 * code, issue data and the 1-based start line. `lineNumber` is `0` where the Java location is the empty
 * `IssueLocation`. Columns, offsets, lengths, URIs and the check type are not carried.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/validation/Issue.java
 */
export interface Issue {
  readonly severity: Severity;
  readonly message: string;
  readonly code: string | null;
  readonly data: readonly string[];
  readonly lineNumber: number;
  readonly syntaxError: boolean;
}

/**
 * A diagnostic of loading a resource (syntax, linking, value conversion), already converted by the
 * loader (G4). `code` and `data` are the Xtext diagnostic's (`org.eclipse.xtext.diagnostics.Diagnostic.Linking`
 * and so on); they default to `null` and empty.
 */
export interface ResourceDiagnostic {
  readonly message: string;
  readonly line: number;
  readonly syntax: boolean;
  readonly code?: string | null;
  readonly data?: readonly string[];
}

/** The errors and warnings of a loaded resource (`Resource.getErrors()` and `getWarnings()`). */
export interface ResourceDiagnostics {
  readonly errors: readonly ResourceDiagnostic[];
  readonly warnings: readonly ResourceDiagnostic[];
}
