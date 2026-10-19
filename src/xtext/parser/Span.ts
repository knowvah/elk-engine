// SPDX-License-Identifier: EPL-2.0

/**
 * Source text with the line of its first token.
 *
 * Port-local substitute for the parser and node-model runtime of Xtext: Xtext has no counterpart with this shape.
 */
export interface Span {
  readonly text: string;
  readonly line: number;
}
