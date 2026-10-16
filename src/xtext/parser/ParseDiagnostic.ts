// SPDX-License-Identifier: EPL-2.0

/**
 * One syntax or conversion problem of a parse.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface ParseDiagnostic {
  readonly kind: 'syntax' | 'conversion';
  readonly message: string;
  readonly line: number;
}
