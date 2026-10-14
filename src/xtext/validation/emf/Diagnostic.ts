// SPDX-License-Identifier: EPL-2.0

/** The severities of an EMF diagnostic (EMF `Diagnostic.OK` and following, `int` bit flags). */
export const DiagnosticSeverity = {
  OK: 0x0,
  INFO: 0x1,
  WARNING: 0x2,
  ERROR: 0x4,
  CANCEL: 0x8,
} as const;

/**
 * A validation diagnostic as the validators produce it. EMF is EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.common/src/org/eclipse/emf/common/util/Diagnostic.java
 */
export interface Diagnostic {
  getSeverity(): number;
  getMessage(): string;
  getSource(): string;
  getCode(): number;
  getData(): readonly unknown[];
  getChildren(): readonly Diagnostic[];
}
